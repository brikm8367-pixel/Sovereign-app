
-- Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('❤️', '👍', '🔥', '😂', '👎')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view reactions on their messages" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id 
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Deleted messages tracking (for "delete for me")
CREATE TABLE public.deleted_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can soft-delete messages" ON public.deleted_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their deletions" ON public.deleted_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
