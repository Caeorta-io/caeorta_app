/**
 * New-DTC in-app notification — the preference gate, the "new" predicate, the selection
 * both feed, and the pure half of the seen-set persistence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IN-APP ONLY. This module has NOTHING to do with OS push notifications. There is no
 * `expo-notifications`, no APNs/FCM token, no permission prompt and no background
 * delivery anywhere in it, deliberately: design §4.3 says a **warning** "triggers a
 * push notification", and that half is Week-7 work (`docs/08` § Week 7), gated on
 * Apple Developer enrollment. What ships here is the surface a user sees *inside the
 * running app* — the Week-5 line item "In-app notification when new DTCs detected
 * after sync". Do not grow this module toward push; Week 7 owns that.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No React / React-Native / Expo imports, so this is unit-testable in plain
 * Node/vitest — the same convention as `dtc.ts`, `diagnostics.ts` and `driveHealth.ts`.
 * The native I/O half (SecureStore read/write) lives in `dtcSeen.ts` and imports the
 * pure helpers below, never the other way round.
 */
import type { Dtc } from '@caeorta/types';

import {
  compareDtcsForList,
  deriveDtcBadgeSeverity,
  deriveDtcStatus,
  type DtcBadgeSeverity,
} from './dtc';

// ─── The preference model (design §6 `S8`) ───────────────────────────────────

/**
 * Per-severity notification preferences — design §6 `S8 · Notification prefs`:
 * "**Critical = Always**, Warning on, Info off, Insufficient off".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(s8-prefs): THE S8 SCREEN DOES NOT EXIST YET. `docs/08` schedules the
 *   "Notification preferences screen: per-severity toggle, quiet hours, per-vehicle
 *   settings" in **Week 7**, alongside push — and S7 (Settings), its only entry point
 *   per design §7's link graph, isn't built either. So this type plus
 *   {@link DEFAULT_DTC_NOTIFICATION_PREFS} plus the in-memory `useDtcNotificationPrefsStore`
 *   slice ARE the whole preference model today: real, typed, gate-honoured, and not yet
 *   user-editable. Week 7 adds the screen and the persistence BEHIND this shape; the
 *   gate below should need no edit. Deliberately built to the design's model rather than
 *   hardcoding `true` at the call site, so the Week-7 screen is a UI + storage task and
 *   not a re-derivation of which tier notifies. Founder call, session 36.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Keyed off {@link DtcBadgeSeverity} by construction (a mapped type over the tier union,
 * not a hand-written record), which is the same structural tie `DtcGroups` uses against
 * `DtcGrouping`: adding a tier to the badge-severity union turns
 * {@link DEFAULT_DTC_NOTIFICATION_PREFS} into a COMPILE ERROR rather than a silently
 * ungated tier. A tier that nobody remembered to default would otherwise fall through
 * `prefs[tier]` as `undefined` — off, which is quiet and safe, but silent.
 *
 * `critical` is typed as the literal `true`, not `boolean`. That is the type system
 * carrying "Critical = Always": the S8 screen physically cannot bind a toggle that
 * turns it off, and nothing can construct a prefs object that silences a critical code.
 */
export type DtcNotificationPrefs = {
  readonly [Tier in Exclude<DtcBadgeSeverity, 'critical'>]: boolean;
} & {
  /** Always on. See the note above on why this is `true` and not `boolean`. */
  readonly critical: true;
};

/** Re-exported so consumers of the prefs model don't also have to import `lib/dtc`. */
export type { DtcBadgeSeverity };

/**
 * The design's S8 defaults, verbatim: Critical always, Warning on, Info off,
 * Insufficient off.
 *
 * `unknown` is this app's off-ladder tier (`deriveDtcBadgeSeverity`'s fallback for an
 * unreadable `severity_raw`) and is what S8's "Insufficient off" maps onto here — both
 * mean "we could not rank this", and §4.3 gives them the same off-ladder treatment.
 * Defaulting it OFF is also the honest direction: notifying about a code whose severity
 * we cannot read would assert an urgency we don't have (§8, calibrated honesty), and
 * the code is still visible on S5 either way — it just doesn't interrupt.
 */
