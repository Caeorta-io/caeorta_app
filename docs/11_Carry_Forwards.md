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

---

## Platform-blocked

### CF-01 — `create_vehicle` end-to-end verification

- **Category:** Platform-blocked
- **Origin:** Week 3. Decision session 19 (2026-06-22); wire contract authored
  session 21 (2026-06-23, `docs/create_vehicle_contract.md`); recorded in the
  Week-3 close table, session 24 (PR #30).
- **Current status:** The `create_vehicle` Edge Function is **still absent** —
  confirmed via `ls supabase/functions/` (10 functions present:
  `pair_device`, `mint_device_token`, `submit_wifi_credentials`, `ota_check`,
  `device_sync_start/chunk/complete`, `get_drive_telemetry`,
  `send_diagnostic_notification`, `update_current_state`; no `create_vehicle`).
  The App-side add-vehicle flow (`lib/vehicles.ts`, form, Zod, result states)
  is built and unit-tested against the contract — "built, not E2E-verified."
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
- **Current status:** Unbuilt, re-verified via `ls apps/admin/app/` — only
  `login/page.tsx`, a ~120-line devices dashboard `page.tsx`, and
  `auth/callback/route.ts` exist; no per-device drive-list page. Platform's
  Week-4 sync pipeline (`device_sync_*`, `get_drive_telemetry`) is built, but
  the admin drive-list view is not.
- **What's needed to resolve:** Platform builds the per-device drive-list page in
  the admin app.
- **Owner:** Platform track (Sulaiman).
- **Cross-references:** `docs/08` Week-4 plan + close table; workdiary sessions
  29, 30 (re-verified absent).

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

### CF-13 — Full eight-variant Diagnostic Card (design §5.1)

- **Category:** App-build dependency
- **Origin:** Week 4, sessions 27–29 (drive-detail uses a simplified stand-in).
- **Current status:** Not built. Drive-detail uses a simplified token diagnostic
  row; the vehicle-detail preview stays stock. The full eight-variant Diagnostic
  Card is the reusable diagnostic atom for the rest of the build and is
  explicitly a **Week-5 dependency** (DTC list/detail + the agent feed depend on
  it).
- **What's needed to resolve:** Build the eight-variant component
  (severity-coloured, expandable, thumbs UI, mark-seen, dismiss) at the start of
  Week 5. Note: session 30's finding that each Victory Native `CartesianChart`
  auto-scales its own x-domain applies directly to this card's chart.
- **Owner:** App track.
- **Cross-references:** `docs/08` Week-4 close table + Week-5 plan; design §5.1;
  workdiary sessions 27, 28, 29, 30.

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
- **What's needed to resolve:** Two queued follow-ups (both founder-owned, since
  `docs/04` is founder-edited): (1) the Metro/NDK/Skia local-setup writeup —
  **a full follow-up prompt for this is already drafted and ready to run**; (2)
  the `pnpm-workspace.yaml` layout investigation — **a separate queued follow-up
  with its own drafted prompt.**
- **Owner:** Founder (`docs/04` is founder-owned).
- **Cross-references:** Claude Code local memories `android-native-build-toolchain-this-machine`,
  `metro-devclient-reconnect`, `pnpm-workspace.yaml`-related notes; workdiary
  session 30 (Metro diagnostic).

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
