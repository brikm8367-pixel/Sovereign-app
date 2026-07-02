CREATE POLICY "Manager updates celebrity business inbox"
ON public.messages FOR UPDATE
TO authenticated
USING (category = 'work'::message_category AND active_manager_of(auth.uid(), receiver_id))
WITH CHECK (category = 'work'::message_category AND active_manager_of(auth.uid(), receiver_id));