# AI Agent Contract

**Version:** v0.2 (draft for joint review)
**Status:** proposed — supersedes v0.1 (`06_AI_Agent_Contract.md`), pending ratification at cross-project sync.
**Owners:** app project (`Caeorta-io/caeorta_app`) + agent project.
**This document is the single source of truth for the app↔agent interface.** When it changes, both projects update, and the changelog at the bottom records it.

> **On v0.1 → v0.2.** v0.1 was drafted ~2026-05 and never jointly reviewed; its six "Week 1 open questions" stayed open while implementation moved ahead, so the doc drifted from what shipped (R1). v0.2 reconciles the doc with the shipped schema (verified against `20260602130000_initial_schema.sql`), records the decisions taken in agent-project design, and marks what genuinely remains open as **[DECISION REQUIRED]**. Nothing here is silently invented — every normative claim traces to the schema, a migration, or a recorded decision.

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

`telemetry`, `current_state`, `dtcs`, `drives`, `vehicles`, `vehicle_modifications`, `sync_sessions`, `diagnostic_outputs` (continuity), `diagnostic_feedback` (evals).

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

One row per unit of work. `kind ∈ {routine, deep, dtc}`; `state ∈ {pending, claimed, done, failed}`; `attempts int`; timestamps; `last_error`. Two partial indexes: `(enqueued_at) WHERE state='pending'` (claim path) and a **unique** `(vehicle_id, kind) WHERE state='pending'` (coalescing / cooldown). Full DDL in `proposed-app-changes.md §1`.

- **Enqueue** is a trigger on `sync_sessions` `AFTER UPDATE OF status` (fires atomically with the commit — cannot be skipped by a code path, cannot fire on a rolled-back commit; the v0.1 "Edge Function's last step" could). Analogous enqueues: `dtcs AFTER INSERT WHERE is_active` → `dtc`; weekly pg_cron → `deep`.
- **Wake-up** is a single `pg_notify('agent_trigger', '')` — channel name **kept from the shipped implementation**. Payload is empty; the agent reads the queue. (Retires the v0.1 `{sync_session_id, vehicle_id, drive_ids[]}` payload, which was never built — the shipped payload was `{session_id, vehicle_id, triggered_at}`.)
- **Claim** is `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1)` — multi-instance safe.

**What the queue absorbs for free:** durability (no lost work), cooldowns (the unique partial index enforces §5 declaratively), retries surviving restart (`attempts`), and the DTC + weekly triggers through one path and one consumer loop.

**Security:** the v1 `notify_agent` RPC is `SECURITY DEFINER` with no `REVOKE FROM PUBLIC` — any authenticated user can trigger agent runs on any vehicle. Adopting the queue moves enqueue to a table trigger and the RPC is dropped, closing this.

### Cooldowns (unchanged from v0.1)
≤1 routine run per vehicle per hour; ≤1 deep run per vehicle per week; manual runs (v2) bypass cooldowns, rate-limited per user per day.

### Deep analysis  **[DECISION REQUIRED #2]**
v0.1/BUILD REQ promise a weekly per-vehicle deep-analysis emitter from the app project. **No such pg_cron job exists** (the cron migration schedules only downsample + two cleanups). Decide: **build the weekly `deep` enqueue**, or **cut deep analysis from v1** and document it as v2. A trigger nothing fires must not ship silently.

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

### `referenced_telemetry_ids` vs retention  **[decided — app ack needed]**
Raw telemetry is purged at 30 days; `diagnostic_outputs` is kept indefinitely; `referenced_telemetry_ids` is a bare `uuid[]` with no FK/cascade. Every diagnostic older than 30 days will cite rows that no longer exist. **Decision (agent-priority): add `referenced_telemetry_snapshot jsonb`** to `diagnostic_outputs`; the agent copies the handful of cited samples inline at write time. Diagnostics become self-contained (also what the eval loop wants). Needs the app to add the column.

---

## 6. What the agent writes — `agent_status`

Upsert on `vehicle_id` (PK). `status ∈ {idle, analyzing, error, rate_limited}`, `updated_at`, `last_run_at`, `error_message`. Set `analyzing` on start; `idle` on success; `error` + message on failure; `rate_limited` when a cooldown blocks a run. (Verified against DDL.)

---

## 7. Severity / urgency / category, and the two "I don't know"s

Severity (consequence), urgency (timing), category (fixed enum) — meanings unchanged from v0.1 §"Severity, urgency, and category".

