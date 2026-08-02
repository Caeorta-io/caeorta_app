import { describe, expect, it } from 'vitest';
import type { Dtc } from '@caeorta/types';

import {
  DEFAULT_DTC_NOTIFICATION_PREFS,
  isNewDtc,
  MAX_SEEN_DTC_IDS,
  mergeSeenDtcIds,
  parseSeenDtcIds,
  selectNewDtcNotifications,
  serializeSeenDtcIds,
  shouldNotifyForDtc,
  type DtcNotificationPrefs,
} from '../dtcNotifications';

/**
 * Unit tests for the new-DTC in-app notification core (`lib/dtcNotifications.ts`).
 *
 * Three properties matter more than the individual cases and are asserted repeatedly:
 *   1. The preference gate REUSES `deriveDtcBadgeSeverity`'s tier — no second severity
 *      vocabulary. Tested by driving the gate with the same raw ECU strings the badge
 *      derivation is specified against (including the fixtures' casing drift).
 *   2. Nothing on this path throws, for any input, including inputs the types forbid.
 *   3. "New" means unacknowledged, so an acknowledged code STAYS acknowledged — the
 *      re-notify-on-every-open failure mode is what the whole design choice avoids.
 */

/** A structurally complete DTC. Overrides let each test state only what it's about. */
function makeDtc(overrides: Partial<Dtc> = {}): Dtc {
  return {
    id: 'dtc-1',
    vehicle_id: 'vehicle-1',
    sync_session_id: null,
    code: 'P0299',
    description: 'Turbocharger/Supercharger Underboost',
    severity_raw: 'warning',
    first_seen_at: '2026-06-21T19:52:40.000Z',
    last_seen_at: '2026-06-22T07:20:15.000Z',
    is_active: true,
    cleared_at: null,
    cleared_by_user_id: null,
    freeze_frame_metrics: null,
    grouping: 'active',
    ...overrides,
  } as Dtc;
}

const NONE: ReadonlySet<string> = new Set<string>();

/** Every tier ON — isolates the tier mapping from the defaults. */
const ALL_ON: DtcNotificationPrefs = { critical: true, warning: true, info: true, unknown: true };

/** Everything that CAN be off, off. `critical` is `true` by type and cannot be. */
const ALL_OFF: DtcNotificationPrefs = {
  critical: true,
  warning: false,
  info: false,
  unknown: false,
};

describe('DEFAULT_DTC_NOTIFICATION_PREFS', () => {
  it('matches the design §6 S8 model exactly: Critical always, Warning on, Info off, Insufficient off', () => {
    expect(DEFAULT_DTC_NOTIFICATION_PREFS).toEqual({
      critical: true,
      warning: true,
      info: false,
      unknown: false,
    });
  });
});

describe('shouldNotifyForDtc', () => {
  it('notifies for critical under the defaults', () => {
    const dtc = makeDtc({ severity_raw: 'critical' });
    expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(true);
  });

  it('notifies for warning under the defaults', () => {
    const dtc = makeDtc({ severity_raw: 'warning' });
    expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(true);
  });

  it('stays silent for info under the defaults', () => {
    const dtc = makeDtc({ severity_raw: 'info' });
    expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(false);
  });

  it('stays silent for an unreadable severity under the defaults', () => {
    const dtc = makeDtc({ severity_raw: 'P-CODE-SEVERITY-7' });
    expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(false);
  });

  it('CRITICAL = ALWAYS — it notifies even when every switchable tier is off', () => {
    const dtc = makeDtc({ severity_raw: 'critical' });
    expect(shouldNotifyForDtc(dtc, ALL_OFF)).toBe(true);
  });

  it('honours the warning preference in both positions', () => {
    const dtc = makeDtc({ severity_raw: 'warning' });
    expect(shouldNotifyForDtc(dtc, ALL_ON)).toBe(true);
    expect(shouldNotifyForDtc(dtc, ALL_OFF)).toBe(false);
  });

  it('honours the info preference in both positions', () => {
    const dtc = makeDtc({ severity_raw: 'info' });
    expect(shouldNotifyForDtc(dtc, ALL_ON)).toBe(true);
    expect(shouldNotifyForDtc(dtc, ALL_OFF)).toBe(false);
  });

  it('honours the unknown preference in both positions', () => {
    const dtc = makeDtc({ severity_raw: null });
    expect(shouldNotifyForDtc(dtc, ALL_ON)).toBe(true);
    expect(shouldNotifyForDtc(dtc, ALL_OFF)).toBe(false);
  });

  // The point of the reuse: these are the exact raw values `deriveDtcBadgeSeverity` is
  // specified against (mocks.ts casing drift included). If the gate ever grew its own
  // severity map, one of these would diverge.
  it.each([
    ['critical', true],
    ['WARN', true],
    ['warning', true],
    ['  Warning  ', true],
    ['info', false],
    ['INFO', false],
    [null, false],
    ['', false],
    ['   ', false],
    ['catastrophic', false],
  ])('reuses the badge tier for severity_raw %o → notifies: %s', (severityRaw, expected) => {
    const dtc = makeDtc({ severity_raw: severityRaw as string | null });
    expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(expected);
  });

  it('never throws, and stays silent, for values the type forbids', () => {
    const nasty = [123, {}, [], true, Symbol('x'), () => undefined];
    for (const severityRaw of nasty) {
      const dtc = makeDtc({ severity_raw: severityRaw as unknown as string });
      expect(() => shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).not.toThrow();
      expect(shouldNotifyForDtc(dtc, DEFAULT_DTC_NOTIFICATION_PREFS)).toBe(false);
    }
  });

  it('treats a prefs object missing a tier as OFF rather than throwing', () => {
    // Reachable if a future persisted prefs blob predates a tier being added.
    const partial = { critical: true } as unknown as DtcNotificationPrefs;
    expect(shouldNotifyForDtc(makeDtc({ severity_raw: 'warning' }), partial)).toBe(false);
    expect(shouldNotifyForDtc(makeDtc({ severity_raw: 'critical' }), partial)).toBe(true);
  });

  it('treats a non-boolean preference value as OFF', () => {
    const truthyString = {
      critical: true,
      warning: 'yes',
      info: 1,
      unknown: {},
    } as unknown as DtcNotificationPrefs;
    expect(shouldNotifyForDtc(makeDtc({ severity_raw: 'warning' }), truthyString)).toBe(false);
    expect(shouldNotifyForDtc(makeDtc({ severity_raw: 'info' }), truthyString)).toBe(false);
  });
});

