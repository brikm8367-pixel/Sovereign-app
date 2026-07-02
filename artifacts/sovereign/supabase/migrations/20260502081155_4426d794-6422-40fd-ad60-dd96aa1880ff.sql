-- 1. recipient_filters: ما يرفض المستخدم استلامه
CREATE TABLE IF NOT EXISTS public.recipient_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filter_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, filter_type)
);

ALTER TABLE public.recipient_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own filters - select"
  ON public.recipient_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own filters - insert"
  ON public.recipient_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own filters - update"
  ON public.recipient_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own filters - delete"
  ON public.recipient_filters FOR DELETE
  USING (auth.uid() = user_id);

-- 2. blocked_content_log: سجل الحجب التلقائي
CREATE TABLE IF NOT EXISTS public.blocked_content_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  reason TEXT NOT NULL,
  content_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_content_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read blocked log"
  ON public.blocked_content_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts blocked log"
  ON public.blocked_content_log FOR INSERT
  WITH CHECK (true);

-- 3. inbox_mode على message_limits
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_limits' AND column_name = 'inbox_mode'
  ) THEN
    ALTER TABLE public.message_limits ADD COLUMN inbox_mode TEXT NOT NULL DEFAULT 'limited';
  END IF;
END $$;

-- index للأداء
CREATE INDEX IF NOT EXISTS idx_recipient_filters_user ON public.recipient_filters(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_log_receiver ON public.blocked_content_log(receiver_id, created_at DESC);