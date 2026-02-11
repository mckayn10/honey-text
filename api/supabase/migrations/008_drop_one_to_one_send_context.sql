-- Remove one-to-one SMS relay; we only use Group MMS (Conversation) now.
DROP INDEX IF EXISTS public.idx_one_to_one_send_context_lookup;
DROP TABLE IF EXISTS public.one_to_one_send_context;
