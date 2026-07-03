# Caeorta — Frontend Build Report (Project OS)

**Product:** Caeorta — predictive-maintenance AI for modified & tuned cars
**Surface:** Android mobile app (React Native / Expo), v1 pilot
**Design file:** Figma `8bf8yT1Cvun5fqf3qp2Max`
**Theme:** Dark-primary (Light mode built as a re-skin, not a refactor)
**Type system:** Geist / Geist Mono
**Status:** Complete v1 surface — foundations, component system, all core + secondary screens, help layer, and app states. No dead-end links.

> This document is the operating reference for the Caeorta frontend. It captures *what was built, why, and how it fits together* so design, engineering, and product can work from one source of truth. Section 9 is the Figma node-ID index; Section 10 is the implementation gotchas engineering should read first.

---

## Table of contents

1. Product context
2. Design principles & locked decisions
3. Technical constraints
4. Design system foundations
   - 4.1 Color — primitives
   - 4.2 Color — semantic tokens (Dark / Light)
   - 4.3 The temperature-encodes-urgency system
   - 4.4 Typography
   - 4.5 Spacing, radius, elevation
   - 4.6 Iconography & motion
5. Component library
6. Screen inventory
7. Navigation & link graph
8. Voice & copy guidelines
9. Figma structure & node-ID index
10. Implementation notes & gotchas
11. Accessibility
12. Out of scope (v1)
13. Open items & next steps
14. Decisions log

---

## 1. Product context

Caeorta is a predictive-maintenance platform for modified/tuned petrol cars (aftermarket ECUs, turbo setups). A small OBD-II device plugs into the car, records every drive to an SD card, and syncs opportunistically over the owner's phone hotspot. An AI agent analyzes each completed drive and surfaces plain-English diagnostic insight — *the one thing worth the owner's attention*, the way a knowledgeable friend would after looking at the data.

**Target user:** Car enthusiasts in India with modified petrol engines. Competent, technical, allergic to hand-holding and baby-talk.

**Core thesis:** This is an *interpretation* product, not an OBD dashboard. Depth of raw data is secondary to clarity of insight. It deliberately is **not** Torque Pro.

**v1 scope:** 10-person friendly pilot, Android-only. Mobile app is the only user-facing surface.

