/**
 * Typed mock fixtures for the Week-3 vehicle dashboard data seam.
 *
 * Every fixture is pinned to a generated `Tables<>` Row type via `satisfies`, so
 * if Platform regenerates `database.types.ts` and a column changes, these stop
 * compiling — the conformance test (and `tsc --noEmit`) is the early-warning.
 *
 * These are consumed only through the `fetch*` functions in `./source.ts`; screens
 * and hooks never import this file directly.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(metric-keys): PROVISIONAL jsonb vocabulary.
 *   The keys inside `peak_metrics` / `summary_metrics` / `latest_metrics` below
 *   ({@link PROVISIONAL_METRIC_KEYS}) are a best-guess placeholder. The CANONICAL
 *   metric-key set is owned by the hardware/AI-agent contract (OBD-II PID → key
 *   mapping), NOT by this repo — see docs/06_AI_Agent_Contract.md and
 *   docs/07_Sync_Architecture.md (peak_metrics = "max rpm, max boost, max coolant
 *   temp, etc."). These keys MUST be reconciled against that contract before any
 *   capability in `source.ts` is flipped to 'live'; the jsonb columns are typed as
 *   opaque `Json`, so a key mismatch would NOT be caught by the compiler.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { CreateVehicleInput } from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

/**
 * Provisional OBD metric keys used across all jsonb metric blobs in this file.
 * Listed once so the placeholder vocabulary is greppable and reconcilable in one
 * place. See the TODO(metric-keys) note above.
 */
export const PROVISIONAL_METRIC_KEYS = [
  'rpm',
  'speed_kph',
  'coolant_temp_c',
  'engine_load_pct',
  'throttle_pct',
  'intake_air_temp_c',
  'boost_pressure_kpa',
  'battery_voltage',
  'fuel_level_pct',
] as const;

// Stable mock identifiers. Real UUID v4 shapes so they survive a future `vin`/`id`
// zod check or a `.eq('id', …)` round-trip when a capability flips to 'live'.
export const MOCK_OWNER_USER_ID = '33333333-3333-4333-8333-333333333333';
export const MOCK_VEHICLE_ID = '11111111-1111-4111-8111-111111111111';
export const MOCK_DEVICE_ID = '22222222-2222-4222-8222-222222222222';
export const MOCK_DRIVE_ID = '44444444-4444-4444-8444-444444444444';
export const MOCK_SYNC_SESSION_ID = '55555555-5555-4555-8555-555555555555';

/** One paired vehicle owned by the mock user. */
export const mockVehicle = {
  id: MOCK_VEHICLE_ID,
  owner_user_id: MOCK_OWNER_USER_ID,
  device_id: MOCK_DEVICE_ID,
  nickname: 'Project Hachi',
  make: 'Toyota',
  model: 'GR Corolla',
  year: 2023,
  vin: 'JTDBR32E720123456',
  ecu_type: 'denso-gen4',
  modifications: [],
  created_at: '2026-05-20T08:00:00.000Z',
} satisfies Tables<'vehicles'>;

/**
 * One completed drive (`ended_at` set). Top-level summary columns are kept
 * arithmetically consistent: 24.6 km over 2190 s ≈ 40.4 kph average.
 */
export const mockLastDrive = {
  id: MOCK_DRIVE_ID,
  vehicle_id: MOCK_VEHICLE_ID,
  sync_session_id: MOCK_SYNC_SESSION_ID,
  started_at: '2026-06-22T07:12:00.000Z',
  ended_at: '2026-06-22T07:48:30.000Z',
  duration_seconds: 2190,
  distance_km: 24.6,
  average_speed_kph: 40.4,
  has_anomaly: false,
  // Peaks observed during the drive (provisional keys — see TODO above).
  peak_metrics: {
    rpm: 6480,
    speed_kph: 132,
    coolant_temp_c: 101.5,
    engine_load_pct: 94,
    throttle_pct: 100,
    intake_air_temp_c: 47,
    boost_pressure_kpa: 118,
    battery_voltage: 14.6,
  } satisfies Record<string, number>,
  // Averages across the drive (provisional keys — see TODO above).
  summary_metrics: {
    rpm: 2180,
    speed_kph: 40.4,
    coolant_temp_c: 92.3,
    engine_load_pct: 38,
    throttle_pct: 22,
    intake_air_temp_c: 39,
    boost_pressure_kpa: 12,
    battery_voltage: 14.2,
    fuel_level_pct: 61,
  } satisfies Record<string, number>,
} satisfies Tables<'drives'>;

