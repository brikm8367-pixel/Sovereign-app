
-- Referral/Invite tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL,
  invitee_id UUID,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their referrals"
ON public.referrals FOR UPDATE
TO authenticated
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Add referral_code and referred_by to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Function to generate a unique referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.referral_code := LOWER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();

-- Function to reward inviter when invitee joins
CREATE OR REPLACE FUNCTION public.complete_referral(_invitee_id UUID, _invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter_id UUID;
BEGIN
  -- Find the referral
  SELECT inviter_id INTO _inviter_id
  FROM public.referrals
  WHERE invite_code = _invite_code AND status = 'pending';
  
  IF _inviter_id IS NULL THEN RETURN false; END IF;
  
  -- Update referral status
  UPDATE public.referrals 
  SET status = 'completed', invitee_id = _invitee_id, completed_at = NOW()
  WHERE invite_code = _invite_code;
  
  -- Update invitee's referred_by
  UPDATE public.profiles SET referred_by = _inviter_id WHERE id = _invitee_id;
  
  -- Reward: increase all inbox limits by 10 for the inviter
  INSERT INTO public.message_limits (user_id, category, max_messages)
  VALUES 
    (_inviter_id, 'work', 110),
    (_inviter_id, 'audience', 110),
    (_inviter_id, 'direct', 110)
  ON CONFLICT (user_id, category) 
  DO UPDATE SET max_messages = message_limits.max_messages + 10;
  
  RETURN true;
END;
$$;
