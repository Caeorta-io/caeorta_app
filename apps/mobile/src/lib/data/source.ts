/**
 * Data-source seam for the Week-3 vehicle dashboard.
 *
 * Every read the dashboard performs goes through one of the `fetch*` functions
 * below. Each consults {@link DATA_SOURCE} for its capability and either serves a
 * typed mock fixture (today) or delegates to the live Supabase implementation
 * (later — currently a thrown "not implemented"). Hooks and screens NEVER branch
 * on mock-vs-live; they call a fetcher and get back a generated `Tables<>` row.
 *
 * Flipping one capability to 'live' is a single-line edit in {@link DATA_SOURCE}
 * (or the `EXPO_PUBLIC_DATA_SOURCE` env default) — no hook or screen changes.
 *
 * NOTE: the live branches intentionally do not import the Supabase client, so this
 * module pulls in zero React-Native / network code and stays unit-testable in a
 * plain Node/vitest environment. Wire the real queries here when each capability
 * is promoted (see the per-table notes on each `fetch*`).
 */
import { createVehicleInputSchema, type CreateVehicleInput, type Dtc } from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

import type { DriveHealthFlags } from '../driveHealth';
import type { DriveTelemetry } from '../telemetry';
import * as mocks from './mocks';

export type DataSourceMode = 'mock' | 'live';

/**
 * Capabilities the dashboard reads, listed individually (not one global flag) so
 * each migrates to live Supabase on its own schedule — e.g. flip `currentState`
 * to 'live' for Realtime-backed reads while `lastDrive` still serves mocks.
 */
export type DataCapability =
  | 'vehicles'
  | 'vehicle'
  | 'lastDrive'
  | 'drives'
  | 'drive'
  | 'driveDiagnostics'
  | 'driveTelemetry'
  | 'recentDiagnostics'
  | 'diagnostics'
  | 'currentState'
  | 'currentStateSubscription'
  | 'createVehicle'
  | 'dtcs'
  | 'dtcDiagnostic';

/**
 * Optional global default via env: `EXPO_PUBLIC_DATA_SOURCE=live` flips every
 * capability whose entry below references it. Anything other than the literal
 * 'live' (including unset) defaults to 'mock' — the safe default for this PR.
 */
const ENV_DEFAULT: DataSourceMode =
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'live' ? 'live' : 'mock';

/**
 * THE flip-point. Per-capability switch. Default every entry to {@link ENV_DEFAULT}
 * (= 'mock' unless the env override is set). To promote a single capability ahead
 * of the others, replace its value with the literal 'live'.
 */
export const DATA_SOURCE: Record<DataCapability, DataSourceMode> = {
  vehicles: ENV_DEFAULT,
  vehicle: ENV_DEFAULT,
  lastDrive: ENV_DEFAULT,
  drives: ENV_DEFAULT,
  drive: ENV_DEFAULT,
  driveDiagnostics: ENV_DEFAULT,
  // THE EXCEPTION. Every other capability defaults to mock (and throws on 'live' until
  // its Platform query lands). `driveTelemetry` is the reverse: it defaults DIRECTLY to
  // 'live' and has NO mock path. The `get_drive_telemetry` Edge Function is already
  // deployed on main, there's no Platform-side blocker, and the founder approved wiring
  // it live from day one (Week-4 decision) — so mocking it would be busywork. In 'mock'
  // mode it throws {@link notImplemented} (the inverse of the usual pattern).
  driveTelemetry: 'live',
  recentDiagnostics: ENV_DEFAULT,
  // The S1 feed's vehicle-wide read. Separate from `recentDiagnostics` (same table,
  // different query: no limit, plus filters) so the feed and the home preview can flip
  // independently. Both are gated by CF-30's live-flip gate, which this PR does NOT
  // change — reconciling the App's internal model does not make the agent's output
  // vocabulary confirmed. See the note on `fetchDiagnostics`.
  diagnostics: ENV_DEFAULT,
  currentState: ENV_DEFAULT,
  currentStateSubscription: ENV_DEFAULT,
  createVehicle: ENV_DEFAULT,
  // Mock-default despite the `dtcs` table (and `freeze_frame_metrics`) being fully
  // present on main: the Active/Pending split the S5 screen groups on has no column
  // behind it, so a live flip today would silently collapse the list to two groups.
  // See the adapter note on `fetchDtcs` and CF-29.
  dtcs: ENV_DEFAULT,
  // Separate from `dtcs`: this reads `diagnostic_outputs`, not `dtcs`, so it flips with
  // the agent-output capabilities rather than with the DTC table. See `fetchDiagnosticForDtc`.
  dtcDiagnostic: ENV_DEFAULT,
};

