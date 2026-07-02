
-- Fix weekly_analysis RLS: change RESTRICTIVE to PERMISSIVE so anon can view public profiles
DROP POLICY IF EXISTS "Public can view analysis of public profiles" ON public.weekly_analysis;
DROP POLICY IF EXISTS "Users can view own analysis" ON public.weekly_analysis;

CREATE POLICY "Public can view analysis of public profiles"
ON public.weekly_analysis FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = weekly_analysis.user_id AND profiles.is_public = true
));

CREATE POLICY "Users can view own analysis"
ON public.weekly_analysis FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
