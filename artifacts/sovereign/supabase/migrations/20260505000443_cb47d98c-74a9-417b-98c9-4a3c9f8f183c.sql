CREATE TABLE IF NOT EXISTS public.device_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_keys_user ON public.device_keys(user_id);

ALTER TABLE public.device_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own devices" ON public.device_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own devices" ON public.device_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own devices" ON public.device_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own devices" ON public.device_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);