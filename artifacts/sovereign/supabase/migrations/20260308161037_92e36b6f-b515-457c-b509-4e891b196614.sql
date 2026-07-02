DROP POLICY IF EXISTS "Public can view analysis of public profiles" ON public.weekly_analysis;

CREATE POLICY "Public can view analysis of public profiles"
ON public.weekly_analysis
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = weekly_analysis.user_id
    AND profiles.is_public = true
  )
);