# AI Agent Contract

**Version:** v0.3
**Status:** ratified — supersedes v0.1 (`06_AI_Agent_Contract.md`). Both projects are bound by this document.
**Owners:** app project (`Caeorta-io/caeorta_app`) + agent project.
**This document is the single source of truth for the app↔agent interface.** When it changes, both projects update, and the changelog at the bottom records it.

> **On v0.1 → v0.2.** v0.1 was drafted ~2026-05 and never jointly reviewed; its six "Week 1 open questions" stayed open while implementation moved ahead, so the doc drifted from what shipped (R1). v0.2 reconciles the doc with the shipped schema (verified against `20260602130000_initial_schema.sql`), records the decisions taken in agent-project design, and flags what genuinely remains open inline. Nothing here is silently invented — every normative claim traces to the schema, a migration, or a recorded decision.

---

## 1. Overview

The AI agent is a service, built and operated in a separate project (prompts, evals, model choice, internals are owned there). It:

- **Reads** telemetry, DTCs, drives, vehicles, and its own prior outputs from Supabase.
- **Writes** `diagnostic_outputs`, upserts `agent_status`, and claims/updates rows in `agent_work_queue` (see §4).

The app:

- **Subscribes** to `diagnostic_outputs` and `agent_status` via Supabase Realtime.
- **Displays** diagnostics with severity-appropriate UI.
- **Writes** `diagnostic_feedback` (thumbs + comment), which the agent consumes for evals.

The agent authenticates as the dedicated `agent_role` Postgres role (migration `20260717000000_create_agent_role.sql`), over a **direct, session-mode connection** (Supavisor port 5432 — transaction pooling silently breaks `LISTEN`).

---

## 2. What the agent reads

`telemetry`, `current_state`, `dtcs`, `drives`, `vehicles`, `sync_sessions`, `diagnostic_outputs` (continuity), `diagnostic_feedback` (evals).

RLS is enabled on all 26 tables. `agent_role` is `NOBYPASSRLS` and has no `auth.uid()`, so it carries an explicit `FOR SELECT ... USING (true)` policy per read table (in the migration). Without those, reads return **zero rows silently** — the dominant integration failure mode.

**Vehicle context (corrects v0.1):** the modification signal for v1 is **`vehicles.ecu_type`** (`oem|haltech|aem|motec|link|other`) and **`vehicles.modifications`** (jsonb). `vehicle_modifications` is **empty and reserved for v2** — the agent must not depend on it in v1, despite v1 docs pointing there.

---

## 3. Metric vocabulary  *(new in v0.2 — closes R22 / `TODO(metric-keys)`)*

The **canonical** telemetry metric vocabulary is the app's existing set. The firmware conforms to these names and units; the agent keys on them; the app's provisional keys become canonical.

| key | unit | notes |
|---|---|---|
| `speed_kph` | km/h | |
| `rpm` | rpm | |
| `coolant_temp_c` | °C | only safety-relevant metric captured today |
| `boost_pressure_kpa` | kPa | **not bar** — 1 bar = 100 kPa |
| `engine_load_pct` | % | |

**Per-vehicle capability is derived, not configured.** The device emits `jsonb_strip_nulls`'d metrics, so an unavailable metric is an **absent key**, never a null and never zero. The agent infers each vehicle's capability set from keys observed across its recent drives (over a window, not a single drive — one short/dropped drive is not loss of a sensor).

