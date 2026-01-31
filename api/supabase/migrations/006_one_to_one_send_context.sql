-- Allow group_messages without a Conversation (one-to-one SMS mode)
ALTER TABLE public.group_messages
  ALTER COLUMN conversation_sid DROP NOT NULL;

-- Track which group we last sent a one-to-one SMS to for (twilio_number, recipient_phone)
-- so we can map inbound replies to the correct group and relay to other members
CREATE TABLE IF NOT EXISTS public.one_to_one_send_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  twilio_number TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_to_one_send_context_lookup
  ON public.one_to_one_send_context (twilio_number, recipient_phone, sent_at DESC);

COMMENT ON TABLE public.one_to_one_send_context IS 'Last group we sent one-to-one SMS to for (twilio_number, recipient_phone); used to route inbound SMS replies.';
