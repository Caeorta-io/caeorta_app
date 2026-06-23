/**
 * Canonical connection-state derivation for the vehicle dashboard.
 *
 * Every surface that shows a vehicle's connection status (the list chip, the
 * detail header, any future widget) MUST import {@link deriveConnectionState}
 * rather than re-deriving the rule inline — keeping the "what counts as live /
 * synced / stale" decision in exactly one place.
 *
 * This module is intentionally free of React-Native / React imports so the rule
 * is unit-testable in a plain Node/vitest environment (see the presentational
 * wrapper in `./ConnectionState.tsx`).
 */

/** Realtime channel status, or `null` when Realtime has not been initialised. */
export type ChannelStatus = 'open' | 'connecting' | 'closed' | null;

/** The four derived states, in no particular order. */
export type ConnectionStateValue = 'live' | 'synced' | 'connecting' | 'offline';

/**
 * A `current_state.updated_at` newer than this (relative to now) counts as
 * 'synced'. Four hours: long enough that an opportunistically-syncing device
 * that uploaded "this drive" still reads as recently-synced, short enough that
 * yesterday's data reads as 'offline'.
 */
export const SYNCED_THRESHOLD_MS = 4 * 60 * 60 * 1000;

export interface DeriveConnectionStateInput {
  /** Live Realtime channel status; `null` on surfaces that never open a channel. */
  channelStatus: ChannelStatus;
  /** ISO timestamp from `current_state.updated_at`, or `null` if no row yet. */
  currentStateUpdatedAt: string | null;
  /** Reference "now" in epoch ms. Injectable so the rule is deterministic in tests. */
  now?: number;
}

/**
 * Derive the connection state from channel status + last-sync timestamp.
 *
 * Priority order (first match wins):
 *   1. channelStatus === 'connecting' → 'connecting'
 *   2. channelStatus === 'open'       → 'live'
 *   3. currentStateUpdatedAt within {@link SYNCED_THRESHOLD_MS} of `now` → 'synced'
 *   4. otherwise (stale, future, or null)                                → 'offline'
 *
 * The threshold is strict: a timestamp that is *exactly* `SYNCED_THRESHOLD_MS`
 * old is 'offline', not 'synced'. Future timestamps (negative age, e.g. clock
 * skew) are also treated as 'offline' since they are not a real recent sync.
 */
export function deriveConnectionState({
  channelStatus,
  currentStateUpdatedAt,
  now = Date.now(),
}: DeriveConnectionStateInput): ConnectionStateValue {
  if (channelStatus === 'connecting') return 'connecting';
  if (channelStatus === 'open') return 'live';

  if (currentStateUpdatedAt !== null) {
    const updatedMs = Date.parse(currentStateUpdatedAt);
    if (!Number.isNaN(updatedMs)) {
      const ageMs = now - updatedMs;
      if (ageMs >= 0 && ageMs < SYNCED_THRESHOLD_MS) return 'synced';
    }
  }

  return 'offline';
}