/** One decimal place, matching the `distance_km` / `average_speed_kph` precision. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build one completed `drives` Row from compact fields. `ended_at` is derived from
 * `startedAt + durationSeconds` and `average_speed_kph` from distance/duration, so
 * every fixture stays arithmetically self-consistent (same invariant the conformance
 * test pins on {@link mockLastDrive}). The jsonb blobs reuse the exact provisional
 * key set from {@link PROVISIONAL_METRIC_KEYS} — no new key names (see TODO above).
 */
function makeDrive(fields: {
  id: string;
  startedAt: string;
  durationSeconds: number;
  distanceKm: number;
  hasAnomaly?: boolean;
  peakRpm?: number;
  peakSpeedKph?: number;
  peakCoolantC?: number;
}): Tables<'drives'> {
  const avg = round1(fields.distanceKm / (fields.durationSeconds / 3600));
  const endedAt = new Date(Date.parse(fields.startedAt) + fields.durationSeconds * 1000).toISOString();
  return {
    id: fields.id,
    vehicle_id: MOCK_VEHICLE_ID,
    sync_session_id: MOCK_SYNC_SESSION_ID,
    started_at: fields.startedAt,
    ended_at: endedAt,
    duration_seconds: fields.durationSeconds,
    distance_km: fields.distanceKm,
    average_speed_kph: avg,
    has_anomaly: fields.hasAnomaly ?? false,
    peak_metrics: {
      rpm: fields.peakRpm ?? 5200,
      speed_kph: fields.peakSpeedKph ?? 96,
      coolant_temp_c: fields.peakCoolantC ?? 95.0,
      engine_load_pct: 82,
      throttle_pct: 88,
      intake_air_temp_c: 42,
      boost_pressure_kpa: 74,
      battery_voltage: 14.5,
    } satisfies Record<string, number>,
    summary_metrics: {
      rpm: 2050,
      speed_kph: avg,
      coolant_temp_c: 90.0,
      engine_load_pct: 34,
      throttle_pct: 20,
      intake_air_temp_c: 37,
      boost_pressure_kpa: 10,
      battery_voltage: 14.2,
      fuel_level_pct: 58,
    } satisfies Record<string, number>,
  } satisfies Tables<'drives'>;
}

/**
 * The vehicle's completed drives for the paginated, date-grouped drives list.
 * Newest-first, spanning four calendar dates (Jun 22 / 21 / 19 / 18) with several
 * drives per day so date-grouping and cursor pagination are both exercised.
 *
 * {@link mockLastDrive} is the newest element, so the drives list and the detail
 * screen's "last drive" card stay consistent (the last drive IS the top of the list).
 * A couple of drives carry `has_anomaly` so the list's amber marker has something to
 * render.
 */
export const mockDrives: Tables<'drives'>[] = [
  // ── Jun 22 (2 drives) — newest is the shared mockLastDrive ──
  mockLastDrive,
  makeDrive({
    id: '77777777-7777-4777-8777-777777777701',
    startedAt: '2026-06-22T05:40:00.000Z',
    durationSeconds: 1140, // 19 min
    distanceKm: 11.2,
  }),
  // ── Jun 21 (3 drives) ──
  makeDrive({
    id: '77777777-7777-4777-8777-777777777702',
    startedAt: '2026-06-21T19:20:00.000Z',
    durationSeconds: 2760, // 46 min
    distanceKm: 38.9,
    hasAnomaly: true,
    peakRpm: 6720,
    peakSpeedKph: 141,
    peakCoolantC: 103.2,
  }),
  makeDrive({
    id: '77777777-7777-4777-8777-777777777703',
    startedAt: '2026-06-21T13:05:00.000Z',
    durationSeconds: 900, // 15 min
    distanceKm: 7.4,
  }),
  makeDrive({
    id: '77777777-7777-4777-8777-777777777704',
    startedAt: '2026-06-21T08:15:00.000Z',
    durationSeconds: 1980, // 33 min
    distanceKm: 21.5,
  }),
  // ── Jun 19 (2 drives) ──
  makeDrive({
    id: '77777777-7777-4777-8777-777777777705',
    startedAt: '2026-06-19T17:45:00.000Z',
    durationSeconds: 3300, // 55 min
    distanceKm: 47.1,
  }),
  makeDrive({
    id: '77777777-7777-4777-8777-777777777706',
    startedAt: '2026-06-19T07:30:00.000Z',
    durationSeconds: 1500, // 25 min
    distanceKm: 16.8,
  }),
  // ── Jun 18 (2 drives) ──
  makeDrive({
    id: '77777777-7777-4777-8777-777777777707',
    startedAt: '2026-06-18T16:10:00.000Z',
    durationSeconds: 2100, // 35 min
    distanceKm: 28.3,
    hasAnomaly: true,
    peakRpm: 6180,
    peakCoolantC: 99.8,
  }),
  makeDrive({
    id: '77777777-7777-4777-8777-777777777708',
    startedAt: '2026-06-18T06:50:00.000Z',
    durationSeconds: 1260, // 21 min
    distanceKm: 13.6,
  }),
];

