# Carry-Forwards Registry

The single canonical, living registry of every item carried forward across the
whole project — both tracks (App / Platform), Week 1 onward. It consolidates
what used to be scattered across `docs/08`'s per-week close tables, `docs/09`'s
risk register, and `docs/workdiary.md`'s per-session "open items rolled
forward" notes.

**Read this before planning any new week.** It answers "what is still
outstanding, who owns it, and what unblocks it" without re-deriving from the
git log or re-reading every session entry.

## How this file relates to the others

- **`docs/08_12_Week_Action_Plan.md`** keeps each week's *narrative* ("what
  shipped, how it diverged"). Its per-week close tables now carry a one-line
  summary + a pointer here rather than duplicating the detail.
- **`docs/09_Risks_And_Mitigations.md`** keeps the *risk* lens
  (likelihood / impact / mitigation). Where a risk is *also* a concrete
  outstanding work item (R1, R11, R14, R19, R20, R21, R22), the risk carries a
  one-line cross-reference to the matching `CF-xx` entry here. Pure
  forward-looking risks with no unfinished task attached (R2, R6, R9, R16, …)
  do **not** appear here — this file is work items, not the watch list.
- **`docs/workdiary.md`** keeps the chronological, per-session record. Every
  entry below cross-references the workdiary session(s) it came from so the
  trail back is visible.

## Entry schema

Every item uses the same fields:

- **ID** — sequential (`CF-01`, …). Stable; don't renumber on resolution.
- **Title** — short name.
- **Category** — one of the groups below.
- **Origin** — the week / session / PR it was first carried from.
- **Current status** — re-verified against `main` as of the date shown, with
  the verification method stated. Not transcribed from an older table.
- **What's needed to resolve** — the concrete unblock.
- **Owner** — App track / Platform track / hardware team / AI-agent team /
  designer / founder decision.
- **Cross-references** — which risk, week-close row, and workdiary session(s)
  also mention this, so nothing is silently duplicated without a trail.

## Categories

The suggested taxonomy, extended where an item genuinely didn't fit the
original six:

- **Platform-blocked** — App-track work waiting on a Platform-track deliverable.
- **Cross-track dependency / flag** — needs explicit cross-track agreement, or
  is another track's outstanding work the App track must keep visible.
- **Provisional-value-reconciliation** — placeholder keys/values awaiting a
  canonical source; a mismatch is silently wrong, not compiler-caught.
- **On-device / integration verification pending** *(added)* — built +
  unit-tested, but not yet observed on real hardware or at scale.
- **App-build dependency** *(added)* — a near-term App-track build feeding an
  upcoming week.
- **Week-8-deferred-by-design** — deliberately parked for the polish week.
- **Infra / tooling queued** — Platform infra promotions, repo hygiene,
  dependency cleanups, funding-gated activations.
- **Documentation-gap** — a doc that doesn't match shipped reality.
- **Founder logistics** — process/setup actions still open; lower priority,
  tracked here so nothing is silently dropped.