**Reference apps & how they were weighted:**
- **Whoop** — structural anchor: insight-over-data, the daily readout pattern.
- **Strava** — structural anchor: the drive-as-activity record (maps to Drives list / Drive detail).
- **Tesla** — *concept* reference only (vehicle-as-hero, live/connection status). Not an execution reference.
- **Linear** — craft-and-restraint bar. Not a layout model (it's desktop-dense).

---

## 2. Design principles & locked decisions

These are settled. Treat them as constraints, not preferences.

1. **Temperature encodes urgency.** Cool = fine, warm = attend. The severity ladder is a heat ramp: neutral-cool `info` → amber `warning` → red `critical` (the "redline"). See §4.3.

2. **`insufficient_data` sits off the ladder.** It is honesty, not a problem. Neutral tone + dashed treatment, never a severity color. Reads as "more data needed."

3. **System/connection/agent states never use severity colors.** Sync failures, offline, agent errors, rate-limits all render in neutral or brand-cyan only. A sync failure must never visually resemble an engine fault. This is a hard rule.

4. **Dark-primary.** Enthusiast tool, often used near/in the car, glanceable numerals favor it. Light mode is built (semantic tokens have a Light mode) but Dark is the design target.

5. **The agent is a voice, not a character.** No name, no avatar, no mascot. Identity lives entirely in the writing and the diagnostic-card treatment. Its defining trait is *calibrated honesty* — which is why the `insufficient_data` state matters so much.

6. **Numerals are the instrument-cluster motif.** Character comes from tabular Geist Mono telemetry values, not a decorative display face that would fight a data-dense utility.

7. **Critical = calm specificity.** The full-screen takeover *is* the urgency signal, so the content inside stays calm. Lead with the specific finding ("Oil pressure dropped under load"), not a "CRITICAL" label. Always give a next step. Red is a scalpel on the finding, not a bath over the screen. One acknowledgment, not a gauntlet.

8. **Live mode is prominent but secondary.** Full-width, present, but tinted-and-outlined — never a solid CTA competing with diagnostics.

9. **Single-vehicle now, switcher-ready.** v1 is one vehicle. The Home header carries a chevron affordance so a future vehicle switcher can attach without a redesign. (Multi-vehicle UI is out of scope for v1.)

10. **Component-system discipline.** Auto-layout throughout, real components + variants (not duplicated frames), every color/space/radius bound to a token. This materially affects build speed.

---

## 3. Technical constraints (hard, from the build stack)

- **Platform:** React Native via Expo, Android-only. No iOS conventions.
- **No CSS grid.** Flexbox only. (Metric grids are built as flex rows-of-two.)
- **No hover.** Touch-only. Every interactive element needs a pressed/active state. **Pressed opacity token: 0.72.**
- **Min touch target: 48dp** — including icon-only buttons. Some visual controls are drawn smaller (e.g. 44px feedback buttons) but the *tap target* must pad to 48dp in build.
- **Dynamic font scaling** must be supported. Type scale uses generous line-heights; layouts reserve space and use flexible containers. Test against "what if this text is 30% longer."
- **Charts:** Victory Native. Designs use standard chart shapes only (line/area) — no bespoke chart interactions. Mocked charts in Figma are filled-area approximations; build them as Victory Native line/area charts.
- **Icons:** lucide-react-native. All icons in the file are lucide-style line icons (2px stroke, round caps/joins).
- **RTL:** not needed v1 (English-only), but flex-direction properties preferred over hardcoded left/right where free.

---

## 4. Design system foundations

Built as **96 Figma variables** across three collections + **12 text styles**.

- Collection `primitives` — raw ramps (single mode "Base").
- Collection `semantic` — two modes: **Dark** (default, aliases primitives) and **Light** (re-skin values).
- Collection `scale` — spacing, radius, and type size/line-height floats (single mode).

> **Variable naming rule:** Figma variable names cannot contain `.` — the half-step spacing token is `space/0-5`, not `space/0.5`.

### 4.1 Color — primitives

| Token | Hex |
|---|---|
| `slate/950` | #0B0F14 |
| `slate/900` | #101720 |
| `slate/850` | #141A21 |
| `slate/800` | #1C242E |
| `slate/700` | #2A343F |
| `slate/600` | #3A4650 |
| `slate/500` | #586573 |
| `slate/400` | #6B7885 |
| `slate/300` | #8CA0B3 |
| `slate/200` | #A5B0BC |
| `slate/100` | #D3DAE1 |
| `slate/050` | #F2F5F7 |
| `boost/600` | #1B8FAD |
| `boost/500` | #2BB3D4 *(brand cyan — "Caeorta blue")* |
| `boost/400` | #54C6E2 |
| `boost/300` | #8ADAEC |
| `boost/tint` | #0F2933 |
| `amber/600` | #C9861F |
| `amber/500` | #E8A73C *(warning)* |
| `amber/400` | #F1BE6A |
| `amber/tint` | #2B2311 |
| `redline/600` | #C43B41 |
| `redline/500` | #E5484D *(critical)* |
| `redline/400` | #F06E72 |
| `redline/tint` | #2B1416 |
| `green/500` | #46A758 *(success)* |
| `green/tint` | #122016 |

### 4.2 Color — semantic tokens (Dark / Light)

Dark aliases primitives; Light carries re-skin hexes. **Always bind to semantic tokens in build — never raw hex.**

| Semantic token | Dark (→ primitive) | Light (hex) |
|---|---|---|
| `surface/canvas` | slate/950 #0B0F14 | #F5F7F9 |
| `surface/primary` | slate/850 #141A21 | #FFFFFF |
| `surface/elevated` | slate/800 #1C242E | #FFFFFF |
| `surface/sunken` | slate/900 #101720 | #EDF1F4 |
| `text/primary` | slate/050 #F2F5F7 | #0B0F14 |
| `text/secondary` | slate/200 #A5B0BC | #3A4650 |
| `text/tertiary` | slate/400 #6B7885 | #586573 |
| `text/disabled` | slate/600 #3A4650 | #A5B0BC |
| `text/on-accent` | slate/950 #0B0F14 | #FFFFFF |
| `border/default` | slate/700 #2A343F | #D3DAE1 |
| `border/strong` | slate/600 #3A4650 | #A5B0BC |
| `border/subtle` | slate/800 #1C242E | #EDF1F4 |
| `brand/default` | boost/500 #2BB3D4 | #1B8FAD |
| `brand/pressed` | boost/600 #1B8FAD | #166F87 |
| `brand/tint` | boost/tint #0F2933 | #E4F4F8 |
| `brand/text` | boost/300 #8ADAEC | #166F87 |
| `severity/info` | slate/300 #8CA0B3 | #586573 |
| `severity/warning` | amber/500 #E8A73C | #B37516 |
| `severity/warning-tint` | amber/tint #2B2311 | #FBF1DE |
| `severity/critical` | redline/500 #E5484D | #C43B41 |
| `severity/critical-tint` | redline/tint #2B1416 | #FCE9EA |
| `severity/insufficient` | slate/400 #6B7885 | #6B7885 |
| `status/success` | green/500 #46A758 | #2F7D3D |
| `status/live` | boost/400 #54C6E2 | #1B8FAD |
| `status/offline` | slate/400 #6B7885 | #8CA0B3 |
| `interactive/default` | boost/500 #2BB3D4 | #1B8FAD |
| `interactive/pressed` | boost/600 #1B8FAD | #166F87 |
| `interactive/disabled` | slate/700 #2A343F | #D3DAE1 |

### 4.3 The temperature-encodes-urgency system

The single idea the whole product hangs on. The severity ladder is a heat ramp:

```
cool ───────────────────────────────► warm
neutral-slate    amber       redline-red
   info    →   warning   →   critical
(quietest)   (attend)     (act now)

insufficient_data = OFF the ladder
neutral slate + dashed treatment (no chroma of its own)
```

- **info** — the majority case. Quietest treatment; must not manufacture urgency. Accent = `severity/info` (near-neutral cool slate).
- **warning** — noticeably more prominent than info (tint-fill + amber). Triggers a push notification. The gap to critical is deliberate and carried by tint/border/weight, never color alone.
- **critical** — full-screen takeover on next app open, persists until acknowledged. Calm-specific. See principle #7.
- **insufficient_data** — dashed border + dashed icon ring, neutral. Reads "more data needed," not "error."

This same language extends into **live telemetry** (a coolant gauge running hot shows amber in real time) and into **Drives / DTC** (health flags, code badges).

### 4.4 Typography

**Families:** `Geist` (UI/display) + `Geist Mono` (telemetry numerals, tabular). Both confirmed available in the Figma environment with all weights.

| Style | Family | Size/Line (dp) | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Display | Geist | 34 / 40 | SemiBold 600 | -0.5 | First-drive / hero moments |
| Heading/H1 | Geist | 26 / 32 | SemiBold 600 | -0.3 | Screen titles |
| Heading/H2 | Geist | 21 / 28 | SemiBold 600 | -0.2 | Nav titles, sections |
| Heading/H3 | Geist | 17 / 24 | SemiBold 600 | 0 | Card titles |
| Body/Large | Geist | 16 / 24 | Regular 400 | 0 | Primary reading copy |
| Body/Base | Geist | 15 / 22 | Regular 400 | 0 | Standard body |
| Body/Small | Geist | 13 / 18 | Regular 400 | 0 | Secondary body |
| Caption | Geist | 12 / 16 | Medium 500 | +0.1 | Timestamps, meta |
| Label | Geist | 11 / 16 | SemiBold 600 | +0.6 | UPPERCASE eyebrows/status |
| Data/XL | Geist Mono | 44 / 48 | Medium 500 | -0.5 | tabular · big readouts |
| Data/Large | Geist Mono | 28 / 32 | Medium 500 | -0.3 | tabular · metric values |
| Data/Base | Geist Mono | 15 / 20 | Medium 500 | 0 | tabular · inline metrics |

Mono figures are inherently tabular. Line-heights are deliberately generous to tolerate ~30% dynamic font scaling.

### 4.5 Spacing, radius, elevation

**Spacing (4dp base):** `space/0`=0, `space/0-5`=2, `space/1`=4, `space/2`=8, `space/3`=12, `space/4`=16, `space/5`=20, `space/6`=24, `space/8`=32, `space/10`=40, `space/12`=48, `space/16`=64.

**Radius:** `radius/sm`=8 (chips, small controls), `radius/md`=12 (buttons, inputs), `radius/lg`=16 (cards), `radius/xl`=20 (modals/takeover), `radius/full`=999.

**Elevation:** On dark, separation is carried by **surface-step + border**, not heavy shadow (shadows barely read on near-black).
- elev-0: `surface/canvas`, no border, no shadow.
- elev-1: `surface/primary` + `border/subtle` (+ optional `0 1px 2px rgba(0,0,0,.35)`).
- elev-2: `surface/elevated` + `border/default` (+ `0 8px 24px rgba(0,0,0,.45)`).

Glows (neon on live/gauge/celebration moments) use a cyan **drop-shadow** (0 offset, blurred) rather than layer effects that don't survive certain contexts.

### 4.6 Iconography & motion

- **Icons:** lucide-react-native, ~2px stroke, round caps/joins. 18px inside 36px containers is the common pairing.
- **Pressed state:** opacity 0.72 (no hover exists).
- **Motion (for build, not mocked in Figma):** the "analyzing" and sync spinners should feel like *active reassuring progress*, not a stalled spinner — use a smooth indeterminate rotation + the progress hints already designed. The live "listening"/live dots have a subtle glow that can pulse. Keep motion restrained and technical.

---

## 5. Component library

Five components, all auto-layout, all token-bound, reused as instances across screens.

### 5.1 Diagnostic Card — `node 8:182` — **the lynchpin**

The single most-reused surface. Where the agent's voice lives.

- **Property `state`:** `info` · `warning` · `critical` · `insufficient_data`
- **Property `expanded`:** `False` · `True`  → **8 variants total**
- **Anatomy (collapsed):** left accent bar (severity color; absent + dashed border for insufficient) · icon container (36) · category Label · title (H3) · timestamp (Caption) · body (Body/Base).
- **Expanded adds:** divider · "WHAT IT SAW" metrics (3× Data/Base + captions) · confidence indicator (labeled bar) · feedback actions (thumbs up/down, 44px→48dp target) · "Mark as seen" (becomes "I've got it" on critical). `insufficient_data` expands to a "WHAT'S NEEDED" note instead — no metrics/confidence.
- **Appears in:** Home preview, Diagnostics feed, Diagnostic detail, Drive detail, DTC detail (related), First-drive celebration.

### 5.2 Status Pill — `node 13:46`

Compact header connection pill. **Property `state`:** `synced` (green dot) · `live` (brand-tinted, active) · `connecting` (spinner) · `offline` (dimmed, sunken surface + tertiary text).

### 5.3 Sync Banner — `node 14:63`

Full-width strip for connection states needing explanation. **Property `state`:** `syncing` (row-count + determinate progress) · `large-sync` (reassuring "you can close the app" + progress) · `sync-failed` (neutral, "your data is safe on the device," quiet Retry). **No severity colors** — connection ≠ health.

### 5.4 Agent Strip — `node 14:92`

The "analyzing your drive" family. **Property `state`:** `analyzing` (brand spinner + data-point count + progress hint) · `error` ("Couldn't analyze this drive — we'll try again") · `rate-limited` ("Analysis paused briefly"). `idle` = strip absent. Neutral/brand only.

### 5.5 Metric Tile — `node 35:48`

Telemetry/readout tile. **Property `state`:** `normal` · `warning` (amber value) · `critical` (red value). Named text layers `value` / `unit` / `label` for instance override. Used in Live-mode telemetry groups, DTC freeze-frame, and reusable for Drive detail.

---

## 6. Screen inventory

All screens are 393dp wide. Fixed-height screens are 852dp; content-heavy screens are auto-height (scroll). Node IDs are the review boards unless a specific screen is listed.

### Onboarding (14 screens)

**Board: Onboarding · Auth — `node 23:33`**
- `01 · Welcome` (23:34) — car line-art motif, "Caeorta" wordmark, tagline "Knows your engine. Tells you what matters.", Get started, "Already set up? Sign in".
- `01b · Sign in` (60:233) — returning user: "Welcome back", email input, Send code, "New to Caeorta? Get started".
- `02 · Email` (23:54) — "What's your email?", no-passwords reassurance, focused email input, Send code.
- `03 · Verify` (23:71) — 6-digit OTP boxes (filled/focused/empty states), resend timer, Verify.

**Board: Onboarding · Pairing — `node 38:121`**
- `04 · Pair intro` — OBD device line-art, "Scan the QR **first**, then plug in — the camera can't reach it once seated," Scan device QR, "Where's the OBD-II port?" link.
- `05 · Camera` — permission priming ("nothing is recorded"), Allow camera, Enter code manually.
- `06 · Scan` — reticle + glowing scan line, framing instruction, manual fallback.
- `07 · Manual code` — `CAEO-••••-••••` formatted input, Pair device, Scan QR instead.
- `08 · Plug in` — "Now plug it in" (correct sequence beat), "How do I find the OBD-II port?" link, It's plugged in.
- `09 · Pairing` — spinner + live step checklist (Device found ✓ / Verifying firmware / Syncing settings), Cancel.

**Board: Onboarding · Wi-Fi & Done — `node 46:121`**
- `10 · Wi-Fi intro` — why Wi-Fi (opportunistic sync), Set up Wi-Fi.
- `11 · Wi-Fi details` — SSID + password (eye toggle), hotspot-or-home guidance, Send to device.
- `12 · Sending` — credentials-transfer progress + step checklist.
- `13 · Test` — live status card showing device streaming (pulse, CONNECTED, sample readings), Finish setup.
- `14 · Done` — celebratory close: glowing check, "You're all set", hands off to first-drive anticipation.

### Core screens

- **Home / Vehicle Detail — `node 10:2`** — header (vehicle name + switcher-chevron affordance + subtitle), synced Status Pill, **blueprint car hero** (cyan line-art + glow), last-drive card (hero distance + sparkline + metric row), prominent-but-secondary Live mode button, Recent Diagnostics preview (3× Diagnostic Card instances), "See all". *(Synced/idle state; other connection/agent states covered by §5 components.)*
- **Live Mode — `node 30:33`** — brand-tinted live banner + exit; **cyberpunk segmented tach** (7-segment RPM digits with ghost segments + horizontal bar-graph ramping cyan→amber→red at redline + 0–8 scale); scrollable **telemetry groups** (Engine / Fuel & Air / Turbo & Boost / Electrical, ~22 Metric Tile instances, coolant flagged amber); Exit Live mode. Banner + gauge intended sticky in build.

### Secondary screens

- **Diagnostics — `node 47:121`**
  - `S1 · Diagnostics feed` (47:122) — severity filter chips + date-grouped Diagnostic Card instances.
  - `S2 · Diagnostic detail` (48:173) — full agent output, boost/knock chart (area + event markers), what-it-saw metrics, confidence, "From your drive" link, feedback + mark-as-seen/dismiss.
- **Drives — `node 52:173`**
  - `S3 · Drives list` — date-grouped drive cards (distance/duration/avg + health flag: Clean / Needs a look / Check now).
  - `S4 · Drive detail` — date/distance header, summary metrics, three telemetry charts (Speed/Boost/Coolant — coolant peak amber), diagnostics from the drive.
- **DTC — `node 53:195`**
  - `S5 · DTC list` — grouped Active/Pending/History, severity-tinted code badges + plain-language titles.
  - `S6 · DTC detail` — large code badge + status pill, "what it means" (tuned-setup specific), likely-causes, freeze-frame conditions (Metric Tile instances), related Diagnostic Card, auto-clear note.

### Settings

- **Settings — `node 55:222`**
  - `S7 · Settings` — grouped: Vehicle, Units (km/mi · bar/psi · °C/°F segmented controls), Notifications, Account (email, red Sign out), About (help, privacy, version).
  - `S8 · Notification prefs` — per-severity: **Critical = Always**, Warning on, Info off, Insufficient off; delivery (push, quiet hours); sync/device alerts.
- **Settings · Sub-pages — `node 62:233`**
  - `SS1 · Vehicle details` (62:234) — editable form (name/make/model/year/tune) + Save.
  - `SS2 · Device info` — device card + firmware/serial/paired rows, Check for updates, red Unpair.
  - `SS3 · Quiet hours` — toggle + Start/End time rows.
  - `SS4 · Privacy policy` — plain-language sections.

### Help & Support — `node 50:173`

- `Help · Support hub` — grouped article list (Getting started / Troubleshooting / Contact).
- `Help · How syncing works` — device→hotspot→cloud flow + explainer sections.
- `Help · Sync tips` — numbered troubleshooting cards.
- `Help · Contact support` — Email / WhatsApp / articles.
- `Help · Finding OBD-II port` — under-dash illustration + common locations.

### App States — `node 59:222`

- `T1 · First drive — waiting` — home empty state: "Connected · listening" pill, car motif, anticipatory copy, "How syncing works" link. **The most important UX moment; must never read as broken.**
- `T2 · First drive — welcome` — one-time celebration: glowing check, "Your first drive is in", first-drive summary card + info Diagnostic Card, Take a look.
- `T3 · Critical takeover` — redline bar, "NEEDS ATTENTION", finding-as-headline, 11 psi vs 25 floor panel, "what this likely means" + next step, single "I've got it — dismiss" + "See the full reading".
- `T4 · Device offline` — neutral wifi-off, "Device offline since Monday", reassuring "nothing is lost" copy, Sync tips.

---

## 7. Navigation & link graph

**No dead ends.** Every tappable link/chevron resolves to a real screen.

| From | Link | → Destination |
|---|---|---|
| Welcome | Already set up? Sign in | Sign in (01b) |
| Welcome / Sign in | Get started | Onboarding flow |
| Pair intro | Where's the OBD-II port? | Help · Finding OBD-II port |
| Plug in | How do I find the OBD-II port? | Help · Finding OBD-II port |
| Camera / Scanner | Enter code manually | Manual code (07) |
| Manual code | Scan QR instead | Scanner (06) |
| First-drive waiting | How syncing works | Help · How syncing works |
| Device offline | Sync tips | Help · Sync tips |
| Home | Live mode | Live Mode |
| Home | See all | Diagnostics feed (S1) |
| Home | vehicle-name chevron | *Vehicle switcher (v2 — affordance only)* |
| Diagnostic card (anywhere) | tap | Diagnostic detail (S2) |
| Diagnostic detail | From your drive | Drive detail (S4) |
| Drives list | tap drive | Drive detail (S4) |
| DTC list | tap code | DTC detail (S6) |
| DTC detail | related | Diagnostic detail (S2) |
| Settings | Golf GTI | Vehicle details (SS1) |
| Settings | Device | Device info (SS2) |
| Settings | Notifications | Notification prefs (S8) |
| Settings | Quiet hours / Notif prefs → Between | Quiet hours (SS3) |
| Settings | Help & support | Help · Support hub |
| Settings | Privacy policy | Privacy policy (SS4) |
| Help hub / OBD help | Contact support | Help · Contact support |

**Not screens (by design):** Sign out & Unpair device → confirmation dialogs. Units segmented controls & all toggles → inline state changes. Start/End time tap → native Android time picker.

---

## 8. Voice & copy guidelines

The agent is a **voice, not a character** (principle #5). Copy is where the product's identity lives.

- **Confident, direct, not corporate.** Talk to a competent adult who understands cars.
- **No baby-talk. No medical-style hedging**, even when discussing potential problems.
- **Specificity is the trust mechanism.** "Detected light knock at 1.2 bar on three pulls today" — not "Potential engine issue detected." Vague alarm is exactly what enthusiasts tune out.
- **Calibrated honesty.** When there isn't enough data, say so plainly ("Not enough data on your transmission yet"). This *is* the persona.
- **Always give a next step in critical/warning copy.** The anxiety in an alert is mostly helplessness; a clear action converts it to agency.
- **System states reassure.** "Your data is safe on the device, we'll retry automatically." Never alarm over a connection issue.

*Reference copy lines are embedded in the built screens — reuse their tone as the style guide.*

---

## 9. Figma structure & node-ID index

The file reads top-to-bottom, aligned to x=0, under labeled section banners:

```
CAEORTA — v1 Design (master title)
├─ § COMPONENTS
│   Diagnostic Card ........ 8:182   (8 variants)
│   Status Pill ............ 13:46   (4)
│   Sync Banner ............ 14:63   (3)
│   Agent Strip ............ 14:92   (3)
│   Metric Tile ............ 35:48   (3)
├─ § ONBOARDING
│   Onboarding · Auth ...... 23:33
│   Onboarding · Pairing ... 38:121
│   Onboarding · Wi-Fi&Done  46:121
├─ § CORE SCREENS
│   Home — Vehicle Detail .. 10:2
│   Live Mode .............. 30:33
├─ § SECONDARY SCREENS
│   Secondary · Diagnostics  47:121
│   Secondary · Drives ..... 52:173
│   Secondary · DTC ........ 53:195
├─ § SETTINGS
│   Secondary · Settings ... 55:222
│   Settings · Sub-pages ... 62:233
├─ § HELP & SUPPORT
│   Help & Support ......... 50:173
└─ § APP STATES
    App States ............. 59:222
```

Foundations (96 variables · 3 collections, 12 text styles) live in the Variables and Text-styles panels, not on canvas.

---

## 10. Implementation notes & gotchas

**Read this before building.**

- **Bind to semantic tokens, never raw hex.** The Light re-skin depends on it. Dark is default; flipping the `semantic` collection mode to Light re-themes the whole app.
- **Charts are mocked as filled areas.** Build them as **Victory Native** line/area charts (Speed/Boost/Coolant on Drive detail; boost/knock on Diagnostic detail). Match the token colors; coolant "hot" peaks use `severity/warning`.
- **Touch targets:** honor **48dp minimum** even where the visual control is smaller (feedback thumbs are drawn 44px — pad the tap area).
- **Dynamic font scaling:** containers reserve space and flex; test titles/metrics at +30%. Don't pixel-lock text containers.
- **Live mode:** banner + RPM gauge sticky; telemetry groups scroll beneath.
- **Segmented tach:** the RPM readout is 7-segment-style (in the pilot, mocked from filled shapes; in build, render with real segments or a segment font). The bar-graph ramps cyan→amber→red; lit bars glow.
- **Motion:** spinners = smooth indeterminate (reassuring, not stalled). Live/connection dots have a subtle pulse/glow.
- **Icons:** lucide-react-native equivalents of every icon used.
- **Fonts:** Geist + Geist Mono (OFL). Ensure both are bundled with the correct weights (Regular/Medium/SemiBold; Mono Medium).

> **Design-tool note (not app-relevant):** during the Figma build, SVG *stroke* paths did not survive import reliably; all line-art/gauges were rebuilt with *filled* shapes. This is a Figma-authoring detail, not a React Native constraint — ignore it for the app build.

---

## 11. Accessibility

- **WCAG AA contrast** is the baseline. Text tokens are tuned for it on both surfaces.
- **Never color alone** for severity. Every severity state pairs color with an **icon + text label** (info/warning/critical/insufficient are distinguishable without hue) — colorblind-safe.
- **Text/primary is #F2F5F7, not pure white**, to reduce glare on dark.
- Generous line-heights + dynamic-scaling support aid low-vision users.

---

## 12. Out of scope (v1)

Do not design/build these (deferred to v2+): community/social, payments/subscriptions/billing, multi-vehicle switcher UI, marketplace, track/racing modes, voice/audio, calendar/reminders, photo upload, social sharing, gamification/achievements, CarPlay/Android Auto, Wear OS/Watch, VIN lookups/history reports, mechanic booking, custom/configurable dashboards, tablet-optimized layouts.

*(Note: the Live-mode telemetry groups are a fixed, comprehensive readout — this is distinct from a user-configurable dashboard, which remains out of scope.)*

---

## 13. Open items & next steps

**Parked (agreed):**
- Refine the Home-screen **car silhouette** (line-art proportions).
- Confirm mocked area charts against **real Victory Native** output during build.
- Decide whether Sign out / Unpair want **custom styled confirmation dialogs** vs native.

**Recommended next:**
- **Light-mode spot-check** — flip the `semantic` collection to Light and audit any token that needs tuning before it ships.
- **Handoff notes page** in Figma for the dev team (can be generated from this document).
- Wire the real backend **PID list** into Live-mode telemetry groups (current channels are a representative tuned-turbo set).

---

## 14. Decisions log

| # | Decision | Rationale |
|---|---|---|
| D1 | Dark-primary | Enthusiast tool, garage/night use, glanceable numerals; Light built as re-skin |
| D2 | Brand = `boost` cyan #2BB3D4 | Cool "instrument" signal; deliberately not the acid-green default |
| D3 | Temperature encodes urgency | Makes severity learnable, not arbitrary; extends to live telemetry |
| D4 | `insufficient_data` off the ladder | Honesty ≠ problem; dashed neutral treatment |
| D5 | System states never use severity colors | An app hiccup must not look like an engine fault |
| D6 | Agent = voice, not character | Avoids baby-talk; identity in copy + calibrated honesty |
| D7 | Geist + Geist Mono, no display face | Character comes from tabular numerals, not decoration |
| D8 | Critical = calm specificity | Takeover is the signal; specificity + next step converts panic to agency |
| D9 | Live mode prominent-but-secondary | Tinted/outlined, never a solid CTA |
| D10 | Switcher-ready header, no v1 switcher | Free future-proofing |
| D11 | Scan-before-plug-in sequence + "Now plug it in" beat | Camera can't reach QR once seated under the dash |
| D12 | Live telemetry = curated groups, not configurable | Glanceable; custom dashboards are out of scope |
| D13 | Cyberpunk segmented tach (7-seg + bar-graph) | Matches enthusiast instrument-cluster reference; ramp = severity system |

---

*End of report. This document should be updated as decisions evolve — treat §14 as the running log.*
