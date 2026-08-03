-- ============================================================================
-- Migration: create_agent_role
-- Target repo: Caeorta-io/caeorta_app — supabase/migrations/
-- Proposed by: AI agent project (per BUILD REQUIREMENTS §14.2, §16, §17)
-- Verified against: docs/05_Database_Schema.md (v1)
-- ============================================================================
--
-- Creates the least-privilege Postgres role for the Caeorta AI agent service.
-- The agent connects DIRECTLY to Postgres (not PostgREST) because its primary
-- trigger is LISTEN/NOTIFY, which PostgREST cannot hold open. The same
-- connection serves reads, the backstop sweep, and the agent's writes.
--
-- Closes the schema doc's outstanding item (Testing §"Deferred until Week 2"):
--   "agent_role read-only verification: TODO until the AI Agent Contract v0
--    lands and the role is created in a follow-up migration."
--
-- NOTE on "read-only": that phrasing in the schema doc is loose. The agent is
-- read-only on context tables but MUST write diagnostic_outputs and
-- agent_status — those are its contract deliverables (contract §"What the
-- agent writes"). Grants below reflect that.
--
-- ============================================================================
-- WHY THE RLS SECTION IS LOAD-BEARING (read before trimming it)
-- ============================================================================
-- Per docs/05_Database_Schema.md, RLS is ENABLED ON ALL 26 TABLES (verified on
-- prod 2026-06-21). The three actors in the RLS philosophy section are:
-- authenticated user (auth.uid()), service role (bypasses RLS), device JWT
-- (device_id claim). agent_role is a FOURTH actor and matches none of them:
--
--   - It has no auth.uid()      -> every users_select_own_* policy fails
--   - It has no device_id claim -> every devices_insert_own_* policy fails
--   - It is NOBYPASSRLS         -> it does not get the service-role escape
--
-- Consequence if the policies below are omitted: the agent connects
-- successfully, every query returns ZERO ROWS, and it looks like "the pilot
-- cars have no telemetry" rather than an error. This fails silently. Every
-- read table therefore needs an explicit agent_role policy.
--
-- Granting NOBYPASSRLS + explicit policies (rather than making the agent a
-- service role) is deliberate: it keeps the agent's read surface auditable and
-- enumerable in pg_policies, instead of "it can see literally everything".
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Role
-- ----------------------------------------------------------------------------
-- Password intentionally NOT set here — never commit the secret. Set it
-- out-of-band after apply:
--     ALTER ROLE agent_role WITH PASSWORD '<from-1Password/Vault>';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_role') THEN
    CREATE ROLE agent_role WITH
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;

COMMENT ON ROLE agent_role IS
  'Caeorta AI agent service. Direct connection, least-privilege, NOBYPASSRLS. Reads diagnostic context; writes diagnostic_outputs + agent_status only.';

GRANT USAGE ON SCHEMA public TO agent_role;


-- ----------------------------------------------------------------------------
-- 2. Grants — reads
-- ----------------------------------------------------------------------------
-- Per contract §"What the agent reads".
GRANT SELECT ON
  public.telemetry,
  public.current_state,
  public.dtcs,
  public.drives,
  public.vehicles,
  public.sync_sessions,
  public.diagnostic_outputs,    -- continuity: its own prior outputs
  public.diagnostic_feedback    -- eval loop input
TO agent_role;

-- vehicle_modifications: contract + BUILD REQ §1 both list it, but the schema
-- doc states it is "Empty in v1; reserved for v2 community features". The
-- actual v1 modification signal lives on vehicles (ecu_type, modifications
-- jsonb), already granted above. Granting SELECT anyway is harmless and
-- forward-compatible; the agent must not depend on it in v1. See [Q-A].
GRANT SELECT ON public.vehicle_modifications TO agent_role;


-- ----------------------------------------------------------------------------
-- 3. Grants — writes
-- ----------------------------------------------------------------------------
-- diagnostic_outputs: INSERT only.
-- Schema doc: status is 'new' | 'seen' | 'dismissed' | 'actioned'; contract
-- says "status: 'new' // initial status; user actions update this". The APP
-- owns all status transitions. Agent never updates this table.
GRANT INSERT ON public.diagnostic_outputs TO agent_role;

-- agent_status: upserted (INSERT ... ON CONFLICT (vehicle_id) DO UPDATE).
GRANT SELECT, INSERT, UPDATE ON public.agent_status TO agent_role;

-- drives.has_anomaly is APP-DERIVED (cross-project decision, 2026-07-17): a
-- trigger sets it from diagnostic_outputs.severity. The agent does NOT write
-- it. Write surface stays diagnostic_outputs + agent_status only. No grant.


-- ----------------------------------------------------------------------------
-- 4. RLS policies for agent_role
-- ----------------------------------------------------------------------------
-- One SELECT policy per read table. USING (true) is correct here: the agent is
-- a trusted backend service analysing all pilot vehicles, not a user-scoped
-- actor. Scoping is enforced by the grant list (§2), not by row predicates.
--
-- Policies are additive in Postgres — these do NOT weaken existing
-- user/device/anon policies, because each is scoped TO agent_role. No other
-- role's visibility changes. (Schema doc "Promoting a migration to prod" step 4
-- asks this question explicitly: the answer is no behaviour change for any
-- currently-running query.)