function notImplemented(capability: DataCapability): never {
  throw new Error(
    `Live data source for '${capability}' is not implemented yet. ` +
      `Keep DATA_SOURCE.${capability} = 'mock', or wire the Supabase query in source.ts.`,
  );
}

/** All vehicles owned by the current user. Live: `select * from vehicles`. */
export async function fetchVehicles(): Promise<Tables<'vehicles'>[]> {
  if (DATA_SOURCE.vehicles === 'live') return notImplemented('vehicles');
  return mocks.vehicles();
}

/** A single vehicle by id, or null if not found. Live: `…eq('id', id).maybeSingle()`. */
export async function fetchVehicle(id: string): Promise<Tables<'vehicles'> | null> {
  if (DATA_SOURCE.vehicle === 'live') return notImplemented('vehicle');
  return mocks.vehicleById(id);
}

/**
 * Most recent completed drive for a vehicle, or null if none yet (empty-state).
 * Live: `…eq('vehicle_id', …).not('ended_at','is',null).order('started_at',desc).limit(1)`.
 */
export async function fetchLastDrive(vehicleId: string): Promise<Tables<'drives'> | null> {
  if (DATA_SOURCE.lastDrive === 'live') return notImplemented('lastDrive');
  return mocks.lastDriveForVehicle(vehicleId);
}

/** One page of drives plus the cursor to fetch the next page (null when at the end). */
export interface DrivesPage {
  drives: Tables<'drives'>[];
  /**
   * Per-drive health-severity flags for the three-state health pill, keyed by drive
   * id, for the drives on THIS page only. Carried alongside `drives` (a sidecar map,
   * not per row) so the list renders each row's health WITHOUT an N+1 fetch of every
   * drive's diagnostics — the list derives the pill via `driveHealthFromFlags`. Live:
   * one keyset page query that also aggregates linked-diagnostic severities per drive
   * (`bool_or(severity='critical'|'warning')`), not a query per row. Absence of a
   * drive's id means no elevating diagnostics (reads clean).
   */
  healthByDriveId: Record<string, DriveHealthFlags>;
  /**
   * Keyset cursor for the NEXT page: the `started_at` of the last row on this page,
   * or null when no more rows follow. `started_at` (not an opaque offset) so the
   * eventual live query is a stable keyset scan the mock already mirrors — see
   * {@link fetchDrives}.
   */
  nextCursor: string | null;
}

/**
 * One page of a vehicle's completed drives, newest-first, for the paginated drives
 * list. `cursor` is the `started_at` of the last row seen (null/absent for the first
 * page); `limit` is the page size.
 *
 * Live: keyset pagination on `started_at` —
 * `…eq('vehicle_id', …).order('started_at',desc).lt('started_at', cursor).limit(limit)`
 * (first page omits the `.lt`). `started_at` is effectively unique per vehicle in the
 * fixtures; a live query wanting exact tie-breaking would key on `(started_at, id)`.
 */
export async function fetchDrives(
  vehicleId: string,
  { limit, cursor }: { limit: number; cursor?: string | null },
): Promise<DrivesPage> {
  if (DATA_SOURCE.drives === 'live') return notImplemented('drives');
  return mocks.drivesPage(vehicleId, limit, cursor ?? null);
}