/**
 * Latest known instantaneous metrics for the vehicle (engine idling, just keyed
 * on). `updated_at` here is a static "recent" anchor; `currentStateForVehicle`
 * re-stamps it to call-time so it stays genuinely recent for the dashboard's
 * "Synced Xm ago" / "Live" indicator.
 */
export const mockCurrentState = {
  vehicle_id: MOCK_VEHICLE_ID,
  latest_metrics: {
    rpm: 820,
    speed_kph: 0,
    coolant_temp_c: 88.0,
    engine_load_pct: 19,
    throttle_pct: 0,
    intake_air_temp_c: 36,
    boost_pressure_kpa: 0,
    battery_voltage: 14.1,
    fuel_level_pct: 60,
  } satisfies Record<string, number>,
  updated_at: '2026-06-22T07:49:00.000Z',
} satisfies Tables<'current_state'>;

/**
 * Three diagnostics spanning the severity range (info / warning / critical), all
 * `status = 'new'`. Vocab (severity / urgency / category) follows
 * docs/06_AI_Agent_Contract.md. Ordered newest-first by `generated_at`.
 */
export const mockDiagnostics = [
  {
    id: '66666666-6666-4666-8666-666666666661',
    vehicle_id: MOCK_VEHICLE_ID,
    agent_version: 'v0.3.1',
    category: 'turbo',
    severity: 'critical',
    urgency: 'now',
    status: 'new',
    confidence: 0.93,
    title: 'Boost pressure spiked repeatedly under load',
    summary: 'Boost climbed past the safe ceiling three times during hard pulls.',
    explanation:
      'On three separate wide-open-throttle pulls this drive, boost pressure exceeded ' +
      '115 kPa and held there for over two seconds. Sustained overboost can damage the ' +
      'turbo and stress head gaskets. Have the wastegate and boost control checked before ' +
      'the next spirited drive.',
    recommended_action: 'Stop hard acceleration and have the wastegate/boost control inspected.',
    referenced_drive_id: MOCK_DRIVE_ID,
    referenced_dtc_ids: [],
    referenced_telemetry_ids: [],
    generated_at: '2026-06-22T07:50:10.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666662',
    vehicle_id: MOCK_VEHICLE_ID,
    agent_version: 'v0.3.1',
    category: 'cooling',
    severity: 'warning',
    urgency: 'soon',
    status: 'new',
    confidence: 0.71,
    title: 'Coolant ran warmer than usual',
    summary: 'Peak coolant temperature was a little high for the ambient conditions.',
    explanation:
      'Coolant temperature peaked at 101.5 °C during sustained load. That is within the ' +
      'engine’s tolerance but warmer than your baseline for similar drives. Worth keeping ' +
      'an eye on; if it recurs, check coolant level and the radiator for airflow blockage.',
    recommended_action: 'Check coolant level and radiator airflow within the next week.',
    referenced_drive_id: MOCK_DRIVE_ID,
    referenced_dtc_ids: [],
    referenced_telemetry_ids: [],
    generated_at: '2026-06-22T07:49:55.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666663',
    vehicle_id: MOCK_VEHICLE_ID,
    agent_version: 'v0.3.1',
    category: 'engine',
    severity: 'info',
    urgency: 'monitor',
    status: 'new',
    confidence: 0.86,
    title: 'Smooth drive overall',
    summary: 'Engine ran cleanly with no faults detected this drive.',
    explanation:
      'Idle was stable, throttle response was consistent, and no diagnostic trouble codes ' +
      'were reported. Nothing needs your attention from this drive.',
    recommended_action: null,
    referenced_drive_id: MOCK_DRIVE_ID,
    referenced_dtc_ids: [],
    referenced_telemetry_ids: [],
    generated_at: '2026-06-22T07:49:40.000Z',
  },
] satisfies Tables<'diagnostic_outputs'>[];

// ── Selectors ────────────────────────────────────────────────────────────────
// Narrow, mock-only readers used by `source.ts`. Return the WIDE generated row
// types (not the narrow literal fixtures) so the seam's surface matches what the
// live Supabase implementation will return.

