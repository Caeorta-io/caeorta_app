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
>
> **Partial re-verification 2026-08-02** (session 36, Week-5 close, off `origin/main`
> `63ed007`). Three entries added, all from building the in-app new-DTC notification:
> **CF-36** (DTC seen/ack state has no schema backing — the App-local acknowledged-set),
> **CF-37** (the design specifies no in-app new-DTC surface at all), and **CF-38** (the
> project now carries *three* non-equivalent notification-preference models). **CF-32**
> was updated — the badge-severity derivation gained a second consumer, and its
> `unknown` fallback now has a behavioural consequence beyond tinting. Re-confirmed
> unchanged: `DATA_SOURCE.dtcs` is still `'mock'`, `dtcs` still has no status/seen column
> (**CF-29** premise holds), and the three `apps/admin` lint errors from `22acf4c` are
> still red on `main` (**CF-05** caveat). Entries not named here were not re-checked.
>
> ---
>
> ### FULL re-verification 2026-08-03 (session 37, Week-5 close-out sweep)
>
> **The first pass over the whole registry since it was written.** Every entry was
> re-checked against a live clone of `origin/main` at **`85b47b0`** (PR #44, merged
> 2026-08-02T14:48Z) — not transcribed from an older table. This supersedes the
> 2026-07-05 blanket verification date in the header above; **no entry now carries a
> status older than the date on its own line.**
>
> **Method.** `git fetch origin` → branched off `origin/main` `85b47b0` → read the
> artifact each entry names (migration file, Edge Function, `source.ts` capability flag,
> doc section, `package.json` dependency) rather than the entry's own prose. Three checks
> ran against live systems rather than the repo: `pnpm -r lint` (CF-05's three admin
> errors), `gh api repos/Caeorta-io/caeorta_app` (CF-20's merge settings), and
> `gh api …/branches/main/protection` (CF-20's branch protection — 404). Platform's last
> commit to `main` is **`d582b62` (2026-07-08)**; everything after it is App-track PRs
> #40–#44 — so no Platform-side work has silently resolved an entry this pass the way
> `create_vehicle` once resolved CF-01's Platform half.
>
> **Closed (2):** **CF-12** (downsample check — promoted to closed-by-founder-decision;
> the decision was already recorded in the 2026-07-05 decisions log, the entry had simply
> never been updated to match) and **CF-25** (the `docs/05` seed.sql wording — the fix is
> on `main` in `b875bf5`, so its "resolved in this PR" phrasing was retired for a dated
> closure). Both carry their resolving artifact on the entry.
>
> **Re-verified and left OPEN (23):** CF-01, CF-02, CF-03, CF-04, CF-05, CF-06, CF-07,
> CF-08, CF-09, CF-10, CF-11, CF-14, CF-15, CF-16, CF-17, CF-18, CF-19, CF-20, CF-21,
> CF-22, CF-23, CF-24, CF-27. Each carries a refreshed status line with a `2026-08-03`
> marker and a named blocker. **Nothing blocked on hardware, the AI-agent team, the
> designer, funding or a founder decision was closed**, however tidy that would have been
> — a carry closed on optimism corrupts the registry.
>
> **Carried unchanged (11):** the DTC-arc entries re-verified 2026-08-02 in sessions
> 35/36 — CF-28, CF-29, CF-30, CF-31, CF-32, CF-33, CF-34, CF-35, CF-36, CF-37, CF-38.
> One day old, re-read this pass, nothing to correct. **CF-26 is deliberately untouched**
> (see its entry — the inaccuracy is intentional and is not to be "fixed" by routine work).
>
> **Added (1):** **CF-39** — the Week-5 on-device verification backlog, consolidating what
> was scattered across CF-13's residual note and the session-35/36 after-reports.
>
> **Already closed, re-confirmed (1):** **CF-13**, closed 2026-08-02 in session 35. Left
> closed; its residual note #1 (the on-device look at the preview swap and the S6 related
> card) was **moved to CF-39**, which is now the live tracking for it.
>
> **Accounting:** 2 closed this pass + 1 already closed + 23 re-verified-open + 11 carried
> unchanged + CF-26 (untouched by design) + CF-39 (new) = **39 entries; 3 closed, 36 open.**
>
> ---
>
> ### Amendment 2026-08-03 (session 38) — CF-22 closed won't-do
>
> **One entry moved after the sweep above, and the sweep was wrong about it.** Session 37
> listed **CF-22** among the 23 "re-verified and left open", recording it as *confirmed
> ready to close, held back only for PR scope*. Acting on that in session 38 found the
> premise was wrong: **`expo-symbols` is a hard transitive dependency of `expo-router`**
> (`expo-router@56.2.8` `package.json:157`), so removing our direct declaration removes
> nothing from the tree. CF-22 is **CLOSED as won't-do**, not done — no dependency or
> lockfile change shipped.
>
> **Worth generalising, because it is a failure mode this file is exposed to:** the
> session-37 pass re-verified CF-22's *facts* correctly (unused by our code, still in
> `package.json`) and never questioned the entry's *assumption* that the dependency was
> ours to remove. **Re-verification confirms whether recorded facts still hold; it does not
> check whether they still mean what the entry claims.** When an entry has carried the same
> framing for months, the framing is the thing to re-read.
>
> **Revised accounting: 39 entries; 4 closed (CF-12, CF-13, CF-22, CF-25), 35 open.**
>
> ---
>
> ### Amendment 2026-08-03 (session 39) — CF-38 resolved as Option C1, still open  *(superseded — closed later the same day, see session 42)*
>
> **CF-38 has a decision.** The session-37 sweep listed it among the 11 "carried unchanged"
> DTC-arc entries; it has since been resolved as **Option C1** by founder decision dated
> **2026-08-02** (taken at the Week-5 close, recorded here after the fact). The three-way
> conflict is settled: the monotone `notification_severity_threshold` column is **kept** for
> the ranked Warning/Info tiers, **Critical** becomes an always-on floor rather than a
> toggle, and the off-ladder `insufficient` tier gets its **own boolean** on
> `user_preferences` — an additive one-column migration, no restructure.
>
> **It does NOT close.** One residual holds it open: C1 is correct only if design §6's
> four-toggle layout was a default drawing rather than a deliberate non-monotone
> requirement. If the designer confirms non-monotone was intended, C1 flips to per-tier
> booleans and the threshold retires. Status label on the entry:
> **DECIDED-PENDING-DESIGNER-INTENT-CHECK.** That single question is the only thing that
> can still move it — every remaining work item is internal.
>
> **Accounting unchanged: 39 entries; 4 closed, 35 open.** CF-38 moves within the open set
> from *undecided cross-track conflict* to *decided, pending one designer confirmation*.
>
> *(**Superseded 2026-08-03** — the intent-check was answered "incidental" later the same
> day and CF-38 closed; the `DECIDED-PENDING-DESIGNER-INTENT-CHECK` label and the Option (a)
> contingency above are historical. See the session-42 amendment below.)*
>
> **One status is inferred rather than directly observed — CF-17.** Prod Supabase state
> cannot be read from this repo. The entry is left OPEN on the project's own record:
> `docs/05` still lists both Week-5 migrations as "applied on dev, NOT on prod", and the
> promotion ritual mandates a workdiary entry (step 8), of which there is none since
> 2026-06-21. If Platform has promoted them without logging it, this line is wrong and
> the missing log entry is the thing to fix.
>
> ---
>
> ### Amendment 2026-08-03 (session 41) — AI-agent v0.2 proposal lands; CF-07 closes
>
> **The largest single movement on this registry since it was created, and it came from
> outside the App track.** The AI-agent project produced a **v0.2 contract proposal on
> 2026-07-17** that reconciles the contract against this repo's shipped schema. It reached
> this project's session history only on **2026-08-03** and merged the same day (PR #50,
> `211dc5d`) as documents under `docs/AI_Agent_Contract/`. Four entries move:
>
> - **CF-03** — major status change, **not a close.** Four of the six original open
>   questions are resolved (trigger mechanism → durable `agent_work_queue` + NOTIFY-as-
>   wakeup; dedup confirmed; `agent_request_queue` → yes; deep-analysis cadence confirmed
>   *but its emitter found never to have existed*). **Four founder decisions taken
>   2026-08-03** and **nine review findings (4 P0 + 3 P1 bugs, 2 P2 doc findings)** routed
>   to Sulaiman. Stays open because **every concrete artifact is still unbuilt** and the
>   agreement is currently one-directional.
> - **CF-04** — a **drafted** `agent_role` migration now exists, as a document under
>   `docs/`, not in `supabase/migrations/`. Unapplied. Still open.
> - **CF-07** — **CLOSED.** The app's provisional metric keys are adopted as the canonical
>   vocabulary verbatim; no key value changes anywhere.
> - **CF-08** — **scope widened** from "coolant threshold" to **hard safety thresholds**
>   across metrics (coolant, oil pressure, …), and **re-owned from engineering to
>   founder/domain-research.** The v0.2 package names it *the only remaining item the agent
>   project cannot source or decide for itself.*
>
> **Revised accounting: 39 entries; 5 closed (CF-12, CF-13, CF-22, CF-25, CF-07), 34 open.**
> *(Superseded later the same day — see the CF-38 amendment below.)*
>
> **A provenance note worth keeping.** This proposal sat for ~2.5 weeks between being
> produced (2026-07-17) and being surfaced here (2026-08-03) — during which the session-37
> sweep re-verified CF-03 as "unchanged, nothing moved during the whole of Week 5" and
> called it the most time-critical entry in the file. That was accurate against this repo
> and wrong about the world. **R1's doc-drift risk is bidirectional**, and the same gap now
> runs the other way: the four founder decisions above exist only in this repo until
> someone carries them back into the agent project's context.
>
> ---
>
> ### Amendment 2026-08-03 (session 42) — CF-38 CLOSED, designer intent-check answered
>
> **The one question holding CF-38 open is answered: §6's four-toggle layout was
> incidental, not a deliberate non-monotone requirement.** Nobody intended *"Critical +
> Info but not Warning"* as a supported state, so the single combination Option C1 cannot
> express is a combination nobody wants. **CF-38 closes**, and the **Option (a) fallback —
> per-tier booleans, threshold retired, `send_diagnostic_notification` rewritten — is
> withdrawn rather than deferred.**
>
> **What this unblocks concretely:** Week 7's S8 screen builds against
> `{ threshold, insufficientEnabled }` with **no contingency branch**, the §6
> reconciliation (Critical = Always floor + Warning/Info threshold control + standalone
> Insufficient switch) proceeds as drawn, and Platform's additive `insufficient` boolean is
> safe to ship in the CF-36/CF-29 migration pass without waiting on anything. The
> designer's remaining §6 redline is **housekeeping, not a gate** — the shape it will
> describe is already final.
>
> **Revised accounting: 39 entries; 6 closed (CF-12, CF-13, CF-22, CF-25, CF-07, CF-38),
> 33 open.** The designer batch drops to **four decisions** (CF-24, CF-33, CF-34, CF-37)
> plus CF-38's one redline.

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
  **Re-verified 2026-08-03 (session 37), unchanged.** `DATA_SOURCE.createVehicle` still
  reads `ENV_DEFAULT` (i.e. `'mock'`) in `source.ts`; `create_vehicle` is still present
  among the 11 deployed Edge Functions. **Blocker: the App-side live wiring + E2E run,
  which itself waits on the `ecu_type` canonical-set question owned by the hardware track.**

  **Updated 2026-08-03 (later session — requiring `ecu_type`).** Two changes to this
  item's picture:

  1. **The `ecu_type` canonical-set question is resolved, and was never actually
     open.** `vehicles.ecu_type` has carried
     `CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other'))` since the
     initial schema migration. The "free text until the hardware track locks a set"
     posture rested on reading `database.types.ts` (`string | null`) as proof of no
     constraint — an invalid inference, since the generator never renders CHECKs. The
     App side now validates `z.enum(ECU_TYPES)` against that exact set, so this is no
     longer a blocker on anything.
  2. **The "Platform half now DONE" status is too generous.** An audit of
     `supabase/functions/create_vehicle/index.ts` against the contract found **six
     conformance gaps**, all live-flip blockers — most consequentially, the function
     defaults an absent `ecu_type` to `'oem'` (silently marking every car stock), and
     it returns human error strings where the App orchestrator maps stable machine
     codes, so all four device-specific error paths would collapse to `network`. The
     full table is in `docs/create_vehicle_contract.md` § *Deployed implementation —
     conformance gaps*. Treat the Platform half as **built but not contract-conformant.**
