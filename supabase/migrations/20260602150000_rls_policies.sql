-- RLS policies for v1 tables. Source: docs/05_Database_Schema.md § RLS Philosophy.
--
-- Three actors:
--   1. authenticated user  — auth.uid() matches owner_user_id / id / user_id
--   2. service_role        — bypasses RLS (Edge Functions, AI agent later via agent_role)
--   3. device (JWT)        — short-lived JWT minted by mint_device_token; carries
--                            a top-level "device_id" claim. Accessed via
--                            auth.jwt() ->> 'device_id'.
--
-- The device JWT claim format ("device_id" as a top-level claim) is PROVISIONAL.
-- It is finalized in Week 2 when mint_device_token is built. If the claim name
-- changes there, every policy referencing auth.jwt() ->> 'device_id' in this
-- migration must be updated in a follow-up migration.
--
-- Skipped intentionally:
--   - agent_role (read-only Postgres role for AI agent ingestion) — separate
--     migration after the AI Agent Contract v0 lands.
--   - Community placeholders (posts, comments, groups, group_members, events,
--     event_attendees) get ENABLE ROW LEVEL SECURITY with NO policies in this
--     migration — service-role-only access (deny-all for authenticated/anon)
--     until v2 ships UI and corresponding policies additively.

-- =========================================================================
-- Auth + Identity
-- =========================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_no_direct_insert"
  ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own"
  ON public.user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_preferences_insert_own"
  ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences_update_own"
  ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================================================================
-- Device
-- =========================================================================

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_own"
  ON public.devices
  FOR SELECT TO authenticated
  USING (claimed_by_user_id = auth.uid());

-- Row-level only for now. Column restriction (only `status` realistically
-- owner-writable; device_secret / claimed_by_user_id / claimed_at / created_at
-- / last_seen_at / firmware_version / last_sync_at are not) is deferred to a
-- follow-up migration once mint_device_token and the Edge Function column-write
-- contract finalize in Week 2.
CREATE POLICY "devices_update_own"
  ON public.devices
  FOR UPDATE TO authenticated
  USING (claimed_by_user_id = auth.uid())
  WITH CHECK (claimed_by_user_id = auth.uid());

