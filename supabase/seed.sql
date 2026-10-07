-- Caeorta dev seed data
-- WARNING: dev only — never run against prod
--
-- This file runs AUTOMATICALLY on `supabase db reset` (supabase/config.toml
-- [db.seed].sql_paths), after every migration has applied. It holds local/dev
-- FIXTURES ONLY — never apply it to prod.
--
-- public.users.id REFERENCES auth.users(id) (20260602130000_initial_schema.sql),
-- so the auth.users rows MUST be inserted before the public.users rows. A fresh
-- local stack has an empty auth.users, and without them the whole seed aborts on
-- users_id_fkey (SQLSTATE 23503) before any fixture below lands.
--
-- LOCAL ONLY. Never `db push` / run this against caeorta-dev or prod: it carries
-- a second fixture auth account, fixture diagnostics and ~5,400 telemetry rows.
--
-- THE LARGE DRIVES EXIST TO DEFEAT ROW-COUNT CAPS. Session 49 found two defects
-- that only appear past ~1000 telemetry rows — PostgREST's max_rows = 1000
-- silently truncating the device_sync_complete fetch, and the drive_id backfill
-- failing with "URI too long" — and neither could be caught by the 361-row
-- fixture. Sessions …0021 / …0022 carry 2,520 rows each (42 min at 1 Hz), well
-- past the cap so a regression fails loudly instead of squeaking past. Do not
-- shrink them.
--
-- Fixture map (ids are referenced by number from docs and other sessions — never
-- renumber; add new ones in the same band):
--   users      63f09c52-… (user 1, pilot1@example.test) · …0102 (user 2)
--   devices    …0001–…0005   (create_vehicle branch per device: see Devices)
--   vehicles   …0010 (user 1) · …0011 (user 2)
--   sessions   …0020 (361 rows, completed) · …0021 (2,520, completed)
--              …0022 (2,520, STREAMING — unprocessed, for device_sync_complete)
--   drives     …0030 (anomaly) · …0031 (clean, flip target) · …0032 (large)
--   dtcs       …0040–…0044 · diagnostic_outputs …0050–…0052
--   diagnostic_feedback …0060–…0062