> **Verification date for all "Current status" lines below: 2026-07-05**
> (branched off `origin/main` `697a652`, which includes App-track session 30).
>
> **Partial re-verification 2026-07-26** (session 33, off `origin/main` `c0b1119`).
> `main` moved a long way in between — Platform sessions 12–13 landed
> `create_vehicle`, `dtcs.freeze_frame_metrics`, the `dtc_lookup` table and the admin
> device-detail page. Entries **CF-01**, **CF-05** and **CF-13** were re-checked and
> their status lines updated; **CF-28**, **CF-29** and **CF-30** were added. Every
> other entry still carries its 2026-07-05 verification and may be stale — re-verify
> before relying on one.
>
> **Partial re-verification 2026-08-02** (session 35, off `origin/main` `f0af131`).
> **CF-13 is CLOSED** (the last Diagnostic Card stand-in retired). **CF-28** gained the
> S6 empty-panel note, and **CF-34** (S5/S6 built-from-spec, Figma parity unchecked) and
> **CF-35** (S6's "what it means" / likely-causes have no content source) were added.
> `dtcs` was re-confirmed to carry `freeze_frame_metrics` and still no pending/status
> column, so **CF-29**'s premise holds unchanged. Entries not named here were not
> re-checked this pass.

---

## Platform-blocked

### CF-01 — `create_vehicle` end-to-end verification

- **Category:** Platform-blocked
- **Origin:** Week 3. Decision session 19 (2026-06-22); wire contract authored
  session 21 (2026-06-23, `docs/create_vehicle_contract.md`); recorded in the
  Week-3 close table, session 24 (PR #30).
- **Current status:** **Platform half now DONE; App half still open.** Re-verified
  against `origin/main` on 2026-07-26: `create_vehicle` **exists** (Platform session
  12, commit `1dc0589`; 11 functions now present). This supersedes the previous
  "still absent" status recorded on 2026-07-05. The App-side add-vehicle flow
  (`lib/vehicles.ts`, form, Zod, result states) is built and unit-tested against the
  contract, but `DATA_SOURCE.createVehicle` is **still `'mock'`**, the live `fetch`
  is unwired, and no E2E run has happened — so this stays "built, not E2E-verified."
  The `ecu_type` open question below is also still unresolved.
- **What's needed to resolve:** Platform deploys `create_vehicle`; both tracks
  agree the contract's `ecu_type` open question (currently free text
  `z.string().min(1).max(60)` until the hardware track locks a canonical set);
  then App flips `DATA_SOURCE.createVehicle` → `'live'` in `source.ts`, wires
  the live `fetch`, and runs the add-vehicle flow on-device with a claimed
  `device_id`, confirming a `vehicles` row with correct `owner_user_id` /
  `device_id` / fields.
- **Owner:** Platform track (Edge Function) + App track (live-branch wiring +
  E2E run).
- **Cross-references:** `docs/08` Week-3 close table; `docs/05` `vehicles`
  Platform-track note; `docs/create_vehicle_contract.md`; workdiary sessions
  19, 21, 24, 29, 30.

---

## Cross-track dependency / flag

### CF-02 — Live Realtime swap requires a cross-track adapter (R21)

- **Category:** Cross-track dependency / flag
- **Origin:** Week 3 close, session 23 (live mode, PR #29); formalized as R21
  in session 24 (PR #30).
- **Current status:** Open, re-verified. Platform now has an
  `update_current_state` Edge Function **and** `subscribeToCurrentState` in
  `packages/supabase/src/realtime.ts` — so the Platform groundwork exists — but
  the App `currentStateSubscription` live branch in `source.ts` still throws
  `notImplemented`, and no adapter has been written. The real
  `subscribeToCurrentState` takes a Supabase client and returns a
  `RealtimeChannel`; the App mock emitter's contract is
  `(vehicleId, onUpdate, onChannelStatus) => () => void`. The interfaces do not
  match; the swap is not a one-liner.
- **What's needed to resolve:** Agree the adapter interface cross-track (a
  contract doc, same pattern as `create_vehicle_contract.md`) **before** any
  code — it touches the shared `packages/supabase` boundary. Then App authors a
  thin adapter wrapping `RealtimeChannel` into the mock's interface (bridge
  event callbacks → `onUpdate`; synthesize `onChannelStatus` from `subscribe`
  status codes); `source.ts` imports it on the live branch; the mock emitter
  retires for that capability.
- **Owner:** App track (adapter design) + Platform track (`packages/supabase`
  sign-off); both must agree the interface before authoring.
- **Cross-references:** R21; `docs/08` Week-3 close table; the
  `currentStateSubscription` live-branch comment in `source.ts`; workdiary
  sessions 23, 24, 27, 28, 29, 30.

### CF-03 — AI Agent Contract: six open questions unacknowledged + not shared (R1)

- **Category:** Cross-track dependency / flag
- **Origin:** Week 1, contract v0 authored session 12 (`docs/ai-agent-contract.md`);
  carried at Week-2 close (2026-06-22).
- **Current status:** Open, re-verified against `docs/06`. The changelog stops
  at "**2026-05-XX (v0.1):** Initial draft. To be reviewed jointly with AI
  agent project in Week 1" — no acknowledgment recorded. The six "Open
  questions to resolve in Week 1" stand unresolved: (1) trigger mechanism
  (NOTIFY/webhook/polling), (2) multi-vehicle batching, (3) deep-analysis
  cadence, (4) `insufficient_data` threshold, (5) cross-diagnostic
  deduplication, (6) whether to build `agent_request_queue` in v1. The contract
  is still not shared (no agent repo reachable from the App founder's `gh`), and
  the weekly cross-project sync is not calendared. Mitigation remains "on paper."
- **What's needed to resolve:** Share the contract with the agent project (a
  GitHub issue on the agent repo); get the six proposal-defaults acknowledged or
  rejected; create the recurring Friday cross-project sync. Week 6 is the
  buffered integration day where gaps surface if this hasn't happened first.
- **Owner:** AI-agent team (acknowledge/reject the defaults) + founder (share +
  calendar the sync).
- **Cross-references:** R1; `docs/08` Week-2 "Carry from Week 1"; `docs/06`
  "Open questions" + Changelog; workdiary session 12.

### CF-04 — `agent_role` read-only Postgres role migration

- **Category:** Cross-track dependency / flag
- **Origin:** Week 1 (RLS work, session 7, 2026-06-02); carried Week-1 → Week-2.
- **Current status:** Open, gated on CF-03. The role's exact read scope can't be
  finalized until the AI Agent Contract v0 merges and the agent project confirms
  which tables/columns it reads. `docs/05` § Testing lists `agent_role`
  read-only verification as deferred "until the AI Agent Contract v0 lands and
  the role is created in a follow-up migration."
- **What's needed to resolve:** Contract v0 merges + agent confirms read scope →
  write the `agent_role` migration granting exactly that scope; then add the
  deferred RLS verification test.
- **Owner:** Platform track (migration) + AI-agent team (read-scope confirmation).
- **Cross-references:** CF-03; R1; `docs/08` Week-2 "Carry from Week 1";
  `docs/05` § Testing (deferred) + Migration discipline; workdiary session 7.

### CF-05 — Admin dashboard: drive-list-per-device

- **Category:** Cross-track dependency / flag
- **Origin:** Week 4 Platform-track item.
- **Current status:** **Built — effectively closed.** Re-verified against
  `origin/main` on 2026-07-26: `apps/admin/app/devices/[id]/page.tsx` exists
  (Platform session 12, commit `22acf4c`) with device info, a drives list and a DTC
  timeline, and the devices table links through to it. This supersedes the
  "unbuilt" status recorded on 2026-07-05. The admin dashboard is deployed and
  working.
  **One caveat, not a blocker for this item:** that page currently fails
  `pnpm --filter @caeorta/admin lint` with 3 errors (two `no-explicit-any`, one
  `no-html-link-for-pages`), so `main` is lint-red in the admin workspace. Noted
  here because it is Platform-owned code and App-track PRs cannot make the repo-wide
  lint gate green until it's fixed.
- **What's needed to resolve:** Nothing for the drive-list itself. Separately,
  Platform should clear the three admin lint errors so the workspace-wide gate is
  green again.
- **Owner:** Platform track (Sulaiman).
- **Cross-references:** `docs/08` Week-4 plan + close table; workdiary sessions
  29, 30 (recorded absent), Platform session 12 (built), 33 (re-verified present).

### CF-06 — `supabase/seed.sql` is cross-track-owned (clobber-risk flag)

- **Category:** Cross-track dependency / flag
- **Origin:** Week 4, session 28 — the App track added the dev telemetry fixture
  (one completed drive + 361 telemetry samples) to `seed.sql`, but Sulaiman owns
  `supabase/`.
- **Current status:** Standing coordination flag. PR #37 (Platform) already
  reworked the file's teardown (see CF-25); the App-added fixture rows survived.
  Any future Platform-side `seed.sql` edit must preserve the App fixture (the
  drive-detail / telemetry-chart on-device path depends on it).
- **What's needed to resolve:** Nothing to "close" — this is an ongoing
  awareness flag: coordinate before either track edits `seed.sql`.
- **Owner:** Both tracks (coordination); Platform owns the file.
- **Cross-references:** workdiary sessions 28, 29, 30.

---

## Provisional-value-reconciliation

### CF-07 — Provisional jsonb metric-key vocabulary — `TODO(metric-keys)` (R22 #1)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 3, data seam session 22 (PR #25); recorded in the Week-3
  close table, session 24.
- **Current status:** Open. A provisional key set is now load-bearing in
  `mocks.ts`, `LastDriveCard`, `DiagnosticsPreview`, the drive-detail
  `PEAK_METRICS` (`rpm` / `speed_kph` / `coolant_temp_c`), and — most
  consequentially — the three live telemetry-chart channel keys
  (`speed_kph` / `boost_pressure_kpa` / `coolant_temp_c`), which are the app's
  **first live-read consumers** of the vocabulary via `get_drive_telemetry`.
  A key mismatch is **not** compiler-caught (the columns are opaque `Json`); on
  the live-read path it yields a silently-empty chart, not an error. The
  canonical set is owned by the hardware/AI-agent contract and is undocumented
  in `docs/06`/`docs/07` (only prose like "max rpm, max boost, max coolant temp").
- **What's needed to resolve:** The hardware/AI-agent contract confirms the
  canonical key set; then update the `mocks.ts` provisional keys and every
  hardcoded key reference, remove the `TODO(metric-keys)` flags. This is a
  mandatory reconciliation gate before any live flip of `lastDrive`,
  `currentState`, `recentDiagnostics`, or the telemetry charts.
- **Owner:** Hardware/AI-agent team (canonical set) + App track (reconciliation
  + `TODO` removal).
- **Cross-references:** R22 (#1); `docs/08` Week-3 + Week-4 close tables;
  workdiary sessions 22, 24, 28, 29, 30 + decisions log 2026-06-22.

### CF-28 — Freeze-frame capture fidelity + key vocabulary (R24 #2)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 2, session 33 (2026-07-26), building the DTC seam.
- **Current status:** Open — but **narrower than originally scoped.** The Day-2 brief
  assumed no freeze-frame column existed and that the App would mock one. That is now
  **false**: Platform added `dtcs.freeze_frame_metrics jsonb` (migration
  `20260615000001`, commit `a024a43`) and wired ingestion, closing R23. Verified on
  `origin/main`. **The schema gap is closed; two fidelity gaps remain:**
  1. **Capture point.** `device_sync_chunk` stores `latestRow.metrics` — the **last
     telemetry row of the sync chunk** — not the sample at the moment the code set
     (`supabase/functions/device_sync_chunk/index.ts:93`). The column comment claims
     "at the moment the DTC was first seen"; the code does not implement that. For a
     long chunk the freeze frame can describe conditions minutes away from the fault,
     which is actively misleading on a screen whose entire purpose is "what the car was
     doing when this happened."
  2. **Key vocabulary.** The blob is the same provisional metric-key set as
     `telemetry.metrics` — a **CF-07 / R22 instance**, not a new vocabulary. A wrong key
     renders an **empty** freeze-frame panel, not an error.
  The App side models this honestly: `freezeFrameMetricsSchema` mirrors the real flat
  `key → number` shape (no invented `{value,unit,label}` triple), `toDtc` boundary-parses
  the opaque `Json`, and `toFreezeFrameTiles` does the §5.5 Metric Tile shaping app-side.
- **What's needed to resolve:** (1) Cross-track decision on capture semantics — either
  hardware/Platform capture the sample at fault time (correct fix) or the doc + UI copy
  are corrected to say "conditions around this time" (honest fallback). Either way the
  column comment must stop claiming something the code doesn't do. (2) CF-07 resolves the
  key set. Both gate any live flip of `DATA_SOURCE.dtcs`.
- **Owner:** Platform track (`device_sync_chunk` capture semantics) + hardware/AI-agent
  team (canonical keys, via CF-07) + App track (reconcile + UI copy).
- **Update 2026-08-02 (session 35, PR #43) — a SCREEN now renders this, and its empty state
  is deliberately ambiguous.** S6 ships the freeze-frame panel, always rendered (matching
  S5's discipline). **Zero tiles has two causes the panel cannot tell apart:**
  (a) the DTC genuinely has no freeze frame — `device_sync_chunk` had no telemetry row
  buffered in that chunk and wrote `null` (2 of the 7 fixtures are this case); or
  (b) a frame WAS captured, but under metric keys the provisional vocabulary doesn't
  recognise, so `toFreezeFrameTiles` returns `[]` — **silently empty, not an error**, which
  is this entry's gap #2 made visible.
  The copy therefore states only the observable fact — "No freeze-frame data for this code."
  — and **asserts no cause**. Distinguishing (a) from (b) needs the canonical key set, so it
  is a CF-07 reconciliation concern; guessing at it in the panel would be worse than the
  ambiguity. **When CF-07 lands, revisit this copy** — with a known key set, (b) becomes
  detectable (a non-null blob that yields no tiles) and the panel could honestly say
  "captured, but not readable" instead.
  Gap #1 (capture point) also surfaced in the UI: the panel's caveat line reads "around the
  time the code set, not necessarily the exact moment" rather than claiming fault-time
  precision the ingestion path doesn't deliver. **That copy is the honest-fallback half of
  this entry's resolution, taken pre-emptively** — it does not close the entry, and the
  column comment still claims something the code does not do.
- **Cross-references:** R24 (#2); R23 (resolved predecessor — the column itself); CF-07 /
  R22 (the shared key vocabulary); design §6 `S6` + §5.5; `lib/dtc.ts`
  `TODO(metric-keys)`; the freeze-frame panel + `TODO(metric-keys)` note in
  `apps/mobile/src/app/(app)/vehicles/[id]/dtcs/[dtcId].tsx`;
  `vehicles.dtcs.detail.freezeFrame.*` in `en.json`; the `fetchDtcs` live-adapter note in
  `source.ts`; workdiary sessions 33, 35.

### CF-29 — Pending DTC state has no schema backing (R24 #1)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 2, session 33 (2026-07-26).
- **Current status:** Open, and **confirmed unchanged** against `origin/main` — unlike
  CF-28, Platform has NOT added anything here. `dtcs` carries binary state only:
  `is_active boolean` plus a `cleared_at timestamptz`. There is no pending/confirmed
  column, and nothing else on the row distinguishes a pending code (OBD-II sets one after
  a single failed drive cycle) from a confirmed one. Design §6 `S5` nevertheless specifies
  three sections: **Active / Pending / History**.
  App-side containment: `deriveDtcGrouping` in `@caeorta/types` returns
  `'active' | 'history'` **only** — the narrowed return type records the gap in the type
  system, so widening it later is a compile-time event at every call site. `'pending'` is
  produced by exactly one thing, the mock-only `MOCK_PENDING_DTC_IDS` overlay in
  `mocks.ts`, applied in `toMockDtc`. A unit test asserts `deriveDtcGrouping` can never
  return `'pending'` across all four `is_active`/`cleared_at` permutations, and a seam
  test asserts the pending fixtures are column-identical to active ones.
- **What's needed to resolve:** A **founder decision first**, then possibly Platform work:
  either (a) Platform adds the signal (a `status` column, or a `is_pending`/confirmed
  flag, plus device-side capture of the OBD-II pending-vs-confirmed distinction — this is
  a hardware-capability question, not only a schema one), or (b) the founder cuts the
  Pending group from v1 and design §6 `S5` is amended to two sections. **Do not flip
  `DATA_SOURCE.dtcs` to live before one of these lands** — the live path silently renders
  two sections where the design specifies three.
- **Owner:** Founder decision (keep or cut the group) → then Platform track (schema) +
  hardware team (whether the device can even report pending) + App track (delete the
  overlay).
- **Update 2026-07-26 (session 34, PR #42) — a SCREEN now depends on the overlay, and
  the cost of collapsing was deliberately capped.** S5 ships rendering all three
  sections, so the mock overlay is no longer seam-only; it is visible product. Two
  containment measures were built specifically for this entry:
  1. **One split point.** `groupDtcs` (`apps/mobile/src/lib/dtc.ts`) is the ONLY place
     the three-way split is decided, typed as `Record<DtcGrouping, Dtc[]>` — so
     narrowing `DTC_GROUPINGS` in `@caeorta/types` turns the `pending: []` line into a
     **compile error**, not a silently dead branch. Resolution (b) is therefore a
     two-edit change: the types union + deleting `MOCK_PENDING_DTC_IDS` and the
     `toMockDtc` overlay branch. **The S5 screen needs no edit at all** — it builds its
     sections by mapping `DTC_GROUPING_ORDER`, so a two-member union renders two
     sections on its own. A unit test asserts an empty Pending bucket still exists for
     the live-shaped input.
  2. **The regression stays visible.** All three section headers render even when
     empty (founder call, session 34). If `DATA_SOURCE.dtcs` were flipped live before
     this entry resolves, Pending would stand permanently empty — a visible question
     mark — rather than vanishing into the two-section layout §6 doesn't specify.
  This does not weaken the gate: **still do not flip `DATA_SOURCE.dtcs` to live** until
  the founder decision lands.
  **Verification (2026-07-27, sessions 34b + 34c): COMPLETE, including the live shape.**
  The three-group render was confirmed on a physical device in 34b. The empty-group branch
  — initially unexercised, since all three mock groups are populated — was closed in 34c by
  adding `__DEV__`-only fixture variants (`DEV_DTC_FIXTURE_VEHICLE_IDS` in `mocks.ts`) that
  filter the existing fixtures. **The `noPending` variant renders exactly what a live flip
  would produce today** — Active and History populated, Pending carrying its header plus
  "Nothing pending — no codes waiting to confirm." — and was observed on-device. All three
  `groupEmpty` strings have now rendered.
  This **validates the session-34 always-render decision empirically**: the group does not
  silently vanish, it stands visibly empty. It does **not** weaken the gate — the copy is
  still a stopgap for a group with no live source, and the founder decision is still what
  resolves this entry.
- **Cross-references:** R24 (#1); design §6 `S5`; `packages/types/src/dtc.ts`
  `TODO(dtc-pending)`; `MOCK_PENDING_DTC_IDS` in `mocks.ts`; `groupDtcs` in
  `apps/mobile/src/lib/dtc.ts`; the `fetchDtcs` live-adapter note in `source.ts`;
  workdiary sessions 33, 34.

### CF-30 — `insufficient_data` modeled as a severity vs. the contract's category

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 1 (PR #40, `deriveDiagnosticCardState`); audited and scoped in
  Day 2, session 33 (2026-07-26).
- **Current status:** Open as a **vocabulary/modeling** inconsistency. The Day-2 brief
  hypothesised that `driveHealth` keys on `severity` only and would therefore fail to give
  contract-shaped rows the insufficient-data treatment. **The audit does not support
  that** — recorded here precisely so the wrong version isn't carried forward:
  - `deriveDriveHealth` (`lib/driveHealth.ts`) elevates only when a severity's
    `SEVERITY_RANK` equals `critical` (0) or `warning` (1). `insufficient_data` is absent
    from that map. So the app's sentinel shape (`severity='insufficient_data'` → rank
    `undefined`) and the contract shape (`severity='info'` → rank 2) **both fall through
    to `clean`** — which is exactly the intended treatment ("never elevates health",
    §4.3, locked by `driveHealth.test.ts`). **There is no behavioural gap in
    `driveHealth`, and nothing there needs fixing.**

  The real exposure is narrower and sits elsewhere:
  - **`mocks.ts` writes a non-contract value into `diagnostic_outputs.severity`.** docs/06
    defines `insufficient_data` as a **category** (paired with `severity='info'`,
    confidence < 0.3); the fixture at `mocks.ts` uses it as a severity sentinel, and two
    tests lock that shape. The fixtures are contract-invalid — this is the actual debt.
  - **Any surface keyed on `severity` alone diverges between the two shapes.** Two existed.
    Drive-detail's `SEVERITY_DOT` map would have rendered a contract-shaped row as a blue
    *info* dot instead of neutral — **closed in session 33**, because the DiagnosticCard
    swap routes through `deriveDiagnosticCardState`, which recognises either field. The
    remaining one is `sortDiagnosticsByPriority`: the sentinel sorts **last** (unknown rank)
    while a contract-shaped row sorts as `info` (rank 2), so ordering differs between
    shapes. Cosmetic, but real, and drive-detail still uses that sort.
- **What's needed to resolve:** The AI-agent team confirms the canonical field (docs/06
  open question #4 is adjacent). Then the App reconciles **one** internal model — most
  likely: fixtures move to the contract shape (`category='insufficient_data'`,
  `severity='info'`), the two locked tests are updated **deliberately**, and
  `sortDiagnosticsByPriority` gains the same either-field check the card already has.
  Gate on any live flip of `driveDiagnostics` / `recentDiagnostics`.
- **Owner:** AI-agent team (confirm the canonical field) + App track (reconcile the
  internal model).
- **Cross-references:** R24; CF-03 / R1 (contract vocabulary, docs/06 open questions);
  CF-07 / R22; PR #40 decisions row; `lib/diagnostics.ts` `deriveDiagnosticCardState`
  precedence note; workdiary sessions 32, 33.

### CF-31 — `dtcTitles.ts` plain-language stopgap for DTC titles (R24 #3)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 2, session 33 (2026-07-26) — shipped in PR #41 alongside the DTC
  seam; promoted to its own entry at the founder's call rather than staying folded into
  R24 #3.
- **Current status:** Open. `dtc_lookup` **exists and is seeded** (Platform migration
  `20260615000002`, 52 P0xxx codes with `description` / `system` / `severity_hint` /
  `common_causes`) — so this is **not** a missing-table carry. The gap is *register*: every
  `description` value is verbatim SAE J2012 wording (e.g. P0101 → "Mass Air Flow Circuit
  Range/Performance"), while design §6 (`S5` list, `S6` detail) calls for **plain-language
  titles** and §8's voice rules rule out raw jargon in a headline.
  The app therefore ships `apps/mobile/src/lib/dtcTitles.ts` — a local `P0xxx → plain-language
  title` map covering exactly the codes the mock fixtures use, **all of which are also rows
  in the seeded `dtc_lookup`**, so the eventual promotion is a genuine swap and not a
  rewrite. It is deliberately NOT a general OBD-II table: growing it by hand would duplicate
  Platform's seeded data and drift from it. `dtcTitle()` is the single call site, with a
  three-step fallback (plain title → the row's own `description` → the raw code) so an
  uncovered code degrades to jargon rather than to a blank headline. A test pins map
  coverage to the fixtures, so adding a fixture code without a title fails CI.
- **What's needed to resolve:** A **content decision first** — the plain-language copy is a
  content/voice call (designer/founder), not something Platform can generate from the SAE
  data. Then one of two shapes; note that the obvious-sounding third option is a trap:
  - **(a) Platform adds a `plain_title` column** to `dtc_lookup` alongside `description`,
    populated with the agreed copy. App drops the map and reads the column.
  - **(b) The App-side title layer stays permanent**, sitting over live `dtc_lookup` rows
    (which supply `description` / `system` / `severity_hint` / `common_causes` for the S6
    body). `dtcTitles.ts` stops being a stopgap and becomes the content layer.
  - **(NOT) overwriting `dtc_lookup.description` with plain language** — this would destroy
    the technical wording, which `S6`'s "what it means" section and the admin DTC timeline
    both have a legitimate use for. Keep both registers; don't trade one for the other.
- **Owner:** Founder / designer (the plain-language copy — the blocking input) + Platform
  track (the `dtc_lookup` column, if (a)) + App track (the stopgap and the eventual swap).
- **Update 2026-07-26 (session 34, PR #42):** `dtcTitle()` is now **load-bearing on a
  shipped screen** — every S5 row headline comes from it. The map's coverage is still
  pinned to the fixtures by test, so the stopgap cannot silently fall behind, and an
  uncovered code degrades to the ECU `description` and then to the raw code rather than
  blanking. Unchanged otherwise: the blocking input is still the **content decision**
  (who authors the plain-language copy).
- **Cross-references:** R24 (#3); CF-07 (the adjacent provisional-vocabulary carry);
  design §6 `S5`/`S6` + §8 voice; `apps/mobile/src/lib/dtcTitles.ts` (the flip-point, with
  the same two options recorded in-file); `supabase/seed_dtc_lookup.sql`; PR #41; the S5
  row headline in `vehicles/[id]/dtcs/index.tsx` (PR #42); workdiary sessions 33, 34.
- **Gate:** blocks any live-flip of DTC **titles** specifically. Distinct from CF-29 (which
  gates the whole `DATA_SOURCE.dtcs` flip) — titles could in principle flip independently
  once the copy exists.

### CF-35 — S6's "what it means" + likely-causes have no content source (R24 #5)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 4, session 35 (2026-08-02) — building S6.
- **Current status:** Open. **A content dependency, not a schema or build gap**, and the
  sibling of CF-31: that entry covers the DTC *title* register, this one covers the *body*.
  Design §6 specifies two prose sections on S6 — a "what it means" written for a **tuned /
  modified engine** (explicitly not generic OBD-II boilerplate) and a likely-causes list.
  **Neither has a source the app can reach.** Audited on `origin/main`:
  - **`dtcs.description`** — whatever the ECU reported, verbatim SAE J2012 wording, and
    `null` on 2 of the 7 mock fixtures. A correct *technical* description; precisely the
    register §6 rejects for an explanation. S6 renders it, clearly labelled as the ECU's own
    wording, but it is not an explanation.
  - **`lib/dtcTitles.ts`** — a plain-language TITLE map only. There is no body layer
    (CF-31).
  - **`dtc_lookup.common_causes`** — Platform's seeded table DOES carry a causes column, and
    it is even partly tune-aware (P0234 → "Wastegate stuck, boost controller fault, **tune
    overboost**"; P0171 → "…, **aftermarket intake**"). But it is a single comma-joined
    text blob in the generic-OBD-II register, and it is **not wired into the DTC seam at
    all** — the lookup join is unbuilt (see CF-32's flip note). It is the nearest available
    source, not a current one.
  **What the App did instead of filling the gap:** both sections render **always**, carrying
  copy that states the gap ("We don't have a plain-language explanation for this code yet —
  one written for a modified engine, not a generic OBD-II readout"). Per-code prose was
  **not** authored, because writing it would mean inventing engineering claims about a
  modified engine — §8's calibrated honesty rules that out, and it is the one failure mode a
  tuned-car owner would catch instantly. The sections stay visible so the gap stays visible;
  when the content lands, only the `en.json` values change and no component moves.
- **What's needed to resolve:** A **content decision first**, exactly as with CF-31, and it
  is the same decision-maker — so **resolve the two together**. Three shapes, in rough order
  of preference:
  - **(a) Author the body copy App-side** beside `dtcTitles.ts` (a `dtcContent.ts` covering
    the fixture codes), matching whichever resolution CF-31 takes. Keeps the tuned register
    §6 asks for; costs founder/designer writing time per code.
  - **(b) Wire `dtc_lookup` into the seam** and render `common_causes` as likely-causes.
    Cheap, real, and would close *half* of this entry — but the register is generic OBD-II,
    so "what it means" would still need (a). Also pre-empts CF-32's lookup join, so
    sequence it with that entry.
  - **(c) Platform adds a tuned-register column** to `dtc_lookup`. Only worth it if the copy
    is being authored anyway, in which case (a) is the cheaper place to put it until the
    volume justifies a column.
  **Gate:** blocks nothing today — S6 ships honest about the gap. It does gate calling S6
  "complete against §6".
- **Owner:** Founder / designer (the copy — the blocking input) + App track (render it) +
  Platform track (only under (b)/(c)).
- **Cross-references:** R24 (#5); **CF-31** (the title register — same decision-maker,
  resolve together); CF-32 (the `dtc_lookup` join that option (b) needs); design §6 `S6` +
  §8 voice; `TODO(dtc-body)` in
  `apps/mobile/src/app/(app)/vehicles/[id]/dtcs/[dtcId].tsx`;
  `vehicles.dtcs.detail.meaning.*` / `.causes.*` in `en.json`; PR #43; workdiary session 35.

### CF-32 — DTC `severity_raw` has no vocabulary — `TODO(dtc-severity-vocab)` (R24 #4)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 3, session 34 (2026-07-26) — building the S5 badge derivation.
- **Current status:** Open. `dtcs.severity_raw` is plain `text` with **no CHECK
  constraint and no documented vocabulary** (verified on `origin/main`, migration
  `20260602130000`); `docs/05` describes it only as "as reported by ECU". S5 tints each
  code badge from it, so the app needs a bounded tier — supplied by
  `deriveDtcBadgeSeverity` (`apps/mobile/src/lib/dtc.ts`), the canonical derivation.
  **Nothing was invented.** The map covers exactly the values the mock fixtures carry
  (`critical` / `warning` / `warn` / `info`, case- and whitespace-normalised) and the
  target union matches the ladder Platform **already** CHECK-constrains on
  `dtc_lookup.severity_hint` — `('info','warning','critical')`, migration
  `20260615000002` — rather than adding a fourth vocabulary to the project. Anything
  unrecognised (including `null`, blank, and a non-string from an unvalidated live row)
  renders the off-ladder neutral **`unknown`** badge; unit tests lock the no-throw and
  no-mis-tint behaviour. **Failure mode is understatement, never overstatement or a
  crash:** a real ECU string this map omits shows as unrated rather than as its true
  tier — quiet and wrong, not alarming and wrong.
- **What's needed to resolve:** The hardware/firmware track confirms what the device
  actually writes into `severity_raw` (it may be free OEM text with no closed set at
  all, in which case say so and the `unknown` fallback becomes the documented steady
  state, not a gap). Two follow-ons then become available, both currently unwired:
  (a) `dtc_lookup.severity_hint` is a per-code canonical tier and is the obvious
  fallback for a row whose `severity_raw` is null — it needs the lookup table joined
  into the DTC seam first; (b) if a closed ECU set exists, extend the map and consider a
  CHECK on the column. Gate on any live flip of `DATA_SOURCE.dtcs`.
- **Owner:** Hardware/firmware team (what the device writes) + Platform track
  (`dtc_lookup` join / any CHECK) + App track (extend the map, remove the TODO).
- **Cross-references:** R24 (#4); CF-07 / R22 (the adjacent provisional-vocabulary
  carry); CF-30 (the severity-vs-category vocabulary question on the *agent* side —
  related but a different column and a different owner); design §4.3 + §6 `S5`;
  `TODO(dtc-severity-vocab)` in `apps/mobile/src/lib/dtc.ts`; PR #42; workdiary
  session 34.

### CF-08 — Coolant "hot" threshold — `TODO(coolant-hot-threshold)` = provisional 105 °C (R22 #2)

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 4, session 28 (2026-07-03).
- **Current status:** Open, and **distinct from CF-07** — this is a *value*
  guess (a magnitude), not a *key-name* guess. `COOLANT_HOT_THRESHOLD_C = 105`
  is the placeholder cutoff above which the coolant chart recolours to
  `severity/warning` amber (design §10 "coolant peak amber"). On-device session
  30 confirmed the **mechanism** — `isHot = … && samples.some(s => s.y >=
  hotThreshold)` is a whole-series switch, not a per-point gradient — but that
  confirms the mechanism, **not the 105 value**. No canonical "hot" threshold is
  documented anywhere.
- **What's needed to resolve:** Reconcile the numeric threshold against the
  hardware/AI-agent contract (or a domain source) before live coolant data is
  trusted. A right key with a wrong threshold still misleads.
- **Owner:** Hardware/AI-agent team (or a domain source) + App track.
- **Cross-references:** R22 (#2); `docs/08` Week-4 close table; workdiary
  sessions 28, 30 + decisions log 2026-07-03 and 2026-07-05.

---

## On-device / integration verification pending

### CF-09 — Pairing on-device E2E

- **Category:** On-device / integration verification pending
- **Origin:** Week 2, sessions 16–17 (pairing + Wi-Fi); the "built ≠ verified"
  gap for Week 2's DoD.
- **Current status:** Unrun since Week 2, re-verified. The pairing flow
  (`lib/pairing.ts`, `(app)/pair/*`) is built and all unit tests pass; the live
  handshake against a real seed device has never been executed.
- **What's needed to resolve:** A fresh EAS development build carrying
  `expo-camera` (~56.0.8) and `@orbital-systems/react-native-esp-idf-provisioning`
  (~0.5.5). On a physical Android device: claim a real seed device, confirm the
  `devices` row flips (`claimed_by_user_id` set, `status='active'`), confirm the
  `audit_log` row, and exercise all four documented error states.
- **Owner:** App track (Muhammed, on hardware).
- **Cross-references:** `docs/08` Week-2 DoD + Week-3 close table; workdiary
  sessions 16, 17, 20, 23, 29, 30.

### CF-10 — Real-device Wi-Fi provisioning E2E (firmware-gated) (R20)

- **Category:** On-device / integration verification pending
- **Origin:** Week 2, session 17 (2026-06-22, PR #23).
- **Current status:** Firmware-gated. The app's Wi-Fi onboarding is built to the
  standard ESP-IDF `wifi_provisioning` protocol over SoftAP and is unit-tested
  at the result-mapping boundary, but **no device speaks that protocol yet**,
  and the two parameters that gate a working session — the proof-of-possession
  (PoP) value/source and the security scheme (Security 1 vs Security 2 / SRP6a)
  — are unratified. Both are isolated in one typed seam
  (`lib/provisioningConfig.ts`) with PoP unset and a provisional `secure2`
  default; neither is a committed choice.
- **What's needed to resolve:** The hardware/firmware track exposes a
  provisioning endpoint **and** ratifies the PoP source + security scheme; then
  the App verifies the live wire path (ratifying the two params is a one-file
  change in the seam).
- **Owner:** Hardware team (firmware + PoP/scheme ratification) + App track (wire
  verification).
- **Cross-references:** R20 (and related R2, R13); `docs/08` Week-2 DoD;
  `docs/07` § `submit_wifi_credentials` note; workdiary session 17.

### CF-11 — Perf test: 30 days of simulated data

- **Category:** On-device / integration verification pending
- **Origin:** Week 4 "Together" item.
- **Current status:** Not run. The app exercises the `>300 → downsample` path via
  the dev seed fixture, and the "30-day-old data doesn't slow queries" DoD rests
  on Platform's `get_drive_telemetry` server-side downsample (≤300 points) + the
  `pg_cron` nightly aggregation — but the Together perf test with 30 days of
  simulated data has not been executed.
- **What's needed to resolve:** A dev build + a seeded 30-day dataset; profile
  chart smoothness. Feeds the Week-9 charting re-eval (stay on Victory Native vs.
  migrate).
- **Owner:** Both tracks.
- **Cross-references:** `docs/08` Week-4 DoD + close table; R5 (Supabase scaling);
  workdiary sessions 29, 30.

### CF-12 — `returned_rows ≤ 300` downsample check (skipped by choice)

- **Category:** On-device / integration verification pending
- **Origin:** Week 4, session 28; closure decision session 30 (2026-07-05).
- **Current status:** Unrun, **explicitly skipped by founder decision — not
  forgotten.** It was flagged from the start as an optional server-side concern.
  The seed fixture carries 361 telemetry samples specifically so the server
  downsample path *does* run; confirming the response is actually ≤300 rows was
  deemed non-blocking at the session-30 verification close.
- **What's needed to resolve:** (Optional) confirm `get_drive_telemetry` returns
  ≤300 points for the 361-sample seeded drive. Not gating anything.
- **Owner:** App / Platform (optional).
- **Cross-references:** workdiary sessions 28, 30 + decisions log 2026-07-05.

> **Resolved & intentionally NOT listed here:** the "on-device real-data chart
> render" item (the Week-4 "built ≠ verified" row, marked **Blocked** in session
> 29) was **closed in session 30** — the `/dev/telemetry` harness (PR #36)
> rendered all three charts from real seed data, confirming the app's first live
> `get_drive_telemetry` path works, and the coolant whole-series amber switch
> passed. It is done; it is not an open carry.

---

## App-build dependency

### CF-13 — Full eight-variant Diagnostic Card (design §5.1)  *(CLOSED 2026-08-02)*

- **Category:** App-build dependency
- **Origin:** Week 4, sessions 27–29 (drive-detail uses a simplified stand-in).
- **Current status:** **CLOSED (2026-08-02, session 35, PR #43).** The last remaining piece
  — the vehicle-detail `DiagnosticsPreview` stand-in — was swapped to the atom, so **all
  three stand-ins are now retired**: drive-detail (session 33, PR #41), the S6 related card
  (built directly on the atom, session 35), and the preview (session 35). The screen-local
  `SEVERITY_DOT` map is deleted with it, which means the severity→visual rule now lives in
  exactly one place, `deriveDiagnosticCardState`, on every surface that renders a
  diagnostic. That also closed the **second** CF-30 mis-render: a contract-shaped
  `insufficient_data` row (`category='insufficient_data'`, `severity='info'`) rendered here
  as a blue *info* dot and now gets the off-ladder dashed treatment §4.3 requires — the same
  fix the drive-detail swap made, on the last surface that still had the bug.
  **Two residuals, neither reopening this entry:**
  1. **On-device look pending** for the preview swap and the S6 related card (session 35 is
     built-not-verified). The atom itself is verified — all 8 variants were observed on a
     physical device in session 34b — so this is a placement check, not a component check.
  2. **Known visual, by design:** the card is token-styled for the dark canvas and
     vehicle-detail is still on the stock light palette, so dark cards sit on a white
     screen until Week 8. That is **CF-15's** debt, not this entry's — accepted by the
     founder at the session-35 ASK gate in preference to either restyling a CF-15 screen
     ahead of schedule or leaving a third stand-in in the codebase.
- **Superseded status (kept for the trail):** The atom itself was **built in Week 5 Day 1**
  (PR #40, session 32): all four visual states × collapsed/expanded = the eight
  documented variants, with the severity→state rule centralised in
  `deriveDiagnosticCardState` and a `__DEV__` harness at `/dev/diagnostic-card`.
  **Day 2 (session 33) swapped it into drive-detail**, deleting the simplified
  severity-dot stand-in and the screen-local `SEVERITY_DOT` map — so the
  drive-detail half of this carry is closed (and closed a live-flip mis-render on
  the way; see CF-30).
  **What remains:** the **vehicle-detail `DiagnosticsPreview`** still renders the
  stock-Tailwind stand-in — it sits on an un-migrated Week-1–3 screen, so lifting it
  across the token boundary is entangled with CF-15 rather than being a clean swap.
  **On-device verification is now DONE (2026-07-27, session 34b)** — this supersedes
  the earlier "typecheck/test-green only" status. On a physical device the `/dev/diagnostic-card`
  harness rendered all 8 variants, and drive-detail's `insufficient_data` card rendered
  **off-ladder** (dashed border + dashed icon ring, no severity accent bar) with the
  drive-health pill reading **Clean** beside it — which also confirms CF-30's session-33
  audit finding as an observed fact rather than a test assertion.
- **What's needed to resolve:** Nothing — done. (The superseded plan was to swap
  `DiagnosticsPreview` "naturally, with CF-15's Week-8 token migration"; it was instead
  swapped early in session 35, accepting the palette mismatch above, so that no simplified
  diagnostic rendering survives anywhere in the app.) Note for later: session 30's finding
  that each Victory Native `CartesianChart` auto-scales its own x-domain applies to any
  future chart inside this card (the shipped card uses a styled `View` confidence bar, not
  a chart).
- **Owner:** App track. *(Closed.)*
- **Cross-references:** `docs/08` Week-4 close table + Week-5 plan; design §5.1;
  CF-15 (un-migrated screens — carries the residual palette mismatch), CF-30 (both
  mis-renders the swaps closed); PRs #40, #41, #43;
  workdiary sessions 27, 28, 29, 30, 32, 33, 34b, 35.

---

## Week-8-deferred-by-design

### CF-14 — Light-mode wiring + light-mode spot-check

- **Category:** Week-8-deferred-by-design
- **Origin:** Week 4, design-system foundation session 26 (PR #32, 2026-07-03).
- **Current status:** Deferred by design. Dark is the only live theme;
  `colorsLight` is committed key-for-key against `colorsDark` (test-enforced) but
  not switchable. This was previously buried inside R11's status prose — named
  explicitly here.
- **What's needed to resolve:** The Week-8 light task turns it on (a config swap,
  no screen edits, per the static-token design) **and** runs the light-mode
  spot-check (design §13 "Recommended next") — flip the `semantic` collection to
  Light and audit any token needing tuning before it ships.
- **Owner:** App track (wiring) + designer (spot-check tuning).
- **Cross-references:** R11 (residual exposure); design §13; `docs/08` Week-8
  "visual polish"; workdiary sessions 26, 27, 28, 29, 30 + decisions log
  2026-07-03.

### CF-15 — Week 1–3 screens' design-token migration

- **Category:** Week-8-deferred-by-design
- **Origin:** Week 4, session 26 (PR #32).
- **Current status:** Deferred by design (forward-only policy). The Week 1–3
  screens (auth, vehicle list/detail, live mode, drives list, `LastDriveCard`)
  still render on the stock palette and light surfaces; the design radius scale
  was namespaced `rounded-ds-*` (leaving stock `rounded-*` untouched)
  specifically so those un-migrated screens render unchanged. This was previously
  only *implicit* in Week 8's generic "visual polish" bullet — named explicitly
  here.
- **What's needed to resolve:** In Week 8, migrate those screens to semantic
  tokens, strip the `ds-` radius namespace, and flip radius to override (so
  `rounded-*` becomes the design scale everywhere).
- **Owner:** App track.
- **Cross-references:** `docs/08` Week-8 "visual polish"; workdiary sessions 26,
  27, 29, 30 + decisions log 2026-07-03 (radius namespace).

### CF-16 — Parked design refinements (design §13)

- **Category:** Week-8-deferred-by-design
- **Origin:** Design system §13 "Parked (agreed)"; surfaced as R11's residual at
  Week-4 close (session 29, 2026-07-04).
- **Current status:** Parked-agreed. Three items: (a) refine the Home-screen car
  silhouette line-art proportions; (b) confirm mocked area charts against real
  Victory Native output — **largely satisfied** by session 30's on-device
  observation of the real charts, though the designer hasn't formally signed off;
  (c) decide whether Sign out / Unpair want custom-styled confirmation dialogs
  vs. native.
- **What's needed to resolve:** Designer + App resolve the three items (or
  explicitly cut them) during the polish window.
- **Owner:** Designer + App track.
- **Cross-references:** R11 (residual); design §13; workdiary sessions 29, 30.

---

## Infra / tooling queued

### CF-17 — Prod migration promotion (2 Week-5 migrations) + prod Dashboard OTP config

- **Category:** Infra / tooling queued
- **Origin:** Week 1 → Week 2 carry; prod promotion session 2026-06-21 (session 15).
- **Current status:** The three Week-1 v1 migrations
  (`enable_extensions` / `initial_schema` / `rls_policies`) are promoted and
  verified on prod (4 extensions, 26 tables, 36 indexes, RLS on all 26, isolation
  tests pass). The **two Week-5 migrations remain dev-only**:
  `20260614000001_add_notify_agent` and `20260614000002_add_pg_cron_jobs`. Also
  still pending: the **prod-side** Dashboard OTP config (Magic Link template →
  `{{ .Token }}`, Confirm-email OFF, OTP length 6) — done on dev, not prod.
- **What's needed to resolve:** A follow-up prod-link session per the `docs/05`
  8-step ritual, once the corresponding Week-4/5 Edge Functions are confirmed
  prod-ready. **Caution:** `add_pg_cron_jobs` starts its nightly jobs the moment
  it lands on prod — confirm that's intended first. Replicate the Dashboard OTP
  config on prod in the same session.
- **Owner:** Platform track.
- **Cross-references:** `docs/08` Week-1 DoD + Week-2 "Carry from Week 1";
  `docs/05` § Migration discipline (promotion status) + § Supabase Dashboard
  configuration; workdiary session 15.

### CF-18 — `devices` column-scope follow-up migration

- **Category:** Infra / tooling queued
- **Origin:** Week 1, session 7 (2026-06-02) — deferred in the RLS migration
  until `mint_device_token` firmed up.
- **Current status:** Unblocked. `mint_device_token` now exists (Platform session
  4). The `devices` UPDATE policy is currently row-level only; owner-should-not-
  write columns (`device_secret`, `claimed_by_user_id`, `claimed_at`,
  `created_at`, `last_seen_at`, `firmware_version`, `last_sync_at`) are
  application-enforced, not DB-enforced.
- **What's needed to resolve:** A migration that REVOKEs UPDATE on the
  device-managed columns from `authenticated` and GRANTs the owner-writable
  subset (likely just `status`).
- **Owner:** Platform track.
- **Cross-references:** `docs/08` Week-2 "Carry from Week 1"; `docs/05`
  decisions/comment (2026-06-02); workdiary session 7.

### CF-19 — EAS Update/Build emergency-release runbook (R14 mitigation)

- **Category:** Infra / tooling queued
- **Origin:** Listed as an R14 (bus-factor) mitigation since session 4; flagged
  as non-existent at the 2026-06-19 Week-1 retro.
- **Current status:** **Does not exist.** R14 lists an "EAS Update + EAS Build
  emergency-release runbook in `docs/`" as a mitigation so a JS-only fix can be
  cut without Muhammed; a repo-wide search at the Week-1 retro found no such
  doc — it has been a paper mitigation. (Not re-searched exhaustively this pass,
  but no runbook doc is present in `docs/`.)
- **What's needed to resolve:** Write the runbook in `docs/` (conditions:
  Muhammed unavailable, urgent JS-only fix needed; both founders have EAS access).
- **Owner:** App track / founder.
- **Cross-references:** R14; workdiary Week-1 retrospective (2026-06-19).

### CF-20 — Repo merge hygiene: squash-only setting + branch protection (R19)

- **Category:** Infra / tooling queued
- **Origin:** Long-running carry since session 4/5; tied to R19 (two-track drift
  / stacked-merge — recurred 4×).
- **Current status:** Standing gap. "Allow squash merging only" is documented as
  the intended GitHub repo setting (`docs/04` Branch strategy) but was still
  not enforced in repo settings as of the session-5/6 carries; branch protection
  on `main` (required status checks) is unavailable on the GitHub Free plan, so
  CI red does not block merge and enforcement is honor-system.
- **What's needed to resolve:** Toggle squash-only in repo settings now (2-minute
  founder action). Enable required status checks / branch protection when on a
  paid plan (funding-gated, post-pilot).
- **Owner:** Founder (settings toggle now; paid-plan upgrade later).
- **Cross-references:** R19; `docs/04` § Branch strategy; workdiary sessions 4–9
  long-running carry-overs.

### CF-21 — Google Play Console activation (Week-10 dependency)

- **Category:** Infra / tooling queued
- **Origin:** Section 0 deferred item (2026-05-13); funding-gated.
- **Current status:** Not activated ($25 one-time). This is the v1 pilot's
  distribution channel (Play Internal Testing) and is a hard **Week-10**
  dependency; activation is typically same-day.
- **What's needed to resolve:** Pay + activate the Google Play Console account by
  end of Week 9 at the latest.
- **Owner:** Founder (funding).
- **Cross-references:** `docs/08` Section 0 status + Week-10; workdiary session 1
  open items.

### CF-22 — `expo-symbols` removal

- **Category:** Infra / tooling queued
- **Origin:** Week 4, session 26 (PR #32) — lucide-react-native superseded the
  earlier `expo-symbols`/SF-Symbols direction.
- **Current status:** `expo-symbols` is unused by any code but is still a
  dependency. Kept deliberately (removable in a later cleanup); SF Symbols are
  iOS-flavoured and this build is Android-only.
- **What's needed to resolve:** Drop `expo-symbols` from `apps/mobile` in a
  dependency-cleanup pass.
- **Owner:** App track.
- **Cross-references:** `docs/03`; workdiary sessions 26, 27, 28, 29, 30.

---

## Documentation-gap

### CF-23 — Local-setup writeup missing from `docs/04` (NDK / Skia / Metro / pnpm layout)

- **Category:** Documentation-gap
- **Origin:** Accumulated across the Android native-build sessions and the
  session-30 Metro diagnostic.
- **Current status:** `docs/04` has a "Known environmental gotchas" section
  (pnpm 11 build-script config, Tailwind-4 `#`-in-path, NativeWind css-interop,
  Expo Go SDK lag) but **no consolidated local-native-setup writeup**. Missing:
  the local Android build path (`npx expo run:android`), the NDK 27
  empty-stub-install-via-sdkmanager gotcha, the Skia native-rebuild requirement,
  the Metro dev-client reconnect recipe (start Metro from `apps/mobile`, don't
  pass `CI=1`, reconnect via a manual `localhost:8081` dev-server URL), and the
  `pnpm-workspace.yaml` layout question. Confirmed by reading `docs/04` — none of
  this is present there today.
  **Eight more findings from the 2026-07-27 on-device run (session 34b)**, all
  currently undocumented and each of which cost real time:
  1. **A dev-client APK is only reusable on the ABI it was built for.** `expo run:android`
     builds **only the connected device's** ABI, so the committed debug APK is arm64-only
     despite `gradle.properties` listing four architectures. Checking `package.json` for
     native-module changes does **not** tell you whether an APK will run — inspect `lib/`
     inside the APK.
  2. **An arm64 APK will not run on an x86_64 emulator even with ARM translation present.**
     `extractNativeLibs=false` means the libs are never unpacked, and SoLoader then looks
     inside the APK using the *device's* ABI rather than the app's → `SoLoaderDSONotFoundError`.
  3. **`expo-updates` 56.0.19 cannot build here:** `ninja: error: manifest 'build.ninja'
     still dirty after 100 tries`, all four ABIs, ignoring `-PreactNativeArchitectures`.
     Suspected `expo` 56.0.8 vs `expo-updates` 56.0.19 skew from the session-33 reinstall.
     **Blocks any emulator/x86_64 build.**
  4. **`avdmanager create avd` NPEs** while enumerating targets. Workaround: write
     `~/.android/avd/<name>.ini` + `<name>.avd/config.ini` by hand; the emulator reads them
     directly. `~/.android/avd` may not exist.
  5. **`sdkmanager`'s downloader stalls where `curl` works** — same class as the pnpm-fetcher
     note. Workaround: curl the zips, verify SHA1 against the remote manifest, extract, and
     synthesise each `package.xml` by cloning the header/license from an sdkmanager-installed
     package and swapping `<localPackage>`.
  6. **Use USB, not wireless adb, for dev-client work.** Wireless paired and connected fine
     but the bundle never loaded (`ERR_STREAM_UNABLE_TO_PIPE`, blank white screen); USB
     worked first try. Wireless also auto-connects a duplicate mDNS entry for the same phone,
     breaking every adb command that doesn't pass `-s`.
  7. **mDNS discovery is blocked while the Wi-Fi profile is "Public"** — `adb mdns services`
     returns nothing, so pairing needs hand-entered IP:port + code. Outbound `adb pair` still
     works; only discovery is affected.
  8. **Deep links beat coordinate taps for driving the app:** scheme is `caeorta`, and
     `caeorta://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` + `adb reverse
     tcp:8081 tcp:8081` bypasses the "Failed to download remote updates" launcher entirely.
- **What's needed to resolve:** Two queued follow-ups (both founder-owned, since
  `docs/04` is founder-edited): (1) the Metro/NDK/Skia local-setup writeup —
  **a full follow-up prompt for this is already drafted and ready to run**, and it
  should now absorb the eight findings above plus the typed-routes regeneration step; (2)
  the `pnpm-workspace.yaml` layout investigation — **a separate queued follow-up
  with its own drafted prompt.**
- **Owner:** Founder (`docs/04` is founder-owned).
- **Cross-references:** Claude Code local memories `android-native-build-toolchain-this-machine`,
  `metro-devclient-reconnect`, `pnpm-workspace.yaml`-related notes; workdiary
  session 30 (Metro diagnostic), session 34 (typed routes), session 34b (the eight above).

### CF-24 — Design doc §6 S4 has no map-row slot

- **Category:** Documentation-gap
- **Origin:** Week 4, session 29 — the app shipped a `DriveMapPlaceholder` on
  drive-detail.
- **Current status:** Confirmed gap. `docs/design/00_design_system.md` §6, the
  `S4 · Drive detail` inventory line, lists "date/distance header, summary
  metrics, three telemetry charts (Speed/Boost/Coolant), diagnostics" — **no map
  slot** — even though the app now renders a map placeholder in that position.
- **What's needed to resolve:** The designer adds a map row to the S4 inventory
  (designer-owned doc; not editable from this track).
- **Owner:** Designer.
- **Cross-references:** design §6 (S4); `docs/08` Week-4 close (map placeholder);
  workdiary sessions 29, 30.

### CF-33 — Design §7's link graph has no route INTO the DTC list (S5)

- **Category:** Documentation-gap
- **Origin:** Week 5 Day 3, session 34 (2026-07-26) — building S5.
- **Current status:** Confirmed gap, same species as CF-24. `docs/design/00_design_system.md`
  §7 ("Navigation & link graph", whose stated rule is **"No dead ends. Every tappable
  link/chevron resolves to a real screen"**) carries a row **out of** the DTC list
  (`DTC list | tap code | → DTC detail (S6)`) but **no row into it** — nothing in §6 or
  §7 says where a user reaches S5 from. §6's Home/Vehicle-Detail inventory lists the
  last-drive card, Live mode and the Recent Diagnostics preview + "See all"; fault codes
  appear nowhere. The app therefore made a placement call (founder, session 34): a
  **"View fault codes" link on vehicle detail**, directly mirroring the existing
  "View all drives" link, which was itself an App-track addition to the same screen.
  Not a blocker — S5 is reachable and the link is one line to move — but the *designed*
  entry point is unrecorded, so the built nav and the doc's link graph disagree.
- **What's needed to resolve:** The designer adds a row to §7 (`Vehicle detail | View
  fault codes | → DTC list (S5)`) and a fault-codes entry to §6's Home/Vehicle-Detail
  inventory — or specifies a different placement, in which case the App moves the link.
  Designer-owned doc; not editable from this track.
- **Owner:** Designer (§7 + §6 inventory) + App track (move the link if placement changes).
- **Cross-references:** CF-24 (the parallel §6 S4 map-row gap); design §6 + §7;
  the entry-point link in `apps/mobile/src/app/(app)/vehicles/[id]/index.tsx`; PR #42;
  workdiary session 34.

### CF-34 — S5 (and S6) were built from the written spec, not the Figma board — parity unchecked

- **Category:** Documentation-gap
- **Origin:** Week 5 Day 3, session 34 (2026-07-26); carried through 34b/34c and reaffirmed
  at Day 4, session 35 (2026-08-02), which built S6 the same way.
- **Current status:** Open, and **not a defect — a missing check.** The DTC board
  `node 53:195` has never been opened. S5 (PR #42) and S6 (PR #43) were both built from
  `docs/design/00_design_system.md` §6's one-line inventories plus the token layer, which is
  the documented source of truth this repo works from and was sufficient to build against.
  What is unverified is whether the *rendered screens* match the designer's *drawn* screens:
  §6 gives S5 "grouped Active/Pending/History, severity-tinted code badges + plain-language
  titles" and S6 "large code badge + status pill, what it means, likely-causes, freeze-frame
  conditions (Metric Tile instances), related Diagnostic Card, auto-clear note" — an
  inventory of parts, not a layout. Every arrangement decision (section spacing, badge
  placement relative to the title, the meta line, where the status pill sits, tile grid
  columns, section order below the header) was therefore an App-track call. Some of those
  calls are recorded as deliberate — the §11 badge/label split, the always-render empty
  groups, the neutral status pill — but they were reasoned from the written rules, not
  compared against a drawing.
  **This is the third designer-parity item and they should be handled as one batch** with
  **CF-24** (§6's S4 inventory has no map-row slot) and **CF-33** (§7's link graph has no
  route *into* S5). CF-24 and CF-33 are gaps in the doc; this one is a gap in the
  *verification*. All three want the same 30 minutes of the designer's attention.
- **What's needed to resolve:** Open `node 53:195` and diff the built S5/S6 against the
  drawn ones; record any divergence as either an App-track fix or a designer-side amendment.
  Do this **together with CF-24 and CF-33** so the designer is asked once. Worth doing before
  Week 8's polish pass, since a layout divergence found then is more expensive than one found
  now.
- **Owner:** App track (run the diff) + designer (adjudicate divergences; the doc is
  designer-owned).
- **Cross-references:** CF-24 + CF-33 (the batch); design §6 (`S5`/`S6` inventories) + §7;
  `apps/mobile/src/app/(app)/vehicles/[id]/dtcs/index.tsx` and `[dtcId].tsx`; PRs #42, #43;
  workdiary sessions 34, 34c (raised as "Figma parity for S5 still unchecked"), 35.

### CF-25 — `docs/05` stale seed.sql "safe to re-run" claim  *(resolved in this PR)*

- **Category:** Documentation-gap
- **Origin:** `docs/05` § Test fixtures, written before PR #37.
- **Current status:** **Resolved in this PR.** `docs/05` previously said "Use
  `INSERT … ON CONFLICT DO NOTHING` everywhere so the seed file is safe to
  re-run" — but the actual re-runnability mechanism (PR #37, `9d453ca`) is an
  ordered **child → parent DELETE teardown** block: `vehicles.device_id
  REFERENCES devices(id) ON DELETE RESTRICT` (the only `RESTRICT` FK among the
  seeded tables) made `ON CONFLICT DO NOTHING` insufficient. Verified by reading
  the current `supabase/seed.sql`. `docs/05`'s Test-fixtures wording is corrected
  to cite the PR-#37 teardown-order mechanism as part of this PR.
- **What's needed to resolve:** Done (this PR, step 5).
- **Owner:** App track (this PR).
- **Cross-references:** `docs/05` § Test fixtures; PR #37; workdiary sessions 28,
  30.

### CF-26 — `CLAUDE.md` "sole code author" inaccuracy (deliberately unfixed)

- **Category:** Documentation-gap
- **Origin:** Ongoing; the execution-model framing.
- **Current status:** `CLAUDE.md` (and mirrored lines in `docs/01`/`02`/`04`/`08`
  + the workdiary repo facts) states Muhammed is "the sole code author for this
  repo." This is **known-wrong**: Sulaiman's Platform track authored the Edge
  Functions, admin dashboard, migrations, and `seed.sql` in this same repo
  (workdiary Platform-track sessions 3–11). It is **deliberately left
  uncorrected pending a future founder decision** on how to reconcile the
  framing. **This entry records that the inaccuracy exists and is intentional —
  it is NOT to be fixed as part of routine work.**
- **What's needed to resolve:** A founder decision on how to phrase the
  execution model (e.g., "primary/lead App author" vs. "sole author") that
  matches the two-track reality; then update `CLAUDE.md` + the mirrored lines.
- **Owner:** Founder decision.
- **Cross-references:** `CLAUDE.md`; `docs/01`/`02`/`04`/`08` execution-model
  lines; R14 (bus factor); workdiary Repository facts + Platform-track sessions
  3–11.

---

## Founder logistics

### CF-27 — Open Section-0 / working-agreement founder actions

- **Category:** Founder logistics
- **Origin:** Section 0 + Week-1 "Together" set; carried since sessions 1–7.
- **Current status:** Lower-priority process items still open per the early-session
  carries, tracked here so they aren't silently dropped: the recurring
  daily-sync + Friday-retro calendar events, the GitHub Issues + project board,
  and the WhatsApp Business account. **Superseded / effectively satisfied:** the
  "designer 90-min working session" and "confirm Figma is a component system"
  items — the designer delivered a complete, documented system (96 variables, 12
  text styles, full screen inventory) adopted in PR #32, which is why R11 was
  downgraded. Purely local-machine chores (PowerShell `$PROFILE` off OneDrive,
  Git upgrade, deleting the old source folders) also remain open but are
  out-of-band housekeeping, not project carries.
- **What's needed to resolve:** Founder executes the calendar cadence, the
  Issues/board, and WhatsApp Business when convenient; the housekeeping chores
  are opportunistic.
- **Owner:** Founder.
- **Cross-references:** `docs/08` Week-2 "Carry from Week 1" (slipped
  working-agreement set); R4 (designer handoff — largely mitigated); workdiary
  sessions 1, 5, 6, 7 long-running carry-overs.