- **What's needed to resolve:** Platform brings `create_vehicle` into conformance with
  the contract (the six-gap table above); then App flips
  `DATA_SOURCE.createVehicle` → `'live'` in `source.ts`, wires
  the live `fetch`, and runs the add-vehicle flow on-device with a claimed
  `device_id`, confirming a `vehicles` row with correct `owner_user_id` /
  `device_id` / `ecu_type` / `modifications` / fields.
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
  **Re-verified 2026-08-03 (session 37), unchanged.** `DATA_SOURCE.currentStateSubscription`
  still reads `ENV_DEFAULT`; the live branch still throws `notImplemented`; no adapter
  module exists. **Blocker: the cross-track interface agreement, which must precede any
  code** — it touches the shared `packages/supabase` boundary, so this cannot be unblocked
  App-side alone.
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

### CF-03 — AI Agent Contract: six open questions unacknowledged + not shared (R1)  *(v0.2 proposal received — substantially de-risked, every artifact still unbuilt)*

- **Category:** Cross-track dependency / flag
- **Origin:** Week 1, contract v0 authored session 12 (`docs/ai-agent-contract.md`);
  carried at Week-2 close (2026-06-22).
- **Current status:** **MAJOR STATUS CHANGE, 2026-08-03 — not a close.** The AI-agent
  project produced a **v0.2 contract proposal on 2026-07-17**, reconciling the contract
  against the schema this repo actually shipped (`20260602130000`). It reached this
  project's session history only on **2026-08-03**, ~2.5 weeks later, and merged to `main`
  the same day as **PR #50** (`211dc5d`, squash-merged) into `docs/AI_Agent_Contract/`:
  `ai-agent-contract.md` (the v0.2 draft), `proposed-app-changes.md`,
  `findings-from-repo-review.md`, `safety_thresholds.yaml`, and a proposed
  `20260717000000_create_agent_role.sql`.

  **The v0.2 artifacts are documents on `main`, not applied changes.** Nothing in
  `supabase/migrations/`, `supabase/functions/` or the app has moved. `docs/06` remains
  the ratified v0.1 contract of record; v0.2 is a proposal awaiting joint review.

  **The six original open questions, re-verified against the v0.2 draft:**
  1. **Trigger mechanism — RESOLVED.** Durable **`agent_work_queue` + NOTIFY-as-wakeup**,
     replacing NOTIFY-only. Enqueue becomes a trigger on `sync_sessions AFTER UPDATE OF
     status` (fires atomically with the commit, so no code path can skip it and a
     rolled-back commit can't fire it) rather than v0.1's "Edge Function's last step".
     **Not built — no migration on `main`.**
  2. **Multi-vehicle batching — subsumed structurally**, not separately answered: the
     queue's **unique partial index** `(vehicle_id, kind) WHERE state='pending'` coalesces
     per vehicle and enforces cooldowns declaratively.
  3. **Deep-analysis cadence — cadence confirmed** (≤1 deep run per vehicle per week), but
     the review found **no weekly emitter has ever existed** — the cron migration schedules
     only downsample + two cleanups. Specified since v0.1, never implemented, and not
     previously recorded as missing anywhere in this repo. Founder decision below.
  4. **`insufficient_data` threshold — reframed and open.** v0.2 splits it into
     *temporary* (cold start, recoverable) vs *permanent* (sensor absent). Both use
     `category='insufficient_data'`, `confidence<0.3`, `severity='info'`,
     `urgency='monitor'`; how to distinguish them is DECISION REQUIRED #3 (recommend a
     `title`/`explanation` copy convention for v1, no schema change).
  5. **Cross-diagnostic deduplication — CONFIRMED as v0.1 specified.** Agent writes one
     row per occurrence and uses prior outputs as continuity context; **the app** dedupes
     in the UI by category + active state. The agent does not suppress repeats.
  6. **`agent_request_queue` in v1 — RESOLVED: yes**, as `agent_work_queue` (see #1).

  **This closes CF-07** — the metric vocabulary is settled, the app's own keys adopted as
  canonical. See CF-07 for the evidence; not duplicated here.

  **Four founder decisions taken 2026-08-03** (recorded here because they were taken in
  conversation and, per session 39's lesson, a decision that lives only in a conversation
  is not recorded):
  1. **`drives.has_anomaly` = app-derived** — a trigger on `diagnostic_outputs` insert
     setting the flag where severity > `'info'`. Keeps the agent's write surface at two
     tables (`diagnostic_outputs`, `agent_status`) and keeps the flag consistent with the
     outputs by construction. Resolves a real contradiction: the schema doc calls it
     "set by agent" while BUILD REQ §1 and the contract both say the agent writes only two
     tables — and the column is currently **write-once-`false`**, set at insert by
     `device_sync_complete` and never updated by anything in the repo.
  2. **Add `referenced_telemetry_snapshot jsonb` to `diagnostic_outputs`** — the agent
     copies the handful of cited samples inline at write time. `diagnostic_outputs` is
     retained indefinitely while raw `telemetry` is purged at 30 days, and
     `referenced_telemetry_ids` is a bare `uuid[]` with no FK — so from day 31 every
     diagnostic in a user's permanent history cites rows that no longer exist.
  3. **Add `telemetry.drive_id` + backfill.** Today the association is a working
     convention (`get_drive_telemetry` filters `sync_session_id` + `timestamp BETWEEN
     started_at AND ended_at`) with **no index on `telemetry.sync_session_id`**, so it
     scans.
  4. **BUILD the weekly deep-analysis pg_cron emitter** (not cut to v2) — see #3 above.

  **Nine findings from the agent project's repo review** (`findings-from-repo-review.md`,
  read against `main` 2026-07-17, verified empirically against PostgreSQL 16): **4 P0 + 3
  P1 bugs, plus 2 P2 doc-correction findings.** Routed to Sulaiman 2026-08-03; **none fixed
  yet.** Nothing is in prod — the P0s sit in dev-only migrations, and P1-1/P1-3 in the
  deployed-to-dev `device_sync_complete`. Detail is in that file and deliberately not
  duplicated here. Two bear directly on this entry: **P0-4** (`notify_agent` is callable by
  any authenticated user, so any user can trigger agent runs on arbitrary vehicles) and
  **P2-1** — `docs/ai-agent-contract.md`, the document BUILD REQ §4 calls "THE source of
  truth" and which R1 exists to keep from drifting, **is not in the repo at all**; only the
  immutable v0.1 `docs/06` is committed. The review names that as the root cause of most
  of the mismatches it found.

  **Why this stays open:** the proposal is a large de-risking — four of six questions
  resolved, a concrete architecture, and CF-07 closed — but **every concrete artifact is
  still unbuilt**, and the agreement is currently one-directional.
