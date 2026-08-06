-- Migration: agent_work_queue
-- Proposed in docs/AI_Agent_Contract/proposed-app-changes.md §"Proposed: agent_work_queue"
-- Separates durability (this table, transactional) from latency (NOTIFY, a hint).
-- Replaces the direct notify_agent() RPC call pattern with enqueue-then-notify,
-- fixing two problems documented in findings-from-repo-review.md:
--   P0-4: notify_agent had no REVOKE FROM PUBLIC (fixed separately, 20260803000001/2)
--   P1-3: device_sync_complete could mark a session completed and notify even when
--         drive insertion failed, with no durable record and no fallback if the
--         notification itself was lost mid-request
--
-- This table is the durable record. pg_notify becomes a pure hint — losing it
-- costs latency (picked up by the agent's backstop sweep), never correctness.

CREATE TABLE IF NOT EXISTS public.agent_work_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('routine','deep','dtc')),
  sync_session_id  uuid REFERENCES public.sync_sessions(id) ON DELETE SET NULL,
  dtc_id           uuid REFERENCES public.dtcs(id) ON DELETE SET NULL,
  state            text NOT NULL DEFAULT 'pending'
                     CHECK (state IN ('pending','claimed','done','failed')),
  attempts         int  NOT NULL DEFAULT 0,
  enqueued_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at       timestamptz,
  completed_at     timestamptz,
  last_error       text
);
COMMENT ON TABLE public.agent_work_queue IS
  'Durable work queue for the AI agent. pg_notify on agent_trigger is a latency hint only — this table is the source of truth for what needs analysis.';

-- The only hot query path: claiming the next pending job.
CREATE INDEX IF NOT EXISTS agent_work_queue_pending
  ON public.agent_work_queue (enqueued_at) WHERE state = 'pending';

-- Coalescing guard: at most one pending job per vehicle per kind. A vehicle
-- with 5 pending 'routine' jobs from 5 rapid syncs collapses to 1 via
-- ON CONFLICT DO NOTHING in the enqueue triggers (next migration).
CREATE UNIQUE INDEX IF NOT EXISTS agent_work_queue_dedupe
  ON public.agent_work_queue (vehicle_id, kind) WHERE state = 'pending';

ALTER TABLE public.agent_work_queue ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.agent_work_queue TO agent_role;

DROP POLICY IF EXISTS agent_select_work_queue ON public.agent_work_queue;
CREATE POLICY agent_select_work_queue ON public.agent_work_queue
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_update_work_queue ON public.agent_work_queue;
CREATE POLICY agent_update_work_queue ON public.agent_work_queue
  FOR UPDATE TO agent_role USING (true) WITH CHECK (true);

-- No policy grants INSERT to agent_role by design — only the enqueue triggers
-- (SECURITY DEFINER, locked to service_role/postgres) and pg_cron write rows.
-- The agent only ever reads and claims/completes, never creates its own work.
