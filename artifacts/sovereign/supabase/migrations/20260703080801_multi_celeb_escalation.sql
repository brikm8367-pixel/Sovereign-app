-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Multi-Celebrity Management + Deal Escalation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Active celebrity pointer for manager accounts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_celebrity_id uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Deal Card escalation flow (manager → celebrity approval)
ALTER TABLE public.deal_cards
  ADD COLUMN IF NOT EXISTS escalated_to_celebrity boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS celebrity_approval_status text
    CHECK (celebrity_approval_status IN ('pending','approved','rejected','revision')),
  ADD COLUMN IF NOT EXISTS escalation_note      text,
  ADD COLUMN IF NOT EXISTS celebrity_response_note text,
  ADD COLUMN IF NOT EXISTS escalated_at         timestamptz;

-- 3. Fast lookup: all deals needing celebrity approval
CREATE INDEX IF NOT EXISTS idx_deal_cards_escalated
  ON public.deal_cards(celebrity_id, escalated_to_celebrity)
  WHERE escalated_to_celebrity = true;

-- 4. Ensure existing "update own profile" policy covers new column
-- (The existing RLS policies on profiles already allow users to update
--  their own row, so no new policy is needed.)