export function vehicles(): Tables<'vehicles'>[] {
  return [mockVehicle];
}

export function vehicleById(id: string): Tables<'vehicles'> | null {
  return id === MOCK_VEHICLE_ID ? mockVehicle : null;
}

export function lastDriveForVehicle(vehicleId: string): Tables<'drives'> | null {
  return vehicleId === MOCK_VEHICLE_ID ? mockLastDrive : null;
}

/** All of a vehicle's completed drives, newest-first (the order the live query returns). */
export function drivesForVehicle(vehicleId: string): Tables<'drives'>[] {
  if (vehicleId !== MOCK_VEHICLE_ID) return [];
  return [...mockDrives].sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/**
 * One keyset page of a vehicle's drives, newest-first. `cursor` is the `started_at`
 * of the last row already seen (null for the first page); rows strictly older than
 * the cursor are returned. `nextCursor` is the last returned row's `started_at` when
 * more rows remain, else null. Mirrors the live `.lt('started_at', cursor).limit()`
 * scan (see `fetchDrives` in ./source.ts).
 */
export function drivesPage(
  vehicleId: string,
  limit: number,
  cursor: string | null,
): { drives: Tables<'drives'>[]; nextCursor: string | null } {
  const all = drivesForVehicle(vehicleId);
  const remaining = cursor === null ? all : all.filter((d) => d.started_at < cursor);
  const safeLimit = Math.max(0, limit);
  const drives = remaining.slice(0, safeLimit);
  const hasMore = remaining.length > drives.length;
  const nextCursor = hasMore ? (drives.at(-1)?.started_at ?? null) : null;
  return { drives, nextCursor };
}

export function recentDiagnosticsForVehicle(
  vehicleId: string,
  limit: number,
): Tables<'diagnostic_outputs'>[] {
  if (vehicleId !== MOCK_VEHICLE_ID) return [];
  // Fixtures are already newest-first; the live query will `order(generated_at desc)`.
  return mockDiagnostics.slice(0, Math.max(0, limit));
}

export function currentStateForVehicle(vehicleId: string): Tables<'current_state'> | null {
  if (vehicleId !== MOCK_VEHICLE_ID) return null;
  // Re-stamp to now so "recent" stays honest regardless of when the app reads it.
  return { ...mockCurrentState, updated_at: new Date().toISOString() };
}

/**
 * One Realtime "tick" of `current_state` for the mock live-mode emitter
 * (`subscribeToCurrentStateMock` in ./source.ts). Based on {@link mockCurrentState}
 * but stamped to call-time and with a single provisional metric (`rpm`) nudged by
 * `tick` so each push is visibly different on the live screen — an idle engine
 * wandering ±160 rpm around the baseline. Keys stay within
 * {@link PROVISIONAL_METRIC_KEYS} (see the TODO(metric-keys) note above); the live
 * stream will replace this once the real subscription is wired.
 */
export function currentStateTick(vehicleId: string, tick: number): Tables<'current_state'> {
  const base = mockCurrentState.latest_metrics;
  return {
    vehicle_id: vehicleId,
    latest_metrics: { ...base, rpm: base.rpm + ((tick % 8) - 4) * 40 },
    updated_at: new Date().toISOString(),
  } satisfies Tables<'current_state'>;
}

/**
 * RFC-4122 v4 id, Math.random-backed. Good enough for a mock seam (no crypto
 * dependency, works in both Hermes and the Node/vitest test runner where
 * `crypto.randomUUID` isn't guaranteed). The live `create_vehicle` path gets a
 * real db-generated `id` from the `RETURNING *`, so this never reaches prod.
 */
function mockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * The mock counterpart of the `create_vehicle` Edge Function's insert: builds a
 * brand-new `vehicles` Row from the mock owner/fixture defaults plus the validated
 * user input. Mirrors what the function's `RETURNING *` will hand back — a fresh
 * `id`/`created_at`, the caller's owner, and the user-entered columns — so the
 * add-vehicle screens render against the same shape live and mock.
 */
export function createMockVehicle(input: CreateVehicleInput): Tables<'vehicles'> {
  return {
    id: mockUuid(),
    owner_user_id: MOCK_OWNER_USER_ID,
    device_id: input.device_id,
    nickname: input.nickname,
    make: input.make,
    model: input.model,
    year: input.year,
    vin: null,
    ecu_type: input.ecu_type,
    modifications: [],
    created_at: new Date().toISOString(),
  } satisfies Tables<'vehicles'>;
}
