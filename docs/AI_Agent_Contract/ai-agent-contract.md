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

The agent authenticates as the dedicated `agent_role` Postgres role (migration `supabase/migrations/20260804000001_create_agent_role.sql` on `main`. *Until 2026-10-05 this sentence named `20260717000000_create_agent_role.sql`, which is the superseded proposal under `docs/AI_Agent_Contract/`, never applied; see §12*), over a **direct, session-mode connection** (Supavisor port 5432 — transaction pooling silently breaks `LISTEN`).

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

**Absent ≠ zero ≠ normal.** The pre-filter must never read a missing metric as `0`. (`device_sync_complete`'s `peak_metrics` seeding once broke this rule with `Math.max(x ?? 0, val)`, bug P1-2. It was fixed in `3748031` on 2026-08-05: the first observed value seeds the max, whatever its sign, and a metric that never appears gets no key. *Corrected 2026-10-05; this note said "live today" until then.* `distance_km` follows the same rule, see §9.)

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

*Status (2026-10-05): closed on `main`, and this paragraph describes the past.* `20260803000001` and `20260803000002` revoked `EXECUTE` from `PUBLIC`, `anon` and `authenticated`. `20260804000005` then dropped the function. Per the 2026-09-30 audit, dev lags `main` only by the three `20260812*` migrations, so the drop is in dev. Prod has no promotion recorded after the three Week-1 migrations (2026-06-21), so prod most likely never received `notify_agent`; that cannot be confirmed from this repo.

### Cooldowns (unchanged from v0.1)
≤1 routine run per vehicle per hour; ≤1 deep run per vehicle per week; manual runs (v2) bypass cooldowns, rate-limited per user per day.

### Routine vs deep: same channel, different jobs  *(resolved — build deep)*

**Decision (2026-07-17): build the weekly deep emitter now** (not cut to v2). The app project adds a pg_cron job that, once a week, enqueues a `deep` row per active vehicle and fires the same `pg_notify('agent_trigger','')`.

`routine` and `deep` share the wake-up channel and the claim loop, but are **not** the same job. The agent consumes them differently:

- **Scope.** `routine` = the drives in one sync session (`sync_session_id` set). `deep` = the whole vehicle over a trailing window (`sync_session_id` NULL; agent derives the window — default trailing 7 days of drives). Different reads, prompt, and token budget.
- **Enqueue shape.** `deep` rows set `kind='deep'`, `vehicle_id`, and leave `sync_session_id`/`dtc_id` NULL. The cron does one `INSERT ... SELECT` across active vehicles with `ON CONFLICT DO NOTHING` against the `(vehicle_id, kind) WHERE state='pending'` dedupe index (no doubling if a `deep` is already pending). Default cadence Sundays 04:00 UTC (matches the shipped cron), **jittered** — the agent spreads claims rather than the cron enqueuing in a burst, so no app-side change is needed for this.

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

**`average_speed_kph` is NULL on every row; `distance_km` is computed as of the `device_sync_complete` correctness PR (2026-10-05).** Resolved separately:

- **`average_speed_kph` is cut.** It duplicates `summary_metrics.speed_kph`, which the same function's existing average loop already computes. Drop the column and stop documenting it. — *Build status: decided 2026-08-12; **not yet shipped as of 2026-10-05**. No migration drops the column. Scheduled per the 2026-10-05 ruling (§12, D2).*
- **`distance_km` is computed.** It is the denominator for per-100km rate baselining (§8), and the segmentation loop already holds the samples, so `Σ(speed × Δt)` lands inside the loop that exists. — *Build status: decided 2026-08-12; **built 2026-10-05** in the `device_sync_complete` correctness PR (§12, D1).* What the agent can rely on:
  - Trapezoidal integration of `speed_kph` between consecutive samples.
  - Absent is never zero: a sample without `speed_kph` breaks the chain, and the intervals either side of it are skipped rather than read as 0 km/h.
  - Intervals longer than 30 s are skipped rather than extrapolated, because they mean samples were lost.
  - So `distance_km` is a **lower bound** when samples are missing, never an invented figure.
  - **NULL means unknown** (no usable interval: fewer than two adjacent samples with speed). **`0` means stationary.** Rate baselining must exclude NULL drives, not treat them as zero distance.
  - Drives created before this PR keep `distance_km` NULL; nothing backfills them.

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
| — | `referenced_telemetry_ids` vs 30-day purge | **Resolved → add `referenced_telemetry_snapshot jsonb`** (§5). On `main` in `20260812000002` (PR #59); not yet in dev as of the 2026-09-30 audit. *(Read "App-side migration pending" until 2026-10-05.)* |
| — | `telemetry.drive_id` | **Resolved → add column; no backfill** (amended 2026-10-05). Column + indexes on `main` in `20260812000001`; not yet in dev as of the 2026-09-30 audit (dev carries the column from the orphan `20260804000004`). The backfill was **deliberately refused**: drive boundaries were computed in memory and never persisted, so historical telemetry cannot be reliably assigned to a drive. Pre-association rows keep `drive_id IS NULL` and are served by the `sync_session_id` + `timestamp` path (`telemetry_sync_session_id_timestamp_idx`). See §12, D3. *(Read "**Resolved → add column + one-time backfill** (§3). App-side migration pending." until 2026-10-05.)* |
| 3 | `insufficient_data` temporary vs permanent | **Resolved → structured marker in `referenced_telemetry_snapshot`** (§7). Copy convention withdrawn. |
| — | Queue claim index vs claim sort | **Resolved → expression index `((kind <> 'routine'), enqueued_at)`** (§4). `(kind, enqueued_at)` does not serve the sort. |
| — | Routine SLO behind a running deep | **Resolved → deep yields the vehicle lock at chunk boundaries** (§4). Mutex kept. |
| — | "Active vehicle" for the weekly deep enqueue | **Resolved → ≥1 drive in the last 14 days** (§4). |
| — | `referenced_telemetry_snapshot` shape | **Resolved → core pinned in §5**, `schema: 1`. Agent may extend; core changes require a bump. |
| — | `drives.average_speed_kph` / `distance_km` | **Resolved → cut `average_speed_kph`; compute `distance_km`** (§9). Neither is built as of 2026-10-05; both are scheduled (§12, D1–D2). |
| 4 | Coolant threshold single source of truth | Open — one source; app consumes validated value. |
| — | Hard safety thresholds (values) | Open — founder/domain research. Non-blocking: `unvalidated` gate keeps `critical` off until filled (§8). |

**App-side changes v0.2 depends on**, routed to the Platform track, unbuilt on `main` as of 2026-07-17 (agent builds against these once landed): `agent_work_queue` + enqueue triggers; weekly `deep` pg_cron enqueue; drop/replace `notify_agent` RPC; `telemetry.drive_id` + backfill; `referenced_telemetry_snapshot`; `has_anomaly` app-derived trigger. Plus confirmed bug fixes (`findings-from-repo-review.md`): downsample cron (P0-1/2/3), `peak_metrics` negative-seed (P1-2), `vehicles.last_sync_at` write (P1-1).

Until these land, the agent is built against a local Postgres with the shipped schema + these four migrations applied, and re-pinned to real DDL when Platform confirms column names/types.

*Status (2026-10-05): the paragraph above is a 2026-07-17 record.* Every item in it is now on `main` **except the `telemetry.drive_id` backfill, which was deliberately refused** (§12, D3):
- the queue, its enqueue triggers and the weekly `deep` cron: `20260804000002`, `20260804000003`, `20260812000003`
- `notify_agent` dropped: `20260804000005`
- `telemetry.drive_id`: `20260812000001`
- `referenced_telemetry_snapshot` and the `has_anomaly` trigger: `20260812000002`
- the downsample cron fix: `20260803000003`
- the `peak_metrics` seed fix: `device_sync_complete`
- P1-1: `device_sync_complete` no longer writes the nonexistent `vehicles.last_sync_at`; the column lives on `devices`, and the function updates it there

**On `main` is not the same as in dev.** Per the 2026-09-30 audit, the three `20260812*` migrations are not in dev, and the repo records no push since. The agent's re-pin target is the migration set on `main`; whether a given environment matches it has to be checked against that environment.

---

## 12. Conformance — contract vs shipped schema (as of 2026-09-30)

This contract is ratified and normative. The schema on `main` does not yet match it everywhere. Divergences are recorded here rather than left implicit, because a contract that silently describes DDL that does not exist is the drift this document exists to prevent (R1).

**Shipped and conformant:** `agent_role` (`20260804000001_create_agent_role.sql`); `agent_work_queue` — table, `ENABLE ROW LEVEL SECURITY`, `GRANT SELECT, UPDATE ... TO agent_role`, and both the `FOR SELECT` and `FOR UPDATE` policies are all present, so the claim loop is correctly readable (`20260804000002`); the three enqueue paths — `sync_session_completed_enqueue`, `dtc_active_enqueue`, and the `enqueue-weekly-deep-analysis` pg_cron job (`20260804000003`); `notify_agent` retired outright via `DROP FUNCTION IF EXISTS public.notify_agent(uuid, uuid)` (`20260804000005`). The `drives (vehicle_id, started_at DESC)` index §4 asks for already exists (`20260602130000_initial_schema.sql`), so the 14-day predicate is indexed on arrival.

**Brought into conformance since this section was written:** `telemetry.drive_id` + its partial index and a `(sync_session_id, timestamp)` index (`20260812000001`); and, in `20260812000003`, the four queue divergences below — the claim index replaced with the expression form `((kind <> 'routine'), enqueued_at) WHERE state='pending'` that the claim sort actually needs, `attempts` documented as counting failures rather than claims, the weekly deep cron rescheduled with a 14-day active-vehicle predicate in place of "any drive ever", and `agent_role`'s `SELECT` on `vehicle_modifications` revoked along with its policy.

**Divergent — code and schema not yet matching this contract (corrected 2026-10-05):** three items. Each is a decision §§9 and 11 record correctly; the error was in describing them as shipped state.

| # | Contract | What it says | What `main` actually does | Ruling (2026-10-05) |
|---|---|---|---|---|
| D1 | §9 | `distance_km` "is computed" (`Σ(speed × Δt)` inside the segmentation loop) | `device_sync_complete` writes `peak_metrics` and `summary_metrics` only. Nothing under `supabase/functions/` writes `drives.distance_km`; it is NULL on every row the function creates. | **Build it.** The per-100km denominator for rate baselining (§8); the segmentation loop already holds the samples. **Resolved 2026-10-05:** the `device_sync_complete` correctness PR computes it (§9 records the NULL-when-unknown rule). |
| D2 | §9 | `average_speed_kph` "is cut … Drop the column" | No migration drops it. The column exists from `20260602130000_initial_schema.sql` and is never written, so it is always NULL. | **Drop the column** — scheduled, not open. It duplicates `summary_metrics.speed_kph`, which the same function already computes. Lands in a migration after the D1 PR. |
| D3 | §11 | `telemetry.drive_id` gets "add column + one-time backfill" | `20260812000001` adds the column and **deliberately refuses** a backfill (its §3). | **Recorded as deliberately refused**; §11 amended. Drive boundaries were computed in memory and never persisted, so historical telemetry cannot be reliably assigned to a drive. Pre-association rows (`drive_id IS NULL`) are served by the `sync_session_id` + `timestamp` path, which is why `telemetry_sync_session_id_timestamp_idx` is not redundant. The NULL cohort drains with the 30-day purge. |

D1 and D2 describe `main`. Dev's state is a separate question and cannot be read from this repo (see the dev-drift paragraph below).

*(Until 2026-10-05 this paragraph read: "**Divergent — schema to be corrected to match this contract:** none. As of `20260812000003` the shipped schema is conformant with §§1–11." That was wrong from the day it was written (2026-08-12). It checked the queue divergences, but not the §9 and §11 resolutions, which still described decisions as if they had shipped. It was found in the 2026-09-30 docs reconciliation and left as written pending these rulings.)*

**The `telemetry.drive_id` episode is worth keeping.** The column was written by `device_sync_complete` from `c1dafc4` onward while existing in no migration — the write's error was caught and logged as non-fatal, so an environment built from the migration set alone silently never populated it and reported nothing. `20260812000001` closes the gap. The open question it raised — the column existed in the dev database before any migration on `main` created it, so dev had drifted from `supabase/migrations/` by some unrecorded route — was audited on 2026-09-30, comparing dev against a database built from the migration set. The route was a migration, not an out-of-band edit: dev's history holds version `20260804000004` (`telemetry_drive_id`), applied 2026-08-06, whose file never reached the repo. The audit found **zero type or nullability mismatches**; **two true drift items** — that orphan history record, and the index it left behind, `telemetry_drive_id_timestamp` on `(drive_id, "timestamp")`, which no migration on `main` created — both resolved by recreating the file as `20260804000004_telemetry_drive_id.sql`; and **ten lag differences**, all of them the three `20260812*` migrations not yet applied to dev. **Still pending:** those three have not been pushed to dev, and could not be while dev's history held a version with no local file. The lag differences close when dev is pushed, which is a separate, deliberate step; until then dev remains behind `main`. **Stated plainly: as of 2026-09-30 dev has NOT been pushed. What this section says about conformance describes the migration set on `main`; it is not yet true of the dev database.** **One limit of the audit:** its column capture recorded name, type and nullability only — not `column_default` — so defaults are unverified across every column, and a default-only drift would not have shown up. The lesson stands: absence from the migration set is not evidence of absence from a live database — check both.

**Contract yields to shipped:** the weekly deep cron runs `'0 4 * * 0'` — Sundays 04:00 UTC — rather than the 02:00 UTC originally named in §4. An arbitrary choice where the shipped value is already live; §4 updated to match.

**Landed on `main` 2026-09-28 — no longer in flight:** both items below are delivered by `20260812000002`, which merged as PR #59. *(Until 2026-09-30 this paragraph was headed "In flight, blocking app work" and called that migration "open and unmerged"; it stayed that way for two days after the merge.)* Neither is in dev yet — `20260812000002` is one of the three unpushed migrations above.

- **`referenced_telemetry_snapshot jsonb` on `diagnostic_outputs`** (§5) — the column now exists on `main`. It gates rendering of any diagnostic past the 30-day telemetry purge, and gates the §7 `insufficient_data` marker. `apps/mobile/src/lib/diagnostics.ts` carries `deriveInsufficientDataKind`, which was written to return `'unknown'` unconditionally while awaiting this column; wiring it to the column is App-side work that follows, and is additionally gated on regenerating `packages/supabase/src/database.types.ts`.
- **`drives.has_anomaly` app-derived trigger** (§11) — `diagnostic_output_sets_has_anomaly` now exists on `main`, so the column is no longer write-once-`false` in an environment built from the migration set. It is `SECURITY DEFINER` with `SET search_path = public, pg_temp`, because it fires inside the agent's insert transaction as `agent_role`, which has no UPDATE grant on `drives` and must not be given one.

The prefix `20260804000004` was long described here as an unused gap — the sequence on `main` ran `…0001, 0002, 0003, 0005`. That was true of the repo and false of dev: the version was applied in dev on 2026-08-06 as `telemetry_drive_id`, and its file was lost before reaching any branch. It is recreated at its true number by `20260804000004_telemetry_drive_id.sql`, written from dev's captured DDL with every statement guarded, so it is a no-op on dev and creates the objects elsewhere. The two items above were never placed in that number; they are numbered normally in `20260812000002`, so migration order stays monotonic with wall-clock time. (`20260812000002`'s own header still calls the number unused; it is an applied migration and is left as written.) The commented-out `GRANT UPDATE (has_anomaly)` at `20260804000001:119` is dead once that trigger lands, and is deliberately left in place — it is inert commented SQL, and applied migrations are immutable. `20260812000003` records that resolution; it needs no further action.

**Superseded artifact:** `docs/AI_Agent_Contract/20260717000000_create_agent_role.sql` is the proposal; `supabase/migrations/20260804000001_create_agent_role.sql` is what applied. The proposal is not present in `supabase/migrations/`. It is retained as the decision record for [Q-A]–[Q-D] and is not to be moved into `supabase/migrations/`.

---

## Changelog

- **2026-10-05 (v0.3, `device_sync_complete` correctness pass):** D1 resolved, so `distance_km` is now computed (§9). §3's "live today" note on the `peak_metrics` zero-seed is corrected: `3748031` fixed it on 2026-08-05. The same PR also fixed two defects nobody had recorded:
  - The function's telemetry read was capped at 1000 rows (`max_rows`), so every aggregate for a session over 1000 rows silently ignored the rest.
  - The `telemetry.drive_id` association write failed with "URI too long" for large drives.

  D2 is unchanged. No normative change beyond §9's `distance_km` semantics.

- **2026-10-05 (v0.3, §12 divergence corrected):** §12's "Divergent: none" was wrong and is replaced with three items:
  - D1: `distance_km` is not computed. Ruling: build it, in the `device_sync_complete` PR.
  - D2: `average_speed_kph` is not dropped. Ruling: drop the column, in a later migration.
  - D3: the `telemetry.drive_id` backfill was deliberately refused by `20260812000001`. Ruling: record the refusal; §11 amended to "no backfill".

  §9's two resolutions are kept and carry their build status. Stale present-tense claims in §1 (role migration path), §4 (`notify_agent` hole) and §11 ("pending" / "unbuilt on `main`") carry dated corrections. No normative change beyond D3's amendment to §11.

- **2026-09-30 (v0.3, §12 reconciled with `main`):** §12 heading re-dated; the "in flight" paragraph corrected now that `20260812000002` has merged (PR #59, 2026-09-28); the dev-drift paragraph now states outright that dev has not been pushed and that the audit did not capture `column_default`. No normative change to §§1–11.

- **2026-09-30 (v0.3, dev-drift audit recorded):** §12 corrected — `20260804000004` was not an unused gap but a migration applied in dev 2026-08-06 whose file was lost; it is recreated as `20260804000004_telemetry_drive_id.sql`, adopting dev's `telemetry_drive_id_timestamp` index. Audit result recorded: zero type/nullability mismatches, two true drift items (both resolved by that file), ten lag differences pending the push of the three `20260812*` migrations to dev. No normative change to §§1–11.

- **2026-08-12 (v0.3, schema brought into conformance):** `20260812000003` closes the four queue divergences §12 recorded — claim index replaced with the expression form matching the claim sort, `attempts` documented as counting failures, weekly deep cron bounded to a 14-day active-vehicle predicate, and `agent_role`'s `vehicle_modifications` read revoked. With `20260812000001` (`telemetry.drive_id`) the divergence table is empty. §12 updated; no normative change to §§1–11.
- **2026-08-12 (v0.3, conformance section added):** §12 records divergence between this contract and the migrations shipped 2026-08-04, and adopts the shipped weekly-cron schedule. No normative change to §§1–11.
- **2026-08-12 (v0.3, ratified):** Status corrected from "draft/pending" to ratified — §11 already recorded five resolutions. Resolved: `insufficient_data` split via structured marker (#3, withdrawing the v0.2 copy-convention recommendation); `referenced_telemetry_snapshot` core shape pinned (§5); queue claim index corrected to an expression index matching the claim sort (§4); `attempts` defined as counting failures not claims (§4); deep runs yield the per-vehicle lock at chunk boundaries (§4); "active vehicle" defined as ≥1 drive in 14 days (§4); `average_speed_kph` cut and `distance_km` to be computed (§9). Remaining open: coolant-threshold source (#4), hard threshold values (founder, CF-08).
- **2026-07-17 (v0.2, decisions folded in):** Cross-project review with App track. Resolved: trigger = work queue (#1); deep analysis = build weekly emitter (#2); `has_anomaly` = app-derived; `referenced_telemetry_ids` = add `referenced_telemetry_snapshot`; `telemetry.drive_id` = add + backfill. Added routine/deep consumption split (§4). Remaining open: `insufficient_data` split (#3), coolant-threshold source (#4), hard threshold values (founder). App-side migrations routed to Platform track, unbuilt on `main`.
- **2026-07-17 (v0.2, draft):** Reconciled with shipped schema (`20260602130000`). Adopted work-queue trigger (was Option A NOTIFY-only). Added canonical metric vocabulary (closes R22 / `TODO(metric-keys)`) and per-vehicle capability model. Recorded baselining + `safety_thresholds.yaml` with unvalidated safety gate. Recorded 5-min drive / 3-hour thermal-session split. Split `insufficient_data` into temporary/permanent. Corrected vehicle-context source (`vehicles.*`, not `vehicle_modifications`). Flagged nullable `recommended_action`/`referenced_drive_id`, telemetry-retention vs `referenced_telemetry_ids`, deep-analysis missing emitter, coolant-threshold dual source. 4 decisions marked for joint review.
- **2026-05-XX (v0.1):** Initial draft (`06_AI_Agent_Contract.md`). Never jointly reviewed; superseded.
