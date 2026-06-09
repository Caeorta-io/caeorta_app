# Tech Stack

This is the **fixed, decided** tech stack for Caeorta v1. These are not options to be re-evaluated — they were chosen deliberately for this team, this product, this timeline.

If a future conversation proposes changing one of these, the burden is on the proposer to justify why, not on the existing choice to defend itself.

## Core stack table

| Layer | Tool | Notes |
|---|---|---|
| Package manager | pnpm 9+ | Workspaces are first-class |
| Mobile framework | Expo SDK 56+ | Bare React Native is not needed |
| Mobile router | expo-router | File-based, mirrors Next.js mental model |
| Mobile styling | NativeWind 4 | Tailwind for React Native |
| Web framework | Next.js 16 (App Router) | Standard choice |
| Web styling | Tailwind 4 + shadcn/ui | Standard choice |
| Web hosting | Vercel | Native fit for Next.js |
| Backend platform | Supabase | DB + Auth + Realtime + Storage + Edge Functions |
| Database | Postgres (via Supabase) | Includes pgvector, pg_cron extensions |
| Auth | Supabase Auth | Email magic link v1; phone OTP v2 |
| Realtime | Supabase Realtime | For live mode + diagnostic_outputs subscriptions |
| File storage | Supabase Storage | Firmware binaries, user uploads if any |
| Edge functions | Supabase Edge Functions (Deno) | Device pairing, OTA, push triggers |
| Forms | react-hook-form + zod | Validation parity across mobile + web |
| Client state | Zustand | Lightweight, avoids Redux complexity |
| Server state | TanStack Query | Caching, retry, optimistic updates |
| Charts | Victory Native (v1) | Re-evaluate to react-native-skia in Week 9 if perf demands |
| Icons | lucide-react-native + lucide-react | Same icon set both platforms |
| Animation | react-native-reanimated 4 | Industry standard; uses react-native-worklets |
| QR scanning | expo-camera | Built-in |
| Wi-Fi provisioning | react-native-wifi-reborn | Android-first; iOS limitations documented |
| Push notifications | Expo Notifications + Expo Push API | APNs + FCM under the hood |
| Maps (admin only) | MapLibre GL JS | Free; Mapbox if MapLibre limitations bite |
| Marketing site | Framer | Outside the monorepo; Framer-hosted |
| Email (transactional) | Resend + React Email | Modern, simple |
| Error tracking | Sentry | Free tier for v1 |
| Product analytics | PostHog | Free tier; events + session replay |
| LLM observability | Langfuse | AI agent project sets up; we have read access |
| Internationalization | i18next + expo-localization | Set up week 1 even if English-only initially |
| Testing | Vitest (unit), Playwright (web E2E), Maestro (mobile E2E) | Keep tests light in v1 |
| Linting | ESLint with shared config | Strict; CI fails on errors |
| Formatting | Prettier | Auto-format on save |
| Type generation | supabase gen types typescript | Auto-sync DB → TS types |
| CI/CD | GitHub Actions | Free for our scale |
| Mobile build | EAS Build | Cloud builds for iOS + Android |
| Mobile submit | EAS Submit | Auto-submit to TestFlight + Play Internal |
| OTA mobile updates | EAS Update | JS-only updates without store review |
| Web deploy | Vercel automatic | Push to main → deploy |
| Editor | VS Code | Free, ubiquitous, standard |
| AI coding | Claude Code (VS Code extension + CLI) | One product, two interfaces; share session history |
| Optional UI scaffolding | v0 | Useful occasionally; Claude Code can also scaffold |
| Source control | GitHub | Organization account, not personal |
| Secret storage | 1Password (or similar) | API keys, signing certs |

## Tools explicitly NOT used (and why)

People will suggest these. Here's why we don't use them:

### LangChain / LlamaIndex
**Why not:** Over-abstracted for what we need. The AI agent project uses the Anthropic SDK directly. This project doesn't call LLMs at all — it consumes their outputs from Supabase. No need for an agent framework here.

### Pinecone / Weaviate / Qdrant (dedicated vector DBs)
**Why not:** Postgres with pgvector handles embeddings up to millions of rows on Supabase. Adding a dedicated vector DB adds a second system, another auth model, another bill, another failure mode. Revisit at >1M rows of embedded content.

### Redux / MobX
**Why not:** Zustand is sufficient for our state shape. The boilerplate cost of Redux isn't justified at our scale.

### Styled-components / Emotion
**Why not:** NativeWind (mobile) and Tailwind (web) cover styling. Adding a CSS-in-JS library creates parallel systems.

### Stripe / RevenueCat
**Why not:** No paid tier in v1. Pilot is free. Defer until pilot validates demand.

