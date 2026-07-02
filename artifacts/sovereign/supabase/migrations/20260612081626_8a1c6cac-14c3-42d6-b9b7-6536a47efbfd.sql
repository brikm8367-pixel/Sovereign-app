-- =========================================================
-- 1) Custom links (slug) on profiles
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text;

-- reserved slugs (system routes / impersonation protection)
CREATE TABLE IF NOT EXISTS public.reserved_slugs (
  slug text PRIMARY KEY
);
GRANT SELECT ON public.reserved_slugs TO authenticated, anon;
ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved slugs readable" ON public.reserved_slugs FOR SELECT USING (true);

INSERT INTO public.reserved_slugs (slug) VALUES
 ('admin'),('api'),('auth'),('login'),('logout'),('signup'),('app'),('www'),
 ('support'),('help'),('settings'),('profile'),('security'),('launch'),
 ('subscribe'),('install'),('notifications'),('dashboard'),('home'),('m'),
 ('s'),('u'),('g'),('group'),('groups'),('admin-stats'),('reset-password'),
 ('terms'),('privacy'),('bug-bounty'),('sovereign'),('null'),('undefined'),
 ('about'),('contact'),('explore'),('discover')
ON CONFLICT DO NOTHING;

-- short, url-safe random slug generator (nanoid-style, lowercase base36)
CREATE OR REPLACE FUNCTION public.gen_unique_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := lower(substring(md5(gen_random_uuid()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate)
          AND NOT EXISTS (SELECT 1 FROM public.reserved_slugs WHERE slug = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- backfill existing profiles
UPDATE public.profiles SET slug = public.gen_unique_slug() WHERE slug IS NULL;

-- enforce uniqueness + case-insensitive
ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_unique UNIQUE (slug);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_lower_idx ON public.profiles (lower(slug));

-- secure self-service slug setter
CREATE OR REPLACE FUNCTION public.set_profile_slug(_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  clean text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  clean := lower(trim(_slug));

  -- format: 3-20 chars, a-z0-9 and single dashes/underscores, must start alnum
  IF clean !~ '^[a-z0-9][a-z0-9_-]{2,19}$' THEN
    RAISE EXCEPTION 'invalid_slug_format';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reserved_slugs WHERE slug = clean) THEN
    RAISE EXCEPTION 'slug_reserved';
  END IF;

  -- impersonation protection: cannot use another user's username
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = clean AND id <> uid) THEN
    RAISE EXCEPTION 'slug_reserved';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(slug) = clean AND id <> uid) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE public.profiles SET slug = clean, updated_at = now() WHERE id = uid;
  RETURN clean;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_slug(text) TO authenticated;

-- auto-generate slug for new users (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_name TEXT;
  short_code TEXT;
  final_username TEXT;
BEGIN
  base_name := LOWER(COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  ));
  base_name := SUBSTRING(REGEXP_REPLACE(base_name, '[^a-z0-9_]', '', 'g') FROM 1 FOR 10);
  IF base_name = '' THEN base_name := 'user'; END IF;

  short_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  final_username := base_name || short_code;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    short_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    final_username := base_name || short_code;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, slug)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username'),
    public.gen_unique_slug()
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- =========================================================
-- 2) CRITICAL security fix: delete_user_data authorization
-- =========================================================
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM public.messages WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.direct_access WHERE owner_id = _user_id OR allowed_user_id = _user_id;
  DELETE FROM public.message_limits WHERE user_id = _user_id;
  DELETE FROM public.contacts WHERE user_id = _user_id OR contact_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.blocked_users WHERE blocker_id = _user_id OR blocked_id = _user_id;
  DELETE FROM public.reports WHERE reporter_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;