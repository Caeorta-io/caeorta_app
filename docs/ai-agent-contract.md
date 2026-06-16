# AI Agent Contract — Live (v0)

> **Status:** v0, draft, **awaiting AI agent project review.**
> **Date stamped:** 2026-06-16.
> **Author:** App project (Muhammed Raslan). Produced unilaterally based on this
> project's current understanding because the AI agent project is not yet ready
> to review jointly. The agent project reviews this async (see **Review process**
> at the bottom) and either agrees with or pushes back on each proposal below.

## Relationship to `06_AI_Agent_Contract.md`

There are two copies of this contract, on purpose:

- **`docs/06_AI_Agent_Contract.md`** — the **project-knowledge spec**. Treat it as
  the **immutable v0.1 starting point**. It does not change as the contract
  evolves; it records where we began.
- **`docs/ai-agent-contract.md`** (this file) — the **live, versioned contract in
  the repo**. This is the one that **evolves**, and from v0 onward this file is the
  **single source of truth** for the interface between the two projects. When it
  changes, both projects update, and the change goes through the PR-approval
  protocol in **Review process** below.

This file starts as a faithful copy of the project-knowledge spec, **annotated**
where decisions are still open. The annotations are the lines labelled
**"This project's current proposal"** under the six open questions.

This work is the active mitigation for **R1 (AI agent contract drift)** in
[`docs/09_Risks_And_Mitigations.md`](09_Risks_And_Mitigations.md#L7). Drift between
the two projects on schema meaning, triggers, or feedback flow is the single most
likely integration failure in the build; producing a written, versioned, jointly
reviewable contract is how we manage it.

---

## Overview

The AI agent is a service that:
- **Reads** telemetry, DTCs, drives, vehicles, and previous diagnostic_outputs from Supabase
- **Writes** new diagnostic_outputs and updates agent_status

The app:
- **Subscribes** to diagnostic_outputs and agent_status via Supabase Realtime
- **Displays** diagnostic_outputs to the user with appropriate UI treatment
- **Writes** diagnostic_feedback (thumbs up/down + comment) back, which the AI agent project consumes for evals

## When the agent runs

### Primary trigger

When a `sync_sessions` row reaches `status = 'completed'`, the agent runs analysis
on the drives detected within that sync.

**Reconciliation note (v0):** the project-knowledge spec describes this as a
`sync_sessions` row "transitioning to `status = 'completed'`," which reads like a
database trigger watching the table. The sync architecture
([`docs/07_Sync_Architecture.md`](07_Sync_Architecture.md#L57), the
`device_sync_complete` Edge Function) is more specific: the function itself, after
it flips `status = 'completed'`, runs drive-boundary detection, and updates the
vehicle's `last_sync_at`, is the place that triggers the agent. v0 resolves the two
in favour of the Edge Function: **the `pg_notify` call is emitted by
`device_sync_complete` as its last step**, not by a separate table trigger. This
keeps the trigger logic in one place (the function already owns the completion
transaction) and avoids a table trigger firing on intermediate `UPDATE`s.

**Mechanism options (originally to decide in Week 1 with AI agent project):**

- Option A: Postgres `NOTIFY` (emitted by `device_sync_complete`). Agent service `LISTEN`s.
- Option B: Webhook from a Supabase Edge Function on sync completion. Agent service exposes HTTP endpoint.
- Option C: Agent polls sync_sessions for unanalyzed completed sessions.

> **This project's current proposal — Postgres `NOTIFY`.** Lowest-friction,
> debuggable from `psql`, and adds no extra hosting or inbound-endpoint concerns
> for the agent service. **One honest caveat:** `NOTIFY` is fire-and-forget — if the
> agent's `LISTEN` connection is down when the notify fires, that notification is
> lost (no durability or replay). For v1 we accept this **paired with a cheap
> backstop**: the agent periodically sweeps `sync_sessions` for `completed` sessions
> that have no `diagnostic_outputs` yet and picks up any it missed (this is Option C
> demoted to a safety net, not the primary path). If Week 6 integration shows
> `NOTIFY` is too lossy in practice, the fallback is the `agent_request_queue` table
> (see open question 6) or moving to Option B. We are **not** proposing a webhook for
> v1 unless the agent service ends up hosted somewhere Postgres `NOTIFY` can't reach.

### Secondary triggers
- **User manual request from app:** App writes a row to `agent_request_queue` (table to be added if this is implemented — see open question 6, deferred to v2). Agent processes.
- **New active DTC:** When a `dtcs` row is inserted with `is_active = true`, agent should consider running.
- **Scheduled deep analysis:** Weekly per-vehicle deep dive (long-term trend analysis). Triggered by `pg_cron`.

### Cooldowns
To prevent spam:
- No more than 1 routine analysis run per vehicle per hour
- No more than 1 deep analysis per vehicle per week
- Manual requests bypass cooldowns but rate-limited per user per day

## What the agent reads

The agent has **read access** to:
- `telemetry`
- `current_state`
- `dtcs`
- `drives`
- `vehicles`
- `vehicle_modifications`
- `diagnostic_outputs` (its own previous outputs, for continuity)
- `diagnostic_feedback` (to learn from user reactions)
- `sync_sessions`

It uses a dedicated `agent_role` Postgres role with read-only access to these
tables. (The `agent_role` migration is a downstream follow-up gated on this
contract landing — see the deferred-tests note in
[`docs/05_Database_Schema.md`](05_Database_Schema.md#L588).)

## What the agent writes

The agent **writes**:

### `diagnostic_outputs`
A new row per insight generated. Schema (see `05_Database_Schema.md` for full column list):

```typescript
{
  id: uuid,                    // generated
  vehicle_id: uuid,            // required
  agent_version: string,       // required, e.g. "v0.3.2"
  generated_at: timestamptz,   // required, now()
  severity: "info" | "warning" | "critical",
  urgency: "now" | "soon" | "monitor",
  category: "engine" | "fuel" | "cooling" | "transmission" | 
            "electrical" | "turbo" | "insufficient_data" | "other",
  title: string,               // <= 80 chars, sentence case
  summary: string,             // 1-2 sentences, <= 300 chars
  explanation: string,         // paragraph form, no markdown, plain text
  recommended_action: string,  // <= 200 chars, action-oriented
  confidence: number,          // 0.00 to 1.00
  referenced_telemetry_ids: uuid[],  // can be empty
  referenced_dtc_ids: uuid[],         // can be empty
  referenced_drive_id: uuid,           // required if drive-scoped
  status: "new"                 // initial status; user actions update this
}
```

### `agent_status`
The agent upserts the row for the vehicle being analyzed:

```typescript
{
  vehicle_id: uuid,            // PK
  status: "idle" | "analyzing" | "error" | "rate_limited",
  updated_at: timestamptz,
  last_run_at: timestamptz,
  error_message: string | null
}
```

The agent must:
- Set `status = 'analyzing'` when work begins
- Set `status = 'idle'` when work completes successfully
- Set `status = 'error'` and populate `error_message` on failure
- Set `status = 'rate_limited'` when cooldowns prevent a run

## Severity, urgency, and category — meanings

### Severity
- **`info`** — Informational. No action needed. Examples: "Your engine ran smoothly today," "Coolant temp stayed in normal range." Renders as a quiet card in the feed.
- **`warning`** — Something worth attention but not urgent. Examples: "Mild knock detected at high boost," "Air filter likely needs replacement based on intake patterns." Renders prominently on vehicle detail; triggers push notification (if user preferences allow).
- **`critical`** — Immediate concern, potential safety/damage risk. Examples: "Coolant temp climbing rapidly," "Oil pressure dropped repeatedly under load." Renders as full-screen takeover on next app open until acknowledged; always triggers push notification.

### Urgency
- **`now`** — Act before next drive. Pair with `critical` severity typically.
- **`soon`** — Within days or next maintenance window.
- **`monitor`** — Keep an eye on it; not actionable yet.

### Category
- `engine` — generic engine issues
- `fuel` — fuel system, AFR, injectors
- `cooling` — coolant, radiator, temperature
- `transmission` — gearbox, clutch
- `electrical` — battery, alternator, sensors
- `turbo` — boost, wastegate, turbo health
- `insufficient_data` — agent doesn't have enough to assess; renders gently in app
- `other` — anything else

## The "I don't know" path

When the agent has **insufficient confidence** or **insufficient data**, it must still produce a diagnostic_output, with:
- `category = 'insufficient_data'`
- `confidence < 0.3`
- `severity = 'info'`
- `urgency = 'monitor'`
- `title` = e.g. "Not enough data to assess yet"
- `explanation` = honest about what's missing (e.g., "We need at least 30 minutes of driving data with this ECU profile to begin meaningful analysis.")

The app renders these with a gentler, less-alarming UI treatment.

## Confidence threshold for display

The app may hide low-confidence diagnostics from the main feed:
- Diagnostics with `confidence < 0.5` are hidden by default from the main feed
- A "Show all insights" toggle in settings can reveal them
- This threshold may change based on pilot feedback; the field is always present, the UI logic is owned here

## Versioning

Every diagnostic_output records the `agent_version` that generated it. This:
- Helps debug regressions ("after we updated to v0.4, thumbs-down rate jumped")
- Lets the app gracefully handle new agent versions (forward compatibility)
- Surfaces in the app's debug/settings screen subtly

**Version format:** Semantic-ish: `v<major>.<minor>.<patch>`
- Major bump = breaking change to contract (requires this doc update + app update)
- Minor bump = new categories, new fields, behavioral changes
- Patch bump = prompt tweaks, no contract change

**Breaking changes** require:
- This document updated
- This project's app updated to handle new contract
- Both updates merged before agent project deploys breaking version

## User feedback signal

The app writes `diagnostic_feedback` rows when users tap thumbs up/down on a diagnostic. Schema:

```typescript
{
  id: uuid,
  diagnostic_id: uuid,         // FK to diagnostic_outputs
  user_id: uuid,
  rating: "up" | "down",
  comment: string | null,      // optional user-typed text
  created_at: timestamptz
}
```

The AI agent project consumes these for eval. Specifically:
- Aggregate thumbs-down rate per category, per agent_version
- Comments are read manually during weekly eval review
- High-thumbs-down diagnostics flagged for prompt iteration

**The app guarantees:** every diagnostic shown to a user has a thumbs UI. Even if the user doesn't engage, the *opportunity* exists.

## Latency expectations

Communicated to users as: "Diagnostics typically appear within a minute of sync completion for routine analysis, up to several minutes for deep analysis."

Specifically:
- **Routine analysis** (post-sync): target P95 < 60 seconds from sync completion to first diagnostic_output written
- **Deep analysis** (weekly): no hard latency target; user not waiting
- **Manual request**: target P95 < 30 seconds

If the agent will exceed these, it should set `agent_status.status = 'analyzing'` so the app can show a "still working..." indicator.

## Error handling

If the agent encounters an error:
- Set `agent_status.status = 'error'` with `error_message` populated
- Do NOT write a partial or incorrect diagnostic_output
- The app surfaces "Analysis temporarily unavailable" in the UI

If the agent is rate-limited (e.g., by Anthropic API):
- Set `agent_status.status = 'rate_limited'`
- The app surfaces "Analysis paused — try again later"

## Open questions to resolve with the AI agent project

These were the six items the project-knowledge spec flagged for joint resolution.
For v0, **this project has attached a current proposal to each** — what we advocate
and why. The agent project either agrees or pushes back during async review. None of
these is dictated; the insufficient-data threshold in particular is explicitly the
agent project's call.

1. **Trigger mechanism:** NOTIFY, webhook, or polling?
   > **This project's current proposal — Postgres `NOTIFY`,** emitted by the
   > `device_sync_complete` Edge Function, with a periodic "completed sessions
   > with no outputs yet" sweep as a backstop for `NOTIFY`'s fire-and-forget
   > lossiness. Lowest-friction and debuggable; no inbound endpoint to host. See
   > the full caveat under **Primary trigger** above.

2. **Multi-vehicle batching:** one vehicle per run, or batch?
   > **This project's current proposal — one vehicle per run.** Simpler to reason
   > about, simpler cooldown accounting (cooldowns are already specified per
   > vehicle), and trivially parallelizable later if throughput demands it. At
   > pilot scale (~10 vehicles) there is no batching pressure.

3. **Deep analysis cadence:** weekly per-vehicle is a placeholder. Confirm.
   > **This project's current proposal — weekly per-vehicle, Sundays 02:00 UTC,**
   > triggered by `pg_cron`. Sunday early-UTC is low-traffic for an India-first
   > pilot (≈07:30 IST Sunday), so deep runs don't contend with routine post-sync
   > analysis. Confirm the day/time works for the agent's compute budget.

4. **Insufficient_data threshold:** how much data before the agent declares "enough"?
   > **This project's current proposal — 30 minutes of telemetry with a valid ECU
   > profile** (matching the example wording already in the "I don't know" path).
   > **Flagged explicitly as the agent project's call** — we are proposing a sane
   > default, not dictating. The contract doc reflects whatever the agent project
   > settles on; the app only needs the `insufficient_data` category to render, not
   > the numeric threshold itself.

5. **Cross-diagnostic deduplication:** same issue across multiple drives — multiple outputs or one updated row?
   > **This project's current proposal — write separate outputs; deduplicate in the
   > app UI by `category` + active state.** Keeps the agent's write path append-only
   > and audit-friendly (every run's conclusion is preserved with its `agent_version`
   > and `generated_at`), and keeps the "collapse repeats" logic owned by the app
   > where the UI treatment lives. ("Active state" here means a diagnostic whose
   > `status` is `new`/`seen` and not `dismissed`/`actioned`; the exact grouping key
   > is app-owned and may be refined during build.)

6. **The `agent_request_queue` table:** build it now or defer?
   > **This project's current proposal — defer to v2**, unless a Week 6 integration
   > finding says otherwise. Manual user-requested analysis is not in the v1 scope,
   > and the `NOTIFY`-plus-sweep trigger path covers routine analysis without it.
   > The table is also the natural fallback surface if `NOTIFY` turns out too lossy
   > (see open question 1), so we keep it on the shelf rather than building it
   > speculatively.

---

## Review process

How the two projects keep this contract in sync. This section exists so future
Claude sessions know how cross-project sync works without re-deriving it. It is the
operational arm of the **R1** mitigation in
[`docs/09_Risks_And_Mitigations.md`](09_Risks_And_Mitigations.md#L7).

### Async handoff channel — decided 2026-06-16

**Channel: a GitHub issue on the AI agent project's repository**, with the full
contract markdown pasted into the issue body plus a link back to this file. Chosen
over Notion / email / chat because it puts the review next to the agent project's
code, supports threaded async comments, and aligns with the "contract changes
require PR approval from both sides" mitigation — review and version history live in
git on both sides.

**Status of the handoff: PENDING — blocked on reachability.** As of 2026-06-16 no
AI agent repository is reachable from the app founder's `gh` account: neither
`Caeorta-io/caeorta_ai_agent` nor `Caeorta-io/caeorta_agent` resolves, and only
`caeorta_app` is visible under the `Caeorta-io` org. The issue therefore could not
be filed this session. **Founder action required:** confirm the agent repo's name
and grant the app founder access (or have the agent project owner file the issue
from their side), then post this contract there. Until then the handoff is
documented but not executed.

### Contract-change protocol

- Changes to the contract are made by PR to **this file** (`docs/ai-agent-contract.md`).
- A contract change requires **approval from both sides** (app project + agent
  project) before merge — this is the R1 mitigation, not optional.
- The project-knowledge spec (`docs/06_AI_Agent_Contract.md`) is **not** edited; it
  stays as the immutable v0.1 starting point. All evolution happens here.

### Weekly sync — decided 2026-06-16

- **Cadence:** every **Friday, 16:00 IST, 30 minutes**, recurring.
- **Attendees:** both Caeorta founders (App — Muhammed Raslan; Platform — Sulaiman
  Shiyas Ali) plus the AI agent project lead.
- **Purpose:** the standing R1 mitigation — walk any contract drift, open questions,
  and integration findings before they compound. Week 6 is the buffered integration
  day where gaps are expected to surface; the weekly sync is what keeps Week 6 from
  being a surprise.
- **Calendar status: NOT yet on calendars.** Claude has no calendar integration, so
  the actual recurring invite (both founders + the agent lead) is a **founder
  action**. This section records the agreed cadence; the invite itself must be
  created manually. It also depends on reaching the agent project lead — the same
  reachability gap noted under the handoff channel applies.

---

## Changelog

- **2026-06-16 (v0):** Live contract created in the repo as a copy of the
  project-knowledge spec (`docs/06_AI_Agent_Contract.md`, v0.1), annotated with this
  project's proposals on all six open questions. Reconciled the primary-trigger
  description with `device_sync_complete` (NOTIFY emitted by the Edge Function, plus
  a sweep backstop). Added the **Review process** section: async handoff via a GitHub
  issue on the agent repo (filing pending — agent repo not yet reachable) and a
  weekly Friday 16:00 IST / 30-min sync (calendar invite pending — founder action).
  Status: **draft, awaiting AI agent project review.**
- **2026-05-XX (v0.1, inherited):** Initial draft in `docs/06_AI_Agent_Contract.md`.
  To be reviewed jointly with the AI agent project. Frozen there as the immutable
  starting point.