- **What's needed to resolve — two tracks:**
  - **(a) Platform (Sulaiman) — review + build. None of this exists on `main`:** the
    `agent_role` migration (CF-04), `agent_work_queue` + its enqueue triggers,
    `telemetry.drive_id` + backfill, `referenced_telemetry_snapshot`, the `has_anomaly`
    trigger, the weekly deep-analysis pg_cron emitter, and the 7 bug fixes.
  - **(b) Founder — communicate the four decisions back into the AI-agent project's own
    context**, so both sides hold the same agreement. **R1's doc-drift risk applies to
    silence in *either* direction, not just this side's.** The v0.2 draft still lists
    these as "4 decisions marked for joint review"; until the answers land there, the
    agent project is building against open questions this project considers settled.
    Also still outstanding from the original entry: the recurring cross-project sync is
    **not calendared**.
- **Owner:** Platform track (build) + founder (decisions back to the agent project +
  calendar the sync) + AI-agent team (ratify v0.2, or `docs/06` and the draft diverge).
- **Cross-references:** R1; CF-04 (`agent_role`), CF-07 (**closed by this**), CF-08
  (safety thresholds, widened); `docs/AI_Agent_Contract/README.md` and its four documents;
  `docs/08` Week-2 "Carry from Week 1"; `docs/06` "Open questions" + Changelog; workdiary
  sessions 12, 37, 41; PR #50.

### CF-04 — `agent_role` read-only Postgres role migration

- **Category:** Cross-track dependency / flag
- **Origin:** Week 1 (RLS work, session 7, 2026-06-02); carried Week-1 → Week-2.
- **Current status:** Open, gated on CF-03. The role's exact read scope can't be
  finalized until the AI Agent Contract v0 merges and the agent project confirms
  which tables/columns it reads. `docs/05` § Testing lists `agent_role`
  read-only verification as deferred "until the AI Agent Contract v0 lands and
  the role is created in a follow-up migration."
  **Re-verified 2026-08-03 (session 37), unchanged.** No `agent_role` migration exists —
  the seven files in `supabase/migrations/` contain only *forward references* to it
  (`rls_policies.sql` lines 16, 418, 454 name it as a separate future migration), and
  `docs/05` line 598 still marks the read-only verification TODO. **Blocker: CF-03.**
  This entry cannot move before that one does.

  **Updated 2026-08-03 (session 41) — a draft now exists, still unapplied.** The AI-agent
  project's v0.2 package includes a proposed migration at
  **`docs/AI_Agent_Contract/20260717000000_create_agent_role.sql`** — note the path: it is
  a **document under `docs/`, deliberately not in `supabase/migrations/`**, so it is not
  in the migration sequence and nothing applies it. `supabase/migrations/` is unchanged at
  seven files; the forward references in `rls_policies.sql` and the `docs/05` TODO both
  still stand.

  The draft **self-documents its own open questions** rather than assuming a scope — it
  carries inline notes on the points the agent project could not decide alone, including
  the commented-out **column-scoped** `GRANT UPDATE (has_anomaly) ON drives` that founder
  decision 1 (CF-03) has now settled the other way: `has_anomaly` becomes app-derived via
  a trigger, so that grant should stay out and the agent's write surface stays at two
  tables. Whoever reviews the draft should reconcile it against all four decisions before
  applying it.
- **What's needed to resolve:** Sulaiman reviews the drafted migration, reconciles it
  against the four founder decisions of 2026-08-03 and the agent project's confirmed read
  scope, then lands it **in `supabase/migrations/`** (a new timestamp if the drafted one
  has been overtaken); then add the deferred RLS read-only verification test and clear the
  `docs/05` TODO.
- **Owner:** Platform track (review + apply the migration) + AI-agent team (read-scope
  confirmation as part of ratifying v0.2).
- **Cross-references:** CF-03; R1; `docs/AI_Agent_Contract/20260717000000_create_agent_role.sql`
  (the draft) + that folder's `README.md`; `docs/08` Week-2 "Carry from Week 1";
  `docs/05` § Testing (deferred) + Migration discipline; workdiary sessions 7, 41.

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
  **Re-verified 2026-08-03 (session 37) — the drive-list half is still done; the lint half
  is still red, and is now the sole reason this entry is open.** `pnpm -r lint` was run
  against `main` this pass and fails identically to the session-33 and session-36 checks:
  `apps/admin/app/devices/[id]/page.tsx` — `39:15` and `40:13` `@typescript-eslint/no-explicit-any`,
  `72:9` `@next/next/no-html-link-for-pages` (plus one non-blocking `no-unused-vars`
  warning in `app/page.tsx`). **Unchanged for four weeks** — Platform's last commit to
  `main` is `d582b62` (2026-07-08). **Blocker: Platform-owned code; App-track PRs cannot
  fix it without crossing track ownership**, so the repo-wide lint gate stays red and every
  App PR must report it as pre-existing rather than green.
- **What's needed to resolve:** Nothing for the drive-list itself. Separately,
  Platform should clear the three admin lint errors so the workspace-wide gate is
  green again.
- **Owner:** Platform track (Sulaiman).
- **Cross-references:** `docs/08` Week-4 plan + close table; workdiary sessions
  29, 30 (recorded absent), Platform session 12 (built), 33 (re-verified present).

### CF-38 — Three non-equivalent notification-preference models  *(RESOLVED as Option C1 — CLOSED 2026-08-03, designer intent-check answered)*

- **Category:** Cross-track dependency / flag
- **Origin:** Week 5 Day 5, session 36 (2026-08-02) — found while building the in-app
  new-DTC notification's preference gate.
