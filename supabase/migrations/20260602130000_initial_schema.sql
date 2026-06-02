-- Initial v1 schema. Source of truth: docs/05_Database_Schema.md.
-- RLS policies, agent_role, pg_cron jobs, retention DELETEs are SEPARATE migrations.
-- Postgres 13+ — gen_random_uuid() is built-in, no extension needed for it.

-- =========================================================================
-- Shared trigger: BEFORE UPDATE sets updated_at = now()
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- Auth + Identity
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone        text,
  locale       text NOT NULL DEFAULT 'en',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Extends Supabase auth.users with profile data.';

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  notification_severity_threshold text NOT NULL DEFAULT 'warning'
    CHECK (notification_severity_threshold IN ('info','warning','critical')),
  quiet_hours_start               time,
  quiet_hours_end                 time,
  timezone                        text NOT NULL DEFAULT 'UTC',
  units_preference                jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at                      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.user_preferences IS 'Per-user app settings.';

CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- Device
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.devices (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_secret            text NOT NULL UNIQUE,
  claimed_by_user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  claimed_at               timestamptz,
  last_seen_at             timestamptz,
  firmware_version         text,
  target_firmware_version  text,
  last_sync_at             timestamptz,
  hardware_revision        text,
  status                   text NOT NULL DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed','active','disabled','lost')),
  created_at               timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.devices IS 'The physical OBD-II dongles.';

CREATE INDEX IF NOT EXISTS devices_claimed_by_user_id_idx
  ON public.devices (claimed_by_user_id);

CREATE TABLE IF NOT EXISTS public.device_wifi_credentials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  ssid                text NOT NULL,
  encrypted_password  text NOT NULL,
  priority            int NOT NULL DEFAULT 0,
  added_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.device_wifi_credentials IS 'Stored Wi-Fi networks per device. Multiple allowed; device picks one available.';

CREATE TABLE IF NOT EXISTS public.device_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  timestamp   timestamptz NOT NULL DEFAULT now(),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb
);
COMMENT ON TABLE public.device_events IS 'Append-only log of device actions for debugging.';

CREATE INDEX IF NOT EXISTS device_events_device_id_timestamp_idx
  ON public.device_events (device_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.firmware_versions (
  version        text PRIMARY KEY,
  binary_url     text NOT NULL,
  checksum       text NOT NULL,
  release_notes  text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.firmware_versions IS 'Available firmware versions for OTA.';

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token         text NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('ios','android')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  UNIQUE (user_id, token)
);
COMMENT ON TABLE public.device_push_tokens IS 'Expo push tokens per user device (phone), not Caeorta device.';

-- =========================================================================
-- Vehicle
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.vehicles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id      uuid REFERENCES public.devices(id) ON DELETE RESTRICT,
  make           text,
  model          text,
  year           int,
  vin            text,
  nickname       text,
  ecu_type       text CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other')),
  modifications  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vehicles IS 'A car owned by a user, paired with a device.';

CREATE TABLE IF NOT EXISTS public.vehicle_modifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vehicle_modifications IS 'Empty in v1; reserved for v2 community features (itemized mod tracking).';

-- =========================================================================
-- Telemetry
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.sync_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','streaming','completed','failed')),
  bytes_uploaded  bigint NOT NULL DEFAULT 0,
  row_count       int NOT NULL DEFAULT 0,
  error_message   text
);
COMMENT ON TABLE public.sync_sessions IS 'A single sync attempt from device to cloud.';

