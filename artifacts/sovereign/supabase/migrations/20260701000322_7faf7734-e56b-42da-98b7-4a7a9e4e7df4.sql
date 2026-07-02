-- 1) Close the privilege-escalation hole: drop the client INSERT policy that let
--    any authenticated user insert a manager_link for themselves against ANY celebrity.
--    Manager links are now created ONLY server-side (redeem edge function via service_role)
--    or by the celebrity themselves (existing "Celebrity manages own links" ALL policy).
DROP POLICY IF EXISTS "Manager can accept own link" ON public.manager_links;

-- 2) Track failed redemption attempts to allow lockout of brute-forced invites.
ALTER TABLE public.manager_invitations
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;