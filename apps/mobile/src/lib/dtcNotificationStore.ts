/**
 * Client state for the new-DTC in-app notification: the S8 preference slice and the
 * acknowledged ("seen") DTC set, plus the SecureStore I/O the latter needs.
 *
 * SPLIT FROM `dtcNotifications.ts` ON PURPOSE. That module is the pure core — the gate,
 * the predicate, the selection, the parse/merge helpers — and holds zero React-Native or
 * Expo imports so it runs under plain Node/vitest. THIS module is where the native
 * dependency (`expo-secure-store`) and the mutable state live. The dependency arrow
 * points one way only: this file imports the pure helpers, never the reverse. Same
 * reasoning as `lib/data/source.ts` deliberately not importing the Supabase client.
 *
 * Kept out of `lib/store.ts` for the same reason: that slice is pure in-memory auth
 * state with no native import, and pulling SecureStore into it would drag a native
 * module into every graph that touches auth.
 */
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import {
  DEFAULT_DTC_NOTIFICATION_PREFS,
  mergeSeenDtcIds,
  parseSeenDtcIds,
  serializeSeenDtcIds,
  type DtcNotificationPrefs,
} from './dtcNotifications';

// ─── S8 notification preferences (in-memory) ─────────────────────────────────

interface DtcNotificationPrefsState {
  /** The active per-severity preferences. Starts at the design's S8 defaults. */
  prefs: DtcNotificationPrefs;
  /**
   * Replace the non-always tiers. `critical` is absent from the input by type — it is
   * the literal `true` in {@link DtcNotificationPrefs} and cannot be turned off.
   */
  setPrefs: (next: Omit<DtcNotificationPrefs, 'critical'>) => void;
}

/**
 * The S8 preference slice.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(s8-prefs): IN-MEMORY ONLY, AND NOT YET USER-EDITABLE. There is no S8 screen to
 *   drive `setPrefs` — `docs/08` schedules it (with quiet hours and per-vehicle
 *   settings) in **Week 7**, alongside push. This slice exists now so the notification
 *   gate reads a real preference object rather than a hardcoded constant, which is what
 *   makes Week 7 a UI + persistence task instead of a re-derivation of the tier rules.
 *   Week 7 adds the screen and swaps this `create()` for a persisted one; nothing that
 *   READS `prefs` should need to change. Founder call, session 36.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Not persisted, which is currently invisible: with no screen the value never leaves
 * its defaults, so there is nothing a restart could lose. Do not add persistence here
 * ahead of the screen — Week 7 should choose one storage for prefs + quiet hours
 * together rather than inheriting a half-measure.
 */
export const useDtcNotificationPrefsStore = create<DtcNotificationPrefsState>((set) => ({
  prefs: DEFAULT_DTC_NOTIFICATION_PREFS,
  setPrefs: (next) => set({ prefs: { ...next, critical: true } }),
}));

// ─── Acknowledged ("seen") DTC ids (persisted) ───────────────────────────────

/**
 * SecureStore key for the acknowledged-id set.
 *
 * `expo-secure-store` rather than AsyncStorage for one practical reason: it is ALREADY a
 * dependency (it backs the Supabase session adapter in `lib/supabase.ts`) and therefore
 * already inside the existing development build. Adding
 * `@react-native-async-storage/async-storage` would mean a new native module and a new
 * dev build for a set of uuids. This is not secret data and does not need encryption at
 * rest; it is using the storage that is already there. If Week 7 adds AsyncStorage for
 * preferences anyway, moving this alongside it is a two-line change — the pure helpers
 * in `dtcNotifications.ts` are storage-agnostic.
 */
const SEEN_DTC_IDS_KEY = 'caeorta.dtc.seen';

interface DtcSeenState {
  /** Acknowledged DTC ids, oldest-first (the order carries the eviction policy). */
  seenIds: string[];
  /**
   * False until {@link hydrate} has resolved. The banner MUST NOT render while this is
   * false: `seenIds` starts empty, so rendering early would flash an already-dismissed
   * notification for a frame before hydration clears it.
   */
  hydrated: boolean;
  /** Read the persisted set once, on first mount. Idempotent; never rejects. */
  hydrate: () => Promise<void>;
  /** Acknowledge ids: merge in memory, then write through. Never rejects. */
  markSeen: (ids: readonly string[]) => void;
}

/**
 * The acknowledged-DTC set — what makes "new" mean *unacknowledged* rather than *recent*
 * (see `dtcNotifications.ts` `isNewDtc`), and therefore what stops this surface
 * re-notifying on every app open.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(dtc-seen-state) → CF-36. THIS IS AN APP-LOCAL STOPGAP FOR A MISSING COLUMN.
 *   `dtcs` has no seen/ack state at all: it carries `is_active`, `cleared_at`,
 *   `first_seen_at`, `last_seen_at` and nothing else. `diagnostic_outputs` — the
 *   adjacent table — DOES have one (`status text CHECK (status IN
 *   ('new','seen','dismissed','actioned'))`), which is the shape a `dtcs` equivalent
 *   would take. Consequences of the local set, all of them real:
 *     • It is PER-DEVICE. A second device re-notifies for codes already dismissed.
 *     • It does not survive reinstall or a cleared app storage.
 *     • It is capped (see `MAX_SEEN_DTC_IDS`), so it can evict.
 *   None of these are fixable App-side; all of them disappear if Platform adds the
 *   column. Do NOT grow this into a general local-mirror layer in the meantime.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const useDtcSeenStore = create<DtcSeenState>((set, get) => ({
  seenIds: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;

    let raw: string | null = null;
    try {
      raw = await SecureStore.getItemAsync(SEEN_DTC_IDS_KEY);
    } catch {
      // A read fault degrades to "nothing acknowledged", which re-shows the banner
      // rather than silently suppressing it — see `parseSeenDtcIds`. Still mark hydrated
      // so the UI unblocks; a broken keystore must not hide the surface forever.
      raw = null;
    }

    set({ seenIds: parseSeenDtcIds(raw), hydrated: true });
  },

  markSeen: (ids) => {
    const merged = mergeSeenDtcIds(get().seenIds, ids);
    // Optimistic: update memory first so the banner dismisses immediately. A failed
    // write means the dismissal holds for this session and the banner returns on the
    // next launch — visibly wrong in the harmless direction, and not worth blocking
    // the tap on I/O.
    set({ seenIds: merged });
    void SecureStore.setItemAsync(SEEN_DTC_IDS_KEY, serializeSeenDtcIds(merged)).catch(() => {
      // Intentionally swallowed. Acknowledging a notification is not an operation worth
      // interrupting the user to report a failure of.
    });
  },
}));