/**
 * A single completed drive by id, or null if not found — the drive-detail screen's
 * primary read. Live: `…eq('id', driveId).maybeSingle()`.
 */
export async function fetchDrive(driveId: string): Promise<Tables<'drives'> | null> {
  if (DATA_SOURCE.drive === 'live') return notImplemented('drive');
  return mocks.driveById(driveId);
}

/**
 * All diagnostics the AI agent linked to a specific drive (the drive-detail screen's
 * "diagnostics from this drive" section), newest-first. Filters on the
 * `referenced_drive_id` FK; an empty array means the drive flagged nothing.
 * Live: `…eq('referenced_drive_id', driveId).order('generated_at',desc)`.
 */
export async function fetchDriveDiagnostics(
  driveId: string,
): Promise<Tables<'diagnostic_outputs'>[]> {
  if (DATA_SOURCE.driveDiagnostics === 'live') return notImplemented('driveDiagnostics');
  return mocks.diagnosticsForDrive(driveId);
}

/**
 * A drive's full telemetry (all channels, downsampled server-side to <= 300 points) for
 * the drive-detail Speed/Boost/Coolant charts — the app's FIRST live Edge Function read.
 *
 * This is the ONE fetcher that breaks the module's Node-pure / mock-default rule: it has
 * no mock branch (throws {@link notImplemented} in 'mock' mode) and its live branch is a
 * real network call. To keep THIS module free of Supabase/React-Native imports at the
 * top level (so `source.ts` and its tests still run in plain Node/vitest), the live
 * implementation lives in `./telemetryLive.ts` and is pulled in with a lazy `import()`
 * that only runs when the live branch executes. It throws `TelemetryFetchError` (HTTP
 * status or `'network'`) on failure — a read, so no never-throws orchestrator; the hook's
 * error state surfaces it. See `DATA_SOURCE.driveTelemetry` above for why it's live.
 */
export async function fetchDriveTelemetry(driveId: string): Promise<DriveTelemetry> {
  if (DATA_SOURCE.driveTelemetry !== 'live') return notImplemented('driveTelemetry');
  const { fetchDriveTelemetryLive } = await import('./telemetryLive');
  return fetchDriveTelemetryLive(driveId);
}

/**
 * Up to `limit` newest diagnostics for a vehicle, newest-first.
 * Live: `…eq('vehicle_id', …).order('generated_at',desc).limit(limit)`.
 */
export async function fetchRecentDiagnostics(
  vehicleId: string,
  limit: number,
): Promise<Tables<'diagnostic_outputs'>[]> {
  if (DATA_SOURCE.recentDiagnostics === 'live') return notImplemented('recentDiagnostics');
  return mocks.recentDiagnosticsForVehicle(vehicleId, limit);
}

/**
 * Filters for the S1 Diagnostics feed ({@link fetchDiagnostics}). Every field is
 * OPTIONAL and an ABSENT-or-EMPTY field means "no constraint on this axis" — so `{}`
 * and `undefined` both return the full feed. Fields combine with AND.
 *
 * Shaped to map one-to-one onto the eventual PostgREST clauses so the live flip is a
 * query, not a rewrite: `severity` → `.in('severity', …)`, `status` → `.in('status', …)`,
 * `since`/`until` → `.gte`/`.lte` on `generated_at`.
 */
export interface DiagnosticsFilters {
  /**
   * Match the raw `severity` column (`info` | `warning` | `critical`), NOT the derived
   * card state. Worth knowing for S1's chips: a contract-shaped `insufficient_data` row
   * carries `severity='info'` (contract §7), so an "Info" chip includes it. If the design
   * wants insufficient-data as its OWN chip — S8's notification prefs do treat it as a
   * fourth, separate toggle — filter on `deriveDiagnosticCardState` in the UI instead of
   * widening this; the column has no such value and the DB CHECK forbids one.
   */
  severity?: readonly string[];
  /** Match the raw `status` column (`new` | `seen` | `dismissed` | `actioned`). */
  status?: readonly string[];
  /** Inclusive lower bound on `generated_at` (ISO-8601). */
  since?: string | null;
  /** Inclusive upper bound on `generated_at` (ISO-8601). */
  until?: string | null;
}

