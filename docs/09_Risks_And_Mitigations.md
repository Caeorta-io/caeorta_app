# Risks & Mitigations

A living watch list. When a new risk appears, add it. When a risk materializes, update with what actually happened. When a risk is gone (e.g., feature shipped, decision made), mark it resolved.

---

## R1: AI agent contract drift

**Risk:** The AI agent project and this project drift on what the diagnostic_output schema means, what triggers analysis, or how feedback flows. By Week 7, the integration breaks in ways that take days to untangle.

**Likelihood:** High (this is one of the most common patterns in multi-project work)

**Mitigations:**
- The contract doc (`06_AI_Agent_Contract.md`) is the single source of truth
- Weekly sync with AI agent project (calendar this)
- Contract changes require PR approval from both sides
- Week 6 integration day is explicitly buffered for finding gaps

**Status:** Active, partially mitigated as of the 2026-06-19 Week 1 retro. A written, versioned contract v0 exists (`docs/ai-agent-contract.md`, App-track session 12) with each open-question default labelled a *proposal* the agent project can reject — the core mitigation. But it is **not yet shared**: it sits on an unmerged branch, no agent repo is reachable from the App founder's `gh`, and the weekly cross-project sync isn't on a calendar. Until the contract is shared and the sync is recurring, the mitigation is on paper. Monitor weekly.

**2026-06-22 (Week 2 close):** unchanged in practice. The contract's six open-question defaults remain **unacknowledged by the AI agent project** — no response received, the contract still sits on an unmerged branch (`docs/ai-agent-contract.md` is not on `main`), no agent repo is reachable from the App founder's `gh`, and the weekly cross-project sync is still not calendared. Carried into Week 3 as-is; the mitigation stays on paper.

---

## R2: iOS Wi-Fi provisioning is painful

**Risk:** Apple's Wi-Fi APIs are restrictive. The SoftAP provisioning flow that works cleanly on Android may not work on iOS without workarounds.

**Likelihood:** High (this is a known iOS pain point)

**Mitigations:**
- Android-first launch
- iOS pilot users use a manual SSID/password entry flow (less elegant but works)
- Document the iOS limitation in the pilot pack
- Revisit iOS-native Wi-Fi flow in Week 9 if time allows
- For v2, evaluate BLE-based provisioning which works better on iOS

**Status:** Active.

---

## R3: Founder availability changes

**Risk:** One founder gets sick, has a family emergency, or has to attend to other commitments. The 12-week plan assumes full-time availability from both.

**Likelihood:** Medium

**Mitigations:**
- Each week's deliverable is small enough to absorb a missed day
- Integration days have built-in buffer
- The split between Platform and App founders means single-person work isn't pure blocker; each can make some progress on the other's track
- Week 12 is buffer that can absorb up to a week of slip

**Status:** Active. Did not materialize as written (no founder went unavailable) through the 2026-06-19 Week 1 retro. Worth noting: the Reading B execution model — Muhammed as sole code author — is effectively the single-execution-point pattern this risk was written to anticipate, but in steady-state rather than as a one-off absence. The day-to-day version of that exposure is now tracked more precisely under R14 (bus factor); R3 remains the framing for a multi-day/family-emergency-style availability shock.

---

## R4: Designer handoff issues

**Risk:** Designer produces beautiful Figma that doesn't account for React Native constraints, real-time states, or the AI agent's output structure. App build hits "this can't be implemented as designed" wall.

**Likelihood:** Medium

**Mitigations:**
- Week 1 working session with designer (covers schema, real-time states, AI contract, RN constraints)
- Weekly designer check-in throughout build
- Figma must be organized as component system with auto-layout and tokens
- App founder flags implementation issues to designer immediately, not at end of build

**Status:** Active.

---

## R5: Supabase scaling surprise

**Risk:** During pilot, telemetry volume causes Supabase usage to exceed free tier or queries become slow. Discovered at the worst possible moment (mid-pilot).

**Likelihood:** Low at 10 users, Medium if pilot expands quickly

**Mitigations:**
- Telemetry downsampling job from Week 4
- Database monitoring set up in Week 9
- Paid tier upgrade pre-approved
- Cost monitoring in admin dashboard
- Indexes on hot paths from initial migration

**Status:** Active. Monitor monthly.

---

