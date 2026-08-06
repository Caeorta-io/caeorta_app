-- Migration: retire notify_agent RPC
-- Per proposed-app-changes.md: "The queue design below fixes both structurally:
-- enqueue moves to a table trigger and the RPC can be dropped entirely."
--
-- notify_agent is now fully superseded by the trigger-based enqueue paths
-- added in 20260804000003 (sync_session_completed_enqueue, dtc_active_enqueue,
-- enqueue-weekly-deep-analysis). The last caller (device_sync_complete's
-- explicit RPC call) was removed the same session this migration ships in.
--
-- This is the structural fix for P0-4 (findings-from-repo-review.md), not
-- just the lockdown -- 20260803000001/000002 revoked EXECUTE from
-- PUBLIC/anon/authenticated as an immediate stopgap; this migration removes
-- the attack surface entirely by deleting the function.

DROP FUNCTION IF EXISTS public.notify_agent(uuid, uuid);