/** `undefined`/empty list = no constraint (see {@link DiagnosticsFilters}). */
function matchesList(value: string, allowed: readonly string[] | undefined): boolean {
  return allowed === undefined || allowed.length === 0 || allowed.includes(value);
}

/**
 * EVERY diagnostic for a vehicle, newest-first — the read behind the S1 Diagnostics feed
 * (design §6 `S1`). Distinct from {@link fetchRecentDiagnostics}, which is the home
 * screen's newest-three preview.
 *
 * Returns rows RAW: filtered, but neither deduped nor date-grouped. Contract §5 assigns
 * dedup to the app's UI layer, so it and the date grouping are pure functions in
 * `lib/diagnostics.ts` ({@link dedupeDiagnostics}, {@link groupDiagnosticsByDate}) that
 * the screen composes — the seam must not pre-collapse rows a filter chip might want back.
 *
 * Live: `…eq('vehicle_id', …)` plus the clauses named on {@link DiagnosticsFilters},
 * `.order('generated_at', desc)`. Filtering runs at the seam (not in the fixtures) for
 * exactly that reason — it is the half that becomes SQL.
 *
 * BEFORE FLIPPING `DATA_SOURCE.diagnostics`: this reads `diagnostic_outputs`, so it sits
 * behind CF-30's gate. This PR reconciled the App's internal model onto the contract
 * shape, which removes the app-side divergence but does NOT close the carry — the agent
 * team still has to confirm the canonical field, and §7's DECISION REQUIRED #3 (which of
 * the two "I don't know"s a row is) is still open; see `deriveInsufficientDataKind`.
 */
export async function fetchDiagnostics(
  vehicleId: string,
  filters: DiagnosticsFilters = {},
): Promise<Tables<'diagnostic_outputs'>[]> {
  if (DATA_SOURCE.diagnostics === 'live') return notImplemented('diagnostics');

  const { severity, status, since, until } = filters;
  return mocks.diagnosticsForVehicle(vehicleId).filter((d) => {
    if (!matchesList(d.severity, severity)) return false;
    if (!matchesList(d.status, status)) return false;
    // Lexicographic compare is a correct chronological compare for the ISO-8601 UTC
    // timestamps this column holds, and is what the live `.gte`/`.lte` do server-side.
    if (since != null && d.generated_at < since) return false;
    if (until != null && d.generated_at > until) return false;
    return true;
  });
}

/**
 * Latest known snapshot of a vehicle's current_state, or null if none.
 * Live mode reads this once for the initial value; ongoing updates come from the
 * Realtime helper `subscribeToCurrentState` in @caeorta/supabase, not this fetcher.
 * Live: `…eq('vehicle_id', …).maybeSingle()`.
 */
export async function fetchCurrentState(
  vehicleId: string,
): Promise<Tables<'current_state'> | null> {
  if (DATA_SOURCE.currentState === 'live') return notImplemented('currentState');
  return mocks.currentStateForVehicle(vehicleId);
}

