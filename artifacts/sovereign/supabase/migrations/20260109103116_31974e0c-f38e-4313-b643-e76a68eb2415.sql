-- Create message category enum
CREATE TYPE public.message_category AS ENUM ('work', 'audience', 'direct');

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category message_category NOT NULL DEFAULT 'audience',
  subject TEXT,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message limits table (per category per user)
CREATE TABLE public.message_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  max_messages INTEGER DEFAULT 100,
  UNIQUE(user_id, category)
);

-- Create direct access list (who can send to Direct section)
CREATE TABLE public.direct_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, allowed_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_messages_receiver_category ON public.messages(receiver_id, category);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_parent ON public.messages(parent_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_access ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages (mark as read)"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own sent messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- RLS Policies for message_limits
CREATE POLICY "Users can view their own limits"
ON public.message_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can set their own limits"
ON public.message_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits"
ON public.message_limits FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for direct_access
CREATE POLICY "Users can view their own direct access list"
ON public.direct_access FOR SELECT
USING (auth.uid() = owner_id OR auth.uid() = allowed_user_id);

CREATE POLICY "Users can manage their own direct access list"
ON public.direct_access FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can remove from their direct access list"
ON public.direct_access FOR DELETE
USING (auth.uid() = owner_id);

-- Trigger for updated_at on messages
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to count messages in a category for a user
CREATE OR REPLACE FUNCTION public.get_message_count(
  _user_id UUID,
  _category message_category
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.messages
  WHERE receiver_id = _user_id AND category = _category;
$$;

-- Function to check if user can receive more messages in a category
CREATE OR REPLACE FUNCTION public.can_receive_message(
  _user_id UUID,
  _category message_category
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT get_message_count(_user_id, _category) < COALESCE(
      (SELECT max_messages FROM public.message_limits 
       WHERE user_id = _user_id AND category = _category),
      100
    )),
    true
  );
$$;

-- Function to check if user can send to Direct section
CREATE OR REPLACE FUNCTION public.can_send_to_direct(
  _sender_id UUID,
  _receiver_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_access
    WHERE owner_id = _receiver_id AND allowed_user_id = _sender_id
  );
$$;