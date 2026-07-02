
-- =========================================================
-- 1) FEATURE ENTITLEMENTS (payment gate for Golden Hour)
-- =========================================================
CREATE TABLE public.feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

GRANT SELECT ON public.feature_entitlements TO authenticated;
GRANT ALL ON public.feature_entitlements TO service_role;

ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entitlements"
  ON public.feature_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_fe_updated
  BEFORE UPDATE ON public.feature_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_entitlement(_uid uuid, _feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feature_entitlements
    WHERE user_id = _uid AND feature = _feature AND granted = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- =========================================================
-- 2) GOLDEN HOUR LIFECYCLE (gate on create, start on reply)
-- =========================================================
-- Redefine: on INSERT, enforce payment gate and DO NOT start the clock.
CREATE OR REPLACE FUNCTION public.set_golden_hour()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.golden_hour THEN
    IF NOT public.has_entitlement(NEW.sender_id, 'golden_hour') THEN
      RAISE EXCEPTION 'golden_hour_not_allowed';
    END IF;
  END IF;
  -- Golden Hour does NOT start at creation; it starts on first reply.
  NEW.golden_hour_expires_at := NULL;
  RETURN NEW;
END;
$$;

-- New deal card cancels any active Golden Hour for the same celebrity.
CREATE OR REPLACE FUNCTION public.expire_prior_golden_hours()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.deal_cards
  SET golden_hour_expires_at = now()
  WHERE celebrity_id = NEW.celebrity_id
    AND id <> NEW.id
    AND golden_hour_expires_at IS NOT NULL
    AND golden_hour_expires_at > now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_cards_expire_prior ON public.deal_cards;
CREATE TRIGGER trg_deal_cards_expire_prior
  AFTER INSERT ON public.deal_cards
  FOR EACH ROW EXECUTE FUNCTION public.expire_prior_golden_hours();

-- Golden Hour begins (exactly 60 min) on first reply: status leaves 'pending'.
CREATE OR REPLACE FUNCTION public.start_golden_hour_on_reply()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.golden_hour
     AND OLD.status = 'pending'
     AND NEW.status <> 'pending'
     AND NEW.golden_hour_expires_at IS NULL THEN
    NEW.golden_hour_expires_at := now() + interval '60 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_cards_start_golden ON public.deal_cards;
CREATE TRIGGER trg_deal_cards_start_golden
  BEFORE UPDATE ON public.deal_cards
  FOR EACH ROW EXECUTE FUNCTION public.start_golden_hour_on_reply();

-- =========================================================
-- 3) MANAGER ACTIVITY LOG (visible to celebrity only)
-- =========================================================
CREATE TABLE public.manager_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manager_activity_log TO authenticated;
GRANT ALL ON public.manager_activity_log TO service_role;

ALTER TABLE public.manager_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Celebrity views own activity log"
  ON public.manager_activity_log FOR SELECT TO authenticated
  USING (auth.uid() = celebrity_id);

CREATE POLICY "Manager logs own actions"
  ON public.manager_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = manager_id AND public.active_manager_of(auth.uid(), celebrity_id));

CREATE INDEX idx_activity_log_celebrity ON public.manager_activity_log (celebrity_id, created_at DESC);

-- Auto-log manager deal actions (status changes performed by a manager).
CREATE OR REPLACE FUNCTION public.log_manager_deal_action()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> NEW.celebrity_id
     AND NEW.status IS DISTINCT FROM OLD.status
     AND public.active_manager_of(auth.uid(), NEW.celebrity_id) THEN
    INSERT INTO public.manager_activity_log (celebrity_id, manager_id, action, detail)
    VALUES (NEW.celebrity_id, auth.uid(), 'deal_' || NEW.status::text, NEW.deal_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_cards_log_action ON public.deal_cards;
CREATE TRIGGER trg_deal_cards_log_action
  AFTER UPDATE ON public.deal_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_manager_deal_action();

-- =========================================================
-- 4) KILL SWITCH (revoke all active managers instantly)
-- =========================================================
CREATE OR REPLACE FUNCTION public.kill_switch_revoke_all(_celebrity uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.manager_links
  SET status = 'revoked', updated_at = now()
  WHERE celebrity_id = _celebrity AND status = 'active';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