CREATE POLICY "devices_no_direct_insert"
  ON public.devices
  FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER TABLE public.device_wifi_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_wifi_credentials_select_owner"
  ON public.device_wifi_credentials
  FOR SELECT TO authenticated
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "device_wifi_credentials_insert_owner"
  ON public.device_wifi_credentials
  FOR INSERT TO authenticated
  WITH CHECK (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "device_wifi_credentials_update_owner"
  ON public.device_wifi_credentials
  FOR UPDATE TO authenticated
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "device_wifi_credentials_delete_owner"
  ON public.device_wifi_credentials
  FOR DELETE TO authenticated
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  );

ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_events_select_owner"
  ON public.device_events
  FOR SELECT TO authenticated
  USING (
    device_id IN (
      SELECT id FROM public.devices WHERE claimed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "device_events_insert_device"
  ON public.device_events
  FOR INSERT TO authenticated
  WITH CHECK (
    device_id::text = auth.jwt() ->> 'device_id'
  );

ALTER TABLE public.firmware_versions ENABLE ROW LEVEL SECURITY;

-- All authenticated users (including device JWTs) can read the firmware
-- catalog. INSERT/UPDATE/DELETE service-role-only.
CREATE POLICY "firmware_versions_select_all_auth"
  ON public.firmware_versions
  FOR SELECT TO authenticated
  USING (true);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_push_tokens_select_own"
  ON public.device_push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "device_push_tokens_insert_own"
  ON public.device_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_push_tokens_update_own"
  ON public.device_push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_push_tokens_delete_own"
  ON public.device_push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- Vehicle
-- =========================================================================

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_own"
  ON public.vehicles
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "vehicles_update_own"
  ON public.vehicles
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "vehicles_no_direct_insert"
  ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER TABLE public.vehicle_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_modifications_select_owner"
  ON public.vehicle_modifications
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_modifications_insert_owner"
  ON public.vehicle_modifications
  FOR INSERT TO authenticated
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_modifications_update_owner"
  ON public.vehicle_modifications
  FOR UPDATE TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_modifications_delete_owner"
  ON public.vehicle_modifications
  FOR DELETE TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

-- =========================================================================
-- Telemetry
-- =========================================================================

ALTER TABLE public.sync_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_sessions_select_owner"
  ON public.sync_sessions
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "sync_sessions_insert_device"
  ON public.sync_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

CREATE POLICY "sync_sessions_update_device"
  ON public.sync_sessions
  FOR UPDATE TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telemetry_select_owner"
  ON public.telemetry
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "telemetry_insert_device"
  ON public.telemetry
  FOR INSERT TO authenticated
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

ALTER TABLE public.current_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "current_state_select_owner"
  ON public.current_state
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

-- UPSERT path (INSERT ... ON CONFLICT DO UPDATE) requires BOTH INSERT WITH CHECK
-- and UPDATE USING + WITH CHECK to pass.
CREATE POLICY "current_state_insert_device"
  ON public.current_state
  FOR INSERT TO authenticated
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

CREATE POLICY "current_state_update_device"
  ON public.current_state
  FOR UPDATE TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

-- =========================================================================
-- Drives
-- =========================================================================

ALTER TABLE public.drives ENABLE ROW LEVEL SECURITY;

-- SELECT for vehicle owner. INSERT/UPDATE/DELETE service-role-only (drive
-- boundary detection runs in device_sync_complete Edge Function).
CREATE POLICY "drives_select_owner"
  ON public.drives
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

-- =========================================================================
-- Diagnostics
-- =========================================================================

ALTER TABLE public.dtcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dtcs_select_owner"
  ON public.dtcs
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "dtcs_insert_device"
  ON public.dtcs
  FOR INSERT TO authenticated
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM public.vehicles v
      JOIN public.devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );

-- Owner can UPDATE to clear a DTC. Column scope (cleared_at, cleared_by_user_id)
-- is application-layer; row-level RLS allows updating any column on owned rows.
CREATE POLICY "dtcs_update_owner"
  ON public.dtcs
  FOR UPDATE TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

ALTER TABLE public.diagnostic_outputs ENABLE ROW LEVEL SECURITY;

-- SELECT for vehicle owner. INSERT/UPDATE/DELETE service-role-only for now;
-- migrates to agent_role once AI Agent Contract v0 lands.
CREATE POLICY "diagnostic_outputs_select_owner"
  ON public.diagnostic_outputs
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

ALTER TABLE public.diagnostic_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostic_feedback_select_own"
  ON public.diagnostic_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "diagnostic_feedback_insert_own"
  ON public.diagnostic_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "diagnostic_feedback_update_own"
  ON public.diagnostic_feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "diagnostic_feedback_delete_own"
  ON public.diagnostic_feedback
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

-- SELECT for vehicle owner. UPSERT service-role-only for now; migrates to
-- agent_role with the AI Agent Contract v0 migration.
CREATE POLICY "agent_status_select_owner"
  ON public.agent_status
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE owner_user_id = auth.uid()
    )
  );

-- =========================================================================
-- Operational
-- =========================================================================

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_own"
  ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "feedback_insert_own"
  ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Both authenticated AND anon need to read the version gate (force-update
-- check fires before login).
CREATE POLICY "app_versions_select_public"
  ON public.app_versions
  FOR SELECT TO authenticated, anon
  USING (true);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- No policies. Service-role-only access. Append-only by design.

-- =========================================================================
-- Community placeholders — RLS ON, no policies (deny-all to non-service-role).
-- v2 will add SELECT/INSERT/UPDATE/DELETE policies additively when community
-- UI ships.
-- =========================================================================

ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
