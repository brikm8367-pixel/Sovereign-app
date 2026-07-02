CREATE TYPE public.deal_status AS ENUM ('pending', 'accepted', 'declined', 'countered');

CREATE TABLE public.deal_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  celebrity_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  deal_type text NOT NULL,
  budget_range text,
  timeline text,
  details text,
  status public.deal_status NOT NULL DEFAULT 'pending',
  golden_hour boolean NOT NULL DEFAULT false,
  golden_hour_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_cards_celebrity ON public.deal_cards(celebrity_id);
CREATE INDEX idx_deal_cards_sender ON public.deal_cards(sender_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_cards TO authenticated;
GRANT ALL ON public.deal_cards TO service_role;

ALTER TABLE public.deal_cards ENABLE ROW LEVEL SECURITY;

-- Sender can create offers as themselves
CREATE POLICY "Sender creates own deal cards"
ON public.deal_cards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Visibility: sender, the celebrity, or an active manager of that celebrity
CREATE POLICY "Parties can view deal cards"
ON public.deal_cards FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = celebrity_id
  OR active_manager_of(auth.uid(), celebrity_id)
);

-- Celebrity or active manager can update status (accept/decline/counter)
CREATE POLICY "Celebrity or manager updates deal cards"
ON public.deal_cards FOR UPDATE
TO authenticated
USING (auth.uid() = celebrity_id OR active_manager_of(auth.uid(), celebrity_id))
WITH CHECK (auth.uid() = celebrity_id OR active_manager_of(auth.uid(), celebrity_id));

-- Sender can delete their own pending offers
CREATE POLICY "Sender deletes own pending deal cards"
ON public.deal_cards FOR DELETE
TO authenticated
USING (auth.uid() = sender_id AND status = 'pending');

CREATE TRIGGER update_deal_cards_updated_at
BEFORE UPDATE ON public.deal_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set golden hour expiry automatically on insert when enabled
CREATE OR REPLACE FUNCTION public.set_golden_hour()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.golden_hour THEN
    NEW.golden_hour_expires_at := now() + interval '60 minutes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_cards_golden_hour
BEFORE INSERT ON public.deal_cards
FOR EACH ROW EXECUTE FUNCTION public.set_golden_hour();