## R6: Apple/Google rejections delay pilot

**Risk:** Apple TestFlight or Google Play Internal Testing rejects the build for reasons we didn't anticipate (privacy disclosure, missing sign-in option, encryption declarations).

**Likelihood:** Medium for first submission

**Mitigations:**
- Submit early (Week 10, not Week 12)
- Privacy policy and ToS URLs ready from marketing site
- Apple Sign-In integration planned for Week 12 if needed
- Encryption / IDFA / data safety forms prepped during Week 10

**Status:** Active.

---

## R7: First sync experience is bad

**Risk:** A new pilot user pairs their device, drives, comes home, opens the app, and sees "no data yet" with no indication of why. Bad first impression at the moment that matters most.

**Likelihood:** Medium

**Mitigations:**
- Week 11 task: explicit testing of new-user onboarding with non-engineer
- "Waiting for first drive" UX explicitly designed (Week 3 + Week 8)
- AI agent generates a special "welcome" diagnostic on first drive (agreed with agent project)
- Pilot onboarding pack includes "what to expect in the first 24 hours" guide

**Status:** Active.

---

## R8: Diagnostics that confidently say wrong things

**Risk:** The AI agent surfaces a high-confidence diagnostic that's wrong. User acts on it (or doesn't act on something real), bad outcome. Trust eroded.

**Likelihood:** Medium

