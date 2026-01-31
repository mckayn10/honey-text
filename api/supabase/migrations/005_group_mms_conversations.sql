-- Add Twilio Conversations fields for Group MMS
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS conversation_sid TEXT;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS participant_sid TEXT,
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- Optional: log inbound/outbound group messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  conversation_sid TEXT NOT NULL,
  participant_sid TEXT,
  author TEXT,
  body TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
