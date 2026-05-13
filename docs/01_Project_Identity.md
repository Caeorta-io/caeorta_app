# Project Identity

## What Caeorta is

Caeorta is a predictive AI + agentic copilot + community platform for modified and tuned cars, accessed via the OBD-II port. The product has three layers (predictive maintenance AI, agentic AI copilot, community platform). This project (the app + web build) is one slice of a larger product effort.

Original name was ΔFactor; pitch deck may still use that. Treat "Caeorta" as current.

## Founders

Two founders: Muhammed Raslan Thalassery and Sulaiman Shiyas Ali. Both embedded systems / mechanical engineering backgrounds. Both based in India. Both share the same Claude account — address as "Caeorta founder" in conversation, do not assume which of the two you are speaking to.

Markets: GCC (UAE / Saudi Arabia) primary, India secondary.

## What this project builds

The **mobile app, admin web dashboard, marketing site, and the Supabase backend pieces those touch** for the Caeorta v1 product. Specifically:

1. **Mobile app** (Expo, React Native, TypeScript) — the primary user interface. Lets pilot users see their car's last drive, view live data on demand, see AI diagnostic outputs, give feedback.
2. **Admin web dashboard** (Next.js on Vercel) — internal operational tool for the two founders to monitor pilot devices, debug issues, see aggregate signals.
3. **Marketing site** (Framer) — public face for pilot recruitment, App Store / Play Store linking (privacy policy URL, support URL).
4. **Backend in Supabase** — Postgres schema, RLS policies, Edge Functions, Realtime channels, Auth, Storage. The parts of the backend that the app + admin touch directly are owned here. (The parts that the AI agent project touches are owned there; see `06_AI_Agent_Contract.md`.)

## What this project does NOT build

These are explicitly handled in other projects or other contexts:

- **Hardware / firmware / PCB / OBD-II protocol work** — separate hardware project. This project consumes the data the device sends, defines the interface the device writes to, but does not design or build the device.
- **AI agent internals** — separate AI agent project. The agent is a service that reads telemetry/DTCs from Supabase and writes diagnostic outputs back. The internal logic, prompts, evals, model selection live in that project. This project handles the *interface* and how the app *renders* what the agent produces.
- **Peaq blockchain / DePIN integration** — parallel backend track, not this project. Will eventually integrate but deliberately deferred. The app does not currently show wallets, tokens, claims, or balances.
- **Legal, ToS, privacy policy drafting, regulatory analysis** — handled post-MVP separately. The marketing site will need a privacy policy URL and ToS URL; those will be produced by a lawyer separately and linked, not drafted here.
- **Pilot user logistics, recruitment, customer support process, device shipping** — handled separately. This project produces the *software* the pilot uses, not the *programmatic* operation of the pilot.
- **Caeorta business strategy, funding, go/no-go decisions** — handled in the Caeorta Startup OS project.

If a question crosses into these areas, ask which project should own it before answering.

## Stage when this project starts

- **Week 1 starting 2026-05-18.** Repository exists at
  github.com/Caeorta-AI/caeorta_app, both founders cloned locally.
- **Section 0 closed.** Accounts created, founder agreement signed,
  tooling set up. See `08_12_Week_Action_Plan.md` Section 0 status.
- **Designer is engaged.** Figma in progress; kickoff brief drafted,
  90-min working session scheduled for Week 1.
- **Hardware prototype V1 exists** but is being redesigned (smaller MCU,
  no screen).
- **AI agent is being built in parallel** in its separate project.
  Contract v0 review session scheduled with that project for Week 1.
- **No pilot users yet.** Target is 10 friendly enthusiasts in India for
  the first pilot.

## Key product design decisions (already made, do not re-litigate)

These decisions were made through careful conversation and should not be revisited unless the founder explicitly asks to revisit them.

### Architecture decisions

