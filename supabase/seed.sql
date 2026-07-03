-- Caeorta dev seed data
-- WARNING: dev only — never run against prod

-- Test firmware versions
DELETE FROM public.firmware_versions WHERE version IN ('0.1.0', '0.1.1');
INSERT INTO public.firmware_versions (version, binary_url, checksum, release_notes, is_active, created_at)
VALUES
  ('0.1.0', 'https://placeholder.caeorta.com/firmware/0.1.0.bin', 'abc123def456', 'Initial pilot firmware', true, now()),
  ('0.1.1', 'https://placeholder.caeorta.com/firmware/0.1.1.bin', 'xyz789ghi012', 'Bug fixes', true, now());

-- Test devices
DELETE FROM public.devices WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
INSERT INTO public.devices (id, device_secret, status, hardware_revision, firmware_version, target_firmware_version, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CAEORTA-TEST-SECRET-0001', 'unclaimed', 'v1-esp32c3', '0.1.0', '0.1.0', now()),
  ('00000000-0000-0000-0000-000000000002', 'CAEORTA-TEST-SECRET-0002', 'unclaimed', 'v1-esp32c3', '0.1.0', '0.1.1', now());

-- App version
DELETE FROM public.app_versions WHERE version = '1.0.0';
INSERT INTO public.app_versions (version, platform, is_supported, force_update_below_this, release_notes, released_at)
VALUES
  ('1.0.0', 'android', true, false, 'Initial pilot release', now());

-- Test user (Sulaiman's account for local testing)
INSERT INTO public.users (id, display_name, locale)
VALUES ('63f09c52-c7e9-4ee1-8584-623b4cf27428', 'Sulaiman Shiyas', 'en')
ON CONFLICT (id) DO NOTHING;

-- Test vehicle linked to device 1
DELETE FROM public.vehicles WHERE id = '00000000-0000-0000-0000-000000000010';
INSERT INTO public.vehicles (id, owner_user_id, device_id, make, model, year, nickname, ecu_type)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '63f09c52-c7e9-4ee1-8584-623b4cf27428',
  '00000000-0000-0000-0000-000000000001',
  'Maruti', 'Swift', 2019, 'Test Swift', 'oem'
);

-- =========================================================================
-- Dev telemetry fixture — for the Week-4 drive-detail charts (App track).
-- One completed drive with dense telemetry on the seeded vehicle above, so the
-- Speed / Boost / Coolant charts render REAL data via get_drive_telemetry (the
-- app's first live Edge Function read). NOTE (cross-track): this block was added by
-- the App track for chart verification — Sulaiman owns supabase/, flagged in the PR.
-- The metric keys (speed_kph / boost_pressure_kpa / coolant_temp_c) are the SAME
-- provisional TODO(metric-keys) vocabulary the app uses; reconcile together.
-- =========================================================================
DELETE FROM public.telemetry     WHERE sync_session_id = '00000000-0000-0000-0000-000000000020';
DELETE FROM public.drives        WHERE id              = '00000000-0000-0000-0000-000000000030';
DELETE FROM public.sync_sessions WHERE id              = '00000000-0000-0000-0000-000000000020';

INSERT INTO public.sync_sessions (id, device_id, vehicle_id, started_at, completed_at, status, row_count)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  timestamptz '2026-06-25 09:00:00+00',
  timestamptz '2026-06-25 09:30:00+00',
  'completed', 361
);

INSERT INTO public.drives (
  id, vehicle_id, started_at, ended_at, distance_km, duration_seconds,
  average_speed_kph, peak_metrics, summary_metrics, sync_session_id, has_anomaly
) VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000010',
  timestamptz '2026-06-25 09:00:00+00',
  timestamptz '2026-06-25 09:30:00+00',
  22.4, 1800, 44.8,
  jsonb_build_object('rpm', 6480, 'speed_kph', 131, 'coolant_temp_c', 108.2, 'boost_pressure_kpa', 119, 'engine_load_pct', 94),
  jsonb_build_object('rpm', 2180, 'speed_kph', 44.8, 'coolant_temp_c', 96.0, 'boost_pressure_kpa', 22, 'engine_load_pct', 38),
  '00000000-0000-0000-0000-000000000020',
  true
);

-- 361 samples at 5 s spacing across the 30-min drive (> 300, so the function's
-- server-side downsampling path is exercised too). Coolant climbs from ~86 °C to a
-- ~108 °C peak — above the app's provisional 105 °C "hot" threshold — so the coolant
-- chart visibly trips severity/warning amber. Missing-vs-zero is also exercised: a few
-- early samples deliberately omit boost so the split helper skips (not zero-fills) them.
INSERT INTO public.telemetry (vehicle_id, sync_session_id, timestamp, metrics)
SELECT
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000020',
  timestamptz '2026-06-25 09:00:00+00' + (i * interval '5 seconds'),
  jsonb_strip_nulls(jsonb_build_object(
    'speed_kph',          round((60 + 55 * sin(i / 12.0))::numeric, 1),
    -- boost omitted (NULL → stripped) for the first 6 samples: honest "missing" data.
    'boost_pressure_kpa', CASE WHEN i < 6 THEN NULL
                               ELSE round((greatest(0, 55 + 60 * sin(i / 9.0)))::numeric, 1) END,
    'coolant_temp_c',     round((86 + 22 * (i / 360.0) * (1.0 + 0.15 * sin(i / 20.0)))::numeric, 1),
    'rpm',                round(2000 + 3500 * abs(sin(i / 12.0))),
    'engine_load_pct',    round((35 + 45 * abs(sin(i / 9.0)))::numeric, 0)
  ))
FROM generate_series(0, 360) AS g(i);
