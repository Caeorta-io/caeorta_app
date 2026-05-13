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

**Status:** Active. Monitor weekly.

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

**Status:** Active.

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

## R14: Two founders' coding styles diverge, codebase becomes inconsistent

**Risk:** Different patterns, conventions, file structures emerge between Platform and App halves. Future maintenance is harder.

**Likelihood:** Medium

**Mitigations:**
- Shared ESLint + Prettier config (enforced in CI)
- Shared TS config
- Mutual PR review (no self-merge)
- Friday retro covers any consistency drift
- ADRs for any pattern decision worth remembering

**Status:** Active.

---

## R15: AI tools generate plausible-but-wrong code that ships unnoticed

**Risk:** Cursor and Claude Code generate code that compiles, passes tests, but has a subtle bug. Founders, learning mobile, don't catch it. Bug ships to pilot.

**Likelihood:** Medium

**Mitigations:**
- Mutual PR review (the other founder is reading too)
- Strict TypeScript, no `any` types
- Zod schema validation at boundaries (DB ↔ app, API ↔ UI)
- Sentry catches runtime errors fast
- Pilot itself is the final test
- For especially critical paths (auth, device pairing, payments-later), write unit tests even if other code is tested less

**Status:** Active.

---

## R16: Force-update mechanism is a single point of failure

**Risk:** A bug in the `app_versions` check itself prevents the app from launching or prevents force updates from working. Pilot users brick.

**Likelihood:** Low but catastrophic

**Mitigations:**
- The version check has a hard timeout (3 seconds); if it fails, app launches anyway
- Manual rollback via EAS Update is documented and tested
- Two founders both have access to publish updates
- Don't introduce force-update logic until Week 8 when it's been tested

**Status:** Active. Specifically watched.

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

## How to use this document

- **Weekly retro:** Walk this list. Any risks worsening? Any new ones to add? Any to resolve?
- **When something breaks:** Add it as a new risk if not already present, with mitigation.
- **When mitigation works:** Note it. Mitigations that worked are templates for future risks.
- **When mitigation fails:** Note that too. Useful for honesty about what we learn.
