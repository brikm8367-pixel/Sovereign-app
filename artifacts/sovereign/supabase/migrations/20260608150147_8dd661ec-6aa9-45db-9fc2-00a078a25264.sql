-- account type enum + column
CREATE TYPE public.account_type AS ENUM ('celebrity', 'sender');

ALTER TABLE public.profiles
  ADD COLUMN account_type public.account_type NOT NULL DEFAULT 'sender';

-- manager <-> celebrity links
CREATE TABLE public.manager_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (celebrity_id, manager_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_links TO authenticated;
GRANT ALL ON public.manager_links TO service_role;

ALTER TABLE public.manager_links ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_manager_links_updated_at
  BEFORE UPDATE ON public.manager_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- permission helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_celebrity(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND account_type = 'celebrity'
  );
$$;

CREATE OR REPLACE FUNCTION public.active_manager_of(_manager uuid, _celebrity uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manager_links
    WHERE manager_id = _manager
      AND celebrity_id = _celebrity
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_managed_celebrity(_uid uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT celebrity_id FROM public.manager_links
  WHERE manager_id = _uid AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- RLS for manager_links
CREATE POLICY "Celebrity manages own links"
ON public.manager_links FOR ALL
TO authenticated
USING (auth.uid() = celebrity_id)
WITH CHECK (auth.uid() = celebrity_id);

CREATE POLICY "Manager can view own links"
ON public.manager_links FOR SELECT
TO authenticated
USING (auth.uid() = manager_id);

CREATE POLICY "Manager can accept own link"
ON public.manager_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = manager_id);

-- Allow active manager to read the celebrity's Business (work) messages
CREATE POLICY "Manager reads celebrity business inbox"
ON public.messages FOR SELECT
TO authenticated
USING (
  category = 'work'
  AND public.active_manager_of(auth.uid(), receiver_id)
);