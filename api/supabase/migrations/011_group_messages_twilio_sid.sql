-- Dedupe messages synced from Twilio Conversations API vs webhook/cron inserts
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_messages_twilio_message_sid
  ON public.group_messages (twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;
