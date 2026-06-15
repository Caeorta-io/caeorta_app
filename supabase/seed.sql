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