describe('isNewDtc', () => {
  it('is new when active and unacknowledged', () => {
    expect(isNewDtc(makeDtc(), NONE)).toBe(true);
  });

  it('is NOT new once acknowledged', () => {
    expect(isNewDtc(makeDtc({ id: 'dtc-7' }), new Set(['dtc-7']))).toBe(false);
  });

  it('is new for a pending code — the ECU has seen the fault', () => {
    expect(isNewDtc(makeDtc({ grouping: 'pending' }), NONE)).toBe(true);
  });

  it('is NEVER new for a cleared code, even if never acknowledged', () => {
    const cleared = makeDtc({
      grouping: 'history',
      is_active: false,
      cleared_at: '2026-06-14T17:05:44.000Z',
    });
    expect(isNewDtc(cleared, NONE)).toBe(false);
  });

  it('acknowledgement is per-id, not per-code', () => {
    const seen = new Set(['dtc-1']);
    expect(isNewDtc(makeDtc({ id: 'dtc-1' }), seen)).toBe(false);
    // Same code, different row — a fault that came back is news again.
    expect(isNewDtc(makeDtc({ id: 'dtc-2' }), seen)).toBe(true);
  });
});

describe('selectNewDtcNotifications', () => {
  it('returns [] for a vehicle with no codes', () => {
    expect(selectNewDtcNotifications([], NONE, DEFAULT_DTC_NOTIFICATION_PREFS)).toEqual([]);
  });

  it('applies BOTH gates — new AND preference-enabled', () => {
    const dtcs = [
      makeDtc({ id: 'crit', severity_raw: 'critical' }),
      makeDtc({ id: 'warn', severity_raw: 'warning' }),
      makeDtc({ id: 'info', severity_raw: 'info' }), // gated off by prefs
      makeDtc({ id: 'seen-crit', severity_raw: 'critical' }), // gated off by acknowledgement
      makeDtc({ id: 'cleared', severity_raw: 'critical', grouping: 'history' }), // not new
    ];

    const result = selectNewDtcNotifications(
      dtcs,
      new Set(['seen-crit']),
      DEFAULT_DTC_NOTIFICATION_PREFS,
    );

    expect(result.map((dtc) => dtc.id)).toEqual(['crit', 'warn']);
  });

  it('orders by severity first, then recency — across groupings', () => {
    const dtcs = [
      makeDtc({ id: 'warn-new', severity_raw: 'warning', last_seen_at: '2026-06-22T09:00:00Z' }),
      makeDtc({
        id: 'crit-pending-old',
        severity_raw: 'critical',
        grouping: 'pending',
        last_seen_at: '2026-06-20T09:00:00Z',
      }),
      makeDtc({ id: 'warn-old', severity_raw: 'warning', last_seen_at: '2026-06-21T09:00:00Z' }),
    ];

    const result = selectNewDtcNotifications(dtcs, NONE, DEFAULT_DTC_NOTIFICATION_PREFS);

    // The critical PENDING code outranks both active warnings: a banner triages, it
    // does not file. Then the two warnings, newest-first.
    expect(result.map((dtc) => dtc.id)).toEqual(['crit-pending-old', 'warn-new', 'warn-old']);
  });

  it('does not mutate its input', () => {
    const dtcs = [
      makeDtc({ id: 'a', severity_raw: 'warning' }),
      makeDtc({ id: 'b', severity_raw: 'critical' }),
    ];
    const order = dtcs.map((dtc) => dtc.id);

    selectNewDtcNotifications(dtcs, NONE, DEFAULT_DTC_NOTIFICATION_PREFS);

    expect(dtcs.map((dtc) => dtc.id)).toEqual(order);
  });

  it('NEVER THROWS on the query shapes that are not an array', () => {
    for (const input of [null, undefined]) {
      expect(() =>
        selectNewDtcNotifications(input, NONE, DEFAULT_DTC_NOTIFICATION_PREFS),
      ).not.toThrow();
      expect(selectNewDtcNotifications(input, NONE, DEFAULT_DTC_NOTIFICATION_PREFS)).toEqual([]);
    }
  });

  it('NEVER THROWS on malformed rows, and drops them rather than surfacing them', () => {
    const dtcs = [
      null,
      undefined,
      42,
      'P0299',
      {},
      { id: '' },
      { id: 'no-fields' },
      makeDtc({ id: 'good', severity_raw: 'critical' }),
    ] as unknown as Dtc[];

    let result: Dtc[] = [];
    expect(() => {
      result = selectNewDtcNotifications(dtcs, NONE, DEFAULT_DTC_NOTIFICATION_PREFS);
    }).not.toThrow();

    // A row we cannot read must not manufacture an interruption.
    expect(result.map((dtc) => dtc.id)).toEqual(['good']);
  });

  it('goes quiet once everything surfaced has been acknowledged — the no-re-notify property', () => {
    const dtcs = [
      makeDtc({ id: 'crit', severity_raw: 'critical' }),
      makeDtc({ id: 'warn', severity_raw: 'warning' }),
    ];

    const first = selectNewDtcNotifications(dtcs, NONE, DEFAULT_DTC_NOTIFICATION_PREFS);
    expect(first).toHaveLength(2);

    // Simulates dismiss → next app open with the SAME rows (nothing about the DTC
    // changed; only the acknowledged-set did).
    const acknowledged = new Set(first.map((dtc) => dtc.id));
    expect(selectNewDtcNotifications(dtcs, acknowledged, DEFAULT_DTC_NOTIFICATION_PREFS)).toEqual(
      [],
    );
  });
});