**`insufficient_data` splits into two cases  [DECISION REQUIRED #3]** *(new in v0.2)*

The per-vehicle capability model (§3) creates two genuinely different "can't assess" states that v0.1 collapses into one:

1. **Temporary** — not enough history yet. *"We need a few more drives to learn what's normal for your car."* Resolves with driving.
2. **Permanent** — the car doesn't report the needed metric. *"Your car doesn't report air–fuel ratio, so fuel-system analysis isn't available."* Never resolves; telling the user to "keep driving, we'll have more soon" (v0.1's boilerplate) would be a lie.

Both use `category='insufficient_data'`, `confidence<0.3`, `severity='info'`, `urgency='monitor'`. Decide how to distinguish them: **(a)** a convention on `title`/`explanation` only, or **(b)** a small structured marker. Recommend (a) for v1 (no schema change; agent varies the copy), revisit if the app needs to render them differently.

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

A **drive** is one ignition-cycle aggregate; `device_sync_complete` segments on a **5-minute** telemetry gap (`DRIVE_GAP_MS`, shipped) — **kept**. The agent does **not** merge drives at the source. "Was the engine cold?" is answered by the agent **grouping drives into thermal sessions at a 3-hour gap** at analysis time — a restart <3h is a warm start. Fine segmentation is recoverable (group at query time, free); coarse is lossy (raw telemetry gone at 30 days). `duration_seconds = ended_at − started_at`; note `distance_km`/`average_speed_kph` are **currently never computed** (always NULL) — the agent must not rely on them until they are.

---

## 10. Versioning, feedback, latency, error handling

- **Versioning** — semver `v<major>.<minor>.<patch>`; every output records `agent_version`. Major = breaking contract change (both projects update + this doc bumped before deploy). (v0.1 unchanged.)
- **Feedback / evals** — app writes `diagnostic_feedback` (`rating up|down`, optional `comment`); agent aggregates thumbs-down per category per version, reviews comments weekly, flags high-thumbs-down for prompt iteration. `diagnostic_id` is `ON DELETE CASCADE`; `user_id` is `ON DELETE SET NULL`. (Verified against DDL.)
- **Latency** — routine post-sync **P95 < 60s** to first output; manual (v2) P95 < 30s; deep no hard target. Set `agent_status='analyzing'` if exceeding. (The queue in §4 is what makes 60s survivable across deploys.)
- **Errors** — on failure: `agent_status='error'` + `error_message`, write **no** partial output. On provider rate-limit: `agent_status='rate_limited'`, stop. Retries: exponential backoff, cap 3, then log (Sentry) and move on. (v0.1 unchanged; retry count now lives durably in `agent_work_queue.attempts`.)

---

## 11. Open decisions (carried, for the review)

| # | Decision | Recommendation |
|---|---|---|
| 1 | Trigger mechanism | **Resolved → work queue (§4).** |
| 2 | Deep analysis: build emitter or cut from v1 | Founder call; don't ship a silent no-op. |
| 3 | `insufficient_data` temporary vs permanent | (a) copy convention for v1. |
| 4 | Coolant threshold single source of truth | One source; app consumes validated value. |

**App-side changes v0.2 depends on** (all in `proposed-app-changes.md`): `agent_work_queue` + enqueue triggers; drop/replace `notify_agent` RPC; `telemetry.drive_id`; `referenced_telemetry_snapshot`; `has_anomaly` app-derived; plus the confirmed bug fixes (downsample cron, `peak_metrics` negative-seed, `vehicles.last_sync_at` write).

---

## Changelog

- **2026-07-17 (v0.2, draft):** Reconciled with shipped schema (`20260602130000`). Adopted work-queue trigger (was Option A NOTIFY-only). Added canonical metric vocabulary (closes R22 / `TODO(metric-keys)`) and per-vehicle capability model. Recorded baselining + `safety_thresholds.yaml` with unvalidated safety gate. Recorded 5-min drive / 3-hour thermal-session split. Split `insufficient_data` into temporary/permanent. Corrected vehicle-context source (`vehicles.*`, not `vehicle_modifications`). Flagged nullable `recommended_action`/`referenced_drive_id`, telemetry-retention vs `referenced_telemetry_ids`, deep-analysis missing emitter, coolant-threshold dual source. 4 decisions marked for joint review.
- **2026-05-XX (v0.1):** Initial draft (`06_AI_Agent_Contract.md`). Never jointly reviewed; superseded.