- **Current status: RESOLVED as Option C1 (founder decision, 2026-08-02) and CLOSED
  2026-08-03 — the designer intent-check is answered.** The four-toggle layout in design §6
  was **incidental, not a deliberate non-monotone requirement**: nobody intended
  *"Critical + Info but not Warning"* as a supported state. **C1 stands with no residual
  risk of reopening, and the Option (a) fallback is withdrawn** — per-tier booleans are off
  the table, `notification_severity_threshold` is not retiring, and
  `send_diagnostic_notification`'s skip logic is not being rewritten.

  **The shape is final — Week 7 can build S8 against it with no fallback branch.** The §6
  reconciliation proceeds exactly as drawn below: **Critical = Always (a floor, rendered
  without a toggle) + one Warning/Info threshold control + a standalone Insufficient
  switch.** No conditional design work, no "pending confirmation" caveat on the migration,
  and the one additive boolean column is safe to batch with the other Platform DTC-state
  work. What C1 openly gives up — the inexpressible `{Critical, Info}` combination — is
  now a confirmed non-requirement rather than an accepted risk.

  **The agreed model (C1).** Three parts, and the point of it is that each tier is stored
  by a mechanism that matches whether it is actually *ordered*:
  1. **`user_preferences.notification_severity_threshold` is KEPT** — the existing monotone
     three-value column (migration `20260602130000`), unchanged. **No replacement
     migration.** It carries the two genuinely *ranked*, user-configurable tiers:
     **Warning and Info**. Platform's `send_diagnostic_notification` skip logic keeps
     working as written.
  2. **Critical becomes an always-on floor, not a user-configurable toggle.** §6 already
     says "**Critical = Always**"; C1 makes that structural rather than a convention. The
     App side already enforces it in the type system — `DtcNotificationPrefs` types
     `critical` as the literal `true`, not `boolean`, so no prefs object can silence it and
     no S8 toggle can bind to it.
  3. **`insufficient` — the off-ladder §4.3 tier — gets its OWN boolean on
     `user_preferences`, default `false`.** An **additive one-column migration**, not a
     restructure. This is the part the threshold structurally cannot do: the column's three
     values *are* the §4.3 ladder, and an off-ladder tier is not comparable to them, so it
     needs its own slot rather than a rank.

  **This is NOT the option (c) rejected below — read the difference before assuming it is.**
  Rejected (c) kept a per-severity model App-side and **persisted the closest threshold**,
  which is lossy: it silently discards non-monotone states, the failure mode where a user
  turns something off and it stays on. C1 changes the *model* instead of mapping between
  two mismatched ones — the threshold carries only tiers that are genuinely ordered, and
  the tier that isn't ordered gets its own storage. **Nothing is silently dropped at write
  time.** What C1 gives up, it gives up openly — and that cost has now been checked and
  accepted:

  **✅ THE RESIDUAL — resolved 2026-08-03.** With Critical pinned on and Insufficient
  independent, the threshold's remaining job is just Warning-vs-Info. So C1 can express
  `{Critical}`, `{Critical, Warning}` and `{Critical, Warning, Info}` — but **not
  `{Critical, Info}`**, i.e. *"Info on, Warning off"*. That single combination was the
  entire cost of C1, and the entry stayed open on one question: **was §6's four-toggle
  drawing a default layout, or a deliberate non-monotone requirement?**
  **Answered: incidental.** The layout was not a considered decision to support
  non-monotone selections, so the one state C1 cannot express is a state nobody wants.
  The Option (a) contingency — per-tier booleans, threshold retired,
  `send_diagnostic_notification` rewritten — **is withdrawn, not deferred.** The check
  happened before anyone wrote the migration, which is what it was for.

  **One equivalence the designer and Platform are implicitly ratifying, flagged so it is
  not discovered later.** The single `insufficient` boolean will serve **two different
  upstream causes**: the agent's `insufficient_data` on `diagnostic_outputs` (CF-30) and
  the App's `unknown` tier on `dtcs` — `deriveDtcBadgeSeverity`'s fallback for an
  unreadable `severity_raw` (CF-32). Session 36 already treated these as the same
  preference deliberately (both mean "we could not rank this", and §4.3 gives them the same
  off-ladder treatment), and that is recorded in `DEFAULT_DTC_NOTIFICATION_PREFS`' header.
  It is a reasonable equivalence, not an accident — but it is one switch governing two
  sources, so if either track later wants them controlled separately, that is a second
  column, not a tweak.

  **Superseded — the original conflict, kept for the trail.** Three descriptions of "which
  severities notify me" existed, and two of them could not express the third:
  1. **Design §6 `S8 · Notification prefs`** — *per-severity toggles*: "**Critical =
     Always**, Warning on, Info off, Insufficient off". Four independent switches,
     including the off-ladder `insufficient` tier.
  2. **`user_preferences.notification_severity_threshold`** (migration `20260602130000`)
     — a **single ordered threshold**, `text NOT NULL DEFAULT 'warning' CHECK (… IN
     ('info','warning','critical'))`, consumed by Platform's `send_diagnostic_notification`
     Edge Function (Platform session 11) as `severityRank[diagnostic.severity] <
     severityRank[threshold] → skip`.
  3. **The App's `DtcNotificationPrefs`** (`lib/dtcNotifications.ts`, session 36) — built
     to (1), because that is what the design specifies.
  **A threshold can only express monotone sets** — `{critical}`, `{warning, critical}`,
  `{info, warning, critical}`. The design's *defaults* happen to be expressible
  (`threshold = 'warning'`), which is why this has stayed invisible; the design's *model*
  is not. "Critical on, Warning off, Info on" is a legal S8 state and has no threshold
  representation. Separately, **`insufficient` has no place in the CHECK at all** — the
  column's three values are the §4.3 ladder, and the off-ladder tier the design gives its
  own toggle simply cannot be stored.
  *(Historical — as of 2026-08-03 the design-side half of this conflict is settled: §6's
  four-toggle model was incidental, and §6 reconciles to what C1 builds.)*
  Two things keep this from being urgent today. The App-side prefs are **in-memory and
  not yet bound to `user_preferences`** (there is no S8 screen — see CF-37's Week-7 note),
  so nothing is currently written to a column it doesn't fit. And the two paths are
  currently disjoint: Platform's function gates **push for `diagnostic_outputs`**, the
  App's gate is **in-app for `dtcs`**. They converge in Week 7, when the S8 screen has to
  bind to storage and push arrives.
  The three shapes that were on the table when this was opened — **(a)** promote the schema
  to per-severity booleans, **(b)** cut S8 down to a bare threshold (loses the Insufficient
  toggle entirely), and **(c)** keep both and persist the closest threshold (**rejected**:
  silently discards non-monotone states). **C1 is a refinement of (b) that does not lose the
  Insufficient toggle** — it keeps the threshold for the ranked tiers and gives the
  off-ladder tier its own switch instead of dropping it. ~~**(a) remains the fallback** if the
  designer intent-check comes back "non-monotone was deliberate".~~ **(a) is withdrawn as of
  2026-08-03** — the intent-check came back "incidental", so there is no fallback branch.

- **What's needed to resolve — the blocking question is answered; two build items remain,
  BOTH INTERNAL.** No hardware, AI-agent, designer, funding or external dependency gates
  this entry any longer. What is left is ordinary scheduled work.
  1. ~~**Designer — the intent-check (the blocking item).**~~ **DONE 2026-08-03** —
     confirmed the four-toggle layout was incidental, not a deliberate non-monotone
     requirement. **Remaining and non-blocking:** reconcile the §6 `S8` drawing to describe
     what C1 actually builds — **"Critical = Always (floor, no toggle) + a Warning/Info
     threshold control + a standalone Insufficient switch."** This is a doc/redline
     housekeeping item, not a decision; **Week 7 does not wait on it**, since the shape it
     will describe is already final. Fold it into the designer sitting alongside CF-24,
     CF-33, CF-34 and CF-37 — **that batch is now four decisions plus this one redline.**
  2. **Platform (Sulaiman) — one additive migration.** A single boolean column on
     `user_preferences` for `insufficient`, `DEFAULT false`, existing rows backfilling
     `false`. `notification_severity_threshold` is **untouched** and
     `send_diagnostic_notification` needs no change for the ranked tiers — only a new read
     of the boolean for the off-ladder one. **Batch it with the Platform DTC-state work
     rather than shipping it standalone** — CF-36 (seen/ack state) and CF-29 (pending state)
     are both waiting on `dtcs` columns. *Note the tables differ* — CF-36/CF-29 want columns
     on `dtcs`, this one is on `user_preferences` — so it is one migration **pass**, not
     literally one `ALTER TABLE`. Grouping them means one review and one promotion window
     instead of three.
  3. **App — a model edit, not a rebuild.** Adapt the session-36 screenless prefs model from
     the four-key mapped type to **`{ threshold, insufficientEnabled }`**, keeping
     `critical` structurally always-on. `shouldNotifyForDtc` keeps reusing
     `deriveDtcBadgeSeverity`'s tier — the gate's shape does not change, only how the tier is
     compared against stored prefs. **S8 binds to this in Week 7**, which is the deadline
     that has always driven this entry.
  `docs/05` § `user_preferences` and design §6 `S8` must end up describing the same model —
  that requirement is unchanged, C1 is just now the model they should both describe.
- **Owner:** **Platform track** (the additive boolean, batched with the CF-36/CF-29
  migration pass) + **App track** (adapt the prefs model; bind S8 in Week 7). Founder
  decision **taken 2026-08-02**; designer intent-check **answered 2026-08-03** — neither is
  an open input any longer, and the designer's remaining §6 redline is housekeeping that
  does not gate the build.
- **Cross-references:** **CF-36** (the sibling `dtcs` state gap — **batch the Platform
  migration work**; the same Week-7 S8 screen is what forces both bindings); **CF-29** (the
  third column in that same Platform pass); **CF-30** and **CF-32** (the two different
  off-ladder sources the single `insufficient` boolean will govern — see the equivalence
  note above); **CF-37** + CF-24/CF-33/CF-34 (the designer batch this intent-check joins);
  `TODO(s8-prefs)` in `apps/mobile/src/lib/dtcNotifications.ts` and
  `lib/dtcNotificationStore.ts`; `DEFAULT_DTC_NOTIFICATION_PREFS` (records the
  `unknown` ↔ "Insufficient" mapping); `docs/05` § `user_preferences`; **`docs/08` Week 7**
  ("Notification preferences screen") — the S8 build this unblocks — and the Week-6 handoff
  block; design §6 `S8` + §4.3; `supabase/functions/send_diagnostic_notification`;
  PR #44 (opened); workdiary sessions 36, 39, 41.

### CF-06 — `supabase/seed.sql` is cross-track-owned (clobber-risk flag)

- **Category:** Cross-track dependency / flag
- **Origin:** Week 4, session 28 — the App track added the dev telemetry fixture
  (one completed drive + 361 telemetry samples) to `seed.sql`, but Sulaiman owns
  `supabase/`.
- **Current status:** Standing coordination flag. PR #37 (Platform) already
  reworked the file's teardown (see CF-25); the App-added fixture rows survived.
  Any future Platform-side `seed.sql` edit must preserve the App fixture (the
  drive-detail / telemetry-chart on-device path depends on it).
  **Re-verified 2026-08-03 (session 37).** `supabase/seed.sql` has not been touched since
  `9d453ca` (PR #37, 2026-07-05) — no Platform edit has landed on it, so the App fixture is
  intact and nothing has been clobbered. **This entry is a standing flag with no closable
  end state**, which is why it stays open indefinitely: it is not unfinished work, it is a
  coordination rule that applies for as long as both tracks can edit the file. It is
  correctly *not* a candidate for closure, and shouldn't be re-examined as one each sweep.
- **What's needed to resolve:** Nothing to "close" — this is an ongoing
  awareness flag: coordinate before either track edits `seed.sql`.
- **Owner:** Both tracks (coordination); Platform owns the file.
- **Cross-references:** workdiary sessions 28, 29, 30.

---

## Provisional-value-reconciliation

### CF-07 — Provisional jsonb metric-key vocabulary — `TODO(metric-keys)` (R22 #1)  *(CLOSED 2026-08-03)*

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 3, data seam session 22 (PR #25); recorded in the Week-3
  close table, session 24.
- **Current status: CLOSED 2026-08-03 — the app's provisional keys are now the canonical
  vocabulary.** The AI-agent project's v0.2 contract draft, §3 *Metric vocabulary* ("new in
  v0.2 — closes R22 / `TODO(metric-keys)`"), states it directly: *"The canonical telemetry
  metric vocabulary is the app's existing set. The firmware conforms to these names and
  units; the agent keys on them; the app's provisional keys become canonical."* The table:

  | key | unit | note |
  |---|---|---|
  | `speed_kph` | km/h | |
  | `rpm` | rpm | |
  | `coolant_temp_c` | °C | only safety-relevant metric captured today |
  | `boost_pressure_kpa` | kPa | **not bar** — 1 bar = 100 kPa |
  | `engine_load_pct` | % | |

  `safety_thresholds.yaml` independently pins the same five under *"UNITS — must match the
  app's telemetry vocabulary EXACTLY"*, citing `supabase/seed.sql` as canonical as of
  2026-07-17. **The guess turned out to be the answer** — every provisional usage
  (`mocks.ts`, `LastDriveCard`, `DiagnosticsPreview`, drive-detail `PEAK_METRICS`, the three
  live telemetry-chart channel keys, and the S6 freeze-frame panel of CF-28 gap #2) was
  already correct, so **no key value changes anywhere.**

  Two things v0.2 adds that the App track should know, neither of which reopens this:
  **absent ≠ zero ≠ normal** — the device emits `jsonb_strip_nulls`'d metrics, so an
  unavailable metric is an **absent key**, never a null and never a zero; per-vehicle
  capability is *derived* from keys observed across recent drives, not configured. And
  additional PIDs (`afr`, `oil_pressure_kpa`, `intake_air_temp_c`, …) are per-car
  extensions on top of this set, not replacements for it.
- **Residual (tracked elsewhere, not here):** the `TODO(metric-keys)` comment flags can now
  be removed as a tidy-up, and v0.2 notes that `device_sync_complete`'s `peak_metrics`
  seeding reads a missing metric as `0` (`Math.max(x ?? 0, val)`) — that is bug **P1-2** in
  `findings-from-repo-review.md`, carried under CF-03, **not** a vocabulary question.
- **Closed by:** the v0.2 contract draft, §3 — see CF-03 for the provenance and the
  ratification status of v0.2 as a whole.
- **Owner:** — (closed). Flag removal is incidental App-track tidy-up.
- **Cross-references:** CF-03 (parent), CF-28 (freeze-frame keys — the vocabulary half is
  now settled), CF-08 (the *value* question, still open and now wider);
  `docs/AI_Agent_Contract/ai-agent-contract.md` §3; `docs/AI_Agent_Contract/safety_thresholds.yaml`
  § UNITS; R22 (#1); `docs/08` Week-3 + Week-4 close tables; workdiary sessions 22, 24, 28,
  29, 30, 41 + decisions log 2026-06-22.

<details>
<summary>Superseded — the open status carried until 2026-08-03, kept for the trail</summary>

- **Previous status:** Open. A provisional key set is now load-bearing in
  `mocks.ts`, `LastDriveCard`, `DiagnosticsPreview`, the drive-detail
  `PEAK_METRICS` (`rpm` / `speed_kph` / `coolant_temp_c`), and — most
  consequentially — the three live telemetry-chart channel keys
  (`speed_kph` / `boost_pressure_kpa` / `coolant_temp_c`), which are the app's
  **first live-read consumers** of the vocabulary via `get_drive_telemetry`.
  A key mismatch is **not** compiler-caught (the columns are opaque `Json`); on
  the live-read path it yields a silently-empty chart, not an error. The
  canonical set is owned by the hardware/AI-agent contract and is undocumented
  in `docs/06`/`docs/07` (only prose like "max rpm, max boost, max coolant temp").
  **Re-verified 2026-08-03 (session 37), unchanged — and its blast radius grew again in
  Week 5.** The same provisional vocabulary now also backs the S6 freeze-frame panel
  (CF-28 gap #2), where a wrong key renders an **empty panel rather than an error**. Still
  no canonical key set in `docs/06` or `docs/07`. **Blocker: the hardware/AI-agent team
  owns the vocabulary** — not resolvable from this repo.
- **Previously needed to resolve:** The hardware/AI-agent contract confirms the
  canonical key set; then update the `mocks.ts` provisional keys and every
  hardcoded key reference, remove the `TODO(metric-keys)` flags. This is a
  mandatory reconciliation gate before any live flip of `lastDrive`,
  `currentState`, `recentDiagnostics`, or the telemetry charts.

  *Outcome: the confirmation arrived and adopted the app's set unchanged, so the
  "update every hardcoded key reference" work turned out to be empty.*

</details>

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
- **Founder decision 2026-08-03 (Platform session 16) — RESOLVED: cut Pending from
  v1.** Option (b) taken. Rationale: Pending is a real OBD-II hardware behaviour (ECU
  marks a code pending after one failed drive cycle, confirms it after a second) —
  doing it properly means the device firmware must actually distinguish and report
  that distinction, which is unconfirmed. Adding a schema column ahead of that
  confirmation risks a UI element that either always reads false or has to be faked,
  which is worse than not having the group at all for a pilot of car-literate users
  who would notice. No Platform schema work follows from this entry — the `dtcs`
  table needs no pending/confirmed column. **CF-36 is NOT batched with a CF-29
  migration** (there is none); CF-36's own column (seen/ack state) is unaffected and
  proceeds on its own schedule.
  **App-side action (not yet done — Platform cannot execute this half):** the two-edit
  change described above — narrow `DTC_GROUPINGS` in `@caeorta/types/dtc.ts` to
  `'active' | 'history'`, delete `MOCK_PENDING_DTC_IDS` and the `toMockDtc` overlay
  branch in `mocks.ts`. Design §6 `S5` should be amended to two sections. Until the App
  half lands, the mock-only Pending group keeps rendering (harmless — it is not on
  `main`'s live path) but should be removed promptly so the codebase reflects the
  decision. **CF-29 can be marked CLOSED once the App-side two-edit change ships** —
  this entry stays open until then, since the decision alone doesn't change what's on
  `main`.
- **Cross-references:** R24 (#1); design §6 `S5`; `packages/types/src/dtc.ts`
  `TODO(dtc-pending)`; `MOCK_PENDING_DTC_IDS` in `mocks.ts`; `groupDtcs` in
  `apps/mobile/src/lib/dtc.ts`; the `fetchDtcs` live-adapter note in `source.ts`;
  workdiary sessions 33, 34, 16 (Platform).

### CF-36 — DTC seen/ack state has no schema backing — the acknowledged-set is App-local

- **Category:** Provisional-value-reconciliation
- **Origin:** Week 5 Day 5, session 36 (2026-08-02) — building the in-app new-DTC
  notification.
- **Current status:** Open. **The direct sibling of CF-29**: another piece of DTC state
  the design's behaviour depends on that the `dtcs` table cannot express. Verified against
  `origin/main`: `dtcs` carries `id` / `vehicle_id` / `sync_session_id` / `code` /
  `description` / `severity_raw` / `first_seen_at` / `last_seen_at` / `is_active` /
  `cleared_at` / `cleared_by_user_id` / `freeze_frame_metrics` — **no seen, ack, dismissed
  or status column of any kind.** The adjacent table already has exactly the right shape:
  `diagnostic_outputs.status text NOT NULL DEFAULT 'new' CHECK (status IN
  ('new','seen','dismissed','actioned'))` (migration `20260602130000`). DTCs simply never
  got the equivalent.
  This matters because **"new" was defined as UNACKNOWLEDGED, not recent** (founder call,
  session 36). The rejected alternative — a recency window on `first_seen_at` — needs no
  state, but re-notifies on every app open until the window lapses, and `first_seen_at`
  records when the *ECU* first reported the code, not when the *user* first saw it.
  App-side containment, all of it deliberately small:
  - The acknowledged-set is a list of DTC ids persisted in `expo-secure-store`
    (`useDtcSeenStore`, `lib/dtcNotificationStore.ts`), chosen over AsyncStorage **only**
    because it is already a dependency backing the Supabase session adapter — adding
    `@react-native-async-storage/async-storage` would mean a new native module and a new
    dev build for a list of uuids. It is not secret data and is not treated as such.
  - The pure half (`parseSeenDtcIds` / `mergeSeenDtcIds` / `serializeSeenDtcIds`, in
    `lib/dtcNotifications.ts`) is storage-agnostic and unit-tested, so moving to a
    different store — or to a server column — touches the I/O shell only.
  - It is **capped at 40 ids, oldest evicted first** (`MAX_SEEN_DTC_IDS`), because
    SecureStore warns above ~2048 bytes per value (the same constraint already noted on
    the session adapter in `lib/supabase.ts`). A test pins the serialized full set under
    that threshold.
  **Three consequences that cannot be fixed App-side**, and are the reason this is a
  carry rather than a design: the set is **per-device** (a second device re-notifies for
  codes already dismissed); it does **not survive reinstall** or cleared app storage; and
  the cap can **evict** — a code acknowledged long ago could re-notify if it is still
  active after 40 further acknowledgements on that device. The last is remote (vehicles
  carry single-digit active codes) and is documented rather than hidden because it is the
  one way this surface can nag.
- **What's needed to resolve:** Platform adds the `dtcs` equivalent of
  `diagnostic_outputs.status` — most cheaply a `status text` with the same four-value
  CHECK, or a narrower `seen_at timestamptz` if the dismissed/actioned states aren't
  wanted for codes. Then `isNewDtc` reads the column instead of the local set, the
  SecureStore store and its cap are deleted, and the three consequences above disappear.
  **Sequence it with CF-29** — both are missing `dtcs` state columns, both were found from
  the same screens, and adding one column that carries pending/confirmed *and* seen state
  is one migration rather than two. Gate: this does **not** block a live flip of
  `DATA_SOURCE.dtcs` (the local set works against live rows); it blocks calling the
  notification surface multi-device-correct.
- **Owner:** Platform track (the column) + App track (swap the local set out).
- **Cross-references:** **CF-29** (the sibling missing-state carry — resolve together);
  CF-38 (the preference model the same surface reads); `TODO(dtc-seen-state)` in
  `apps/mobile/src/lib/dtcNotificationStore.ts`; `isNewDtc` +
  `MAX_SEEN_DTC_IDS` in `apps/mobile/src/lib/dtcNotifications.ts`; `docs/05`
  `diagnostic_outputs.status` (the shape to copy); PR #44; workdiary session 36.

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
- **Update 2026-08-02 (session 36, PR #44) — the derivation gained a SECOND consumer, and
  the `unknown` fallback is no longer only cosmetic.** `deriveDtcBadgeSeverity` now also
  drives the **notification preference gate** (`shouldNotifyForDtc`,
  `lib/dtcNotifications.ts`): the tier that tints a code's badge is by construction the
  tier that decides whether it interrupts the user. That reuse was deliberate and is the
  containment — a second severity map for notifications would have let a code render as
  Warning and gate as Info. `DtcNotificationPrefs` is a **mapped type over this union**,
  so extending the tier ladder is a compile error at the defaults rather than a silently
  ungated tier.
  **What changes about this entry's exposure:** the failure mode is still understatement,
  but understatement now has teeth. Previously an unrecognised `severity_raw` meant a
  neutral badge — quiet and wrong, but visible on S5. Now it *also* means **no
  notification**, because `unknown` defaults off in the S8 model (CF-38). A real
  ECU-critical fault whose severity string this map omits would appear on S5 as unrated
  **and never surface a banner**. That does not change what resolves this entry — the
  hardware track confirming the vocabulary — but it raises the cost of leaving it open,
  and it is a second reason not to flip `DATA_SOURCE.dtcs` live first. Contained today
  only because the mock fixtures' severity values are, by construction, exactly the map's
  keys.
- **Cross-references:** R24 (#4); CF-07 / R22 (the adjacent provisional-vocabulary
  carry); CF-30 (the severity-vs-category vocabulary question on the *agent* side —
  related but a different column and a different owner); **CF-38** (the preference model
  whose `unknown`-off default gives this entry its notification consequence); design
  §4.3 + §6 `S5`; `TODO(dtc-severity-vocab)` in `apps/mobile/src/lib/dtc.ts`;
  `shouldNotifyForDtc` in `apps/mobile/src/lib/dtcNotifications.ts`; PRs #42, #44;
  workdiary sessions 34, 36.

### CF-08 — Hard safety thresholds (coolant, oil pressure, …) — `TODO(coolant-hot-threshold)` = provisional 105 °C (R22 #2)  *(scope widened 2026-08-03)*

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
  **Re-verified 2026-08-03 (session 37), unchanged.** Still the project's only per-metric
  threshold, and Week 5 established why that matters beyond the coolant chart: S6's
  freeze-frame Metric Tiles render **every** tile in the `normal` state precisely because
  105 °C is a chart-recolour guess, not a general tile-ranking rule (session-35 decision).
  **Blocker: a canonical value from the hardware/AI-agent contract or a domain source.**

  **SCOPE WIDENED 2026-08-03 (session 41) — this is not a coolant question, and it is not
  an engineering task.** The AI-agent project's v0.2 package reframes it as **hard safety
  thresholds** across multiple metrics — per-engine coolant *and* oil-pressure limits, with
  `safety_thresholds.yaml` as the proposed home. Two things changed about this entry:

  1. **It is the agent project's single external dependency.** `proposed-app-changes.md` §7
     states it outright: *"These decide when `critical` fires on a user's car; they must
     come from factory specs or a domain reference, not the agent project's judgement.*
     ***This is the only remaining item the agent project cannot source or decide for
     itself.***" Everything else in v0.2 the agent project could resolve, propose or build.
     This one it cannot.
  2. **It needs real domain research, not a code decision.** No amount of reading this repo
     produces the number. It comes from factory specs or a domain reference, per engine.
     Filing it as an engineering task is what has let it sit for four weeks — a developer
     looking at it correctly concludes there is nothing to implement.

  **The design is already safe to ship without the numbers**, which is why this is
  important but not blocking: `safety_thresholds.yaml` carries a **`status` safety gate** —
  `unvalidated` (the default) means the agent **must not fire `critical`** from that
  threshold and may only downgrade to `warning` while stating the limit is provisional;
  `validated` unlocks `critical` and requires `source`, `validated_by` and `validated_at`
  to be filled. An empty or unvalidated profile degrades the agent to advisory behaviour
  rather than producing a confidently wrong `critical`. The file's own rule: *"never set
  `status: validated` on a number you guessed."* **The App's 105 °C is exactly such a
  guess**, and it is a chart-recolour cutoff, not a safety gate — it must not be promoted
  into `safety_thresholds.yaml` as though it were sourced.

  Why the floor is needed at all, per the file (it is not redundant with the adaptive
  per-vehicle baseline): a baseline **learns a fault as normal** — a car that has run hot
  since day one teaches it that 112 °C is fine, so the cars most needing a warning are
  exactly the ones whose baselines are poisoned — and **cold start has no baseline at all**,
  so without a floor a car cooking on drive two gets silence.
- **What's needed to resolve:** Founder-led domain research producing sourced per-engine
  limits (coolant, oil pressure, and any further metric the pilot fleet exposes) from
  factory specs or a domain reference; fill `safety_thresholds.yaml` with `source`,
  `validated_by`, `validated_at` and flip `status` to `validated` per profile. Separately
  and independently, the App's `COOLANT_HOT_THRESHOLD_C = 105` should be reconciled against
  the validated coolant number once it exists — **one source of truth**, the app consuming
  the validated value rather than keeping its own (this is DECISION REQUIRED #4 in the v0.2
  draft, still open).
- **Owner:** **Founder / domain research** — *not* engineering, and not resolvable by the
  AI-agent team, the App track or Platform. App track consumes the result.
- **Cross-references:** CF-03 (parent — v0.2 provenance); CF-07 (the *key* half, now
  closed — this is the *value* half); R22 (#2);
  `docs/AI_Agent_Contract/safety_thresholds.yaml` (the `status` gate + rationale),
  `docs/AI_Agent_Contract/proposed-app-changes.md` §7; `docs/08` Week-4 close table;
  workdiary sessions 28, 30, 41 + decisions log 2026-07-03, 2026-07-05 and 2026-08-03.

---

## On-device / integration verification pending

### CF-09 — Pairing on-device E2E

- **Category:** On-device / integration verification pending
- **Origin:** Week 2, sessions 16–17 (pairing + Wi-Fi); the "built ≠ verified"
  gap for Week 2's DoD.
- **Current status:** Unrun since Week 2, re-verified. The pairing flow
  (`lib/pairing.ts`, `(app)/pair/*`) is built and all unit tests pass; the live
  handshake against a real seed device has never been executed.
  **Re-verified 2026-08-03 (session 37), unchanged — 11 weeks unrun.** Note this is **not**
  the same dev-build run as **CF-39**: CF-39 needs only the existing dev client (no new
  native modules), whereas this entry needs a **fresh EAS development build** carrying
  `expo-camera` and `@orbital-systems/react-native-esp-idf-provisioning`. Do not assume
  running CF-39 covers this one. **Blocker: a fresh dev build + access to a real seed
  device.** Partly gated by the same `expo-updates` 56.0.19 / `expo` 56.0.8 skew recorded
  in CF-23.
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
  **Re-verified 2026-08-03 (session 37), unchanged.** **Blocker: the hardware/firmware
  track must expose a provisioning endpoint and ratify the PoP source + security scheme.**
  Not closable from this repo under any circumstances — no amount of App-side work
  advances it.
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
  **Re-verified 2026-08-03 (session 37), unchanged.** Still not run. Note this entry is
  **not** resolved by CF-12's closure — that was the optional `returned_rows ≤ 300` spot
  check, deliberately skipped; this is the real 30-day perf test and remains genuinely
  outstanding. **Blocker: a seeded 30-day dataset + a dev build; needs both tracks.**
  Feeds the Week-9 charting re-eval, so it wants doing before then.
- **What's needed to resolve:** A dev build + a seeded 30-day dataset; profile
  chart smoothness. Feeds the Week-9 charting re-eval (stay on Victory Native vs.
  migrate).
- **Owner:** Both tracks.
- **Cross-references:** `docs/08` Week-4 DoD + close table; R5 (Supabase scaling);
  workdiary sessions 29, 30.

### CF-12 — `returned_rows ≤ 300` downsample check (skipped by choice)  *(CLOSED 2026-08-03)*

- **Category:** On-device / integration verification pending
- **Origin:** Week 4, session 28; closure decision session 30 (2026-07-05).
- **Current status:** **CLOSED (2026-08-03, session 37) — closed by founder decision, not
  by execution.** The check was never run and is not going to be; that was decided on
  **2026-07-05** and the decision is on the record. **Resolving artifact:** the
  `workdiary.md` decisions-log row dated 2026-07-05 — *"the `returned_rows ≤ 300` vs 361
  downsample check stays skipped (optional server-side concern from the start)"* — taken
  at the session-30 PR-#34 verification close, alongside the founder's ruling that
  `splitTelemetryChannels`' unit coverage plus the on-device coolant-amber check are
  sufficient closure for that loop.
  This entry has been carrying an already-decided item as though it were outstanding.
  Closing it changes nothing about the system: the server-side downsample is Platform's
  `get_drive_telemetry` contract, the seed fixture's 361 samples still exercise the
  `>300 → downsample` path, and nothing gates on the row count. **Closure criteria met:**
  owner is App/Platform (not hardware, AI-agent, designer or funding); a recorded founder
  decision resolves it; no build risk is created — the adjacent perf question survives
  independently as **CF-11**, which is a real unrun test and stays open.
- **What's needed to resolve:** Nothing — decided. (If a future session wants the number
  anyway it is one call against the seeded drive; it would be new work, not this carry.)
- **Owner:** — *(Closed.)*
- **Cross-references:** **CF-11** (the 30-day perf test — genuinely unrun, still open, and
  the entry this one is easily confused with); workdiary sessions 28, 30 + decisions log
  2026-07-05; session 37 sweep.

### CF-39 — Week-5 on-device verification backlog (one batched dev-build run)

- **Category:** On-device / integration verification pending
- **Origin:** Week 5 Days 4–5, sessions 35 and 36 (2026-08-02); consolidated into a single
  tracked entry at the Week-5 close, session 37 (2026-08-03).
- **Current status:** Open — **built, typecheck/lint/test-green, not seen on hardware.**
  This entry exists because the backlog was previously scattered across CF-13's residual
  note #1 and two sessions' after-reports, which is how a verification gap gets lost across
  a week boundary. **Everything Week 5 shipped up to and including S5 is already verified**
  — all 8 Diagnostic Card variants and the three-group S5 render on a physical device in
  session 34b, the empty-Pending branch via `__DEV__` fixture variants in 34c. **The
  residual is the week's last three deliverables**, all of which postdate that run:

  1. **S6 · DTC detail render** (session 35, PR #43) — the screen has never been opened on
     hardware. Wanted: the large code badge + status pill, section order, the always-rendered
     "what it means" / likely-causes gap copy (CF-35), and the freeze-frame panel's empty
     state on the 2 of 7 fixtures that carry no frame.
  2. **The `DiagnosticsPreview` card swap** (session 35, PR #43) — a **placement** check, not
     a component check: the atom itself is verified. Confirm the swapped card sits correctly
     in the vehicle-detail panel. **Expect a known, accepted palette mismatch** — the card is
     token-styled for the dark canvas and vehicle-detail is still on the stock light palette
     until Week 8. That is **CF-15**'s debt, accepted at the session-35 ASK gate; it is not a
     defect to report.
  3. **The in-app new-DTC banner** (session 36, PR #44) — four things, and the first is the
     one no unit test can prove:
     - **The SecureStore round-trip:** dismiss → **force-quit** → relaunch → the banner
       stays gone. This is the entire point of defining "new" as *unacknowledged* rather
       than *recent* (CF-36); if the acknowledged-set doesn't survive a cold start, the
       surface nags exactly as the rejected recency-window design would have.
     - **The hydration gate:** no flash of an already-dismissed banner on cold start before
       the persisted set loads.
     - **The expected content under default prefs:** the banner should surface **4 codes** —
       **P0234** (critical), **P0299 / P0128 / P0301** (warning) — while **P0171**
       (`unknown` tier) and both cleared codes stay correctly silent. A different count is a
       real finding: it means either the preference gate or `deriveDtcBadgeSeverity`'s tier
       map is behaving differently against the fixtures than the tests assert (CF-32).
     - **Row wrap at 3 codes** with a long plain-language title, and the same light-screen
       palette mismatch as (2).
  4. **The freeze-frame tile-grid wrap risk** (flagged session 35) — the Metric Tile grid
     uses `min-w-[48%] flex-1` inside a `flex-wrap` container. That is a two-per-row
     intention expressed as a constraint rather than a column count; with a long metric
     label or a wide value it can wrap to one tile per row or leave a stretched orphan.
     **Unit tests cannot see this** — it is pure layout, and the only way to know is to look
     at a DTC whose freeze frame carries an odd number of tiles.

- **What's needed to resolve:** One dev-build run on the physical Android device, covering
  all four above in a single session. **No new native modules are involved** —
  `expo-secure-store` was chosen for the acknowledged-set precisely because it is already
  in the existing dev build (over AsyncStorage, which would have forced a rebuild), so the
  committed arm64 dev client should serve. Two known environment constraints from CF-23
  apply: use **USB, not wireless adb**, and the `expo-updates` 56.0.19 / `expo` 56.0.8 skew
  still blocks any x86_64/emulator build, so this must run on the physical device.
- **Owner:** App track (Muhammed, on hardware).
- **Gate:** blocks nothing structurally — none of this is on the critical path for Week 6,
  and no live flip depends on it. What it gates is the right to call Week 5
  **on-device-verified** rather than **built**; `docs/08`'s Week-5 close states that
  distinction explicitly and will need updating when this runs.
- **Cross-references:** **CF-13** (closed — its residual #1 is now carried here, not there);
  **CF-15** (the accepted light/dark palette mismatch on items 2 and 3); **CF-32** (the tier
  map the 4-code expectation would falsify); **CF-36** (the acknowledged-set the SecureStore
  round-trip proves); **CF-35** (the gap copy S6 renders); **CF-23** (the dev-build
  environment gotchas, incl. the `expo-updates` skew); **CF-34** (the Figma-parity diff —
  a *different* check, and cheapest to do while looking at the same screens); `docs/08`
  Week-5 close (DoD scorecard); PRs #43, #44; workdiary sessions 34b, 34c, 35, 36, 37.

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
     **Moved 2026-08-03 (session 37): this residual is now tracked in its own entry,
     § CF-39**, together with the rest of the Week-5 on-device backlog. It is recorded here
     only for the trail — **CF-39 is the live tracking, not this line.**
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
  **Re-verified 2026-08-03 (session 37), unchanged and correctly deferred.** Deliberately
  **not** closed: "deferred by design" is a schedule, not a resolution, and the Week-8 task
  is still ahead. Week 5 added surface area to it — S5, S6 and the new-DTC banner are all
  token-styled dark screens, so the eventual light flip now has more to audit than it did
  at Week 4. **Blocker: none — it is scheduled Week-8 work** (plus the designer's
  light-mode spot-check).
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
  **Re-verified 2026-08-03 (session 37) — unchanged, but Week 5 made its cost visible on
  a shipped screen.** Vehicle detail is still a light stock-palette screen, and it now
  hosts **two** dark token-styled components: the `DiagnosticsPreview` card (session 35)
  and the new-DTC banner (session 36). Both mismatches were accepted at ASK gates in
  preference to leaving duplicated severity rules in the codebase — so this entry is now
  carrying a *known, deliberate* visual defect on a shipped screen until Week 8, not just
  an un-migrated palette. Worth stating plainly at the Week-8 planning point.
  **Blocker: none — scheduled Week-8 work.**
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
  **Re-verified 2026-08-03 (session 37), unchanged.** **Batch this with the other designer
  items — CF-24, CF-33, CF-34 and CF-37** — which between them now amount to one
  conversation covering four design-doc gaps plus a parity check. **Blocker: designer
  availability;** designer-owned decisions cannot be closed from this track.
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
  **Re-verified 2026-08-03 (session 37) — OPEN on the project's own record, but note the
  status is INFERRED, not directly observed.** Prod Supabase state cannot be read from this
  repo. Two pieces of evidence, both pointing the same way: `docs/05` (§ Migration
  discipline) still lists `20260614000001_add_notify_agent` and
  `20260614000002_add_pg_cron_jobs` as *"applied on dev, NOT on prod"*, and the promotion
  ritual's **step 8 mandates a workdiary entry** for every promotion — there is none since
  the 2026-06-21 Week-1 promotion. Platform's last commit to `main` is `d582b62`
  (2026-07-08). **Blocker: a Platform prod-link session.** ⚠️ **If Platform has promoted
  these without logging it, this entry is wrong** — and the missing workdiary entry is then
  the actual defect, since the project has no other way to know prod state.
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
  **Re-verified 2026-08-03 (session 37) — checked directly, still absent.** A grep for
  `REVOKE` / `GRANT UPDATE` across all seven files in `supabase/migrations/` returns
  **nothing**: no column-scope migration has landed. The gap is unchanged since Week 1 —
  owner-should-not-write columns on `devices` remain protected by application code only.
  **Blocker: Platform track must author the migration.** Not App-track work, and not
  closable here despite being "unblocked" for two months.
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
  doc — it has been a paper mitigation.
  **Re-verified 2026-08-03 (session 37) — searched properly this pass; it still does not
  exist.** A content search for `runbook` / `emergency-release` across `docs/` matches only
  the four files that *reference* the missing runbook (`docs/08`, `docs/09`, `docs/11`,
  `workdiary.md`); no runbook document is present. Ten weeks as a paper mitigation.
  **Blocker: nobody has written it.** Worth naming plainly — this is one of the very few
  open entries with **no external dependency at all**. It stays open purely because it has
  never been prioritised, and R14 (bus factor) is a live, unmitigated risk while it doesn't
  exist.
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
  **Re-verified 2026-08-03 (session 37) — checked against the live GitHub API for the first
  time, and BOTH halves are confirmed open.** Previous statuses said "still not enforced as
  of the session-5/6 carries", i.e. inherited rather than observed. Now measured:
  - `gh api repos/Caeorta-io/caeorta_app` → `allow_squash_merge: true`,
    **`allow_merge_commit: true`**, **`allow_rebase_merge: true`**. Squash is *allowed*, not
    *exclusive* — all three merge methods remain selectable in the UI, so the documented
    squash-only convention is unenforced. Also noted: `delete_branch_on_merge: false`.
  - `gh api …/branches/main/protection` → **404 "Branch not protected"**, confirming no
    branch protection on `main`.
  This is the concrete mechanism behind R19, which has now recurred 4×. The first half is a
  **2-minute founder toggle** (untick merge-commit + rebase in Settings → General → Pull
  Requests) and needs no plan upgrade. **Blocker: (a) a founder settings toggle — available
  today; (b) required status checks, funding-gated on a paid plan.**
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
  **Re-verified 2026-08-03 (session 37), unchanged — and the schedule pressure on it has
  changed materially.** The original guidance was "activate by end of Week 9 at the
  latest." Against the calendar (see `docs/08` Week-5 close), **plan Week 9 would have
  ended 2026-07-19 — two weeks ago** — while the App track is only now entering plan
  Week 6. The deadline is therefore no longer meaningfully "Week 9"; the honest framing is
  that it must be activated **before the Week-10 release work begins**, whenever that
  lands. Activation is same-day, so it is not on the critical path *provided* it isn't
  forgotten. **Blocker: funding — a founder decision to spend $25.**
- **What's needed to resolve:** Pay + activate the Google Play Console account by
  end of Week 9 at the latest.
- **Owner:** Founder (funding).
- **Cross-references:** `docs/08` Section 0 status + Week-10; workdiary session 1
  open items.

### CF-22 — `expo-symbols` removal  *(CLOSED 2026-08-03 — won't-do)*

- **Category:** Infra / tooling queued
- **Origin:** Week 4, session 26 (PR #32) — lucide-react-native superseded the
  earlier `expo-symbols`/SF-Symbols direction.
- **Current status:** `expo-symbols` is unused by any code but is still a
  dependency. Kept deliberately (removable in a later cleanup); SF Symbols are
  iOS-flavoured and this build is Android-only.
  **Re-verified 2026-08-03 (session 37) — confirmed still true, and confirmed READY to
  close, but deliberately NOT closed in this PR.** `apps/mobile/package.json` line 37 still
  carries `"expo-symbols": "~56.0.5"`, and a search across `apps/mobile/src/` returns
  **zero** references. Nothing depends on it. **The reason it stays open here is scope, not
  doubt:** removing it is a `package.json` + `pnpm-lock.yaml` change, and this is a
  docs-and-conventions PR. Bundling a dependency edit into it would mean a reviewer
  checking a lockfile diff inside a documentation review, and — since the mobile app is
  built via EAS/native dev client — a dependency change is the one kind of edit that can
  produce a build difference no doc review would catch. **Blocker: none technical. It wants
  its own small, isolated cleanup PR**, where a broken install is obvious and revertible in
  one commit. Do that and this entry closes immediately.
- **CLOSED 2026-08-03 (session 38) — as WON'T-DO, and the session-37 status above was
  wrong about the premise.** The isolated cleanup PR was attempted and **abandoned on a
  finding**: `expo-symbols` is **not an optional dependency this project chose**. It is a
  **hard transitive dependency of `expo-router`**, which is the app's routing foundation —
  verified in `expo-router@56.2.8`'s own `package.json` line 157:
  `"expo-symbols": "^56.0.5"`. The lockfile agrees: the `expo-symbols` entry inside the
  `expo-router@56.2.8` snapshot is what actually installs it.
  **What removal would and would not achieve**, measured by actually doing it:
  - **Would:** delete the redundant *direct* declaration in `apps/mobile/package.json` and
    its 3-line importer block in `pnpm-lock.yaml`.
  - **Would NOT:** remove the package from the tree. `expo-symbols@56.0.5` stays in the
    lockfile's `packages:` and `snapshots:` sections and stays on disk in
    `node_modules/.pnpm/` — pulled by `expo-router` regardless. **No install-size, build-time
    or native-surface saving whatsoever.** The only observable change is that
    `apps/mobile/node_modules/expo-symbols` stops being a direct symlink.
  **Why closed rather than left open:** this entry has been carrying a promise of a cleanup
  that does not exist. The honest resolution is not "do it later" but "there is nothing
  worth doing" — the original session-26 framing ("kept as a dependency, removable in a later
  cleanup") assumed we owned the dependency, and we never did. Removing the direct
  declaration is defensible as manifest hygiene, but it buys nothing and costs a native-app
  dependency edit, so the founder's call (2026-08-03) was to leave the manifest alone.
  **If it is ever revisited**, the argument would be manifest *correctness* — a direct
  declaration implies a deliberate choice — not cleanup. It would still not remove anything.
  Deleting `expo-router` is the only thing that removes `expo-symbols`, and that is not on
  the table.
- **What's needed to resolve:** Nothing — closed as won't-do. Not actionable while
  `expo-router` is a dependency.
- **Owner:** App track. *(Closed.)*
- **Cross-references:** `expo-router@56.2.8` `package.json:157` (the transitive owner — the
  evidence that closes this); `docs/03` § Icons (its "pending removal in a later cleanup"
  note corrected in the same PR); `docs/conventions.md` § "Lockfile diffs" (the pnpm
  peer-key-churn rule found while attempting this); workdiary sessions 26, 27, 28, 29, 30,
  37 (flagged as ready-to-close), **38** (attempted, abandoned, closed).

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
- **Re-verified 2026-08-03 (session 37), unchanged — and it is about to be load-bearing.**
  `docs/04` still has no consolidated local-native-setup writeup; all eight session-34b
  findings remain undocumented there. **CF-39** (the Week-5 on-device backlog) is the next
  thing that will need this knowledge, and two of the eight findings apply to it directly:
  use USB rather than wireless adb, and the `expo-updates` 56.0.19 / `expo` 56.0.8 skew
  still blocks any emulator build. **Blocker: founder-owned doc** — `docs/04` is edited by
  the founder, not from this track. The drafted follow-up prompts are still queued.
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
  **Re-verified 2026-08-03 (session 37), unchanged.** Now the **oldest of four** items
  needing the same designer conversation — with **CF-33** (no route into S5), **CF-34**
  (S5/S6 Figma parity unchecked) and **CF-37** (no in-app new-DTC surface specified). One
  session covers all four; asking separately wastes the designer's time and this one has
  been waiting since Week 4. **Blocker: designer availability** — designer-owned doc, not
  editable from this track.
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

### CF-37 — The design specifies no in-app new-DTC surface

- **Category:** Documentation-gap
- **Origin:** Week 5 Day 5, session 36 (2026-08-02) — building the Week-5 item "In-app
  notification when new DTCs detected after sync".
- **Current status:** Confirmed gap, and the **largest** of the CF-24 / CF-33 family,
  because here the doc doesn't merely omit a link — it has no entry for the surface at
  all. Audited across `docs/design/00_design_system.md`:
  - **§4.3** gives the severity ladder its behaviour, and only two answers exist:
    **warning** → "Triggers a push notification" (Week-7 work, out of Week-5 scope), and
    **critical** → "full-screen takeover on next app open, persists until acknowledged".
  - That takeover is specified as **`T3 · Critical takeover`** (§6 App States,
    `node 59:222`) — but it is written **diagnostic-shaped**: "11 psi vs 25 floor panel",
    "what this likely means", and a "See the full reading" action that resolves to
    Diagnostic detail (S2). Nothing about it is DTC-shaped.
  - **§6** has no DTC banner or new-code affordance in any board, and **§7**'s link graph
    has no row for one (it already lacked a route *into* S5 — CF-33).
  So for a **warning-tier DTC**, the design's only answer is push, which this week
  explicitly could not build; and for a critical one, the answer is a screen designed
  around a different object.
  **The App-track call (founder, session 36):** ship a dismissible **banner on vehicle
  detail** rather than approximate T3 with DTC content ahead of T3's own build. The shape
  is not invented — `docs/08` Week 6 already documents exactly it for the diagnostics
  equivalent ("`warning` → prominent banner on vehicle detail"), so this borrows a
  precedent the plan already contains. **One surface serves both notifying tiers**, which
  also keeps S8's Warning toggle from being a dead control. Tapping routes to S6 when
  exactly one code is new and to S5 when several are — the only screen that can show them
  together (§7's "no dead ends").
  Not a blocker: the surface works, is tested, and is one component to move.
- **What's needed to resolve:** The designer decides which of these the product wants and
  records it in §6/§7 — (a) ratify the vehicle-detail banner, adding a §6 inventory line
  and a §7 row (`Vehicle detail | new-code banner | → DTC list (S5) / DTC detail (S6)`);
  (b) extend `T3 · Critical takeover` to cover DTCs, in which case its content model needs
  a DTC variant and the App swaps the banner for it on the critical tier; or (c) specify
  something else, which the App builds instead. **Related but separate:** §4.3's
  "warning → push" only becomes real in Week 7, and CF-38 covers the preference model
  both surfaces read.
- **Owner:** Designer (§6/§7 — designer-owned doc, not editable from this track) + App
  track (move or replace the banner if the answer isn't (a)).
- **Cross-references:** **CF-33** and **CF-24** (the same species, smaller); CF-38 (the
  preference model); CF-34 (the DTC Figma board is still unopened, so a designed surface
  could exist there unseen — check it at the same time); design §4.3 + §6 `T3` + §7;
  `docs/08` Week 5 (the line item) and Week 6 (the borrowed banner precedent);
  `apps/mobile/src/components/dtc/NewDtcBanner.tsx` (header records the same options);
  PR #44; workdiary session 36.

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

### CF-25 — `docs/05` stale seed.sql "safe to re-run" claim  *(CLOSED 2026-08-03)*

- **Category:** Documentation-gap
- **Origin:** `docs/05` § Test fixtures, written before PR #37.
- **Current status:** **CLOSED (2026-08-03, session 37).** The fix is on `main` and was
  re-read there this pass; the entry's "resolved in this PR" phrasing was written while
  the fix was still in flight and has been ambiguous ever since that PR merged.
  **Resolving artifact: commit `b875bf5`** (PR #39, "docs: add carry-forwards registry
  (docs/11); point 05/08/09/README at it", merged 2026-07-05) — the same PR that created
  this registry also carried the `docs/05` correction. `docs/05` § Test fixtures now reads
  *"As of PR #37 (`9d453ca`, merged 2026-07-05) it genuinely is: the file opens with a
  single **child → parent DELETE teardown block** …"*, explicitly naming
  `vehicles.device_id REFERENCES devices(id) ON DELETE RESTRICT` as the only `RESTRICT` FK
  among the seeded tables and stating that `ON CONFLICT DO NOTHING` alone was **not**
  sufficient. The superseded "ON CONFLICT everywhere" claim is gone. **Closure criteria
  met:** App-track owner, a concrete merged commit resolves it, no build risk.
- **What's needed to resolve:** Nothing — done in `b875bf5`.
- **Owner:** App track. *(Closed.)*
- **Cross-references:** `docs/05` § Test fixtures (the corrected wording); PR #37
  (`9d453ca`, the mechanism) and PR #39 (`b875bf5`, the doc correction); **CF-06** (the
  standing `seed.sql` cross-track clobber-risk flag — still open, and the reason this
  file's re-runnability matters); workdiary sessions 28, 30; session 37 sweep.

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
- **Re-verified 2026-08-03 (session 37), unchanged.** Still open: the recurring daily-sync
  and Friday-retro calendar events, the GitHub Issues + project board, and WhatsApp
  Business. Two of these have stopped being merely "process hygiene": the **Friday retro**
  is the cadence in which a week-close like this one would normally happen, and the
  **cross-project sync** that **CF-03** needs is the same class of unscheduled meeting —
  the AI Agent Contract has now gone ten weeks unacknowledged partly because no recurring
  slot exists in which to raise it. **Blocker: founder actions;** none are code, and none
  can be closed from this track.
- **Owner:** Founder.
- **Cross-references:** `docs/08` Week-2 "Carry from Week 1" (slipped
  working-agreement set); R4 (designer handoff — largely mitigated); workdiary
  sessions 1, 5, 6, 7 long-running carry-overs.
