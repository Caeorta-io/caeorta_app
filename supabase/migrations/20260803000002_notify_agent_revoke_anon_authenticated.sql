-- Migration: complete the notify_agent lockdown
-- The previous migration (20260803000001) revoked from PUBLIC only.
-- Supabase grants EXECUTE to anon and authenticated by default at function
-- creation time via ALTER DEFAULT PRIVILEGES — these are separate grants
-- that survive a PUBLIC-only revoke. Verified via pg_proc.proacl after the
-- first migration: anon=X and authenticated=X were still present.

REVOKE EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) FROM authenticated;
