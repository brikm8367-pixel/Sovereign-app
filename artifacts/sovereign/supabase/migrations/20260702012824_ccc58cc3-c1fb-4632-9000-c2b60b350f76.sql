-- Tighten blocked_content_log INSERT: users may only insert rows where they are the sender.
DROP POLICY IF EXISTS "System inserts blocked log" ON public.blocked_content_log;
CREATE POLICY "Users insert their own blocked log"
ON public.blocked_content_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);