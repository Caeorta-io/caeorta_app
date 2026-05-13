# Out of Scope (v1)

When a feature is suggested mid-build, check here first. If it's listed here, it's already been considered and deliberately deferred — with reasoning. Don't re-litigate without new evidence.

Adding scope is the most common reason 12-week plans become 20-week plans. This document is a tool to resist that.

---

## What v1 IS

To anchor the contrast, v1 is:
- A polished mobile app (Expo, Android-only via Play Internal Testing; iOS deferred post-pilot)
- An internal admin web dashboard (Next.js on Vercel)
- A marketing site (Framer)
- The Supabase backend for the above
- A 10-user pilot launch in India

Shipped in 12 weeks at non-negotiable quality.

---

## What v1 is NOT

### Public app store releases
**Not in v1.** Play Internal Testing (Google, Android-only) only, capped at 10 pilot users. iOS deferred post-pilot (see below). Public release is a Week 13+ decision based on pilot results.

**Why deferred:** Public release commits to ongoing review cycles, public reviews, scaling, customer support load. Pilot first, public later.

### iOS in v1 pilot
**Not in v1.** Pilot is Android-only via Play Internal Testing. iOS support is deferred to post-pilot.

**Why deferred:** Two constraints aligned. (1) Budget — Apple Developer enrollment is $99/year and team funds are constrained until late in the build. (2) Hardware — no Mac on the team, and Xcode is macOS-only. The codebase stays cross-platform-compatible via Expo, so adding iOS later is a testing/signing/submission effort, not a rewrite. Budget at least two weeks of post-pilot integration work when re-enabling: Apple Developer enrollment + identity verification (can stall a week+), Mac procurement, iOS Wi-Fi provisioning workaround (iOS Wi-Fi APIs are restrictive), native iOS QA pass on every screen, App Store review. Plan for it; don't be surprised by it.

**GCC implication.** iOS share in UAE and Saudi Arabia is materially higher than in India. Android-only is appropriate for the India pilot; commercial launch into GCC will require iOS support.

### User-facing web app
**Not in v1.** The car is the product, the phone is the interface. Web is for marketing and internal admin only.

**Why deferred:** Triples the surface area for design, development, and QA. No pilot user has asked for it. Defer until commercial launch shows demand.

### Stripe / payments / subscription billing
**Not in v1.** Pilot is free.

**Why deferred:** Adds weeks of work (Stripe Checkout, Customer Portal, webhook handling, dunning, tax). Until pilot validates demand, building this is wasted effort. Add post-pilot when going commercial.

### Community / social features
**Not in v1.** Schema is designed to support these in v2 (empty `posts`, `comments`, `groups`, `events` tables exist with proper FKs) but no UI is built.

**Why deferred:** The Caeorta product vision has three layers (Predictive AI, Agentic Copilot, Community Platform). V1 builds layers 1 and 2 well; layer 3 is its own product effort. Community is the post-pilot focus.

### Phone OTP authentication
**Not in v1.** Email magic link via Supabase Auth is the only sign-in method.

**Why deferred:** GCC commercial launch will need phone OTP (email is less used there). For India pilot, email is fine. Costs money per SMS that doesn't justify itself for 10 users.

### Multi-language UI (Arabic, Hindi, etc.)
**Not in v1.** English only. But all UI strings are wired through `i18next` from Week 1, so adding translations later is just translation work, not refactor.

**Why deferred:** Translation cost and QA overhead. Pilot users speak English. GCC and India commercial launches will localize.

### Peaq blockchain integration in the app
**Not in v1.** No wallets, no token balance display, no claim buttons, no DePIN UX.

**Why deferred:** Peaq is a parallel backend track owned in a separate project, currently scoped to *technical validation only* (can we write attestations to the chain). User-facing token features are a v2 product decision. The app does not need to know Peaq exists.

### Apple Watch / Wear OS companion apps
**Not in v1.** No watch app.

**Why deferred:** Niche use case. Each platform is ~3 weeks of work. Defer until clear demand.

### CarPlay / Android Auto integration
**Not in v1.**

**Why deferred:** CarPlay requires Apple entitlements that are hard to get for non-OEM developers. Android Auto is restrictive for non-media/messaging apps. Either is months of work and platform-bureaucracy fights for unclear pilot value.

### Real-time multi-user features (sharing with mechanics, friends)
**Not in v1.**

**Why deferred:** Adds permissions complexity, RLS complexity, UX complexity. The pilot is single-owner cars. Post-pilot feature.

### Marketplace (parts, services)
**Not in v1.** Listed in the original product vision but explicitly post-pilot.

**Why deferred:** Marketplace is a product unto itself (sellers, payments, disputes, ratings). Not a feature; a separate product.

### Track day / racing modes
**Not in v1.**

**Why deferred:** Niche use case even within the modified-car community. Build after demand is shown.

### OBD scan tool replacement features
**Not in v1.** The app is not a generic OBD-II scanner; it's the Caeorta product.

**Why deferred:** Becoming a Torque Pro / OBD Fusion competitor dilutes the product. Caeorta is differentiated by the AI agent and predictive maintenance, not by raw OBD data display. The vehicle detail screen surfaces some live data; that's enough.

