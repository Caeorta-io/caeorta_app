-- Migration: agent enqueue triggers + weekly deep-analysis cron
-- Per proposed-app-changes.md §"Emit from a trigger, not the Edge Function".
--
-- Replaces the Edge Function's direct notify_agent() RPC call with three
-- trigger-based enqueue paths, all writing to agent_work_queue and firing one
-- shared pg_notify hint on the same 'agent_trigger' channel (channel name kept
-- unchanged per the proposal -- no reason to rename a working channel).
--
-- Why a trigger instead of the Edge Function calling notify_agent as its
-- "last step" (BUILD REQ §5's original design):
--   - Fires atomically WITH the status transition, in the same transaction.
--     Cannot be skipped, forgotten by a future code path, or fire on a commit
--     that later rolls back.
--   - Any other future writer of status='completed' (backfill, admin action,
--     a second sync path) automatically gets analysis too -- the Edge
--     Function's "last step" only fires when that exact code path runs.
--
-- This is also the structural fix for P1-3 (findings-from-repo-review.md):
-- device_sync_complete's failed-drive-insert case now sets status='failed',
-- not 'completed' (fixed already, 20260803000002-era work) -- and this
-- trigger only fires WHEN NEW.status = 'completed', so a failed sync
-- correctly enqueues nothing. No separate guard needed here; it falls out of
-- the WHEN clause.

-- ============================================================================
-- 1. Routine: enqueue on sync_sessions.status -> 'completed'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_agent_routine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.agent_work_queue (vehicle_id, kind, sync_session_id)
  VALUES (NEW.vehicle_id, 'routine', NEW.id)
  ON CONFLICT DO NOTHING;  -- coalesce per agent_work_queue_dedupe
  PERFORM pg_notify('agent_trigger', '');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_session_completed_enqueue ON public.sync_sessions;
CREATE TRIGGER sync_session_completed_enqueue
  AFTER UPDATE OF status ON public.sync_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.enqueue_agent_routine();

-- ============================================================================
-- 2. DTC: enqueue on a new active DTC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enqueue_agent_dtc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_active THEN
    INSERT INTO public.agent_work_queue (vehicle_id, kind, dtc_id)
    VALUES (NEW.vehicle_id, 'dtc', NEW.id)
    ON CONFLICT DO NOTHING;  -- coalesce per agent_work_queue_dedupe
    PERFORM pg_notify('agent_trigger', '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS dtc_active_enqueue ON public.dtcs;
CREATE TRIGGER dtc_active_enqueue
  AFTER INSERT ON public.dtcs
  FOR EACH ROW
  WHEN (NEW.is_active)
  EXECUTE FUNCTION public.enqueue_agent_dtc();

-- ============================================================================
-- 3. Deep: weekly per-vehicle enqueue via pg_cron
-- ============================================================================
-- Resolves ai-agent-contract.md [DECISION REQUIRED #2]: "v0.1/BUILD REQ promise
-- a weekly per-vehicle deep-analysis emitter from the app project. No such
-- pg_cron job exists... Decide: build the weekly deep enqueue, or cut deep
-- analysis from v1." Founder decision (Muhammed's session, 2026-08-02): build
-- it now. This job is that build.
--
-- Runs Sunday 4am UTC, one row per vehicle that has at least one drive (no
-- point analysing a vehicle with zero data). ON CONFLICT DO NOTHING means a
-- vehicle already carrying a pending 'deep' job (e.g. from a manual/backfill
-- enqueue) is silently skipped, not duplicated.
SELECT cron.schedule(
  'enqueue-weekly-deep-analysis',
  '0 4 * * 0',
  $$
  INSERT INTO public.agent_work_queue (vehicle_id, kind)
  SELECT DISTINCT v.id, 'deep'
  FROM public.vehicles v
  WHERE EXISTS (SELECT 1 FROM public.drives d WHERE d.vehicle_id = v.id)
  ON CONFLICT DO NOTHING;
  SELECT pg_notify('agent_trigger', '');
  $$
);
