CREATE TABLE public.manager_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_invitations_token ON public.manager_invitations(token);
CREATE INDEX idx_manager_invitations_celebrity ON public.manager_invitations(celebrity_id);

GRANT SELECT, UPDATE ON public.manager_invitations TO authenticated;
GRANT ALL ON public.manager_invitations TO service_role;

ALTER TABLE public.manager_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Celebrity can view own invitations"
ON public.manager_invitations FOR SELECT
TO authenticated
USING (auth.uid() = celebrity_id);

CREATE POLICY "Celebrity can revoke own invitations"
ON public.manager_invitations FOR UPDATE
TO authenticated
USING (auth.uid() = celebrity_id)
WITH CHECK (auth.uid() = celebrity_id);

CREATE TRIGGER update_manager_invitations_updated_at
BEFORE UPDATE ON public.manager_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_invitation(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT celebrity_id FROM public.manager_invitations
  WHERE upper(code) = upper(_code)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;