export const DEFAULT_DTC_NOTIFICATION_PREFS: DtcNotificationPrefs = {
  critical: true,
  warning: true,
  info: false,
  unknown: false,
};

// ─── The gate ────────────────────────────────────────────────────────────────

/**
 * CANONICAL "should this DTC interrupt the user?" test — the S8 preference gate.
 *
 * REUSES {@link deriveDtcBadgeSeverity} for the severity tier and introduces NO second
 * severity vocabulary. That reuse is the whole point of this function's shape: the tier
 * that tints a code's badge on S5/S6 is by construction the same tier that decides
 * whether it notifies, so a code shown as Warning can never be gated as Info. The
 * `severity_raw → tier` rule stays in exactly one place (`lib/dtc.ts`), as does its
 * `unknown` fallback and its no-throw guarantee.
 *
 * The tier union and the preference keys are the same names, so the map is the identity
 * — deliberately, and enforced by {@link DtcNotificationPrefs} being a mapped type over
 * the tier union. There is no lookup table here to drift out of sync with the ladder.
 *
 * NEVER THROWS. `deriveDtcBadgeSeverity` already absorbs null / blank / non-string /
 * unrecognised `severity_raw`. The `=== true` comparison (rather than a truthiness
 * check) absorbs the other side: a prefs object arriving from a future persisted blob
 * with a missing or non-boolean key reads as OFF. Both failure directions are silence,
 * never a spurious interruption — the safe way to be wrong for something whose job is
 * to interrupt.
 */
export function shouldNotifyForDtc(
  dtc: Pick<Dtc, 'severity_raw'>,
  prefs: DtcNotificationPrefs,
): boolean {
  const tier = deriveDtcBadgeSeverity(dtc.severity_raw);
  return prefs[tier] === true;
}

// ─── The "new" predicate ─────────────────────────────────────────────────────

/**
 * CANONICAL "is this DTC new to the user?" test.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * "NEW" MEANS **UNACKNOWLEDGED**, NOT **RECENT**. Founder call, session 36.
 *
 * The alternative was a recency window on `first_seen_at`, which was rejected for two
 * concrete reasons: (1) it re-notifies on EVERY app open until the window lapses, which
 * is exactly the nag this surface must not become; and (2) `first_seen_at` records when
 * the ECU first reported the code, which is not when the *user* first saw it — a code
 * that set three weeks ago and was never opened is still news to its owner, and one
 * seen ten minutes ago is not.
 *
 * The cost of this choice is that it needs a seen/ack state, and **`dtcs` has no such
 * column** — see `dtcSeen.ts` and CF-36. `diagnostic_outputs` HAS one
 * (`status text CHECK (status IN ('new','seen','dismissed','actioned'))`); `dtcs`
 * carries only `is_active` / `cleared_at` / `first_seen_at` / `last_seen_at`. So the
 * acknowledged-set is App-local today, and this predicate is where a future
 * server-side `dtcs.status` would land instead.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A cleared code never notifies, however unacknowledged: "history" is resolved news.
 * That check routes through {@link deriveDtcStatus} rather than reading `is_active`
 * inline, so it inherits the canonical Active/Pending/History rule — including the
 * degrade-to-visible fallback, and including CF-29's eventual two-group collapse, which
 * this function will follow without an edit. A **pending** code DOES notify: the ECU has
 * seen the fault, S5 shows it as a real group, and staying silent about it would be the
 * app knowing something the user doesn't.
 *
 * Pure; never throws for a structurally valid `Dtc`.
 */
export function isNewDtc(dtc: Dtc, seenIds: ReadonlySet<string>): boolean {
  if (deriveDtcStatus(dtc) === 'history') return false;
  return !seenIds.has(dtc.id);
}

/**
 * THE selection the in-app banner renders: every DTC that is both {@link isNewDtc} and
 * {@link shouldNotifyForDtc}, ordered exactly as S5 orders its rows.
 *
 * Ordering reuses {@link compareDtcsForList} — badge severity (critical → warning →
 * info → unknown), then `last_seen_at` newest-first — rather than re-sorting here, so
 * the banner's "most urgent first" and S5's in-group order can never disagree. It is
 * applied ACROSS groups, not within them: a critical pending code outranks an info
 * active one, because a banner's job is triage, not filing.
 *
 * NEVER THROWS, for any input. This is the one function on the path that touches
 * unvalidated collections, so it absorbs a non-array `dtcs` (the hook's `data` before
 * it resolves, or an error-state value), non-object elements, and elements missing the
 * fields the derivations read. Anything it can't understand is DROPPED rather than
 * surfaced — a malformed row must not manufacture an interruption. Returns a new array;
 * does not mutate the input.
 */