- **Mobile framework: Expo (React Native) with TypeScript.** Not Flutter. Reasoning: AI coding tools (Cursor, Claude Code) are better at React Native; Supabase JS SDK is first-class; future code-share with Next.js admin; team is JS-learnable, not motivated to learn Dart.
- **Backend: Supabase.** Not Firebase, not custom Node, not AWS IoT. Already has working ESP32 → Supabase pipeline. Postgres + Auth + Realtime + Storage + Edge Functions in one product.
- **Web framework: Next.js 15 (App Router) on Vercel** for admin dashboard. Framer for marketing site.
- **Monorepo with pnpm workspaces.** Not Turborepo, not Nx — those add tooling complexity not justified at this scale.

### Device data model

- **Device records continuously to SD card.** Online connectivity is not assumed 24/7.
- **Sync is opportunistic + user-triggerable.** Device uploads when hotspot is available; user can also explicitly trigger sync from the app.
- **Live mode is an explicit user action**, not the default. The default app experience is "your last drive" — not a real-time stream.
- **AI agent runs on completed drives**, not on live data. Triggered post-sync, not continuously.
- **Pilot connectivity is via user's phone hotspot.** 4G modules are not affordable at pilot scale. This is a deliberate pilot constraint; v2 may change.

### User identity & device pairing

- **Per-device credentials.** Each device has a unique device_secret, printed as QR code on a label. App scans QR (or manual code entry fallback) to claim the device.
- **The user never directly authenticates to Supabase as the device.** The Edge Function `pair_device` brokers the claim. Devices write via short-lived JWTs minted by a separate Edge Function.
- **Wi-Fi provisioning via SoftAP** (ESP-IDF's wifi_provisioning component). App connects to device's temporary AP, sends user's hotspot credentials, device joins user's hotspot.
- **OTA updates required.** Device polls a firmware_versions endpoint and updates if a new target version is available, with rollback protection.

### Auth (v1)

- **Email magic link via Supabase Auth.** Easiest path, works for pilot. Phone OTP added later for GCC commercial launch.
- **Apple Sign-In** added in Week 12 if Apple's review requires it (any social sign-in triggers this requirement).

### Scope decisions

- **No social / community features in v1.** Schema is designed to support them in v2 (empty tables with proper FKs), but no UI. See `10_Out_Of_Scope.md`.
- **No public App Store / Play Store release in v1.** Play Internal Testing only (Android-only; iOS deferred post-pilot), max 10 pilot users.
- **Android-only for v1 pilot.** iOS support is deferred to post-pilot. Reason: budget (no Apple Developer enrollment until funded) and team (no Mac in v1 window). Codebase stays cross-platform via Expo; what's deferred is iOS testing, signing, and submission, not code structure. Budget ~2 weeks of integration work when re-enabling iOS (Apple Developer enrollment + identity verification, Mac procurement, iOS Wi-Fi provisioning workaround, native iOS QA pass, App Store review).
- **No Stripe / payments in v1.** Defer until pilot validates demand.
- **Wi-Fi provisioning is Android-only in v1.** Subsumed by the Android-only-pilot decision above. The original Android-first rationale (iOS Wi-Fi APIs are restrictive) still applies when iOS is added post-pilot.
- **English-only UI text in v1**, but all strings via i18next so Arabic and Hindi can be added later without refactor.

## Quality bar

The founder has explicitly stated: **quality and identity of the product are non-negotiable**. Generic-feeling, template-derived, or "good enough for an MVP" outcomes are unacceptable. The 12-week timeline accommodates this; do not propose shortcuts that compromise quality to save time. If a tradeoff is needed, the founder decides.

## Tone and personality of the product (to be filled in by designer)

The designer is producing the visual identity. Once it's settled, capture:
- Reference apps the design is closest to in spirit (currently candidate: Strava, Whoop, Tesla app, Linear)
- Voice and tone for product copy
- Light / dark mode strategy
- Whether the AI agent has a persona or is anonymous

This section is a placeholder. Update when designer ships v1 of the design system.
