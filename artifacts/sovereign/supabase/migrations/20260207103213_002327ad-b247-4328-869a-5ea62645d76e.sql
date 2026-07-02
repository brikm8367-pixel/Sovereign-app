
-- Add is_sealed column to messages table for conversation sealing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_sealed boolean DEFAULT false;

-- Add index for faster conversation lookups (parent_id based threads)
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON public.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