DROP POLICY IF EXISTS agent_select_telemetry ON public.telemetry;
CREATE POLICY agent_select_telemetry ON public.telemetry
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_current_state ON public.current_state;
CREATE POLICY agent_select_current_state ON public.current_state
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_dtcs ON public.dtcs;
CREATE POLICY agent_select_dtcs ON public.dtcs
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_drives ON public.drives;
CREATE POLICY agent_select_drives ON public.drives
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_vehicles ON public.vehicles;
CREATE POLICY agent_select_vehicles ON public.vehicles
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_vehicle_modifications ON public.vehicle_modifications;
CREATE POLICY agent_select_vehicle_modifications ON public.vehicle_modifications
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_sync_sessions ON public.sync_sessions;
CREATE POLICY agent_select_sync_sessions ON public.sync_sessions
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_select_diagnostic_feedback ON public.diagnostic_feedback;
CREATE POLICY agent_select_diagnostic_feedback ON public.diagnostic_feedback
  FOR SELECT TO agent_role USING (true);

-- diagnostic_outputs: SELECT (continuity) + INSERT (new outputs), split
-- deliberately — no FOR ALL, since the role has no UPDATE/DELETE grant here.
DROP POLICY IF EXISTS agent_select_diagnostic_outputs ON public.diagnostic_outputs;
CREATE POLICY agent_select_diagnostic_outputs ON public.diagnostic_outputs
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_insert_diagnostic_outputs ON public.diagnostic_outputs;
CREATE POLICY agent_insert_diagnostic_outputs ON public.diagnostic_outputs
  FOR INSERT TO agent_role WITH CHECK (true);

-- agent_status: agent owns this table's rows entirely.
DROP POLICY IF EXISTS agent_select_agent_status ON public.agent_status;
CREATE POLICY agent_select_agent_status ON public.agent_status
  FOR SELECT TO agent_role USING (true);

DROP POLICY IF EXISTS agent_insert_agent_status ON public.agent_status;
CREATE POLICY agent_insert_agent_status ON public.agent_status
  FOR INSERT TO agent_role WITH CHECK (true);

DROP POLICY IF EXISTS agent_update_agent_status ON public.agent_status;
CREATE POLICY agent_update_agent_status ON public.agent_status
  FOR UPDATE TO agent_role USING (true) WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 5. Notes for the applying engineer
-- ----------------------------------------------------------------------------
-- CONNECTION MODE: the agent must connect in SESSION mode (Supavisor port
-- 5432), NOT transaction mode (6543). Transaction pooling multiplexes
-- connections and silently breaks LISTEN — the listener looks healthy and
-- receives nothing, forever. This is worth asserting in the end-to-end test
-- (BUILD REQ §14.3) rather than discovering during pilot.
--
-- NO SEQUENCE GRANTS NEEDED: every PK in the v1 schema is uuid (confirmed
-- against docs/05_Database_Schema.md). Previously tracked as OQ-3 — closed.
--
-- VERIFICATION (extends the schema doc's 12-step RLS suite; the doc's own
-- "agent_role read-only verification: TODO" item):
--   SET LOCAL ROLE agent_role;
--   SELECT count(*) FROM public.telemetry;   -- expect: > 0, NOT 0
--   SELECT count(*) FROM public.vehicles;    -- expect: 3 (fixtures)
--   INSERT INTO public.audit_log (action) VALUES ('nope');  -- expect: DENIED
--   RESET ROLE;
-- The first two are the important ones: 0 means the RLS policies above didn't
-- take, which is the silent-failure mode this migration exists to prevent.


-- ============================================================================
-- OPEN QUESTIONS — resolve before merge
-- ============================================================================
--  [Q-A] vehicle_modifications is empty/v2 per the schema doc, but BUILD REQ §1
--        and the contract both tell the agent to read it for car context. The
--        real v1 signal is vehicles.ecu_type + vehicles.modifications (jsonb).
--        Confirm the agent should use vehicles.* in v1 and treat
--        vehicle_modifications as v2-only. Docs should be corrected either way.
--
--  [Q-B] RESOLVED (cross-project decision 2026-07-17): drives.has_anomaly is
--        APP-DERIVED via trigger on diagnostic_outputs.severity. Agent does not
--        write it. Grant + policy removed above. Agent write surface remains
--        diagnostic_outputs + agent_status only.
--
--  [Q-C] RESOLVED by reading the repo: channel is 'agent_trigger', emitted by
--        the notify_agent() RPC (20260614000001), called by the
--        device_sync_complete Edge Function. Payload is
--        {session_id, vehicle_id, triggered_at} — note NO drive_ids, and the
--        key is session_id not sync_session_id. BUILD REQ §5's documented
--        payload was never built.
--        SECURITY: notify_agent is SECURITY DEFINER with no REVOKE, so any
--        authenticated user can call it via PostgREST RPC and trigger agent
--        runs on arbitrary vehicles. See findings-from-repo-review.md P0-4.
--
--  [Q-D] RESOLVED (cross-project decision 2026-07-17): app adds
--        referenced_telemetry_snapshot jsonb to diagnostic_outputs; the agent
--        copies cited samples inline at write time, so diagnostics survive the
--        30-day telemetry purge self-contained. App-side migration pending.
--
--  ALSO PENDING APP-SIDE (agent builds against these once landed on main):
--    - agent_work_queue + enqueue triggers (queue trigger design adopted)
--    - telemetry.drive_id + one-time backfill
--    - referenced_telemetry_snapshot jsonb on diagnostic_outputs
--    - weekly deep-analysis pg_cron job (enqueues kind='deep')
--    - notify_agent RPC dropped/replaced by the queue trigger
-- ============================================================================
