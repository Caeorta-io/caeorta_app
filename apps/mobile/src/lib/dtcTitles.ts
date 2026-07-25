/**
 * Plain-language DTC titles — THE flip-point for DTC naming.
 *
 * Design §6 (`S5 · DTC list`) calls for "severity-tinted code badges + **plain-language
 * titles**", and §8's voice rules rule out raw ECU jargon in a headline. Neither source
 * the app can reach supplies that today:
 *
 *   • `dtcs.description` is whatever the ECU reported (often null, often terse).
 *   • Platform's `dtc_lookup` table EXISTS on main (migration 20260615000002, 52 seeded
 *     P0xxx codes) but its `description` column is verbatim SAE J2012 wording —
 *     e.g. P0101 → "Mass Air Flow Circuit Range/Performance". That is a correct
 *     *technical* description and precisely the register design §6 rejects for a title.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STOPGAP — NOT a general OBD-II database, and deliberately not one.
 * This map covers ONLY the codes the mock fixtures use (see `lib/data/mocks.ts`), all
 * of which are also rows in the seeded `dtc_lookup`, so promoting this to the live
 * table is a genuine swap rather than a rewrite. Do not grow it into a full code table
 * by hand — that duplicates Platform's seeded data and will drift from it.
 *
 * FLIP POINT: when the DTC seam goes live, `dtc_lookup` supplies `description`,
 * `system`, `severity_hint` and `common_causes` per code (join on `code`, or a cached
 * read — it's public reference data with a permissive RLS SELECT policy). The
 * plain-language TITLE layer below still has no live source at that point: it is an
 * App/content concern, not a schema one. Either keep this map as the title layer over
 * live lookup rows, or agree a `plain_title` column with Platform. Whichever wins,
 * {@link dtcTitle} stays the single call site so nothing else changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * `code` → plain-language title, in the app's calibrated-honesty voice (§8): describe
 * the observed symptom, don't diagnose the cause and don't manufacture alarm.
 *
 * Every key here is present in `supabase/seed_dtc_lookup.sql`; the comment on each line
 * is that row's SAE `description`, so the two registers can be compared at a glance.
 */
const PLAIN_LANGUAGE_TITLES: Record<string, string> = {
  // 'Turbocharger/Supercharger Overboost Condition'
  P0234: 'Turbo is boosting harder than it should',
  // 'Turbocharger/Supercharger Underboost Condition'
  P0299: 'Turbo is not making full boost',
  // 'Coolant Thermostat Below Regulating Temperature'
  P0128: 'Engine is running cooler than it should',
  // 'Cylinder 1 Misfire Detected'
  P0301: 'Cylinder 1 is misfiring',
  // 'System Too Lean (Bank 1)'
  P0171: 'Running lean — more air than fuel',
  // 'Catalyst System Efficiency Below Threshold (Bank 1)'
  P0420: 'Catalytic converter is losing efficiency',
  // 'Intake Air Temperature Circuit High Input'
  P0113: 'Intake air temperature sensor reading high',
};

/**
 * The title to show for a DTC. Never throws and never renders an empty headline:
 *
 *   1. the plain-language title, when the code is covered by the stopgap map above;
 *   2. else the row's own `description` (the ECU's wording — jargon, but true and
 *      better than showing the user nothing);
 *   3. else the raw code itself, which is always present.
 *
 * The fallback chain is why an uncovered code is a degraded headline rather than a
 * blank one — the map's incompleteness is a content gap, not a crash.
 */
export function dtcTitle(dtc: { code: string; description: string | null }): string {
  const plain = PLAIN_LANGUAGE_TITLES[dtc.code];
  if (plain !== undefined) return plain;

  const described = dtc.description?.trim();
  if (described !== undefined && described.length > 0) return described;

  return dtc.code;
}

/**
 * Whether a code has a plain-language title (i.e. is covered by the stopgap). Exported
 * for the coverage test that pins the map to the mock fixtures — if a fixture adds a
 * code with no title, that test fails rather than the gap shipping silently.
 */
export function hasPlainLanguageTitle(code: string): boolean {
  return PLAIN_LANGUAGE_TITLES[code] !== undefined;
}
