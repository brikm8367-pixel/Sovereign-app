-- =========================================================
-- Fan Groups (Fans Box communities)
-- =========================================================
CREATE TABLE public.fan_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  topic_of_day text,
  messages_per_hour integer NOT NULL DEFAULT 5,
  allow_member_posts boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_groups TO authenticated;
GRANT ALL ON public.fan_groups TO service_role;
ALTER TABLE public.fan_groups ENABLE ROW LEVEL SECURITY;

-- owner manages everything
CREATE POLICY "owner manages groups" ON public.fan_groups
  FOR ALL TO authenticated
  USING (auth.uid() = celebrity_id)
  WITH CHECK (auth.uid() = celebrity_id AND public.is_celebrity(auth.uid()));

-- any authenticated user can view active groups (to open via link)
CREATE POLICY "view active groups" ON public.fan_groups
  FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid() = celebrity_id);

CREATE TRIGGER trg_fan_groups_updated_at
  BEFORE UPDATE ON public.fan_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- members
CREATE TABLE public.fan_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.fan_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fan_group_members TO authenticated;
GRANT ALL ON public.fan_group_members TO service_role;
ALTER TABLE public.fan_group_members ENABLE ROW LEVEL SECURITY;

-- helper: is the user a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.fan_group_members WHERE group_id = _group AND user_id = _uid);
$$;

-- helper: group owner
CREATE OR REPLACE FUNCTION public.group_owner(_group uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT celebrity_id FROM public.fan_groups WHERE id = _group;
$$;

-- user can join groups (insert self), leave (delete self), see own membership
CREATE POLICY "join group" ON public.fan_group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave group" ON public.fan_group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.group_owner(group_id) = auth.uid());
CREATE POLICY "view memberships" ON public.fan_group_members
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.group_owner(group_id) = auth.uid());
CREATE POLICY "owner updates members" ON public.fan_group_members
  FOR UPDATE TO authenticated
  USING (public.group_owner(group_id) = auth.uid())
  WITH CHECK (public.group_owner(group_id) = auth.uid());

-- group messages
CREATE TABLE public.fan_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.fan_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.fan_group_messages TO authenticated;
GRANT ALL ON public.fan_group_messages TO service_role;
ALTER TABLE public.fan_group_messages ENABLE ROW LEVEL SECURITY;

-- members + owner can read
CREATE POLICY "read group messages" ON public.fan_group_messages
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.group_owner(group_id) = auth.uid());

-- send: owner always; members only if posting allowed
CREATE POLICY "send group messages" ON public.fan_group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      public.group_owner(group_id) = auth.uid()
      OR (
        public.is_group_member(group_id, auth.uid())
        AND EXISTS (SELECT 1 FROM public.fan_groups g WHERE g.id = group_id AND g.allow_member_posts = true AND g.is_active = true)
      )
    )
  );

-- delete own messages or owner deletes any
CREATE POLICY "delete group messages" ON public.fan_group_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR public.group_owner(group_id) = auth.uid());

-- enforce per-hour rate limit set by the celebrity (owner is exempt)
CREATE OR REPLACE FUNCTION public.enforce_group_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  lim integer;
  cnt integer;
  owner uuid;
BEGIN
  SELECT messages_per_hour, celebrity_id INTO lim, owner
  FROM public.fan_groups WHERE id = NEW.group_id;

  IF owner = NEW.sender_id THEN
    RETURN NEW; -- owner exempt
  END IF;

  SELECT COUNT(*) INTO cnt
  FROM public.fan_group_messages
  WHERE group_id = NEW.group_id
    AND sender_id = NEW.sender_id
    AND created_at > now() - interval '1 hour';

  IF cnt >= COALESCE(lim, 5) THEN
    RAISE EXCEPTION 'group_rate_limit_exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_rate_limit
  BEFORE INSERT ON public.fan_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_rate_limit();

-- group slug generator (unique within fan_groups)
CREATE OR REPLACE FUNCTION public.gen_unique_group_slug()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE candidate text;
BEGIN
  LOOP
    candidate := lower(substring(md5(gen_random_uuid()::text) from 1 for 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.fan_groups WHERE slug = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- secure creator RPC: only celebrities create groups, slug auto-generated, owner auto-joined
CREATE OR REPLACE FUNCTION public.create_fan_group(_name text, _description text DEFAULT NULL, _messages_per_hour integer DEFAULT 5, _allow_member_posts boolean DEFAULT true)
RETURNS public.fan_groups
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  g public.fan_groups;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public.is_celebrity(uid) THEN RAISE EXCEPTION 'only_celebrity_can_create_groups'; END IF;
  IF char_length(trim(_name)) < 2 OR char_length(_name) > 60 THEN RAISE EXCEPTION 'invalid_name'; END IF;

  INSERT INTO public.fan_groups (celebrity_id, name, description, slug, messages_per_hour, allow_member_posts)
  VALUES (uid, trim(_name), NULLIF(trim(_description), ''), public.gen_unique_group_slug(),
          GREATEST(1, LEAST(COALESCE(_messages_per_hour, 5), 100)), COALESCE(_allow_member_posts, true))
  RETURNING * INTO g;

  INSERT INTO public.fan_group_members (group_id, user_id, role)
  VALUES (g.id, uid, 'owner');

  RETURN g;
END;
$$;
REVOKE ALL ON FUNCTION public.create_fan_group(text, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fan_group(text, text, integer, boolean) TO authenticated;