-- Add status to groups: 'pending' (owner must reply YES to activate) or 'active'
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Constraint: only 'pending' or 'active' allowed
ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_status_check;
ALTER TABLE public.groups
  ADD CONSTRAINT groups_status_check CHECK (status IN ('pending', 'active'));

COMMENT ON COLUMN public.groups.status IS 'pending: owner must reply YES to activate. active: group receives messages.';