### Auth0 / Clerk / Kinde
**Why not:** Supabase Auth covers our needs for v1. Third-party auth adds a vendor, another bill, another integration point. Revisit when feature gaps appear (they may, for things like SSO, advanced MFA, audit logging).

### Tamagui / Solito
**Why not:** Cross-platform component sharing between Next.js (admin) and Expo (mobile) isn't needed yet. Admin is internal-only and the UIs are very different. Revisit when we have a user-facing web app, which is post-MVP.

### Turborepo / Nx
**Why not:** pnpm workspaces is sufficient for two apps + a few packages. Turborepo's caching matters at larger team scale. Adding it now is yield-less complexity.

### Firebase
**Why not:** Already chose Supabase. Firebase is fine, but NoSQL bites you when you need joins, and we have a relational data shape (users → vehicles → telemetry → drives → diagnostics).

### Reach Native CLI / bare React Native
**Why not:** Expo's managed workflow is meaningfully easier and Expo's EAS Build / Submit / Update tooling is a big win for a small team. The historical "Expo is limited" critique is largely outdated; for any native module we need, dev client builds are an option.

### Flutter / Dart
**Why not:** See `01_Project_Identity.md`. AI tooling is better at RN; Supabase JS SDK is first-class; code-share path with Next.js admin; team won't learn Dart faster than JS.

### n8n / Make / Zapier for workflow orchestration
**Why not:** Visual workflow tools become black boxes. Edge Functions + database triggers cover our needs with code that's debuggable and version-controlled.

### Datadog / New Relic / generic APM
**Why not:** Sentry + PostHog + Langfuse cover the observability layers we need. Generic APM is overkill at our scale and doesn't give us LLM-specific visibility (which Langfuse does).

### Cursor
**Why not:** Earlier in planning we considered Cursor (it was the most polished
AI editor through 2025). With Claude Code's VS Code extension now generally
available, the case for Cursor has weakened:
- Cursor is $20/month per founder; Claude Code extension uses your Anthropic
  account directly with no separate subscription
- Same Claude models in both, but Anthropic-first integration means new Claude
  Code features (checkpoints, sub-agents, hooks) reach VS Code first
- VS Code is more widely used and standard; lower onboarding cost for any
  future contractor or hire
- Cursor remains a fine tool; it's not the wrong choice, just not the right one
  for an Anthropic-stack project where the cost saves nothing

If you ever need to switch, your CLAUDE.md and .claude/ config travel with the repo.

## Handling scaffolder drift between doc and reality

The stack table in this document records the *intent* and the *floor* (e.g., "Expo SDK 53+" means "53 or later, where '+' is a forward-permissive operator"). When the actual scaffolder version at the time of `pnpm dlx create-*` is meaningfully ahead of what this doc records, accept the newest stable major (e.g., session 9 took Expo 56 and Next.js 16 rather than pinning to 53/15). Update the floor in this doc in the same session that does the scaffolding, and note the bump in the workdiary entry.

Do not pin to a specific version in this doc unless a known incompatibility forces it. Floor-only with "+" means "this or later."

## Stack additions to plan for (post-MVP, not now)

These are not in v1 but will likely come:

- **Stripe** — when paid subscription tier is built
- **Phone OTP via Twilio or Vonage (through Supabase Auth)** — for GCC commercial launch
- **Arabic + Hindi translations** — for GCC and India commercial launch
- **Tamagui or shared UI package** — if we build a user-facing web product
- **Dedicated time-series DB** — if telemetry volume outgrows Postgres with TimescaleDB extension
- **Customer support tooling (Intercom / Crisp / etc.)** — when pilot graduates to commercial

## Why this stack is "the ultimate pro combination" for Caeorta

The founder asked for "the ultimate pro combination" originally. The honest answer: there is no universal one. For *this team, this product, this timeline,* the stack above is the ultimate pro combination because:

1. **It minimizes the number of new things to learn simultaneously.** Two embedded engineers learn JS/TS, Expo, and Supabase — three things — not five.
2. **It maximizes AI-coding-tool effectiveness.** Cursor and Claude Code are best on this stack.
3. **It has the lowest friction for shipping iOS + Android in 12 weeks.** Expo + EAS removes most of the historical native-build pain.
4. **It scales to commercial launch.** Nothing in this stack is a "toy" or "MVP-only" choice that requires rewriting when you have 1,000 users.
5. **It's open enough to swap pieces later.** Supabase wraps Postgres, which is portable. Expo can eject. Next.js runs anywhere. We are not locked into anything painful.

The stack the founder *won't* find by Googling "best startup stack 2026" is the one that's right *for them*. The list above is that.