export function selectNewDtcNotifications(
  dtcs: readonly Dtc[] | null | undefined,
  seenIds: ReadonlySet<string>,
  prefs: DtcNotificationPrefs,
): Dtc[] {
  if (!Array.isArray(dtcs)) return [];

  const selected: Dtc[] = [];
  for (const dtc of dtcs) {
    // Defensive: `Dtc[]` is the declared type, but this array can originate from an
    // unvalidated live PostgREST read once `DATA_SOURCE.dtcs` flips. A row without an
    // `id` can't be acknowledged (it would re-notify forever), so it is dropped too.
    if (dtc === null || typeof dtc !== 'object') continue;
    if (typeof dtc.id !== 'string' || dtc.id.length === 0) continue;
    if (!isNewDtc(dtc, seenIds)) continue;
    if (!shouldNotifyForDtc(dtc, prefs)) continue;
    selected.push(dtc);
  }

  return selected.sort(compareDtcsForList);
}

// ─── Seen-set persistence — the PURE half (I/O lives in `dtcSeen.ts`) ────────

/**
 * How many acknowledged DTC ids are retained, oldest evicted first.
 *
 * Bounded because the set is persisted in `expo-secure-store`, which warns above ~2048
 * bytes per value (the same constraint already noted on the Supabase session adapter in
 * `lib/supabase.ts`). A uuid serialises to ~39 bytes inside a JSON array, so 40 ids is
 * ~1.6 KB — comfortably under, with room for the wrapper.
 *
 * The eviction is a real, if remote, trade-off: a code acknowledged long ago could
 * re-notify if it is STILL active or pending after 40 further codes have been
 * acknowledged on that device. A vehicle carries single-digit active codes in practice,
 * so this is not expected to fire; it is documented rather than hidden because it is the
 * one way this surface can nag. A server-side `dtcs.status` (CF-36) retires the cap
 * entirely.
 */
export const MAX_SEEN_DTC_IDS = 40;

/**
 * Parse a persisted seen-set payload into ids. NEVER THROWS — this is a boundary parse
 * over a string that a previous app version wrote, so every failure mode (absent,
 * malformed JSON, a non-array, non-string elements) degrades to "nothing acknowledged".
 *
 * Degrading to EMPTY means a storage fault re-shows the banner rather than silently
 * suppressing it. That is the correct direction to fail: a repeated notification is
 * visible and recoverable (dismiss it again); a silently swallowed critical code is not.
 */
export function parseSeenDtcIds(raw: string | null | undefined): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Ids → the persisted payload. Inverse of {@link parseSeenDtcIds}. */
export function serializeSeenDtcIds(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

/**
 * Fold newly-acknowledged ids into the existing set: append-only, de-duplicated, and
 * capped at {@link MAX_SEEN_DTC_IDS} by dropping from the FRONT (oldest acknowledged).
 *
 * Order carries the eviction policy, so it is meaningful data, not incidental — the
 * array is oldest-first. Re-acknowledging an id already present does NOT move it to the
 * back; keeping its original position means a long-lived code can eventually age out
 * rather than pinning itself in the set forever.
 *
 * Pure; never throws; does not mutate either input. Non-string / empty ids are ignored,
 * so a malformed row can't poison the store.
 */
export function mergeSeenDtcIds(
  existing: readonly string[],
  incoming: readonly string[],
): string[] {
  const merged = [...existing];
  const present = new Set(existing);

  for (const id of incoming) {
    if (typeof id !== 'string' || id.length === 0) continue;
    if (present.has(id)) continue;
    present.add(id);
    merged.push(id);
  }

  return merged.length > MAX_SEEN_DTC_IDS ? merged.slice(merged.length - MAX_SEEN_DTC_IDS) : merged;
}