CREATE INDEX IF NOT EXISTS sync_sessions_device_id_started_at_idx
  ON public.sync_sessions (device_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.telemetry (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sync_session_id  uuid REFERENCES public.sync_sessions(id) ON DELETE SET NULL,
  timestamp        timestamptz NOT NULL,
  metrics          jsonb NOT NULL DEFAULT '{}'::jsonb
);
COMMENT ON TABLE public.telemetry IS 'Raw OBD data. The heavy table.';

CREATE INDEX IF NOT EXISTS telemetry_vehicle_id_timestamp_idx
  ON public.telemetry (vehicle_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.current_state (
  vehicle_id      uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  latest_metrics  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.current_state IS 'Single row per vehicle. Upserted by device during live mode.';

CREATE TRIGGER current_state_set_updated_at
  BEFORE UPDATE ON public.current_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- Drives  (created before diagnostic_outputs — referenced by FK)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.drives (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  started_at          timestamptz NOT NULL,
  ended_at            timestamptz,
  distance_km         numeric,
  duration_seconds    int,
  average_speed_kph   numeric,
  peak_metrics        jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_metrics     jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_session_id     uuid REFERENCES public.sync_sessions(id) ON DELETE SET NULL,
  has_anomaly         boolean NOT NULL DEFAULT false
);
COMMENT ON TABLE public.drives IS 'The unit of analysis. Drive = ignition-on to ignition-off period.';

CREATE INDEX IF NOT EXISTS drives_vehicle_id_started_at_idx
  ON public.drives (vehicle_id, started_at DESC);

-- =========================================================================
-- Diagnostics
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.dtcs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sync_session_id     uuid REFERENCES public.sync_sessions(id) ON DELETE SET NULL,
  code                text NOT NULL,
  description         text,
  severity_raw        text,
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true,
  cleared_at          timestamptz,
  cleared_by_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.dtcs IS 'Diagnostic Trouble Codes from the ECU.';

CREATE INDEX IF NOT EXISTS dtcs_vehicle_id_is_active_last_seen_at_idx
  ON public.dtcs (vehicle_id, is_active, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.diagnostic_outputs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id               uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  agent_version            text NOT NULL,
  generated_at             timestamptz NOT NULL DEFAULT now(),
  severity                 text NOT NULL CHECK (severity IN ('info','warning','critical')),
  urgency                  text NOT NULL CHECK (urgency IN ('now','soon','monitor')),
  category                 text NOT NULL CHECK (category IN
                            ('engine','fuel','cooling','transmission','electrical','turbo','insufficient_data','other')),
  title                    text NOT NULL,
  summary                  text NOT NULL,
  explanation              text NOT NULL,
  recommended_action       text,
  confidence               numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  referenced_telemetry_ids uuid[] NOT NULL DEFAULT '{}',
  referenced_dtc_ids       uuid[] NOT NULL DEFAULT '{}',
  referenced_drive_id      uuid REFERENCES public.drives(id) ON DELETE SET NULL,
  status                   text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','seen','dismissed','actioned'))
);
COMMENT ON TABLE public.diagnostic_outputs IS 'The contract table with the AI agent project. AI agent writes here; app reads.';

CREATE INDEX IF NOT EXISTS diagnostic_outputs_vehicle_id_generated_at_idx
  ON public.diagnostic_outputs (vehicle_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS diagnostic_outputs_vehicle_id_status_idx
  ON public.diagnostic_outputs (vehicle_id, status);

CREATE TABLE IF NOT EXISTS public.diagnostic_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  uuid NOT NULL REFERENCES public.diagnostic_outputs(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rating         text NOT NULL CHECK (rating IN ('up','down')),
  comment        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.diagnostic_feedback IS 'User''s thumbs up/down on diagnostic outputs. Critical for the AI agent project''s eval loop.';

CREATE TABLE IF NOT EXISTS public.agent_status (
  vehicle_id     uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle','analyzing','error','rate_limited')),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_run_at    timestamptz,
  error_message  text
);
COMMENT ON TABLE public.agent_status IS 'Per-vehicle status of the AI agent. App subscribes to this for "analyzing your drive" UI.';

CREATE TRIGGER agent_status_set_updated_at
  BEFORE UPDATE ON public.agent_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- Community placeholders — empty in v1; minimum identity + FKs only.
-- v2 will add domain columns via additive migrations (non-destructive).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.posts IS 'Community placeholder (empty in v1; schema-ready for v2).';

CREATE TABLE IF NOT EXISTS public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.comments IS 'Community placeholder (empty in v1; schema-ready for v2).';

CREATE TABLE IF NOT EXISTS public.groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.groups IS 'Community placeholder (empty in v1; schema-ready for v2).';

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id   uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
COMMENT ON TABLE public.group_members IS 'Community placeholder (empty in v1; schema-ready for v2).';

CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.events IS 'Community placeholder (empty in v1; schema-ready for v2).';

CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
COMMENT ON TABLE public.event_attendees IS 'Community placeholder (empty in v1; schema-ready for v2).';

-- =========================================================================
-- Operational
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type IN ('bug','feature','other')),
  message      text NOT NULL,
  app_version  text,
  device_info  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.feedback IS 'General user feedback / bug reports.';

CREATE TABLE IF NOT EXISTS public.app_versions (
  version                  text NOT NULL,
  platform                 text NOT NULL CHECK (platform IN ('ios','android')),
  is_supported             boolean NOT NULL DEFAULT true,
  force_update_below_this  boolean NOT NULL DEFAULT false,
  release_notes            text,
  released_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version, platform)
);
COMMENT ON TABLE public.app_versions IS 'Version gating. App queries on launch to check if forced update needed.';

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  target_type     text,
  target_id       uuid,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.audit_log IS 'Append-only log of sensitive operations.';
