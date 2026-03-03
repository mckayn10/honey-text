-- SMS accept: short code invitee replies with to join (phone + code verified)
ALTER TABLE public.group_invites
  ADD COLUMN IF NOT EXISTS accept_code TEXT NOT NULL DEFAULT '0000';

-- Backfill existing rows with a random 4-digit code so they can't be accepted with "0000"
UPDATE public.group_invites
SET accept_code = (1000 + floor(random() * 9000))::int::text
WHERE accept_code = '0000';

CREATE INDEX IF NOT EXISTS idx_group_invites_invitee_phone_status
  ON public.group_invites (invitee_phone, status)
  WHERE status = 'pending';

COMMENT ON COLUMN public.group_invites.accept_code IS 'Short code (e.g. 4 digits) sent in invite SMS; reply must contain this and come from invitee_phone.';