-- =========================================================================
-- Teardown — delete existing fixture rows before re-inserting, so this seed
-- is safe to re-run (docs/05_Database_Schema.md § Test fixtures).
--
-- Order matters: rows are deleted child → parent, the REVERSE of the INSERT
-- order below. In particular vehicles.device_id REFERENCES devices(id)
-- ON DELETE RESTRICT (20260602130000_initial_schema.sql), so devices must be
-- deleted AFTER the vehicle that references it — otherwise the second apply
-- fails with:
--   ERROR: update or delete on table "devices" violates RESTRICT setting of
--   foreign key constraint "vehicles_device_id_fkey" on table "vehicles"
-- (vehicles.device_id is the only ON DELETE RESTRICT FK among the seeded
-- tables; every other relationship here is CASCADE or SET NULL, but they are
-- ordered child-first here too so the teardown stays correct if that changes.)
-- =========================================================================
DELETE FROM public.diagnostic_feedback WHERE id IN (
  '00000000-0000-0000-0000-000000000060',
  '00000000-0000-0000-0000-000000000061',
  '00000000-0000-0000-0000-000000000062'
);
DELETE FROM public.diagnostic_outputs WHERE id IN (
  '00000000-0000-0000-0000-000000000050',
  '00000000-0000-0000-0000-000000000051',
  '00000000-0000-0000-0000-000000000052'
);
-- By vehicle, not by id: the queue rows are trigger-generated (dtc_active_enqueue
-- on the dtcs inserts below; sync_session_completed_enqueue when a test completes
-- …0022), so their ids are random.
DELETE FROM public.agent_work_queue WHERE vehicle_id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
);
DELETE FROM public.dtcs WHERE id IN (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000042',
  '00000000-0000-0000-0000-000000000043',
  '00000000-0000-0000-0000-000000000044'
);
DELETE FROM public.current_state WHERE vehicle_id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
);
DELETE FROM public.telemetry     WHERE sync_session_id IN (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
-- The sync_session_id arm catches the drive(s) device_sync_complete creates (with
-- random ids) when a test runs it against the unprocessed session …0022.
DELETE FROM public.drives        WHERE id IN (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000032'
) OR sync_session_id IN (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
DELETE FROM public.sync_sessions WHERE id IN (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
-- The device_id arm catches a vehicle a test created through create_vehicle on a
-- fixture device (e.g. the happy path on …0003). Without it, the devices DELETE
-- below hits vehicles_device_id_fkey (ON DELETE RESTRICT) on the next re-seed.
DELETE FROM public.vehicles WHERE id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
) OR device_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
DELETE FROM public.devices WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
DELETE FROM public.firmware_versions WHERE version IN ('0.1.0', '0.1.1');
DELETE FROM public.app_versions WHERE version = '1.0.0';

-- Test firmware versions
INSERT INTO public.firmware_versions (version, binary_url, checksum, release_notes, is_active, created_at)
VALUES
  ('0.1.0', 'https://placeholder.caeorta.com/firmware/0.1.0.bin', 'abc123def456', 'Initial pilot firmware', true, now()),
  ('0.1.1', 'https://placeholder.caeorta.com/firmware/0.1.1.bin', 'xyz789ghi012', 'Bug fixes', true, now());

-- =========================================================================
-- Devices (unclaimed). The claimed devices …0003–…0005 are inserted further
-- down, after public.users, because claimed_by_user_id REFERENCES users(id).
--   …0001  unclaimed, yet holds vehicle …0010 — a pre-existing inconsistency
--          kept as-is (fixture semantics are frozen). mint_device_token needs
--          status = 'active', so no device token can be minted for it.
--   …0002  unclaimed, free — pair_device happy path. Via create_vehicle it
--          returns not_device_owner (NULL owner ≠ caller), NOT
--          device_not_claimed: that code is returned only for an id that
--          does not exist.
-- =========================================================================
INSERT INTO public.devices (id, device_secret, status, hardware_revision, firmware_version, target_firmware_version, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CAEORTA-TEST-SECRET-0001', 'unclaimed', 'v1-esp32c3', '0.1.0', '0.1.0', now()),
  ('00000000-0000-0000-0000-000000000002', 'CAEORTA-TEST-SECRET-0002', 'unclaimed', 'v1-esp32c3', '0.1.0', '0.1.1', now());

-- App version
INSERT INTO public.app_versions (version, platform, is_supported, force_update_below_this, release_notes, released_at)
VALUES
  ('1.0.0', 'android', true, false, 'Initial pilot release', now());

-- Test auth user — LOCAL/DEV FIXTURE ONLY. Must never be seeded into prod.
-- Same uuid as the public.users row below (and every vehicle/drive keyed off it);
-- do not renumber. On caeorta-dev this uuid is already a real auth account, so
-- ON CONFLICT (id) DO NOTHING leaves it untouched there — this row only lands on a
-- fresh local stack. Deliberately NOT in the teardown above: deleting it would
-- CASCADE through public.users on dev.
-- encrypted_password is a NON-SECRET placeholder: bcrypt of the literal string
-- 'local-fixture-not-a-secret'. The token columns are '' rather than NULL because
-- gotrue fails to load a user whose token columns are NULL.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '63f09c52-c7e9-4ee1-8584-623b4cf27428',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'pilot1@example.test',
  '$2a$10$55onI4mRSZbz/yMV/qYYkuSZRnFUDfyTb3hesZ61sfC3OM3VbRrU.',
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- Test user (Sulaiman's account for local testing)
INSERT INTO public.users (id, display_name, locale)
VALUES ('63f09c52-c7e9-4ee1-8584-623b4cf27428', 'Sulaiman Shiyas', 'en')
ON CONFLICT (id) DO NOTHING;

-- Test vehicle linked to device 1
INSERT INTO public.vehicles (id, owner_user_id, device_id, make, model, year, nickname, ecu_type)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '63f09c52-c7e9-4ee1-8584-623b4cf27428',
  '00000000-0000-0000-0000-000000000001',
  'Maruti', 'Swift', 2019, 'Test Swift', 'oem'
);

-- =========================================================================
-- User 2 — LOCAL/DEV FIXTURE ONLY. Exists so not_device_owner and cross-user
-- RLS are testable without hand-building (and cleaning up) a second account.
-- Same pattern and same NON-SECRET placeholder hash as user 1 above; same
-- reasons for '' token columns, ON CONFLICT DO NOTHING, and staying out of the
-- teardown.
-- =========================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'pilot2@example.test',
  '$2a$10$55onI4mRSZbz/yMV/qYYkuSZRnFUDfyTb3hesZ61sfC3OM3VbRrU.',
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, display_name, locale)
VALUES ('00000000-0000-0000-0000-000000000102', 'Pilot Two (fixture)', 'en')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- Devices (claimed) — one per create_vehicle branch. Check order in
-- create_vehicle/index.ts: exists → owner → active → no existing vehicle.
--   …0003  user 1, active, FREE         → 201 as user 1 · not_device_owner as user 2
--   …0004  user 1, disabled (claimed,   → device_not_active as user 1
--          not active)
--   …0005  user 2, active, HOLDS …0011  → duplicate_vehicle as user 2 ·
--                                         not_device_owner as user 1.
--          Also the device the unprocessed session …0022 belongs to, so a
--          device token can be minted for the device_sync_complete test.
-- =========================================================================
INSERT INTO public.devices (id, device_secret, claimed_by_user_id, claimed_at, status, hardware_revision, firmware_version, target_firmware_version, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'CAEORTA-TEST-SECRET-0003', '63f09c52-c7e9-4ee1-8584-623b4cf27428',
   timestamptz '2026-06-20 10:00:00+00', 'active',   'v1-esp32c3', '0.1.1', '0.1.1', now()),
  ('00000000-0000-0000-0000-000000000004', 'CAEORTA-TEST-SECRET-0004', '63f09c52-c7e9-4ee1-8584-623b4cf27428',
   timestamptz '2026-06-20 10:05:00+00', 'disabled', 'v1-esp32c3', '0.1.0', '0.1.1', now()),
  ('00000000-0000-0000-0000-000000000005', 'CAEORTA-TEST-SECRET-0005', '00000000-0000-0000-0000-000000000102',
   timestamptz '2026-06-21 08:00:00+00', 'active',   'v1-esp32c3', '0.1.1', '0.1.1', now());

-- User 2's vehicle, on its own active device …0005.
INSERT INTO public.vehicles (id, owner_user_id, device_id, make, model, year, nickname, ecu_type)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000005',
  'Hyundai', 'i20 N Line', 2022, 'Fixture i20', 'oem'
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

-- A second, clean drive (has_anomaly = false) on the same vehicle — the fixture the
-- has_anomaly trigger test (20260812000002) needs: inserting a warning/critical
-- drive-scoped diagnostic_outputs row against it must flip the flag to true. No
-- telemetry or sync session; it exists only to be flipped.
INSERT INTO public.drives (
  id, vehicle_id, started_at, ended_at, distance_km, duration_seconds,
  average_speed_kph, has_anomaly
) VALUES (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000010',
  timestamptz '2026-06-26 18:00:00+00',
  timestamptz '2026-06-26 18:20:00+00',
  11.0, 1200, 33.0,
  false
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

-- =========================================================================
-- Large drives — realistic length, 2,520 samples each at 1 Hz (42 min).
-- See the header: these exist to defeat row-count caps. Two copies of the SAME
-- generated profile, in two different states:
--
--   …0021  COMPLETED, already processed: drive …0032 exists and every telemetry
--          row carries drive_id = …0032 (what device_sync_complete leaves
--          behind). Exercises the READ side at volume — get_drive_telemetry,
--          agent reads.
--   …0022  STREAMING, unprocessed: telemetry only, no drive, drive_id NULL —
--          the state device_sync_chunk leaves before the device calls
--          device_sync_complete. Running the function against it (device
--          …0005, user 2's vehicle …0011) is the regression test for the
--          1000-row fetch cap and the drive_id backfill URI length. The
--          function returns early on a 'completed' session, so this one must
--          stay 'streaming' in the seed.
-- =========================================================================
INSERT INTO public.sync_sessions (id, device_id, vehicle_id, started_at, completed_at, status, row_count)
VALUES
  ('00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   timestamptz '2026-06-27 07:00:00+00', timestamptz '2026-06-27 07:43:00+00',
   'completed', 2520),
  ('00000000-0000-0000-0000-000000000022',
   '00000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000011',
   timestamptz '2026-06-28 07:00:00+00', NULL,
   'streaming', 2520);

-- distance_km, average_speed_kph and peak_metrics are deliberately NULL / '{}':
-- they are computed by device_sync_complete, and seeding plausible-looking
-- computed values would mask a regression in that computation. (All three
-- columns allow it — distance_km and average_speed_kph are nullable,
-- peak_metrics is NOT NULL DEFAULT '{}'.) duration_seconds is a plain fact of
-- the timestamps, so it is seeded.
INSERT INTO public.drives (
  id, vehicle_id, started_at, ended_at, distance_km, duration_seconds,
  average_speed_kph, peak_metrics, summary_metrics, sync_session_id, has_anomaly
) VALUES (
  '00000000-0000-0000-0000-000000000032',
  '00000000-0000-0000-0000-000000000010',
  timestamptz '2026-06-27 07:00:00+00',
  timestamptz '2026-06-27 07:41:59+00',
  NULL, 2519, NULL,
  '{}'::jsonb, '{}'::jsonb,
  '00000000-0000-0000-0000-000000000021',
  false
);

-- The drive profile, second t = 0..2519. Each phase is chosen to hit a case the
-- consumers must handle:
--   0–119      cold-start idle: speed 0, coolant from ~24 °C, rpm falling from a
--              fast idle, boost NEGATIVE (manifold vacuum, ≈ −68 kPa). A peak
--              computation seeded with 0 instead of the first sample reports
--              0 instead of the true value here.
--   120–1499   city: stop-and-go speed 0–60 kph, boost swinging either side
--              of zero.
--   1500–1799  speed_kph ABSENT (key stripped, not 0) for 300 samples, other
--              metrics present. distance_km must skip it, not integrate a zero.
--              Timestamps stay contiguous, so this is NOT a drive split
--              (DRIVE_GAP_MS is 5 min of timestamp gap, not of missing keys).
--   1800–2399  highway 80–118 kph, with a wide-open-throttle pull at
--              2100–2129 (boost to ~120 kPa, rpm to ~6,100).
--   2400–2519  coast down to a stop, idle; boost back into vacuum.
INSERT INTO public.telemetry (vehicle_id, sync_session_id, drive_id, timestamp, metrics)
SELECT
  d.vehicle_id,
  d.sync_session_id,
  d.drive_id,
  d.started_at + g.t * interval '1 second',
  jsonb_strip_nulls(jsonb_build_object(
    'speed_kph',          round(s.speed::numeric, 1),
    'rpm',                round(m.rpm::numeric),
    'coolant_temp_c',     round(m.coolant::numeric, 1),
    'boost_pressure_kpa', round(m.boost::numeric, 1),
    'engine_load_pct',    round(least(100, greatest(0, m.load))::numeric, 0)
  ))
FROM (VALUES
  ('00000000-0000-0000-0000-000000000010'::uuid,
   '00000000-0000-0000-0000-000000000021'::uuid,
   '00000000-0000-0000-0000-000000000032'::uuid,
   timestamptz '2026-06-27 07:00:00+00'),
  ('00000000-0000-0000-0000-000000000011'::uuid,
   '00000000-0000-0000-0000-000000000022'::uuid,
   NULL::uuid,
   timestamptz '2026-06-28 07:00:00+00')
) AS d(vehicle_id, sync_session_id, drive_id, started_at)
CROSS JOIN generate_series(0, 2519) AS g(t)
CROSS JOIN LATERAL (SELECT CASE
    WHEN g.t < 120  THEN 'warmup'
    WHEN g.t < 1500 THEN 'city'
    WHEN g.t < 1800 THEN 'no_speed'
    WHEN g.t < 2400 THEN 'highway'
    ELSE 'arrive'
  END AS phase) p
CROSS JOIN LATERAL (SELECT (CASE p.phase
    WHEN 'warmup'   THEN 0.0
    WHEN 'city'     THEN greatest(0.0, 28 + 32 * sin((g.t - 120) / 40.0))
    WHEN 'no_speed' THEN NULL   -- absent, stripped from the jsonb
    WHEN 'highway'  THEN 98 + 14 * sin((g.t - 1800) / 55.0) + 6 * sin((g.t - 1800) / 13.0)
    ELSE greatest(0.0, 98 * (1 - (g.t - 2400) / 90.0))
  END)::double precision AS speed) s
CROSS JOIN LATERAL (SELECT
  (CASE p.phase
    WHEN 'warmup'   THEN 1250 - 400 * (g.t / 120.0)
    WHEN 'city'     THEN 800 + s.speed * 38 + 150 * sin(g.t / 7.0)
    WHEN 'no_speed' THEN 2300 + 300 * sin(g.t / 30.0)
    WHEN 'highway'  THEN CASE WHEN g.t BETWEEN 2100 AND 2129
                              THEN 3000 + 3100 * (g.t - 2100) / 29.0
                              ELSE 2600 + (s.speed - 90) * 30 END
    ELSE 800 + s.speed * 25
  END)::double precision AS rpm,
  (90 - 66 * exp(-g.t / 400.0) + 1.5 * sin(g.t / 120.0))::double precision AS coolant,
  (CASE p.phase
    WHEN 'warmup'   THEN -68 + 4 * sin(g.t / 5.0)
    WHEN 'city'     THEN -55 + 1.6 * s.speed + 20 * sin(g.t / 9.0)
    WHEN 'no_speed' THEN -10 + 25 * sin(g.t / 20.0)
    WHEN 'highway'  THEN CASE WHEN g.t BETWEEN 2100 AND 2129
                              THEN 40 + 80 * (g.t - 2100) / 29.0
                              ELSE 20 + 15 * sin(g.t / 40.0) END
    ELSE -70 + 0.3 * s.speed
  END)::double precision AS boost,
  (CASE p.phase
    WHEN 'warmup'   THEN 24 - 4 * (g.t / 120.0)
    WHEN 'city'     THEN 18 + 0.8 * s.speed + 10 * abs(sin(g.t / 9.0))
    WHEN 'no_speed' THEN 35 + 10 * sin(g.t / 25.0)
    WHEN 'highway'  THEN CASE WHEN g.t BETWEEN 2100 AND 2129
                              THEN 98
                              ELSE 45 + 10 * sin(g.t / 40.0) END
    ELSE 15 + 0.2 * s.speed
  END)::double precision AS load
) m;

-- =========================================================================
-- current_state — one row per vehicle (the table's PK is vehicle_id). The
-- agent_role read check needs a non-zero read here; before this seed the table
-- was empty, so a silent zero-row RLS failure was indistinguishable from "no
-- data". Values approximate each vehicle's last large-drive sample.
-- =========================================================================
INSERT INTO public.current_state (vehicle_id, latest_metrics, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   jsonb_build_object('speed_kph', 0, 'rpm', 800, 'coolant_temp_c', 90.6, 'boost_pressure_kpa', -70.0, 'engine_load_pct', 15),
   timestamptz '2026-06-27 07:41:59+00'),
  ('00000000-0000-0000-0000-000000000011',
   jsonb_build_object('speed_kph', 0, 'rpm', 800, 'coolant_temp_c', 90.6, 'boost_pressure_kpa', -70.0, 'engine_load_pct', 15),
   timestamptz '2026-06-28 07:41:59+00');

-- =========================================================================
-- dtcs — the first real rows; the DTC screens had only run against mocks.
-- Codes are real seed_dtc_lookup.sql codes, so the dtc_lookup join resolves
-- (that file loads after this one; dtcs.code has no FK to it).
-- Covers both S5 groups and every badge-severity branch of
-- deriveDtcBadgeSeverity (apps/mobile/src/lib/dtc.ts): 'critical', 'WARN'
-- (casing drift the normaliser must fold), 'info', and NULL (→ 'unknown').
-- History is derived as cleared_at IS NOT NULL OR NOT is_active, so the two
-- history rows cover each arm separately.
--
-- TRIGGER SIDE EFFECT: dtc_active_enqueue (AFTER INSERT, is_active) fires for
-- the three active rows. agent_work_queue_dedupe collapses them to ONE pending
-- 'dtc' job per vehicle — two rows in total, …0040's and …0044's. Expected.
-- =========================================================================
INSERT INTO public.dtcs (
  id, vehicle_id, sync_session_id, code, description, severity_raw,
  first_seen_at, last_seen_at, is_active, cleared_at, cleared_by_user_id, freeze_frame_metrics
) VALUES
  -- Active, critical: overboost at the top of …0021's WOT pull. Freeze frame in
  -- the canonical contract §3 keys.
  ('00000000-0000-0000-0000-000000000040',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000021',
   'P0234', 'Turbocharger/Supercharger Overboost Condition', 'critical',
   timestamptz '2026-06-27 07:35:28+00', timestamptz '2026-06-27 07:35:29+00',
   true, NULL, NULL,
   jsonb_build_object('speed_kph', 104.6, 'rpm', 5993, 'coolant_temp_c', 89.2, 'boost_pressure_kpa', 117.2, 'engine_load_pct', 98)),
  -- Active, 'WARN': lean at cold idle. Freeze frame carries a NEGATIVE boost.
  ('00000000-0000-0000-0000-000000000041',
   '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000021',
   'P0171', 'System Too Lean (Bank 1)', 'WARN',
   timestamptz '2026-06-25 09:02:10+00', timestamptz '2026-06-27 07:01:30+00',
   true, NULL, NULL,
   jsonb_build_object('speed_kph', 0, 'rpm', 875, 'coolant_temp_c', 39.5, 'boost_pressure_kpa', -66.4, 'engine_load_pct', 21)),
  -- History via cleared_at: user-cleared, 'info'.
  ('00000000-0000-0000-0000-000000000042',
   '00000000-0000-0000-0000-000000000010',
   NULL,
   'P0420', 'Catalyst System Efficiency Below Threshold (Bank 1)', 'info',
   timestamptz '2026-06-10 18:12:00+00', timestamptz '2026-06-18 08:40:00+00',
   false, timestamptz '2026-06-19 09:00:00+00', '63f09c52-c7e9-4ee1-8584-623b4cf27428',
   NULL),
  -- History via is_active = false with cleared_at NULL (the ECU stopped
  -- reporting it; nobody cleared it). severity_raw NULL → 'unknown' badge.
  ('00000000-0000-0000-0000-000000000043',
   '00000000-0000-0000-0000-000000000010',
   NULL,
   'P0128', 'Coolant Thermostat Below Regulating Temperature', NULL,
   timestamptz '2026-06-12 07:05:00+00', timestamptz '2026-06-14 07:20:00+00',
   false, NULL, NULL,
   NULL),
  -- User 2, active, critical — gives the cross-user RLS check a dtcs row on
  -- the other side of the owner boundary. Arrived with the unprocessed session.
  ('00000000-0000-0000-0000-000000000044',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000022',
   'P0300', 'Random/Multiple Cylinder Misfire Detected', 'critical',
   timestamptz '2026-06-28 07:12:40+00', timestamptz '2026-06-28 07:13:05+00',
   true, NULL, NULL,
   jsonb_build_object('speed_kph', 46.0, 'rpm', 2410, 'coolant_temp_c', 88.5, 'boost_pressure_kpa', 12.3, 'engine_load_pct', 61));

-- =========================================================================
-- diagnostic_outputs — present so diagnostic_feedback has something to
-- reference. Shapes follow the contract table's CHECKs exactly.
--
-- has_anomaly: INSERTING HERE FIRES diagnostic_output_sets_has_anomaly
-- (20260812000002), which sets has_anomaly = true on the referenced drive for
-- a drive-scoped warning/critical row, one-way. These are chosen so the seed
-- flips NO flag — every drive's has_anomaly after seeding equals the literal
-- in its INSERT above:
--   …0050  warning, drive …0030 — already has_anomaly = true; no change.
--   …0051  info,    drive …0032 — info never flips; …0032 stays false.
--   …0052  critical, vehicle-scoped (referenced_drive_id NULL) — the trigger
--          no-ops on a NULL drive.
-- Drive …0031 is never referenced: it is the has_anomaly trigger test's flip
-- target and must reach that test as false. Do not point a warning/critical
-- output at …0031 or …0032 here.
-- =========================================================================
INSERT INTO public.diagnostic_outputs (
  id, vehicle_id, agent_version, generated_at, severity, urgency, category,
  title, summary, explanation, recommended_action, confidence,
  referenced_dtc_ids, referenced_drive_id, status
) VALUES
  ('00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000010',
   'fixture-0.0.0', timestamptz '2026-06-25 09:35:00+00',
   'warning', 'soon', 'cooling',
   'Coolant ran hot under sustained load',
   'Coolant peaked at 108 °C late in the drive, above the normal operating band.',
   'Temperature climbed steadily through the drive and peaked during high engine load. A healthy cooling system usually holds it near 90–100 °C.',
   'Check the coolant level and radiator fan operation before the next long drive.',
   0.78, '{}', '00000000-0000-0000-0000-000000000030', 'seen'),
  ('00000000-0000-0000-0000-000000000051',
   '00000000-0000-0000-0000-000000000010',
   'fixture-0.0.0', timestamptz '2026-06-27 07:50:00+00',
   'info', 'monitor', 'engine',
   'Cold start and warm-up looked normal',
   'The engine warmed from about 24 °C to its operating temperature in roughly 20 minutes.',
   'Idle vacuum and fast-idle rpm behaved as expected during warm-up.',
   NULL,
   0.64, '{}', '00000000-0000-0000-0000-000000000032', 'new'),
  ('00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000011',
   'fixture-0.0.0', timestamptz '2026-06-28 08:00:00+00',
   'critical', 'now', 'engine',
   'Misfire detected — reduce load',
   'The ECU logged a random/multiple-cylinder misfire (P0300).',
   'Sustained misfires can overheat the catalytic converter. Common causes are worn plugs, a failing coil, or a lean or rich condition.',
   'Avoid hard acceleration and have the ignition system inspected soon.',
   0.86, ARRAY['00000000-0000-0000-0000-000000000044']::uuid[], NULL, 'new');

-- =========================================================================
-- diagnostic_feedback — one per output, both ratings, both users.
-- =========================================================================
INSERT INTO public.diagnostic_feedback (id, diagnostic_id, user_id, rating, comment, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000060',
   '00000000-0000-0000-0000-000000000050',
   '63f09c52-c7e9-4ee1-8584-623b4cf27428',
   'up', 'Matches what the gauge showed.', timestamptz '2026-06-25 10:05:00+00'),
  ('00000000-0000-0000-0000-000000000061',
   '00000000-0000-0000-0000-000000000051',
   '63f09c52-c7e9-4ee1-8584-623b4cf27428',
   'down', 'Did not mention the overboost code from the same drive.', timestamptz '2026-06-27 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000062',
   '00000000-0000-0000-0000-000000000052',
   '00000000-0000-0000-0000-000000000102',
   'up', NULL, timestamptz '2026-06-28 08:30:00+00');
