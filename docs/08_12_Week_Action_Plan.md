# 12-Week Action Plan

This is the canonical build plan. It is **living** — when reality diverges, update this file (with the date of the update noted) rather than letting the doc and reality drift apart.

## Founder role split

The split (decided 2026-05-13): Muhammed Raslan owns App; Sulaiman Shiyas Ali owns Platform.

**Execution model:** Muhammed authors all code in this repo. Sulaiman reviews PRs in his role's area and owns the underlying decisions.

### Platform founder
- Supabase schema, migrations, RLS
- Edge Functions
- Admin web dashboard (Next.js)
- Marketing site (Framer)
- OTA infrastructure
- Push notification backend
- Device pairing backend
- CI/CD pipelines

### App founder
- Expo mobile app
- Screens, navigation, state, integration with Supabase
- Integration with AI agent outputs
- Design implementation (working from designer's Figma)

### Both
- Schema design in Week 1
- AI Agent Contract in Week 1
- Integration days in Weeks 6 and 11
- Friday retros

---

## Section 0 — Setup (before Week 1)

Things done before code starts. None of these are coding tasks; all of them block code if missing.

## Section 0 status — closed 2026-05-13

Section 0 is closed. Summary of state at Week 1 start:

- Repo live at github.com/Caeorta-io/caeorta_app, working directory
  `c:\Users\muham\Documents\#1_Caeorta_dev\caeorta_app` on the App
  founder's machine (Platform founder cloned to their own path)
- CLAUDE.md at repo root; all 11 project knowledge files mirrored to `docs/`
- `docs/workdiary.md` is the living log of decisions, tool inventory, and
  per-session entries — read latest entry at session start
- Founder split decided: Muhammed Raslan (App), Sulaiman Shiyas Ali (Platform)
- All external accounts created and in 1Password "Caeorta" vault:
  GitHub org, Supabase (dev+prod, ap-south-1), Vercel, Expo org,
  Anthropic Console (dev+prod keys), Sentry, PostHog, Cloudflare Registrar
  (domain registered), Google Workspace, Resend, Framer
- Founder agreement (YC template) signed
- Muhammed's local dev environment fully set up; Sulaiman has GitHub web access for PR review

Deferred (funds reason):
- Apple Developer enrollment ($99/year) — **not a v1 blocker.** iOS is
  paused for the v1 pilot (Android-only); Apple Developer is needed
  only for post-pilot iOS rollout. Pay when funded post-pilot. See
  decisions log in `workdiary.md` and `10_Out_Of_Scope.md` "iOS in v1
  pilot" for the full rationale.
- Google Play Console ($25 one-time) — blocker for Week 10 Play Internal
  Testing (the v1 pilot distribution channel). Pay when funded;
  activation is typically same-day, so do it by end of Week 9 at the
  latest.

In flight at Week 1 start:
- Designer kickoff brief drafted; to be sent ≥48h ahead of Week 1
  designer session

### Accounts and services

- [ ] GitHub organization for Caeorta (separate from personal). 2FA required.
- [ ] Supabase: two projects, `caeorta-dev` and `caeorta-prod`, both in `ap-south-1`
- [ ] Vercel team
- [ ] Expo account, both founders invited
- [ ] Anthropic API account, separate keys for dev and prod (mostly used by AI agent project, but Edge Functions may use)
- [ ] Langfuse free tier (the AI agent project sets up; we have read access)
- [ ] Sentry free tier
- [ ] PostHog free tier
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~Apple Developer account ($99/year) — register early, takes 24-48h~~
- [ ] Google Play Console ($25 one-time)
- [ ] Resend account for transactional emails
- [ ] Framer account for marketing site
- [ ] Domain registered (caeorta.com or chosen TLD) via Cloudflare Registrar; Cloudflare DNS configured
- [ ] Google Workspace email on domain (founders@, support@)
- [ ] 1Password (or similar) shared vault for secrets

### Tools installed (Muhammed's machine — Sulaiman reviews PRs via the GitHub web UI, no local dev environment needed)

- [ ] Node 22 LTS, pnpm 9+ (Node 20 is EOL as of 2026-04; current Active LTS is 22)
- [ ] VS Code (free, code.visualstudio.com)
- [ ] Claude Code extension from VS Code Marketplace (official one by Anthropic)
- [ ] Signed in with Anthropic account
- [ ] **OBSOLETE (Expo SDK 50+ uses `npx expo`; no global install needed):** ~~Expo CLI~~
- [ ] Supabase CLI
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~Xcode (Mac)~~
- [ ] Android Studio (or, lighter: OpenJDK 17 + Android platform-tools for `adb` only; full IDE optional until emulator/native-debug needed)
- [ ] Physical Android device with USB debugging
- [ ] WhatsApp Business

### Documents written before Week 1

- [ ] Founder agreement signed (equity, vesting, IP, departure) — use Y Combinator's template
- [ ] Brief design system doc collaboratively with designer (color tokens, type scale, spacing)
- [ ] AI Agent Contract v0 — placeholder, filled in Week 1

### Working agreements decided

- [ ] Who owns Platform role
- [ ] Who owns App role
- [ ] Daily 15-min sync at fixed time
- [ ] Friday 60-min retro
- [ ] GitHub Issues + project board (not Notion, not Jira)
- [ ] Branch strategy + PR review cadence

---

## Week 1 — Foundation and contracts

The whole week is about deciding things on paper so weeks 2-12 don't get rewritten.

> **Note (applies to all weeks):** "Platform founder" tasks describe Platform-area work owned by Sulaiman and implemented by Muhammed in this repo. "App founder" tasks describe App-area work owned and implemented by Muhammed. "Together" tasks are joint decisions, documentation, or testing — neither coded solely.

### Platform founder
- [ ] Create both Supabase projects, enable extensions (pgcrypto, pg_cron, pgvector, pg_trgm)
- [ ] Write initial migration: all tables from `05_Database_Schema.md`
- [ ] Apply to dev, seed with test data
- [ ] Write RLS policies, test that anon and authenticated work correctly
- [ ] Generate TS types: `supabase gen types typescript --linked`, commit to `packages/supabase`
- [ ] Set up Supabase CLI in GitHub Actions for migration validation
- [ ] Initialize Edge Function scaffolding

### App founder
- [ ] Initialize monorepo: pnpm workspaces, shared TS config, shared ESLint config
- [ ] `apps/mobile`: Expo project with TypeScript, expo-router, NativeWind
- [ ] `apps/admin`: Next.js project scaffolding (empty for now)
- [ ] `packages/types`: shared zod schemas mirroring DB types
- [ ] `packages/supabase`: client factory
- [ ] Connect Expo app to dev Supabase
- [ ] Implement email OTP (code-only) login screen
- [ ] Implement authenticated home screen: "Hello {user.email}"
- [ ] Set up i18next with English; structure all UI text through it
- [ ] Set up Sentry SDK in mobile app
- [ ] Create CLAUDE.md at repo root (Claude Code's project brief — see 04_Repository_Structure.md for what it contains)
- [ ] Copy all 11 project knowledge files into repo's `docs/` folder
- [ ] Enable GitHub connector on the Claude.ai project (optional but recommended)

### Together
- [ ] 90-min working session with designer (walk through schema, real-time states, AI contract, RN constraints)
- [ ] Designer feedback: confirm Figma file is organized as a component system (auto-layout, components, variants), tokens not raw hex
- [ ] Write `docs/ai-agent-contract.md` v0 — share with AI agent project for review
- [ ] Set up GitHub Actions CI: lint, typecheck, test on every PR
- [ ] Decide branch strategy, commit conventions, PR review process
- [ ] Calendar: Friday retro recurring event


### Definition of done — Week 1
- Muhammed can run the codebase locally
- Both Supabase projects exist with v1 schema applied — **partial:** the three Week 1 v1 migrations (`enable_extensions`, `initial_schema`, `rls_policies`) are applied to dev AND prod as of 2026-06-21 (prod verified: 4 extensions, 26 tables, 36 indexes, RLS on all 26 tables); the two Week 5 migrations (`add_notify_agent`, `add_pg_cron_jobs`) remain dev-only and are tracked as an outstanding prod promotion (see Week 2 carry below and `docs/05` § Migration discipline).
- App can log in via email OTP (code-only) against dev Supabase
- AI Agent Contract doc exists and is shared with agent project
- CI runs green on a trivial PR

---

## Week 2 — Device pairing and provisioning

Harder than it sounds because it touches firmware, Supabase, and the app simultaneously.

### Carry from Week 1

Logged in the 2026-06-19 Week 1 reconciliation (see `docs/workdiary.md` Week 1 retrospective and the Plan revision log below). Each line: what slipped, why, what unblocks it.

- **Prod migration promotion (2 of 5 migrations remain) + Dashboard OTP config.** The three Week 1 v1 migrations (`enable_extensions` / `initial_schema` / `rls_policies`) were promoted to prod on 2026-06-21 via the `docs/05` ritual (prod verified: 4 extensions, 26 tables, 36 indexes, RLS on all 26 tables, and the anon→`vehicles` / authenticated→`audit_log` isolation tests both return 0). The two Week 5 migrations (`add_notify_agent` / `add_pg_cron_jobs`) were intentionally left dev-only — the 2026-06-21 session was scoped to the three Week 1 migrations — and still need promotion in a follow-up prod-link session (note: `add_pg_cron_jobs` starts its nightly jobs the moment it lands on prod, so confirm that's desired first). Still outstanding alongside this: the Dashboard-side OTP email config on prod (magic-link template → `{{ .Token }}`, confirm-email off, OTP length 6 — see `docs/05` § Supabase Dashboard configuration).
- **`agent_role` read-only Postgres role migration.** Gated on AI Agent Contract v0 review. The v0 contract exists (App-track session 12, `docs/ai-agent-contract.md`) but is on an unmerged branch and not yet shared with the agent project, so the role's exact read scope isn't final. Unblocked when the contract v0 merges and the agent project confirms which tables/columns it reads.
- **`devices` column-scope follow-up migration.** Deferred in the RLS migration (session 7) until `mint_device_token` firmed up. `mint_device_token` now exists (Sulaiman's session 4), so this is unblocked: REVOKE UPDATE on device-managed columns from `authenticated`, GRANT the owner-writable subset (likely just `status`).
- **AI Agent Contract: share with agent project + weekly-sync calendar invite.** Channel (GitHub issue on the agent repo) and cadence (Friday 16:00 IST, 30 min) are decided (session 12) but not executed — no agent repo is reachable from the App founder's `gh`, and there's no calendar integration. Founder action: confirm the agent repo + access (or have the agent owner file the issue) and create the recurring invite. This is the standing R1 mitigation.
- **Auth-decision doc fix.** "Magic link" in Week 1's deliverables/DoD corrected to "email OTP (code-only)" in this reconciliation (see revision log).

Already completed by Sulaiman in Weeks 2–5 (so NOT carried, recorded for honesty): **Edge Function scaffolding** (the Week-1 Platform item "Initialize Edge Function scaffolding" was deferred to Week 2 and is done — all Week 2–5 functions are on `main`) and **`supabase/seed.sql`** (present on `main`, Sulaiman's session 5).

Slipped from Week 1's "Together"/working-agreement set and still open as founder actions (not code): designer 90-min working session, Figma component-system confirmation, recurring daily-sync + Friday-retro calendar events, and the GitHub Issues + project board. Per the 2026-06-19 retro these had not happened; founder intends to do them after that session.

### Platform founder
- [ ] Edge Function: `pair_device` (per `07_Sync_Architecture.md`)
- [ ] Edge Function: `mint_device_token`
- [ ] Edge Function: `submit_wifi_credentials`
- [ ] Edge Function: `ota_check`
- [ ] Build firmware-side auth test (Postman or curl scripts simulating a device)
- [ ] Set up Supabase Vault for encrypting Wi-Fi credentials at rest

### App founder
- [ ] Onboarding flow screens, designed from Figma:
  - Welcome screen
  - Sign in (already exists)
  - "Let's pair your device" intro
  - Camera permission request
  - QR scanner (expo-camera)
  - Manual code entry fallback
  - Pairing in progress
  - "Now set up Wi-Fi" explanation
  - Wi-Fi SSID + password entry
  - "Sending credentials to your device"
  - "Test live mode" — confirms device-to-app round-trip
  - Done / Home
- [x] Wire QR + manual code paths to `pair_device` <!-- session 16, 2026-06-21 (feat/device-pairing) -->
- [x] Wi-Fi setup screens (SSID + password) wired to **direct SoftAP provisioning** over the standard ESP-IDF `wifi_provisioning` protocol — **not** `submit_wifi_credentials`. v1 onboarding sends creds phone→device only; no cloud storage. <!-- session 17, 2026-06-22 (feat/wifi-provisioning, reconciled to main via #23). See docs/07 § submit_wifi_credentials note + R20. -->
- [ ] Real-device Wi-Fi provisioning E2E — **CARRIED, firmware-gated**: no device speaks ESP-IDF `wifi_provisioning` yet, and the PoP value + security scheme (Security 1 vs Security 2 / SRP6a) are unratified (R20). App side is built + unit-tested at the result-mapping boundary; the live wire path can only be verified once firmware provisioning exists.
- [x] Handle all error cases: invalid code, already-claimed, network failure, camera denied <!-- session 16: 404/409/network mapped in pairing.ts; camera-denied → manual path in scan.tsx -->
- [ ] On-device E2E (DoD): scan/enter a seed secret on a physical Android dev build → device row claimed + audit_log written. Deferred — needs a new EAS dev build (expo-camera is native).
- [ ] Persist auth state with expo-secure-store

### Together
- [ ] End-to-end test with simulated device (Postman flow): onboard a user, claim a device, see device row updated
- [ ] Sync with hardware/firmware project: confirm the device-side implementation will use the Edge Functions we built

### Definition of done — Week 2

**Built (on `main` at Week-2 close, 2026-06-22):**
- A user can sign in, scan a QR or enter a code, and the claim path calls the **live** `pair_device` — 404 / 409 / network error cases mapped and unit-tested (session 16).
- Wi-Fi setup screens hand SSID + password to the device via **direct SoftAP ESP-IDF provisioning** (no cloud creds); the boundary + result-mapping is unit-tested (session 17).

**Remaining gates — NOT closed, carried to integration:**
- **Pairing on-device E2E has not been run.** Needs a physical Android EAS dev build: scan/enter a seed secret → confirm the `devices` row is claimed (`claimed_by_user_id`, `status='active'`) and an `audit_log` row is written. Pairing is *built*, not yet *verified end-to-end* (the open App-founder item above).
- **Real-device Wi-Fi provisioning is firmware-gated.** No device speaks ESP-IDF `wifi_provisioning` yet; PoP + security scheme are unratified (R20). Cannot be verified until firmware provisioning exists.

The auth and pairing **paths are real**; full "real and tested" closure waits on the on-device run (pairing) and on firmware (Wi-Fi).

---

## Week 3 — Vehicle dashboard (post-sync model)

The actual product starts to take shape. Default view is "your last drive," not live data.

### App founder
- [ ] Vehicle list screen: all user's vehicles, cards with last sync, last drive summary, connection status
- [ ] Vehicle detail screen (primary):
  - Header: vehicle name, make/model/year, last sync timestamp
  - "Last drive" card: distance, duration, time, summary metrics
  - "Recent diagnostics" preview: last 3 outputs, severity-colored
  - "Live mode" button (prominent secondary action)
  - Empty state when no drives yet: clear "waiting for first drive" UX
- [ ] Live mode screen (separate route): real-time current_state via Realtime, large legible numbers, exit cleanly
- [ ] Connection state indicator: "Synced 2h ago" / "Live" / "Connecting…" / "Offline since yesterday"
- [ ] In-app add-vehicle flow (make/model/year/nickname/ecu_type form, Zod validation, `lib/vehicles.ts` orchestrator, result states; E2E gated on Platform-side `create_vehicle` Edge Function — carried like Wi-Fi)

> **Week 3 App is mock-data-first, JS-only (`DATA_SOURCE='mock'`); no EAS dev build required this week.**

### Platform founder
- [ ] Implement `current_state` upsert pattern
- [ ] Test Realtime subscriptions: ensure they scale to 10 concurrent
- [ ] Build helpers in `packages/supabase` for Realtime patterns
- [ ] Admin dashboard skeleton: Next.js app, deploy to Vercel
- [ ] Admin: Supabase auth limited to two founder emails (hardcoded allowlist for v1)
- [ ] Admin: one page showing all devices, last seen, status

### Together
- [ ] Test with simulated device: telemetry inserts → app shows last drive summary
- [ ] Test live mode end-to-end

### Definition of done — Week 3
- App home experience shows real or simulated drive data
- Live mode works as explicit, opt-in feature
- Admin dashboard shows device status

### Week close — App track (session 23)
- **Week 3 App track complete**, mock-data-first and JS-only — no EAS dev build was needed.
- **Screens shipped:** vehicle list, add-vehicle flow, vehicle detail, live mode. Live mode
  runs against the data seam's mock Realtime emitter (`subscribeToCurrentStateMock`), which
  matches the real subscription's external contract so the swap is a per-capability flag flip.
- **Carried forward:**
  - `create_vehicle` E2E — gated on the Platform-side `create_vehicle` Edge Function.
  - `TODO(metric-keys)` — provisional jsonb metric vocabulary; gated on the hardware/AI-agent
    contract. Resolve per capability before flipping it to `'live'`.
  - Live Realtime swap — flip `DATA_SOURCE.currentStateSubscription` (and the read capabilities)
    to `'live'` once Platform reads are wired; a `@caeorta/supabase` adapter maps the real
    `subscribeToCurrentState` (returns a channel, needs a client, emits no channel status) onto
    the seam's `(vehicleId, onUpdate, onChannelStatus) => () => void` contract.
  - Pairing on-device E2E — still unrun; not a Week 3 blocker. Requires the next EAS dev build
    with the `expo-camera` + `esp-idf-provisioning` native modules.

---

## Week 4 — Drives, charts, and historical data

### App founder
- [ ] Drives list screen: paginated, date-grouped, anomaly indicator
- [ ] Drive detail screen:
  - Summary stats at top
  - Time-series chart: select metric, pinch/zoom
  - Victory Native; document any perf issues for Week 9 evaluation
  - Map view if GPS in telemetry (else placeholder)
  - Linked diagnostics for this drive
- [ ] Multi-metric small multiples view (4 key metrics at once)
- [ ] Use FlatList for lists; useMemo for expensive computations

### Platform founder
- [ ] Edge Function: `get_drive_telemetry` with server-side downsampling
- [ ] Database function for drive boundary detection (called in `device_sync_complete`)
- [ ] `pg_cron` job: nightly aggregation of telemetry > 30 days → per-minute aggregates
- [ ] Admin dashboard: drive list per device

### Together
- [ ] Perf test with 30 days simulated data; verify charts stay smooth

### Definition of done — Week 4
- User can browse drives, tap one, see detailed charts smoothly
- 30-day-old data doesn't slow queries

---

## Week 5 — DTCs and structured diagnostic experience

### App founder
- [ ] DTC list view: active + cleared, sortable by severity/recency
- [ ] DTC detail: code, description, linked agent output if exists, "Mark cleared" action
- [ ] Build the **diagnostic card component** (used in many places): severity-colored, expandable, thumbs UI, mark-seen, dismiss
- [ ] In-app notification when new DTCs detected after sync

### Platform founder
- [ ] DTC ingestion in sync handler: dedupe against active set, mark first/last seen
- [ ] Read-only DTC lookup table (seeded from public OBD-II reference for common P0xxx codes)
- [ ] Admin: support view per pilot user with DTC timeline

### Together
- [ ] Test: device reports DTC → sync completes → DTC appears in app within seconds

### Definition of done — Week 5
- App handles DTCs as first-class objects
- Diagnostic card component is the reusable atom for the rest of the build

---

## Week 6 — AI agent integration

The week most likely to surface contract gaps. Plan for friction.

### App founder
- [ ] AI feed screen: chronological diagnostic_outputs, filterable by severity/status/time
- [ ] Diagnostic detail screen:
  - Full agent output (title, summary, explanation, recommended action)
  - Severity + urgency badges
  - Visual confidence indicator
  - "Referenced data" section: tap to jump to telemetry chart at the moment
  - Linked DTCs
  - **Thumbs up / down + optional comment** → writes to `diagnostic_feedback`
  - "Mark as actioned" button
  - Agent version subtle (debug/settings only)
- [ ] Severity-based UI:
  - `info` → quiet card
  - `warning` → prominent banner on vehicle detail
  - `critical` → modal on app open until acknowledged
- [ ] Insufficient-data UI (gentle treatment)
- [ ] "Analyzing your drive…" banner driven by `agent_status` subscription

### Platform founder
- [ ] Trigger: when `sync_sessions.status = 'completed'`, notify AI agent project (NOTIFY or webhook per contract)
- [ ] App subscribes to `agent_status` changes
- [ ] Admin: agent activity feed, feedback aggregation (% thumbs up, top complained-about)

### Together (Integration Day mid-week)
- [ ] Run real data through real agent → real diagnostics in real app
- [ ] Find 5-10 contract gaps
- [ ] Fix doc and both sides' code
- [ ] Smoke test 10 realistic scenarios

### Definition of done — Week 6
- App feels like an AI-powered product, not a data viewer
- Real drive → real diagnostic → user can give feedback that flows to agent project

---

## Week 7 — Push notifications and background experience

### App founder
- [ ] Expo Notifications setup
- [ ] Token registration on app launch → `device_push_tokens`
- [ ] Test on real iOS + Android
- [ ] Notification preferences screen: per-severity toggle, quiet hours, per-vehicle settings
- [ ] Deep linking: notification tap → diagnostic detail
- [ ] Foreground notification handling (in-app banner when app open)

### Platform founder
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~APNs key in Apple Developer; EAS configured~~
- [ ] FCM project on Firebase; EAS configured
- [ ] Edge Function: `send_diagnostic_notification` triggered on diagnostic_outputs insert with severity=warning/critical
- [ ] Respect user preferences (severity threshold, quiet hours)
- [ ] Rate limit: max 3 per user per hour
- [ ] "Sync complete with new insights" batched notification

### Together
- [ ] Real notification test on real devices: open, closed, backgrounded states

### Definition of done — Week 7
- Critical diagnostic on real hardware → push notification within seconds, even with app closed

---

## Week 8 — Empty states, error states, polish

The unglamorous week that decides whether the app feels professional.

### App founder
- [ ] Every screen: empty, loading, error, offline states
- [ ] Edge cases:
  - First user, device paired, no drives yet
  - Returning user, device offline 3+ days
  - SD card full warning surfaced from device events
  - Airplane mode (cached data display)
  - Token expired mid-session (graceful re-auth)
  - Force-update screen below `force_update_below_this`
- [ ] Non-engineer friend tests onboarding; fix what trips them
- [ ] Accessibility: dynamic font scaling, screen reader labels, color contrast, 44pt/48dp touch targets
- [ ] i18next: pseudo-localization test to find untranslated strings; reserve space for Arabic (RTL) and Hindi
- [ ] Visual polish matching designer's spec; build remaining design primitives

### Definition of done — Week 8
- Every screen has thoughtful responses to every condition
- Non-engineer can use the app without help
- App feels intentionally made

---

## Week 9 — Admin dashboard polish + marketing site

### Platform founder
- [ ] Admin dashboard becomes operational center:
  - Live map of devices (MapLibre, last GPS or IP geolocation fallback)
  - Per-device deep-dive: events log, telemetry volume, DTC timeline, diagnostics + feedback, sync history, current firmware
  - "Push OTA" button per device
  - "Send message" — one-off push to user
  - Aggregate views: token spend per day, agent quality (thumbs rates), engagement (DAU, screens/session)
  - Search by user email / vehicle / device id
- [ ] Marketing site (Framer):
  - Home: hero, what is Caeorta, problem/solution, pilot signup form
  - Privacy policy (linked from lawyer-produced doc)
  - Terms of service (linked from lawyer-produced doc)
  - Contact / support
- [ ] Domain configured, SSL active
- [ ] Resend configured for transactional emails

### App founder
- [ ] Performance pass: React Native DevTools, profile every key screen
- [ ] Decision: stay on Victory Native or migrate to react-native-skia (budget 2 days if migrating)
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~iOS-specific issues: keyboard handling, safe area, gestures, status bar~~
- [ ] Android-specific issues: back gesture / hardware back button, keyboard insets, system bars (status + navigation), large-screen + foldable variants
- [ ] Bug bash day: one full day finding and filing bugs

### Together
- [ ] Marketing site reviewed by designer, committed

### Definition of done — Week 9
- Public marketing site live
- Internal admin tool operational
- Mobile app performant

---

## Week 10 — Build infrastructure, store setup

### Platform founder
- [ ] EAS Build profiles: development, preview, production
- [ ] EAS Update channels: preview, production
- [ ] App icons (all resolutions), splash screens
- [ ] App store assets:
  - ~~iPhone screenshots (6.7", 6.5", 5.5")~~ **DEFERRED (post-pilot)**
  - ~~iPad screenshots or declare iPhone-only~~ **DEFERRED (post-pilot)**
  - Android phone + tablet screenshots
  - Short + full descriptions, keywords, category
  - Privacy policy URL
  - Support URL
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~Apple App Store Connect: app record, bundle ID, app icon, TestFlight internal group with 10 pilot Apple IDs, Encryption/IDFA compliance answers~~
- [ ] Google Play Console:
  - App record, package name
  - Internal Testing track with 10 pilot Google accounts
  - Privacy + data safety form
- [ ] Document signing keys in 1Password (losing Google's = lose Play Store forever)

### App founder
- [ ] Final QA on TestFlight build with real device
- [ ] Document known issues for pilot users
- [ ] Sentry release tracking with sourcemaps via EAS
- [ ] PostHog events configured for key user actions

### Together
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~Submit first TestFlight build (24h review typical)~~
- [ ] Submit first Play Internal Testing build

### Definition of done — Week 10
- App installable on real devices via TestFlight + Play Internal

---

## Week 11 — Pilot onboarding readiness

### Both
- [ ] Pilot onboarding pack:
  - Welcome email template (via Resend)
  - Device installation guide PDF with photos for common car models
  - "First 7 days" expectation guide
  - WhatsApp Business number + pilot group
  - How to give feedback guide
- [ ] Weekly check-in template: 15-min structured interview script
- [ ] Internal runbook: what to do when X breaks (device offline > 24h, app crash, wrong diagnostic, user wants out)
- [ ] **Final integration test with AI agent project:** if the agent's eval suite isn't passing baseline scenarios, pilot is not ready. This is the gate.

### Definition of done — Week 11
- Pilot can begin
- TestFlight + Play Internal Testing live
- Onboarding materials ready
- Support process documented

---

## Week 12 — Buffer / hardening / launch

This week will not go as planned. Plan it as buffer.

Things that always happen:
- Apple Internal Testing requires per-tester email verification
- One device works on workbench but fails in a car
- A bug only shows up at midnight when a date boundary crosses
- Designer comes back with "small changes" touching many components
- One Android model nobody heard of crashes the app

Do not fill this week with new features.

- [ ] Fix bugs from final testing
- [ ] Iterate on Apple/Google rejections if they happen
- [ ] **DEFERRED (post-pilot, Android-only v1):** ~~Apple Sign-In integration if Apple's review demands it~~
- [ ] First pilot device installed in a real car
- [ ] Daily check-ins with first 2-3 pilot users
- [ ] Capture friction for v1.1 backlog

### Definition of done — Week 12
- Pilot is live with real users in real cars
- Real-world data flowing
- Founder team is in operational mode, not build mode

---

## Operational rhythms during the build

### Daily
- 15-min standup at fixed time
- Push at least one PR per day
- Check Sentry for new crashes

### Weekly (Friday)
- 60-min retro
- Review GitHub Issues; close stale
- Review burndown; update this plan honestly
- Weekly DB backup taken (manual pg_dump until paid Supabase tier)
- PostHog usage review (after pilot starts)

### Monthly
- ADR review — write up anything decided this month
- Cost review: Supabase, Claude API, Vercel, EAS minutes
- Blind spot scan per Caeorta OS Section 15

### Per-PR
- Lint, typecheck, tests via GitHub Actions
- Sulaiman reviews PRs in the web UI; Muhammed merges after approval
- Squash merge
- EAS preview auto-built for mobile PRs

### Per-deploy
- Web auto via Vercel
- Mobile JS-only via EAS Update
- Mobile native via EAS Build → EAS Submit
- Tag every release (`v0.1.0`, `v0.2.0`)
- Sentry release tracking active

---

## Plan revision log

When this plan changes, log it here with date and reason. Don't pretend the original plan was always what's happening.

- 2026-06-19 — **Week 1 reconciliation.** DoD: 3/5 fully done (Muhammed runs the codebase locally; app logs in via email OTP against dev; CI green on a trivial PR — PR #18), 2/5 partial (Supabase: dev has all 5 migrations + seed + RLS, prod still unpromoted; AI Agent Contract v0 exists but is unmerged and not yet shared). Slipped into Week 2 (see "Carry from Week 1"): prod migration promotion + Dashboard OTP config, `agent_role` migration, `devices` column-scope migration, AI-contract sharing + weekly-sync invite. Slipped working-agreement items (founder actions, not code): designer working session, Figma component-system confirmation, daily-sync + Friday-retro calendar events, GitHub Issues + project board. Nothing was silently dropped. Note: Sulaiman's Platform track ran ahead to Week 5 (Edge Functions, admin dashboard, Vault, sync pipeline) — those weeks' work is logged in the workdiary's Platform-track entries.
- 2026-06-19 — **Execution model clarified mid-Week-1.** Reading B (Muhammed sole code author; Sulaiman reviews-only and owns Platform-area decisions) made explicit via Prompt 0 in session 4. Reflected in `CLAUDE.md`, `docs/01`, `docs/02`, `docs/04`, `docs/08`, `workdiary`, `conventions.md`.
- 2026-06-19 — **Auth decision corrected.** Email magic link v1 → Email OTP (code-only) v1. `CLAUDE.md` fixed session 10; `docs/03` fixed session 11; this revision logs the change in the Action Plan's Week 1 deliverables + DoD.
- 2026-06-19 — **Stack version bump.** Scaffolders drifted past the doc floors; accepted Expo SDK 56 (not 53), Next.js 16 (not 15), TypeScript pinned 5.9.3 monorepo-wide. Documented in `docs/03` and `conventions.md`. (No "SDK 53"/"Next 15" literals appear in the week-by-week deliverables, so no per-week text changes were needed here.)
- 2026-06-19 — **Prompt 8 (admin scaffold) cut from Week 1.** Admin work properly belongs to Week 3 per the original plan, and Sulaiman built the Week 3 admin dashboard (his session 7). Cut from Week 1 scope.