// ── DTCs (design §6 S5/S6) ───────────────────────────────────────────────────
// Both fetchers return `Dtc` — a `dtcs` row plus a derived `grouping` — so screens
// group on ONE field and never re-derive the rule. Stamping happens at the seam
// because that is where the mock-only Pending overlay lives (CF-29); everything
// downstream is unaware of whether a group came from a column or a fixture.
//
// LIVE ADAPTER NOTE (read before flipping `DATA_SOURCE.dtcs`):
//   1. The QUERY is trivial — `…eq('vehicle_id', …).order('last_seen_at', desc)` for
//      the list, `…eq('id', dtcId).maybeSingle()` for the detail. No Edge Function is
//      involved; `dtcs` is RLS-scoped to the owner via `vehicle_id`.
//   2. Map each row through `toDtc` (lib/dtc.ts) — the SAME converter the mock uses.
//      It boundary-parses the opaque `Json` freeze-frame column and stamps `grouping`
//      via `deriveDtcGrouping`, which returns only 'active' | 'history'. **The Pending
//      group disappears on the live path** — there is no pending/confirmed column on
//      `dtcs`. Resolve CF-29 (Platform adds the signal, or the founder cuts the group
//      from v1) BEFORE the flip, or S5 silently renders two sections where the design
//      specifies three.
//   3. `freeze_frame_metrics` is a real column populated by `device_sync_chunk`, but
//      its KEYS are the provisional metric vocabulary — reconcile CF-07 / R22 first or
//      the S6 freeze-frame panel renders empty rather than erroring.
//   4. `device_sync_chunk` captures the freeze frame as the LAST telemetry row of the
//      sync chunk, not the row at fault time — see CF-28. Values may not correspond to
//      the moment the code actually set.

/**
 * All DTCs recorded for a vehicle, newest-first by `last_seen_at`, each stamped with
 * its Active/Pending/History group. Empty array for an unknown vehicle.
 * Live: see the adapter note above.
 */
export async function fetchDtcs(vehicleId: string): Promise<Dtc[]> {
  if (DATA_SOURCE.dtcs === 'live') return notImplemented('dtcs');
  return mocks.dtcsForVehicle(vehicleId);
}

/**
 * A single DTC by id, or null if not found — the S6 detail screen's primary read.
 * Live: see the adapter note above.
 */
export async function fetchDtc(dtcId: string): Promise<Dtc | null> {
  if (DATA_SOURCE.dtcs === 'live') return notImplemented('dtcs');
  return mocks.dtcById(dtcId);
}

/**
 * The diagnostic the agent linked to a DTC — S6's "related Diagnostic Card" (§6) and the
 * §7 route on to Diagnostic detail (S2). Null when nothing references the code, which is
 * the common case and an empty state, NOT an error.
 *
 * Live: `…contains('referenced_dtc_ids', [dtcId]).order('generated_at', desc)` — a
 * containment query on the `uuid[]` column, then the SAME `findDiagnosticForDtc`
 * resolution the mock uses, so a code cited by several outputs picks the same one on both
 * paths. Note this reads `diagnostic_outputs`, so it is gated by the agent-output carries
 * (CF-30's severity-vs-category vocabulary), not by the DTC ones — hence its own
 * capability key rather than riding on `dtcs`.
 */
export async function fetchDiagnosticForDtc(
  dtcId: string,
): Promise<Tables<'diagnostic_outputs'> | null> {
  if (DATA_SOURCE.dtcDiagnostic === 'live') return notImplemented('dtcDiagnostic');
  return mocks.diagnosticForDtc(dtcId);
}

/** Simulated mock-mode latency for the write path, so the form's busy state is visible. */
const MOCK_CREATE_LATENCY_MS = 300;

/**
 * Creates a vehicle. Unlike the read fetchers, this is the one WRITE on the seam.
 *
 * Mock: re-validates the input at the boundary (defensive — the orchestrator already
 * parsed it), waits ~300 ms to exercise the form's busy state, and returns a freshly
 * constructed `vehicles` Row. Resolves the row; it does not throw on the happy path.
 *
 * Live: throws via {@link notImplemented} — the real call POSTs to the `create_vehicle`
 * Edge Function (see docs/create_vehicle_contract.md). Wire the `fetch` here when the
 * Platform side lands and flip `DATA_SOURCE.createVehicle` to 'live'. The orchestrator
 * in `lib/vehicles.ts` maps a thrown error from this path onto its `network` variant.
 */
