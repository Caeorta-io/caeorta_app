# 12-Week Action Plan

This is the canonical build plan. It is **living** — when reality diverges, update this file (with the date of the update noted) rather than letting the doc and reality drift apart.

## Founder role split

Decide which founder owns which role and commit to it.

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

- Repo live at github.com/Caeorta-AI/caeorta_app, working directory
  `C:\Code\caeorta_app` (both founders cloned)
- CLAUDE.md at repo root; all 11 project knowledge files mirrored to `docs/`
- `docs/workdiary.md` is the living log of decisions, tool inventory, and
  per-session entries — read latest entry at session start
- Founder split decided: Muhammed Raslan (App), Sulaiman Shiyas Ali (Platform)
- All external accounts created and in 1Password "Caeorta" vault:
  GitHub org, Supabase (dev+prod, ap-south-1), Vercel, Expo org,
  Anthropic Console (dev+prod keys), Sentry, PostHog, Cloudflare Registrar
  (domain registered), Google Workspace, Resend, Framer
- Founder agreement (YC template) signed
- Both founders' local dev environments fully set up

Deferred 2 weeks (funds reason, does not block Week 1-6):
- Apple Developer enrollment ($99/year) — blocker for Week 7 iOS push
  and Week 10 TestFlight; pay by Week 3 to have activation buffer
- Google Play Console ($25) — blocker for Week 10 Play Internal Testing

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

### Tools installed on both founders' machines

- [ ] Node 22 LTS, pnpm 9+ (Node 20 is EOL as of 2026-04; current Active LTS is 22)
- [ ] VS Code (free, code.visualstudio.com)
- [ ] Claude Code extension from VS Code Marketplace (official one by Anthropic)
- [ ] Signed in with Anthropic account
- [ ] Expo CLI
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
- [ ] Implement email magic link login screen
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
- Both founders can run the codebase locally
- Both Supabase projects exist with v1 schema applied
- App can log in via magic link against dev Supabase
- AI Agent Contract doc exists and is shared with agent project
- CI runs green on a trivial PR

---

## Week 2 — Device pairing and provisioning

Harder than it sounds because it touches firmware, Supabase, and the app simultaneously.

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
- [ ] Wire QR + manual code paths to `pair_device`
- [ ] Wire Wi-Fi entry to `submit_wifi_credentials`
- [ ] Handle all error cases: invalid code, already-claimed, network failure, camera denied
- [ ] Persist auth state with expo-secure-store

### Together
- [ ] End-to-end test with simulated device (Postman flow): onboard a user, claim a device, see device row updated
- [ ] Sync with hardware/firmware project: confirm the device-side implementation will use the Edge Functions we built

### Definition of done — Week 2
- A new user can open the app, sign in, scan a QR, enter Wi-Fi creds
- The device gets claimed in DB
- The auth and credential paths are real and tested

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

### Both, splitting screens
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
- Push at least one PR per founder per day
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
- One founder reviews other's PR
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

- _(empty — first revision will be logged here)_
