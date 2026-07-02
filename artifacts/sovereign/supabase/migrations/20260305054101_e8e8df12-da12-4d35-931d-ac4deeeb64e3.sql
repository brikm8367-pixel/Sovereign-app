
-- Block/Report system
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  message_id UUID,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can block others" ON public.blocked_users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks" ON public.blocked_users
  FOR SELECT TO authenticated USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Delete account function (GDPR compliance)
CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