**Mitigations:**
- Confidence threshold (default < 0.5 hidden from main feed)
- Thumbs UI on every diagnostic for fast feedback loop
- Weekly review of low-rated diagnostics during pilot
- Severity-appropriate UI (warnings don't render as critical)
- Recommended_action explicitly cautious in language
- "This is informational, not a replacement for professional inspection" disclaimer present (placeholder until legal review)

**Status:** Active.

---

## R9: Pilot users churn or don't give feedback

**Risk:** 10 pilot users get devices, half stop using the app within 2 weeks, none give thumbs feedback. Pilot doesn't produce actionable signal.

**Likelihood:** Medium-High (this is the most common pilot failure mode for hardware products)

**Mitigations:**
- Weekly 15-min structured check-in calls (calendar-blocked, non-skippable)
- WhatsApp group for engagement
- Thumbs UI present on every diagnostic to lower friction
- Push notifications meaningful enough to drive re-engagement (severity-appropriate, batched)
- Pilot recruitment specifically selects highly engaged enthusiasts, not random users
- Pilot pack frames feedback as a co-creation activity, not a chore

**Status:** Active.

---

## R10: Tier 4 doesn't work as expected mid-pilot

**Risk:** A pilot user installs the device on their aftermarket-ECU car and the device cannot access Tier 4 data. Whole product thesis affected.

**Note:** This risk is owned in the hardware project, not here. But it affects this project because the app needs to degrade gracefully.

**Mitigations (in this project):**
- App designed to work with Tier 1-3 data (not assume Tier 4)
- Empty states for "deeper analysis requires aftermarket ECU"
- Diagnostic outputs handle the `insufficient_data` category gracefully

**Status:** Active. Hardware project owns the validation; app accommodates either outcome.

---

## R11: Designer disappears or becomes unresponsive

**Risk:** Freelance designer becomes unavailable mid-build. We're now blocked on design decisions or stuck with incomplete Figma.

**Likelihood:** Low-Medium

**Mitigations:**
- Get the design system locked in Week 1 (tokens, primitives, key components)
- Documented design tokens mean we can extend without the designer
- shadcn/ui and v0 give us fallback patterns
- The founder has a relationship with the designer; flag any responsiveness issues early

**Status:** Active.

---

## R12: Hotspot battery / data drain ruins pilot UX

**Risk:** Pilot users find that running their phone hotspot constantly drains battery, gets hot, and uses too much data. They turn off hotspot. The device stops syncing. Pilot data dries up.

**Likelihood:** Medium

**Mitigations:**
- Sync is opportunistic, not constant — device only requests Wi-Fi when it has data to send
- Live mode is explicit, not default
- App settings: "Only sync on home Wi-Fi" option
- Estimated data usage shown in app settings
- Onboarding guide explains: "your phone needs to be in the car with hotspot on for the device to sync — plug it in"

**Status:** Active.

---

## R13: ESP32 hardware change disrupts firmware-app integration

**Risk:** Mid-build, the hardware project switches MCU (e.g., ESP32-S3 → ESP32-C3 or C6). Firmware behavior changes. Edge Functions break or telemetry shape shifts.

**Note:** Hardware project owns. This project's risk is interface stability.

**Mitigations (in this project):**
- Edge Function input schemas are versioned and strict
- Telemetry `metrics` field is jsonb — flexible to new fields without migration
- Weekly sync with hardware project to flag changes
- Contract: firmware change requires Edge Function compatibility test before merge

**Status:** Active.

---

## R14: Sole code author for caeorta_app — bus factor / unavailability

**Risk:** Muhammed is the only code author in this repo. If he is unavailable (illness, travel, burnout, departure), no one can ship code, fix urgent bugs, or cut releases. Sulaiman owns Platform-area decisions and reviews PRs but does not author code here and is not familiar with the codebase at the implementation level.

**Likelihood:** Low for short-term unavailability (days); medium across the 12-week build; rises again once the pilot is live and on-call obligations begin.

**Mitigations:**
- Sulaiman reviews every PR and stays current on architectural shape, file layout, and non-obvious patterns even though he does not write code in this repo.
- `CLAUDE.md` + `docs/` are deliberately rich so any future contributor (or Sulaiman in emergency) gets the full project brief loaded into a Claude Code session immediately.
- ADRs for any non-obvious pattern decision so reasoning survives the author.
- Strict TypeScript, Zod at boundaries, and tests on critical paths (auth, device pairing) reduce "only Muhammed knows what this does" zones.
- EAS Update + EAS Build runbook lives in `docs/` so an emergency JS-only update can be cut without Muhammed if the build is already on `main`.
- Friday retro includes a standing "what breaks if I disappear this week?" check whenever Muhammed has touched a critical path for the first time.
- Long-term: as Caeorta grows past the pilot, hiring a second app developer is the durable fix. This risk explicitly stays open until that hire.

**Status:** Active. Reframed 2026-06-02 from the prior R14 ("Two founders' coding styles diverge"), which is obsolete now that the execution model has collapsed to a single code author. The original divergence-of-style risk no longer applies.

**2026-06-19 Week 1 retro check:** the **EAS Update + EAS Build emergency-release runbook** listed above as a mitigation **does not yet exist** as an artifact — a repo-wide search found no runbook doc, only this mitigation text referencing it. It has been a paper mitigation since session 4. Outstanding action: write the runbook in `docs/` (the conditions that triggered listing it — Muhammed unavailable, urgent JS-only fix needed — are unchanged). The other mitigations (rich `CLAUDE.md`/`docs/`, ADRs, strict TS + Zod, Sulaiman reviewing every PR) are in place and active.

---

## R15: AI tools generate plausible-but-wrong code that ships unnoticed

**Risk:** Cursor and Claude Code generate code that compiles, passes tests, but has a subtle bug. Muhammed, learning mobile, doesn't catch it during authoring; Sulaiman, reviewing the PR, can miss it in mobile-specific territory where he is also non-expert. Bug ships to pilot.

**Likelihood:** Medium

**Mitigations:**
- Sulaiman reviews every PR; second pair of eyes specifically catches AI-generated subtle bugs Muhammed missed during authoring
- Strict TypeScript, no `any` types
- Zod schema validation at boundaries (DB ↔ app, API ↔ UI)
- Sentry catches runtime errors fast
- Pilot itself is the final test
- For especially critical paths (auth, device pairing, payments-later), write unit tests even if other code is tested less

**Status:** Active. No instance of plausible-but-wrong AI-generated code is known to have reached `main` or pilot through the 2026-06-19 Week 1 retro (Weeks 1–5). The `docs/conventions.md` § Spec deviations protocol has instead been actively exercised as a working mitigation — implementation surfaced real spec gaps that were fixed-and-documented in the same PR (e.g. `app_versions` composite PK, the RLS row-vs-column interpretation, the `pnpm -r run --if-present test` correction). Those are spec/tooling corrections caught during authoring, not bugs that shipped; the absence of shipped defects is encouraging but unproven until the pilot exercises the code.

---

## R16: Force-update mechanism is a single point of failure

**Risk:** A bug in the `app_versions` check itself prevents the app from launching or prevents force updates from working. Pilot users brick.

**Likelihood:** Low but catastrophic

**Mitigations:**
- The version check has a hard timeout (3 seconds); if it fails, app launches anyway
- Manual rollback via EAS Update is documented and tested
- Both founders have EAS access; Sulaiman can publish an emergency rollback via the documented runbook if Muhammed is unavailable
- Don't introduce force-update logic until Week 8 when it's been tested

**Status:** Active. Specifically watched. Unchanged at the 2026-06-19 Week 1 retro — force-update logic has not been introduced yet (it's a Week 8 item), so the risk is still latent, not live. The `app_versions` table (with the composite `(version, platform)` PK) exists in the schema, but no client-side version-check code consumes it yet.

---

## R17: Pilot users in India experience GCC-specific defaults (or vice versa)

**Risk:** App is tested with India-first defaults (Hindi support, INR currency display, IST timezone) but pilot includes GCC users (Arabic RTL, AED display, GST).

**Likelihood:** Low (pilot is India-only)

**Mitigations:**
- Pilot is explicitly India users
- i18next set up from Week 1 so adding Arabic later is translation, not refactor
- Time, currency, units use locale-aware formatters from start
- GCC commercial launch will have its own QA pass

**Status:** Active.

---

## R18: Apple Developer enrolled as Individual, not Organization

**Risk:** Apple Developer account was enrolled as Individual (under one
founder's Apple ID) rather than Organization, because Caeorta is not yet
a registered legal entity with a D-U-N-S number. Consequence: the App
Store listing shows one founder's personal name as the developer rather
than "Caeorta." Less professional for commercial launch.

**Likelihood:** Certain (this is the chosen path)

**Mitigations:**
- Acceptable for pilot (10 users who know us)
- Plan organization transfer between Week 12 and Week 16 once Caeorta
  is incorporated and has a D-U-N-S number
- Track the transfer as an explicit Week 13+ task

**Status:** Active. Tracked for post-pilot.

---

## R19: Two-track main divergence / stacked-merge drift

**Risk:** Two parallel work tracks (Muhammed's App track and Sulaiman's Platform track) integrate into one `main`, and work proceeds on feature branches and stacked PRs. Local `main` (and feature branches cut from it) go stale silently; stacked PRs can merge into their base branch instead of `main`; and a long-lived branch can miss the *other* track's commits entirely. The failure mode is acting on a stale picture — a confident-but-wrong analysis, or worse, an edit/merge that clobbers the other founder's work (e.g. overwriting the Platform-track workdiary entries).

**Likelihood:** Medium-High — it has already recurred. Session 9 hit it (5 stacked PRs merged into base branches, leaving `main` three stacks behind, requiring catch-up PRs #11/#12). Session 13 hit it (28-commit-stale local `main` produced a wrong "main has no monorepo" analysis). The 2026-06-19 Week 1 retro hit it again (the retro branch was stale by Sulaiman's entire Platform track + App session 13; editing the local workdiary would have dropped ~220 lines of his entries).

**Impact:** Low-to-medium each time so far (caught before damage), but the clobber-the-other-track case is high-impact and hard to reverse on a public repo.

**Mitigations:**
- **`git fetch` and reason about `origin/main`, never local `main`.** Local refs are silent when stale.
- **Branch off `origin/main`; for cross-track doc edits (workdiary, plan, risks), edit the `origin/main` copy** so the other track's entries are preserved.
- **Keep stacks shallow** and ensure every PR in a stack targets `main`, not an intermediate branch (see `docs/conventions.md` § PR stacking + Reconciliation).
- **Sanity-check after stacked merges** with `git ls-tree origin/main <path>` / `git log origin/main..<branch>`.
- Longer-term: enabling required status checks / branch protection (blocked on the Free plan today) would reduce the surface; revisit on a paid plan.

**Status:** Active. New at the 2026-06-19 Week 1 retro, formalizing a pattern that bit three times. The process guidance already lives in `docs/conventions.md`; this register entry records it as a standing risk because recurrence shows the guidance alone hasn't prevented it.

---

## R20: Wi-Fi provisioning contract (PoP + security scheme) unratified

**Risk:** The app's Wi-Fi onboarding is built to the standard ESP-IDF `wifi_provisioning` protocol over SoftAP (App-track session 17), but the firmware/hardware track has **not ratified the two parameters that gate a working session**: the proof-of-possession (PoP) value/source, and the security scheme — Security 1 vs Security 2 / SRP6a, which also dictates whether a username is required. The app holds these in a single typed seam (`apps/mobile/src/lib/provisioningConfig.ts`) with PoP unset and a provisional security default — *neither is a committed choice*. If firmware later picks a scheme or PoP source the app didn't anticipate, the SoftAP handshake fails and onboarding breaks at the worst moment (a new user setting up their device).

**Note:** Device-side provisioning is owned by the hardware project and is **not implemented yet** (the V1 prototype has Wi-Fi hardcoded + flashed, no phone-provisioning endpoint — see `docs/07_Sync_Architecture.md` § `submit_wifi_credentials`). This is now an **app-side dependency on a firmware decision**, not just a hardware concern.

**Likelihood:** Medium — the seam is designed to absorb the choice in one place, but the choice is genuinely unmade and the two sides have not met on the wire yet.

**Mitigations (in this project):**
- Security level + PoP isolated in one typed config seam; ratifying them is a one-file change, not a screen/flow rewrite.
- The result-mapping boundary is unit-tested independently of the (untestable-today) live wire path.
- Carried explicitly as a Week-2 gate (`docs/08_12_Week_Action_Plan.md` Week 2 DoD) and as a firmware-sync item: confirm PoP source + security scheme **before** the first real-device provisioning test.
- Related: R2 (iOS Wi-Fi provisioning pain), R13 (firmware↔app interface stability).

**Status:** Active. New at Week-2 close (2026-06-22). Latent until firmware exposes a provisioning endpoint; becomes live the moment on-device integration starts.

---

## R21: Live Realtime swap requires a cross-track adapter

**Risk:** `subscribeToCurrentState` (in `packages/supabase/src/realtime.ts`) returns a `RealtimeChannel` and takes a Supabase client; the App-side mock emitter expects `(onUpdate, onChannelStatus) => () => void`. Bridging this requires a thin adapter touching `packages/supabase` — a shared package boundary. If the adapter is authored without Platform-track sign-off, the interface may diverge from how Sulaiman's track uses the same Realtime helpers elsewhere.

**Likelihood:** Medium (inevitable work; the risk is misalignment, not omission).

**Impact:** Medium (blocks the live Realtime flip; does not block screens or other live-flip capabilities).

**Mitigations:**
- Author the adapter interface as a contract document (same pattern as `docs/create_vehicle_contract.md`) before writing any code.
- Both tracks agree on the interface; adapter implementation follows the agreed contract.

**Status:** Open. New at Week-3 close (App-track session 24). See the Week-3 carried-forward table in `docs/08_12_Week_Action_Plan.md` and the `currentStateSubscription` live-branch comment in `source.ts`.

---

## R22: Provisional jsonb metric key vocabulary unreconciled

**Risk:** The `peak_metrics`, `summary_metrics`, and `latest_metrics` jsonb fields use a provisional key set in `mocks.ts`. The canonical set is owned by the hardware/AI-agent contract. A mismatch is not compiler-caught (the columns are opaque `Json`). Every live-flip of the `lastDrive`, `currentState`, or `recentDiagnostics` capabilities is blocked until the canonical set is confirmed and the `TODO(metric-keys)` flags are resolved.

**Likelihood:** Medium (the contract exists; reconciliation just hasn't happened).

**Impact:** High (silently wrong data in production if skipped).

**Mitigations:**
- Treat `TODO(metric-keys)` as a hard gate on each capability's live flip.
- Add a checklist item to the live-flip runbook (to be written in Week 4) that explicitly confirms metric-key reconciliation before the flip is approved.

**Status:** Open. New at Week-3 close (App-track session 24). Related: R1 (AI agent contract drift). See the Week-3 carried-forward table in `docs/08_12_Week_Action_Plan.md`.

---

## How to use this document

- **Weekly retro:** Walk this list. Any risks worsening? Any new ones to add? Any to resolve?
- **When something breaks:** Add it as a new risk if not already present, with mitigation.
- **When mitigation works:** Note it. Mitigations that worked are templates for future risks.
- **When mitigation fails:** Note that too. Useful for honesty about what we learn.