describe('seen-set persistence helpers', () => {
  it('round-trips ids through serialize → parse', () => {
    const ids = ['a', 'b', 'c'];
    expect(parseSeenDtcIds(serializeSeenDtcIds(ids))).toEqual(ids);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['malformed JSON', '{not json'],
    ['a JSON object', '{"a":1}'],
    ['a JSON string', '"nope"'],
    ['a JSON number', '7'],
  ])('parses %s as "nothing acknowledged" without throwing', (_label, raw) => {
    expect(() => parseSeenDtcIds(raw)).not.toThrow();
    expect(parseSeenDtcIds(raw)).toEqual([]);
  });

  it('drops non-string and empty elements from a persisted array', () => {
    expect(parseSeenDtcIds('["a",1,null,"",{"b":2},"c"]')).toEqual(['a', 'c']);
  });

  it('merges append-only and de-duplicates', () => {
    expect(mergeSeenDtcIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('does not reorder an id that is re-acknowledged', () => {
    expect(mergeSeenDtcIds(['a', 'b', 'c'], ['a'])).toEqual(['a', 'b', 'c']);
  });

  it('ignores malformed incoming ids', () => {
    const incoming = ['ok', '', null, 3, undefined] as unknown as string[];
    expect(mergeSeenDtcIds(['a'], incoming)).toEqual(['a', 'ok']);
  });

  it(`caps at ${MAX_SEEN_DTC_IDS}, evicting oldest-first`, () => {
    const existing = Array.from({ length: MAX_SEEN_DTC_IDS }, (_, i) => `id-${i}`);
    const merged = mergeSeenDtcIds(existing, ['newest']);

    expect(merged).toHaveLength(MAX_SEEN_DTC_IDS);
    expect(merged[0]).toBe('id-1'); // 'id-0' evicted
    expect(merged.at(-1)).toBe('newest');
  });

  it('stays under the SecureStore ~2048-byte warning threshold when full', () => {
    // uuids are the real payload; the cap exists to keep this true.
    const full = Array.from(
      { length: MAX_SEEN_DTC_IDS },
      (_, i) => `f47ac10b-58cc-4372-a567-0e02b2c3d${String(i).padStart(3, '0')}`,
    );
    expect(serializeSeenDtcIds(full).length).toBeLessThan(2048);
  });

  it('never throws on empty inputs', () => {
    expect(() => mergeSeenDtcIds([], [])).not.toThrow();
    expect(mergeSeenDtcIds([], [])).toEqual([]);
  });
});