export async function createVehicle(input: CreateVehicleInput): Promise<Tables<'vehicles'>> {
  if (DATA_SOURCE.createVehicle === 'live') return notImplemented('createVehicle');
  const parsed = createVehicleInputSchema.parse(input);
  await new Promise((resolve) => setTimeout(resolve, MOCK_CREATE_LATENCY_MS));
  return mocks.createMockVehicle(parsed);
}

// ── Live-mode current_state subscription (Realtime seam) ──────────────────────
// Unlike the read fetchers above, this capability is a *push* stream, not a
// one-shot fetch: the live screen opens it on mount and tears it down on unmount.
// The interface below is the seam's own contract — deliberately NOT the shape of
// the real `subscribeToCurrentState` in @caeorta/supabase, which (a) needs a
// CaeortaSupabaseClient, (b) returns a RealtimeChannel (teardown is the separate
// async `unsubscribe(client, channel)`), and (c) emits no channel status. When
// this capability is promoted to 'live', wire an adapter in the live branch below
// that maps that helper onto this `(vehicleId, onUpdate, onChannelStatus) => () => void`
// contract (channel → unsubscribe closure; Supabase SUBSCRIBED/CHANNEL_ERROR/CLOSED
// → 'open'/'connecting'/'closed'). Keeping the adapter here preserves the seam's
// zero-Supabase-import, plain-Node-testable property (see the module header).

/** Emitter callbacks/return shared by the mock and (future) live subscription branches. */
export type CurrentStateUpdate = (payload: Tables<'current_state'>) => void;
export type ChannelStatusUpdate = (status: 'open' | 'connecting' | 'closed') => void;
export type Unsubscribe = () => void;

/** Mock emitter timings — visible-but-brisk connect, then a steady 2 s push cadence. */
const MOCK_SUB_CONNECT_MS = 500;
const MOCK_SUB_TICK_MS = 2000;

/**
 * Mock live-mode emitter. Immediately reports 'connecting', flips to 'open' after
 * ~500 ms, then pushes a fresh {@link Tables}<'current_state'> every 2 s (one
 * provisional metric nudged per tick so the UI visibly updates — see
 * `mocks.currentStateTick`). The returned unsubscribe clears every timer and
 * reports 'closed'; it is safe to call at any point (before or after 'open').
 *
 * This matches the seam's subscription contract exactly (see the block comment
 * above), so the live screen's lifecycle code is identical whether the source is
 * mock or live.
 */
export function subscribeToCurrentStateMock(
  vehicleId: string,
  onUpdate: CurrentStateUpdate,
  onChannelStatus: ChannelStatusUpdate,
): Unsubscribe {
  onChannelStatus('connecting');

  let tick = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const connectTimer = setTimeout(() => {
    onChannelStatus('open');
    intervalId = setInterval(() => {
      onUpdate(mocks.currentStateTick(vehicleId, tick));
      tick += 1;
    }, MOCK_SUB_TICK_MS);
  }, MOCK_SUB_CONNECT_MS);

  return () => {
    clearTimeout(connectTimer);
    if (intervalId !== null) clearInterval(intervalId);
    onChannelStatus('closed');
  };
}

/**
 * THE subscription swap point (mirrors the `fetch*` factories). The live screen
 * calls this, never the branch functions directly. Mock: {@link subscribeToCurrentStateMock}.
 * Live: throws {@link notImplemented} — resolve TODO(metric-keys) and wire the
 * @caeorta/supabase adapter (see the block comment above) before flipping
 * `DATA_SOURCE.currentStateSubscription` to 'live'.
 */
export function subscribeToCurrentStateSource(
  vehicleId: string,
  onUpdate: CurrentStateUpdate,
  onChannelStatus: ChannelStatusUpdate,
): Unsubscribe {
  if (DATA_SOURCE.currentStateSubscription === 'live') return notImplemented('currentStateSubscription');
  return subscribeToCurrentStateMock(vehicleId, onUpdate, onChannelStatus);
}
