
-- Add public_key column to profiles for E2E encryption key exchange
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key text;

-- Create unique constraint on weekly_analysis for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_analysis_user_id_week_start_key'
  ) THEN
    ALTER TABLE public.weekly_analysis ADD CONSTRAINT weekly_analysis_user_id_week_start_key UNIQUE (user_id, week_start);
  END IF;
END $$;