### Vehicle history reports / VIN-based lookups
**Not in v1.**

**Why deferred:** Requires integrations with vehicle history databases (varies wildly by country). Not core to pilot value.

### Calendar / reminder integration
**Not in v1.** No "remind me to check this in 2 weeks" features.

**Why deferred:** Adds platform integration complexity (iOS Calendar, Google Calendar). Push notifications cover the "tell me something" use case.

### Voice / audio features
**Not in v1.** No "Hey Caeorta, how's my car" voice commands.

**Why deferred:** Voice UX is its own discipline. Defer.

### Insurance integrations
**Not in v1.** Even though the Caeorta business model envisions data sales to insurance companies, no insurance-specific app features.

**Why deferred:** B2B integration work, separate from consumer app. Likely a post-MVP project entirely.

### Service-history / maintenance-log features
**Not in v1.** The AI agent generates diagnostic outputs; the user doesn't manually log services in v1.

**Why deferred:** Add when the AI agent learns to consume manual logs. Reasonable v2 feature.

### Custom dashboards / widgets
**Not in v1.** The app's screens are fixed.

**Why deferred:** User-configurable dashboards are a big feature that 10 pilot users won't request. Maybe v2 power-user feature.

### Photo / image features
**Not in v1.** No photo uploads, no "snap a photo of the issue."

**Why deferred:** Adds storage cost, moderation concerns, complexity. The AI agent's analysis is on telemetry, not images.

### Social sharing
**Not in v1.** No "share my drive on Twitter / Strava."

**Why deferred:** Community-adjacent; defer with community features.

### Achievement / gamification features
**Not in v1.**

**Why deferred:** Risk of feeling toy-like. Quality bar is high; gamification done poorly cheapens the product.

### Multiple vehicles per user
**Schema supports it (v1 won't enforce 1:1).** UI optimizes for one vehicle per user.

**Why deferred for UI:** Pilot users have one car each in scope. Multi-vehicle UX (vehicle switcher, separate notification routing) is post-pilot.

### Multi-tenant / fleet features
**Not in v1.**

**Why deferred:** Fleet is a separate product line (different sales motion, different pricing, different features). Eventually a separate product effort.

### Custom AI agent prompts / user-tunable agent
**Not in v1.** The AI agent has one personality and one set of behaviors.

**Why deferred:** Power-user feature. Adds complexity to the agent project. Post-pilot.

### Direct mechanic / repair shop integration
**Not in v1.** No "book a service" or "find a mechanic near you."

**Why deferred:** Marketplace-adjacent; partnership-dependent. Post-pilot.

### Data export / portability features
**Not in v1.** No "download all my data" button.

**Why deferred:** GDPR-style requirements will eventually require this. Build when entering EU markets or when first user requests it.

### App white-labeling / enterprise customization
**Not in v1.**

**Why deferred:** Different business line. Don't start.

### Comprehensive analytics for users
**Not in v1.** The drive detail screen shows charts; aggregate analytics ("your driving over 6 months") are deferred.

**Why deferred:** Build after pilot reveals what users actually want to see.

### Apple Sign-In
**Conditional.** Not in v1 unless Apple's App Store review requires it.

**Why deferred but planned:** Apple requires Sign-In with Apple if any other social sign-in is offered. We're not offering Google/Facebook in v1, so it may not be required. Plan for adding in Week 12 if reviewer demands.

### Dark mode
**Decided by designer.** Likely yes given car-app context (night driving), but follows designer's call.

**Note:** Use semantic color tokens from Week 1 so dark mode is a re-skin, not a refactor.

### Tablet optimization
**Not in v1.** App targets phones. Tablet support is "it runs but isn't optimized."

**Why deferred:** Pilot users use phones. Build tablet layout when needed.

### Accessibility beyond minimum
**Minimum in v1.** Dynamic font scaling, screen reader labels, color contrast — yes (Week 8). Beyond that — no.

**Why deferred:** Comprehensive accessibility is its own project. Minimum is a quality floor; beyond is post-pilot.

---

## How to use this document

When a "we should also build X" suggestion arises:

1. **Check this document.** If X is listed, X has been considered.
2. **Has anything changed?** If the reasoning still holds, reaffirm the deferral.
3. **If genuinely new evidence has emerged** (e.g., a pilot user blocking on X), then debate it. But default to deferral.
4. **If a new "not in v1" decision is made**, add it here with reasoning.

The list grows. That's good. It's the institutional memory that says "yes, we thought about that, here's why we didn't do it."

---

## When this list is wrong

This list is not a moral commitment to never build these things. It's a v1 scope guard.

When the founder decides to bring something in scope:
- Document why the decision changed
- Add it to the action plan with a realistic time estimate
- Decide what comes out of scope to make room (the 12-week budget is fixed)
- Update this file (move from out-of-scope to in-scope, with date)

The honest cost of adding scope is rarely "we'll just work harder." It's "something else doesn't ship at v1 quality." Make that tradeoff explicit.