**Absent ≠ zero ≠ normal.** The pre-filter must never read a missing metric as `0`. (This bug is live today in `device_sync_complete`'s `peak_metrics` seeding, `Math.max(x ?? 0, val)` — tracked separately.)

**Additional PIDs** (`afr`, `oil_pressure_kpa`, `intake_air_temp_c`, …) are enabled per-car only where that vehicle exposes them. Categories depending on absent metrics are simply unavailable for that car — see §7.

---

## 4. Triggers — durable queue + NOTIFY as wake-up  *(changed in v0.2; replaces v0.1 "Option A")*

**Decision: adopt the work queue (v0.1 "Option A" NOTIFY-only is retired).**

Rationale: raw `NOTIFY` is fire-and-forget. A listener not connected at emit time (deploy, crash, blip) loses the event permanently, and the routine SLO is **60s** while the v0.1 backstop sweep is **10 min** — a dropped notification misses the SLO by ~10×. Separating the durable record (a table) from the wake-up (NOTIFY) is what makes the SLO holdable.

### `agent_work_queue` (app project owns the migration)

One row per unit of work. `kind ∈ {routine, deep, dtc}`; `state ∈ {pending, claimed, done, failed}`; `attempts int`; timestamps; `last_error`. Two partial indexes, and the claim index **must match the claim sort** (below) or Postgres reads the whole pending set and sorts in memory:

```sql
-- claim path. Expression index: (kind <> 'routine') puts routine first
-- (false sorts before true), so both keys are plain ascending.
CREATE INDEX agent_work_queue_pending
  ON public.agent_work_queue ((kind <> 'routine'), enqueued_at)
  WHERE state = 'pending';

-- coalescing / cooldown
CREATE UNIQUE INDEX agent_work_queue_dedupe
  ON public.agent_work_queue (vehicle_id, kind) WHERE state = 'pending';
```

A plain `(kind, enqueued_at)` index does **not** serve this sort: btree orders `kind` by text collation (`deep` → `dtc` → `routine`), placing routine last, and the planner will not derive an ordering on the expression from an ordering on the column. The `WHERE state='pending'` predicate must appear literally in the claim query for the partial index to match.

**`attempts` counts failures, not claims.** The claim query increments it, so a job that yields the vehicle lock (see below) must decrement on yield — otherwise a long deep run is killed by §10's 3-attempt retry cap without ever having failed. Carry this as a column comment in the migration.

Full DDL in `proposed-app-changes.md §1`.

- **Enqueue** is a trigger on `sync_sessions` `AFTER UPDATE OF status` (fires atomically with the commit — cannot be skipped by a code path, cannot fire on a rolled-back commit; the v0.1 "Edge Function's last step" could). Analogous enqueues: `dtcs AFTER INSERT WHERE is_active` → `dtc`; weekly pg_cron → `deep`.
- **Wake-up** is a single `pg_notify('agent_trigger', '')` — channel name **kept from the shipped implementation**. Payload is empty; the agent reads the queue. (Retires the v0.1 `{sync_session_id, vehicle_id, drive_ids[]}` payload, which was never built — the shipped payload was `{session_id, vehicle_id, triggered_at}`.)
- **Claim** is `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1)` — multi-instance safe.

**What the queue absorbs for free:** durability (no lost work), cooldowns (the unique partial index enforces §5 declaratively), retries surviving restart (`attempts`), and the DTC + weekly triggers through one path and one consumer loop.

**Security:** the v1 `notify_agent` RPC is `SECURITY DEFINER` with no `REVOKE FROM PUBLIC` — any authenticated user can trigger agent runs on any vehicle. Adopting the queue moves enqueue to a table trigger and the RPC is dropped, closing this.

### Cooldowns (unchanged from v0.1)
≤1 routine run per vehicle per hour; ≤1 deep run per vehicle per week; manual runs (v2) bypass cooldowns, rate-limited per user per day.

### Routine vs deep: same channel, different jobs  *(resolved — build deep)*

**Decision (2026-07-17): build the weekly deep emitter now** (not cut to v2). The app project adds a pg_cron job that, once a week, enqueues a `deep` row per active vehicle and fires the same `pg_notify('agent_trigger','')`.

`routine` and `deep` share the wake-up channel and the claim loop, but are **not** the same job. The agent consumes them differently:

- **Scope.** `routine` = the drives in one sync session (`sync_session_id` set). `deep` = the whole vehicle over a trailing window (`sync_session_id` NULL; agent derives the window — default trailing 7 days of drives). Different reads, prompt, and token budget.
- **Enqueue shape.** `deep` rows set `kind='deep'`, `vehicle_id`, and leave `sync_session_id`/`dtc_id` NULL. The cron does one `INSERT ... SELECT` across active vehicles with `ON CONFLICT DO NOTHING` against the `(vehicle_id, kind) WHERE state='pending'` dedupe index (no doubling if a `deep` is already pending). Default cadence Sundays 02:00 UTC, **jittered** — the agent spreads claims rather than the cron enqueuing in a burst, so no app-side change is needed for this.

- **"Active vehicle" means: had at least one drive in the last 14 days.**

```sql
  WHERE EXISTS (
    SELECT 1 FROM public.drives d
    WHERE d.vehicle_id = v.id
      AND d.started_at > now() - interval '14 days'
  )
```

  Not `devices.status='active'`, which measures the device's claim state rather than whether there is anything new to analyse: a car parked a month has an active device and zero new drives, so a deep run on it spends tokens to produce either `insufficient_data` or a restatement of last week. Deep analysis is trend analysis, so the predicate is drive recency. 14 days rather than 7 because a fortnight-gap driver should not fall out of trending mid-arc, and because 14 > the 7-day deep cooldown, so the two windows cannot fight at the boundary. **This predicate wants an index on `drives (vehicle_id, started_at)`; check whether one exists before shipping the cron.**
- **Per-vehicle mutex (agent-side rule).** `agent_status` is keyed on `vehicle_id` alone (no `kind`), so a `routine` and a `deep` for the same vehicle must **not** run concurrently — they'd race on the status row. The claim loop takes a per-vehicle lock, not just per-row `SKIP LOCKED`.
- **Priority (agent-side rule).** `deep` has no latency SLO (§10); `routine` has 60s. Under contention `routine` wins: claim ordering is `ORDER BY (kind <> 'routine'), enqueued_at`, matching the expression index above.

- **Deep yields at chunk boundaries (agent-side rule).** Claim ordering decides what is claimed *next*; it does not preempt. Without more, a routine job queued behind a running deep waits out the entire deep run — a latency cliff, not a gradual slowdown. So: **a deep run releases the per-vehicle lock at a chunk boundary whenever a routine job for the same vehicle is pending.** Deep analysis is already chunked per thermal session (§9), so the boundaries exist. A routine job's wait is therefore bounded by one deep chunk, not one deep run. The yielding deep row returns to `state='pending'` on the same row (no insert, so no contention with the dedupe index), with `claimed_at` cleared and `attempts` decremented per the note above, and re-claims afterwards.

  Rejected alternatives: dropping the mutex (concurrent routine + deep would race on the single `agent_status` row, which is keyed on `vehicle_id` alone and stays that way — see §6); chunking without yielding (shortens the cliff, does not remove it).

None of the last two require app-side work — they're how the agent consumes the queue. Recorded here because they're contract-visible behaviour, not just implementation.

---

## 5. What the agent writes — `diagnostic_outputs`

One row per insight. Schema **verified** against shipped DDL:

```
id                       uuid      PK, generated
vehicle_id               uuid      NOT NULL → vehicles (ON DELETE CASCADE)
agent_version            text      NOT NULL  e.g. "v0.3.2"
generated_at             timestamptz NOT NULL default now()
severity                 text      NOT NULL  CHECK in (info,warning,critical)
urgency                  text      NOT NULL  CHECK in (now,soon,monitor)
category                 text      NOT NULL  CHECK in (engine,fuel,cooling,
                                   transmission,electrical,turbo,insufficient_data,other)
title                    text      NOT NULL  ≤80 chars, sentence case (length not DB-enforced)
summary                  text      NOT NULL  ≤300 chars (not DB-enforced)
explanation              text      NOT NULL  plain text, no markdown
recommended_action       text      NULLABLE  (see note)
confidence               numeric(3,2) NOT NULL CHECK 0..1
referenced_telemetry_ids uuid[]    NOT NULL default '{}'
referenced_dtc_ids       uuid[]    NOT NULL default '{}'
referenced_drive_id      uuid      NULLABLE → drives (ON DELETE SET NULL)
status                   text      NOT NULL default 'new' CHECK in (new,seen,dismissed,actioned)
```

Enum-like values are **CHECK-constrained in the DB** — invalid LLM output fails loudly at the boundary rather than storing an unrenderable row. The agent still validates before insert; the constraint is the backstop.

**Contract notes where DDL and prose diverge (agent honours the stricter side):**
- `recommended_action` is **nullable in DDL** but required by v0.1 prose. Agent always populates it. *Doc corrected to: "SHOULD always be present; DB does not enforce."*
- `referenced_drive_id` is **nullable + ON DELETE SET NULL**. So "required if drive-scoped" is an agent-side rule, not a DB guarantee, and any drive-scoped reference **can become NULL** if the drive is later deleted. Consumers must tolerate NULL.
- `title`/`summary` length caps are **not** DB-enforced; agent-side only.

**Writes are INSERT-only.** `status` transitions are the app's (`'new'` → user actions). The agent never updates `diagnostic_outputs`.

**Dedup (v0.1 Q5, confirmed):** the agent writes **one row per occurrence** and uses prior outputs as continuity context (don't contradict a recent output); the **app** dedupes in the UI by category + active state. The agent does not suppress repeats.

### `referenced_telemetry_snapshot` — retention, and the shape the app can render against  **(resolved)**

Raw telemetry is purged at 30 days; `diagnostic_outputs` is kept indefinitely; `referenced_telemetry_ids` is a bare `uuid[]` with no FK/cascade. Every diagnostic older than 30 days cites rows that no longer exist. **Resolution: add `referenced_telemetry_snapshot jsonb`** to `diagnostic_outputs`; the agent copies the cited samples inline at write time.

From day 31 this column is the only surviving evidence for that diagnostic, so its **core shape is contract-pinned**, not agent-private. Design §5.1's expanded "WHAT IT SAW" block renders from it for the whole retained history.

```json
{
  "schema": 1,
  "captured_at": "2026-08-03T14:22:07.412Z",
  "samples": [
    { "t": "2026-08-03T14:19:02.000Z",
      "m": { "coolant_temp_c": 104.2, "rpm": 5400, "boost_pressure_kpa": 118.0 } }
  ]
}
```

Guaranteed:

- `samples` is an array ordered ascending by `t`. It **may be empty** — `insufficient_data` rows usually carry no samples.
- Every key in `m` is from §3's canonical vocabulary or a declared per-car PID. Values are JSON numbers, never strings.
- **Absent metric = absent key.** Never `null`, never `0` — the same rule as §3.
- `schema` increments only on a breaking change to the four rules above. Additive keys do not bump it.

Deliberately **not** carried, to avoid a second source of truth: units (§3 pins one unit per key permanently — derive the §5.5 Metric Tile's `unit` from the key) and display precision.

Optional, additive: `"highlight": ["coolant_temp_c", "rpm", "boost_pressure_kpa"]` — the agent's nomination of which three metrics WHAT IT SAW should show. A hint only; the app must have a deterministic fallback when it is absent, so a missing key never blanks the block.

The agent may extend the object freely. It will not change the pinned core without a `schema` bump and a contract change.

Note that drive-detail's WHAT IT SAW derives from `drives.peak_metrics`, which is retained, so that surface already survives the purge. This column's consumer is Diagnostic detail.

---

## 6. What the agent writes — `agent_status`

Upsert on `vehicle_id` (PK). `status ∈ {idle, analyzing, error, rate_limited}`, `updated_at`, `last_run_at`, `error_message`. Set `analyzing` on start; `idle` on success; `error` + message on failure; `rate_limited` when a cooldown blocks a run. (Verified against DDL.)

---

## 7. Severity / urgency / category, and the two "I don't know"s

Severity (consequence), urgency (timing), category (fixed enum) — meanings unchanged from v0.1 §"Severity, urgency, and category".

**`insufficient_data` splits into two cases** *(new in v0.2; resolved in v0.3)*

The per-vehicle capability model (§3) creates two genuinely different "can't assess" states that v0.1 collapses into one:

1. **Temporary** — not enough history yet. *"We need a few more drives to learn what's normal for your car."* Resolves with driving.
2. **Permanent** — the car doesn't report the needed metric. *"Your car doesn't report air–fuel ratio, so fuel-system analysis isn't available."* Never resolves; telling the user to "keep driving, we'll have more soon" (v0.1's boilerplate) would be a lie.

Both use `category='insufficient_data'`, `confidence<0.3`, `severity='info'`, `urgency='monitor'`.

**Resolved: structured marker, not a copy convention.** v0.2 recommended (a); that is withdrawn. A copy convention forces the app to string-match agent prose to decide what to render, which couples the app to wording the agent is free to change.

The marker rides in `referenced_telemetry_snapshot` (§5) — no additional schema change beyond the column already being added:

```json
{ "schema": 1, "captured_at": "...", "samples": [],
  "insufficient_data": {
    "kind": "temporary",
    "missing": ["afr"],
    "drives_seen": 3,
    "drives_needed": 8
  } }
```

- `kind ∈ {temporary, permanent}` — present on **every** `category='insufficient_data'` row written by an agent version shipping this.
- `missing` — absent metric keys. Populated for `permanent`; may be empty for `temporary`.
- `drives_seen` / `drives_needed` — `temporary` only, optional. Available if the app prefers a progress line to agent prose in the WHAT'S NEEDED note.

**App-side contract:** one typed function, `deriveInsufficientDataKind(output) → 'temporary' | 'permanent' | 'unknown'`, returning `unknown` when the key is absent (rows written before this shipped, or after a rollback). `unknown` renders exactly as today — the agent's explanation verbatim, no App-authored resolution promise. Every existing row stays valid and the third state is honest rather than a guess.

Otherwise the "I don't know" path is v0.1's: always write *something* after analysis; never stay silent.

---

## 8. Baselining & safety  *(new in v0.2 — records agent-side design)*

Two tiers:

- **Adaptive per-vehicle baseline** — "unusual *for this car*?" Learned in code from the vehicle's own **`drives` aggregates** (`peak_metrics`/`summary_metrics`), which survive the 30-day telemetry purge. Rolling window, so a later mod re-baselines. Cold-start (first N drives / insufficient history) → `insufficient_data` case 1.
- **Hard safety floor** — "dangerous for *any* car?" Absolute limits in `safety_thresholds.yaml`, checked from drive one, the only path that can fire `critical` before a baseline exists. Guards the two adaptive failure modes: learning a standing fault as normal, and the empty cold-start window.

**Safety gate:** each threshold carries `status: unvalidated|validated`. **Unvalidated thresholds cannot fire `critical`** (downgrade to `warning` at most). This makes it safe to ship before the numbers are researched — a blank file yields an advisory agent, not a confidently wrong one.

`ecu_type != 'oem'` marks a car modified → stock reference bands stay **advisory** (they inform LLM context, never alarm), since a tuned car's deliberate AFR/boost is not a fault. `ecu_type='oem'` does **not** prove stock (intake/exhaust on a stock ECU), so this only ever relaxes, never tightens.

**Coolant threshold ownership  [DECISION REQUIRED #4]:** the app hardcodes `COOLANT_HOT_THRESHOLD_C = 105` (`DriveTelemetrySection.tsx`, flagged provisional); the agent has the same number in `safety_thresholds.yaml`. Two sources → they can disagree on screen (chart says "hot", agent says nothing). Decide a single source of truth (e.g. app reads the validated threshold from a shared config, or the contract pins it and both consume it).

---

## 9. Drive semantics  *(new in v0.2 — records decision)*

A **drive** is one ignition-cycle aggregate; `device_sync_complete` segments on a **5-minute** telemetry gap (`DRIVE_GAP_MS`, shipped) — **kept**. The agent does **not** merge drives at the source. "Was the engine cold?" is answered by the agent **grouping drives into thermal sessions at a 3-hour gap** at analysis time — a restart <3h is a warm start. Fine segmentation is recoverable (group at query time, free); coarse is lossy (raw telemetry gone at 30 days). `duration_seconds = ended_at − started_at`.

**`distance_km` and `average_speed_kph` are both NULL today** (`device_sync_complete` writes only `peak_metrics` and `summary_metrics`). Resolved separately:

- **`average_speed_kph` is cut.** It duplicates `summary_metrics.speed_kph`, which the same function's existing average loop already computes. Drop the column and stop documenting it.
- **`distance_km` is computed.** It is the denominator for per-100km rate baselining (§8), and the segmentation loop already holds the samples, so `Σ(speed × Δt)` lands inside the loop that exists. Until it does, the agent must not rely on it.

---

## 10. Versioning, feedback, latency, error handling

- **Versioning** — semver `v<major>.<minor>.<patch>`; every output records `agent_version`. Major = breaking contract change (both projects update + this doc bumped before deploy). (v0.1 unchanged.)
- **Feedback / evals** — app writes `diagnostic_feedback` (`rating up|down`, optional `comment`); agent aggregates thumbs-down per category per version, reviews comments weekly, flags high-thumbs-down for prompt iteration. `diagnostic_id` is `ON DELETE CASCADE`; `user_id` is `ON DELETE SET NULL`. (Verified against DDL.)
- **Latency** — routine post-sync **P95 < 60s** to first output; manual (v2) P95 < 30s; deep no hard target. Set `agent_status='analyzing'` if exceeding. (The queue in §4 is what makes 60s survivable across deploys.)
- **Errors** — on failure: `agent_status='error'` + `error_message`, write **no** partial output. On provider rate-limit: `agent_status='rate_limited'`, stop. Retries: exponential backoff, cap 3, then log (Sentry) and move on. (v0.1 unchanged; retry count now lives durably in `agent_work_queue.attempts`.)

---

## 11. Open decisions (carried, for the review)

| # | Decision | Status (2026-07-17) |
|---|---|---|
| 1 | Trigger mechanism | **Resolved → work queue (§4).** |
| 2 | Deep analysis: build or cut | **Resolved → build the weekly emitter (§4).** |
| — | `has_anomaly` ownership | **Resolved → app-derived** via trigger on `diagnostic_outputs.severity`. Agent write surface stays `diagnostic_outputs` + `agent_status`. |
| — | `referenced_telemetry_ids` vs 30-day purge | **Resolved → add `referenced_telemetry_snapshot jsonb`** (§5). App-side migration pending. |
| — | `telemetry.drive_id` | **Resolved → add column + one-time backfill** (§3). App-side migration pending. |
| 3 | `insufficient_data` temporary vs permanent | **Resolved → structured marker in `referenced_telemetry_snapshot`** (§7). Copy convention withdrawn. |
| — | Queue claim index vs claim sort | **Resolved → expression index `((kind <> 'routine'), enqueued_at)`** (§4). `(kind, enqueued_at)` does not serve the sort. |
| — | Routine SLO behind a running deep | **Resolved → deep yields the vehicle lock at chunk boundaries** (§4). Mutex kept. |
| — | "Active vehicle" for the weekly deep enqueue | **Resolved → ≥1 drive in the last 14 days** (§4). |
| — | `referenced_telemetry_snapshot` shape | **Resolved → core pinned in §5**, `schema: 1`. Agent may extend; core changes require a bump. |
| — | `drives.average_speed_kph` / `distance_km` | **Resolved → cut `average_speed_kph`; compute `distance_km`** (§9). |
| 4 | Coolant threshold single source of truth | Open — one source; app consumes validated value. |
| — | Hard safety thresholds (values) | Open — founder/domain research. Non-blocking: `unvalidated` gate keeps `critical` off until filled (§8). |

**App-side changes v0.2 depends on**, routed to the Platform track, unbuilt on `main` as of 2026-07-17 (agent builds against these once landed): `agent_work_queue` + enqueue triggers; weekly `deep` pg_cron enqueue; drop/replace `notify_agent` RPC; `telemetry.drive_id` + backfill; `referenced_telemetry_snapshot`; `has_anomaly` app-derived trigger. Plus confirmed bug fixes (`findings-from-repo-review.md`): downsample cron (P0-1/2/3), `peak_metrics` negative-seed (P1-2), `vehicles.last_sync_at` write (P1-1).

Until these land, the agent is built against a local Postgres with the shipped schema + these four migrations applied, and re-pinned to real DDL when Platform confirms column names/types.

---

## Changelog

- **2026-08-12 (v0.3, ratified):** Status corrected from "draft/pending" to ratified — §11 already recorded five resolutions. Resolved: `insufficient_data` split via structured marker (#3, withdrawing the v0.2 copy-convention recommendation); `referenced_telemetry_snapshot` core shape pinned (§5); queue claim index corrected to an expression index matching the claim sort (§4); `attempts` defined as counting failures not claims (§4); deep runs yield the per-vehicle lock at chunk boundaries (§4); "active vehicle" defined as ≥1 drive in 14 days (§4); `average_speed_kph` cut and `distance_km` to be computed (§9). Remaining open: coolant-threshold source (#4), hard threshold values (founder, CF-08).
- **2026-07-17 (v0.2, decisions folded in):** Cross-project review with App track. Resolved: trigger = work queue (#1); deep analysis = build weekly emitter (#2); `has_anomaly` = app-derived; `referenced_telemetry_ids` = add `referenced_telemetry_snapshot`; `telemetry.drive_id` = add + backfill. Added routine/deep consumption split (§4). Remaining open: `insufficient_data` split (#3), coolant-threshold source (#4), hard threshold values (founder). App-side migrations routed to Platform track, unbuilt on `main`.
- **2026-07-17 (v0.2, draft):** Reconciled with shipped schema (`20260602130000`). Adopted work-queue trigger (was Option A NOTIFY-only). Added canonical metric vocabulary (closes R22 / `TODO(metric-keys)`) and per-vehicle capability model. Recorded baselining + `safety_thresholds.yaml` with unvalidated safety gate. Recorded 5-min drive / 3-hour thermal-session split. Split `insufficient_data` into temporary/permanent. Corrected vehicle-context source (`vehicles.*`, not `vehicle_modifications`). Flagged nullable `recommended_action`/`referenced_drive_id`, telemetry-retention vs `referenced_telemetry_ids`, deep-analysis missing emitter, coolant-threshold dual source. 4 decisions marked for joint review.
- **2026-05-XX (v0.1):** Initial draft (`06_AI_Agent_Contract.md`). Never jointly reviewed; superseded.
