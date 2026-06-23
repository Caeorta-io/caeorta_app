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
import type { Tables } from '@caeorta/supabase';

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
  | 'recentDiagnostics'
  | 'currentState';

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
  recentDiagnostics: ENV_DEFAULT,
  currentState: ENV_DEFAULT,
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
