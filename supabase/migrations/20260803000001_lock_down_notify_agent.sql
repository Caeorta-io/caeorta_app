-- Migration: lock down notify_agent RPC
-- Fixes P0-4 from docs/AI_Agent_Contract/findings-from-repo-review.md:
-- SECURITY DEFINER function had no REVOKE FROM PUBLIC, so any authenticated
-- user could call it via PostgREST RPC and trigger agent runs on arbitrary
-- vehicles (unmetered LLM spend + junk diagnostic_outputs on other users' vehicles).

REVOKE EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) TO service_role;

-- Also pin search_path — SECURITY DEFINER without one is a standard Supabase
-- lint warning (mutable search_path is a privilege-escalation vector).
ALTER FUNCTION public.notify_agent(uuid, uuid) SET search_path = public, pg_temp;
