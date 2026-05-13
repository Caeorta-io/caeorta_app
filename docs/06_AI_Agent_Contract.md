# AI Agent Contract

This document defines the **interface between this app/web project and the AI agent project**. The AI agent is built in a separate project (its prompts, evals, model selection, internals are owned there). This project consumes the agent's outputs via a contract.

**This document is the single source of truth.** When it changes, both projects must update. Versioning is by date in this document's changelog at the bottom.

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
When a `sync_sessions` row transitions to `status = 'completed'`, the agent should run analysis on the drives detected within that sync.

**Mechanism options (decide in Week 1 with AI agent project):**

- Option A: Postgres `NOTIFY` from a trigger on sync_sessions. Agent service listens.
- Option B: Webhook from a Supabase Edge Function on sync completion. Agent service exposes HTTP endpoint.
- Option C: Agent polls sync_sessions for unanalyzed completed sessions.

**Recommendation:** Option A (NOTIFY) for simplicity. Option B if the agent service is hosted externally and Postgres NOTIFY isn't reachable.

### Secondary triggers
- **User manual request from app:** App writes a row to `agent_request_queue` (table to be added if this is implemented). Agent processes.
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

It uses a dedicated `agent_role` Postgres role with read-only access to these tables.

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

## Open questions to resolve in Week 1

These need to be decided between this project and the AI agent project before serious development:

1. **Trigger mechanism:** NOTIFY, webhook, or polling? Recommend NOTIFY.
2. **Multi-vehicle batching:** Does the agent process one vehicle per run or batch? Recommend one per run for simplicity.
3. **Deep analysis cadence:** Weekly per-vehicle is a placeholder. Confirm.
4. **Insufficient_data threshold:** How much data before the agent declares "I have enough"? Agent project decides; this contract doc reflects.
5. **Cross-diagnostic deduplication:** If the agent identifies the same issue across multiple drives, does it write multiple outputs or one with an updated `last_observed_at`? Recommend separate outputs, deduplicated in app UI by category + active state.
6. **The `agent_request_queue` table:** Build it if manual user requests are in v1. Otherwise defer.

---

## Changelog

- **2026-05-XX (v0.1):** Initial draft. To be reviewed jointly with AI agent project in Week 1.
