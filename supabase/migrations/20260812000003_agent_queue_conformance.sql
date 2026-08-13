-- Migration: agent queue conformance with AI Agent Contract v0.3
--
-- AUTHORITY: docs/AI_Agent_Contract/ai-agent-contract.md §4 (the queue) and §12
-- (the conformance record). The contract is ratified (PR #56); §12 enumerates
-- where the schema shipped on 2026-08-04 diverges from it (PR #57). This
-- migration closes those divergences.
--
-- APPLIED MIGRATIONS ARE IMMUTABLE. 20260804000001, 20260804000002 and
-- 20260804000003 are applied and are NOT edited here -- not even their
-- comments. Editing an applied migration desyncs the file from every
-- environment's migration history and breaks `supabase db reset`
-- reproducibility. Every statement below is a NEW statement that SUPERSEDES
-- prior state; nothing here is a diff against those files.
--
-- Four items:
--   1. Claim index replaced so it actually serves the claim sort.
--   2. attempts semantics recorded as a column comment (no schema change).
--   3. Weekly deep cron rescheduled with a bounded active-vehicle predicate.
--   4. agent_role's read on vehicle_modifications revoked.
-- Plus a note on one piece of inert dead code, item 5.


-- ============================================================================
-- 1. Claim index -- replace so it serves the claim sort
-- ============================================================================
-- The claim sort is, per contract §4:
--     ORDER BY (kind <> 'routine'), enqueued_at
--
-- The shipped index, (enqueued_at) WHERE state='pending', CANNOT serve it:
-- Postgres reads the whole pending set and sorts it in memory. That is cheap
-- at pilot scale and quietly stops being cheap later, which is the worst shape
-- of performance bug.
--
-- A plain (kind, enqueued_at) index does NOT fix it either, and this is the
-- part that looks wrong until you check it: btree orders `kind` by text
-- collation -- 'deep', 'dtc', 'routine' -- putting routine LAST, which is the
-- opposite of the priority we want. And the planner will not derive an
-- ordering on the expression (kind <> 'routine') from an ordering on the
-- column kind; they are different sort keys as far as it is concerned.
--
-- Hence the expression index below. Note it uses `<>` and not `=`: for a
-- routine row the expression is false, false sorts before true, so routine
-- comes first with BOTH keys plain ascending and no DESC anywhere. Writing it
-- as (kind = 'routine') DESC would need a descending key and stop matching a
-- plain ascending index scan.
--
-- The `WHERE state='pending'` predicate must appear LITERALLY in the claim
-- query for this partial index to be matched by the planner.
--
-- The unique dedupe index (agent_work_queue_dedupe on (vehicle_id, kind)
-- WHERE state='pending') is correct as shipped and is deliberately untouched.
DROP INDEX IF EXISTS public.agent_work_queue_pending;

CREATE INDEX agent_work_queue_pending
  ON public.agent_work_queue ((kind <> 'routine'), enqueued_at)
  WHERE state = 'pending';


-- ============================================================================
-- 2. attempts semantics -- comment only, no schema change
-- ============================================================================
COMMENT ON COLUMN public.agent_work_queue.attempts IS
  'Counts FAILURES, not claims. The claim query increments it, so a job that yields the per-vehicle lock at a chunk boundary (contract §4) must decrement it on yield. Without that, a long deep run is retired by the 3-attempt retry cap (contract §10) without ever having failed. Decrement-on-yield is agent-side.';


-- ============================================================================
-- 3. Weekly deep cron -- bound the active-vehicle predicate
-- ============================================================================
-- The shipped predicate is `EXISTS (SELECT 1 FROM drives d WHERE
-- d.vehicle_id = v.id)` -- any drive EVER. That enqueues a weekly deep run for
-- every vehicle that has ever driven, permanently: a sold, parked or abandoned
-- car burns deep-analysis token budget every single week to restate last
-- month's conclusions, forever, with no mechanism that ever removes it.
--
-- 14 days rather than 7 for two reasons: a fortnight-gap driver should not drop
-- out of trend analysis mid-arc, and 14 > the 7-day deep cooldown (§4), so the
-- two windows cannot fight at the boundary -- with a 7-day predicate a vehicle
-- could become eligible and be cooled down in the same tick.
--
-- The predicate is served by the existing drives_vehicle_id_started_at_idx on
-- drives (vehicle_id, started_at DESC) from 20260602130000, so it costs an
-- index scan per vehicle rather than a table scan.
--
-- Everything else about the job is preserved EXACTLY as shipped: same job name,
-- same schedule string (contract §4 was amended to match the shipped 04:00 UTC
-- rather than churn a live job), same INSERT column list, same SELECT DISTINCT,
-- same ON CONFLICT DO NOTHING, same trailing pg_notify.

-- Unschedule guarded: cron.unschedule raises if the job name does not exist,
-- which would abort this migration on any environment where the 2026-08-04
-- cron never applied. 20260803000003 calls it bare; wrapped here so the file
-- is safe to apply to an environment that is not already carrying the job.
DO $do$
BEGIN
  PERFORM cron.unschedule('enqueue-weekly-deep-analysis');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job absent; nothing to unschedule
END $do$;

SELECT cron.schedule(
  'enqueue-weekly-deep-analysis',
  '0 4 * * 0',
  $$
  INSERT INTO public.agent_work_queue (vehicle_id, kind)
  SELECT DISTINCT v.id, 'deep'
  FROM public.vehicles v
  WHERE EXISTS (
    SELECT 1 FROM public.drives d
    WHERE d.vehicle_id = v.id
      AND d.started_at > now() - interval '14 days'
  )
  ON CONFLICT DO NOTHING;
  SELECT pg_notify('agent_trigger', '');
  $$
);


-- ============================================================================
-- 4. vehicle_modifications -- revoke the agent's read
-- ============================================================================
-- Contract §2: vehicle_modifications is empty and reserved for v2. The v1
-- vehicle-context signal is vehicles.ecu_type + vehicles.modifications, both
-- already granted.
--
-- Why revoking beats leaving a harmless grant in place: with the grant and
-- policy present, an agent that mistakenly reads this table in v1 gets ZERO
-- ROWS SILENTLY and concludes every car is stock. That is precisely the
-- failure mode 20260804000001's own header spends twenty lines warning about
-- ("the agent connects successfully, every query returns ZERO ROWS, and it
-- looks like 'the pilot cars have no telemetry' rather than an error").
-- Without the grant the same mistake raises a permission error and is found in
-- seconds instead of being mistaken for a fleet of stock cars.
--
-- Order matters: drop the policy first, then revoke. The policy is scoped TO
-- agent_role and becomes meaningless once the grant is gone, but leaving an
-- orphaned policy behind would misrepresent the agent's read surface to anyone
-- enumerating pg_policies -- which is the auditability the NOBYPASSRLS design
-- was chosen for in the first place.
DROP POLICY IF EXISTS agent_select_vehicle_modifications
  ON public.vehicle_modifications;

REVOKE SELECT ON public.vehicle_modifications FROM agent_role;


-- ============================================================================
-- 5. Dead grant in 20260804000001 -- recorded, deliberately NOT edited
-- ============================================================================
-- 20260804000001_create_agent_role.sql line ~119 carries, inside a comment
-- block, a commented-out:
--
--     GRANT UPDATE (has_anomaly) ON public.drives TO agent_role;
--
-- left there pending the ownership decision for drives.has_anomaly. That
-- decision is made: has_anomaly is APP-DERIVED via the trigger added in
-- 20260812000002 (PR #59), per contract §11, and the agent's write surface
-- stays diagnostic_outputs + agent_status. The commented grant is now
-- definitively dead.
--
-- It is deliberately NOT edited out. It is inert commented SQL -- it affects
-- no database, in any environment, ever -- and 20260804000001 is applied, so
-- editing it would break migration-history reproducibility for zero functional
-- benefit. THIS COMMENT IS THE RESOLUTION. Nothing further is owed on it, and
-- a future reader finding that block should read this note rather than
-- re-opening the question.
