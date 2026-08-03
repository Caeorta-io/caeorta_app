# Findings from app-repo review

Source: `Caeorta-io/caeorta_app` @ `main`, read 2026-07-17 by the agent project.
Everything below was **verified empirically against PostgreSQL 16** (matching
Supabase) unless marked *by inspection*.

Ordered by severity. P0/P1 items are mostly in **dev-only migrations not yet
promoted to prod** — which is the good news. They're cheap to fix now.

---

## P0-1 — `downsample-old-telemetry` cron job fails every night (hard SQL error)

**File:** `supabase/migrations/20260614000002_add_pg_cron_jobs.sql`, Job 1.
**Status:** applied to dev, not prod.

The inner subquery selects a bare `timestamp` while grouping by
`date_trunc('minute', timestamp)`:

```sql
SELECT vehicle_id, sync_session_id, timestamp, key, AVG(value::numeric) AS avg_val
FROM telemetry, jsonb_each_text(metrics) AS kv(key, value)
WHERE ...
GROUP BY vehicle_id, sync_session_id, date_trunc('minute', timestamp), key;
```

`timestamp` is not in the GROUP BY and is not functionally dependent on
`date_trunc('minute', timestamp)`. Postgres rejects it:

```
ERROR:  column "telemetry.timestamp" must appear in the GROUP BY clause
        or be used in an aggregate function
```

**Verified** by running the exact query from the migration against a real
`telemetry` table on PG 16.

**Impact:** the job has never successfully run. It fails silently at 02:00 UTC
nightly — pg_cron records the failure in `cron.job_run_details` and nothing else
surfaces it. Since raw telemetry is only 30 days old at the earliest on dev, no
one would have noticed yet.

**Check:** `SELECT jobid, status, return_message, start_time FROM
cron.job_run_details WHERE status != 'succeeded' ORDER BY start_time DESC;`

Note also the outer query then does `GROUP BY vehicle_id, sync_session_id,
timestamp` on the **raw** timestamp — so even with the inner error fixed, it
would group per raw sample and downsample nothing. Both levels need rewriting,
not a one-line patch.

---

## P0-2 — Downsampling breaks on any non-numeric metric

**Same file, Job 1.** `AVG(value::numeric)` casts *every* value in the `metrics`
jsonb. OBD-II PIDs are not all numeric — `fuel_system_status` is a standard PID
that returns a string enum (`"closed_loop"`), and any boolean or string metric
does the same thing:

```
ERROR:  invalid input syntax for type numeric: "closed_loop"
```

**Verified** on PG 16 with `{"rpm":3000,"fuel_system_status":"closed_loop"}`.

One non-numeric metric in one sample kills the entire night's job for **all
vehicles**. Needs a numeric filter (e.g. `WHERE jsonb_typeof(value) = 'number'`
using `jsonb_each` rather than `jsonb_each_text`).

---

## P0-3 — Downsampling silently keeps raw samples and mislabels them as aggregates

**Same file, Job 1.** The DELETE preserves rows on a minute boundary, intending
to protect the just-inserted aggregates:

```sql
DELETE FROM telemetry
WHERE timestamp < now() - interval '30 days' AND timestamp >= now() - interval '31 days'
  AND id NOT IN (SELECT id FROM telemetry WHERE timestamp = date_trunc('minute', timestamp));
```

But a **raw** sample whose timestamp happens to land exactly on `:00` also
satisfies `timestamp = date_trunc('minute', timestamp)`. It survives, and is now
indistinguishable from an aggregate.

**Verified:** inserted two raw samples — one at `:00` (rpm 7200), one at `:03`
(rpm 2000). After running the migration's exact DELETE, the survivor was:

```
       timestamp        |    metrics
------------------------+---------------
 2026-06-17 05:30:00+00 | {"rpm": 7200}
```

A raw peak-RPM sample, retained as if it were a per-minute average.

**The deeper problem:** `telemetry` has **no column distinguishing a raw sample
from a downsampled aggregate** — the shape is identical (`id`, `vehicle_id`,
`sync_session_id`, `timestamp`, `metrics`). After downsampling, the table is a
mix of the two, and **no consumer can tell them apart** — not the app, not the
AI agent.

This matters directly for the agent: it would compute baselines over a silent
mix of instantaneous readings and minute-averages. Averaging also destroys
exactly the signal a diagnostic agent needs — a 1-second knock event or a boost
spike averages away to nothing over 60s. (The schema already acknowledges this
elsewhere: `drives.peak_metrics` exists precisely because peaks matter.)

**Suggested:** add `is_downsampled boolean NOT NULL DEFAULT false` (or a
`resolution` column), and aggregate `min`/`max`/`avg` per metric rather than
`avg` alone.

Also *by inspection*: `ON CONFLICT DO NOTHING` in the INSERT is a no-op —
`telemetry`'s only unique constraint is `id`, which is freshly generated per
row, so no conflict can ever occur. The job is not idempotent; a re-run
duplicates aggregates.

---

## P0-4 — `notify_agent` is callable by any authenticated user

**File:** `supabase/migrations/20260614000001_add_notify_agent.sql`.

```sql
CREATE OR REPLACE FUNCTION public.notify_agent(p_session_id uuid, p_vehicle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;
```

There is **no `REVOKE EXECUTE ... FROM PUBLIC`** anywhere in the repo (grepped).
Postgres grants `EXECUTE` on new functions to `PUBLIC` by default, and Supabase
exposes `public` schema functions as PostgREST RPC endpoints to the
`authenticated` role.

**Verified** on PG 16: `proacl` is NULL (= PUBLIC has EXECUTE), and
`SET ROLE authenticated; SELECT public.notify_agent(gen_random_uuid(),
gen_random_uuid());` **succeeds**.

**Impact:** any logged-in pilot user can `POST /rest/v1/rpc/notify_agent` with
arbitrary `session_id` / `vehicle_id` and make the AI agent run analysis on any
vehicle, repeatedly. That's unmetered LLM spend triggered by an unprivileged
caller, plus junk `diagnostic_outputs` on other users' vehicles. RLS doesn't
help — `SECURITY DEFINER` runs as the owner, and the function takes the
vehicle_id as a parameter without checking ownership.

**Fix:**

```sql
REVOKE EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_agent(uuid, uuid) TO service_role;
```

Also add `SET search_path = public, pg_temp` to the function — `SECURITY
DEFINER` without a pinned `search_path` is a standard Supabase lint warning.

Note this is mitigated entirely if the queue design (proposed-app-changes.md §1)
lands, since enqueue moves to a table trigger and the RPC disappears.

---

## P1-1 — `device_sync_complete` writes to a column that doesn't exist

**File:** `supabase/functions/device_sync_complete/index.ts`

```ts
await adminClient.from('vehicles')
  .update({ last_sync_at: new Date().toISOString() })
  .eq('id', session.vehicle_id);
```

**`vehicles` has no `last_sync_at` column.** Confirmed against
`20260602130000_initial_schema.sql` — the columns are `id`, `owner_user_id`,
`device_id`, `make`, `model`, `year`, `vin`, `nickname`, `ecu_type`,
`modifications`, `created_at`. `last_sync_at` exists on **`devices`**, which the
function updates separately and correctly two statements later.

The result isn't checked (`await` without reading `.error` — supabase-js returns
errors, it doesn't throw), so this fails **silently on every single sync**.

Either add the column or drop the call. *By inspection.*

---

## P1-2 — `peak_metrics` is wrong for any metric that peaks negative

**Same file:**

```ts
peakMetrics[key] = Math.max(peakMetrics[key] ?? 0, val);
```

Seeding with `0` means a metric whose real maximum is negative reports `0`.
This affects real OBD-II signals: `boost_bar` is **negative under vacuum** (i.e.
most normal driving, and always on a naturally-aspirated car), and short/long
fuel trims swing negative.

So a cruising car records `peak_boost_bar: 0` — reading as "no vacuum, at
atmospheric" rather than the true peak vacuum. Ambient/intake temps below 0°C
have the same issue.

This matters more than it looks: `drives.peak_metrics` is the substrate the
agent's per-vehicle baseline should be built from (it survives the 30-day
telemetry retention, unlike raw samples). A systematically wrong peak poisons
the baseline.

**Fix:** seed from the first observed value, not `0` — `peakMetrics[key] =
peakMetrics[key] === undefined ? val : Math.max(peakMetrics[key], val)`.
*By inspection.*

---

## P1-3 — Session is marked `completed` and the agent notified even if drives failed to insert

**Same file.** The drives insert logs and continues:

```ts
if (drivesError) { console.error('drives insert error:', drivesError); }
```

...then unconditionally marks the session `completed` and calls `notify_agent`.

So the agent can be woken for a sync session that has **zero drives**, with no
way to distinguish "this sync legitimately contained no drives" from "drive
creation failed." Per BUILD REQ §7 the agent must write *something* — it would
emit `insufficient_data`, which is wrong: the data existed, the write failed.

Related: the whole function is a sequence of independent admin calls, not a
transaction. If it dies between "mark completed" and `notify_agent`, the
notification is lost permanently and the drive waits for the sweep — which is
the exact durability gap the work-queue proposal addresses
(proposed-app-changes.md §1). The code even acknowledges it: *"Non-fatal — agent
will poll as fallback."* There is no polling fallback built yet.

---

## P2-1 — `docs/ai-agent-contract.md` does not exist in the repo

BUILD REQ §4 states it is **"THE source of truth"** and §3 calls it "the live
evolving copy." §15 lists it as the primary coordination artifact, and R1 in
`09_Risks_And_Mitigations.md` tracks contract drift as the **primary risk**.

The repo contains only `docs/06_AI_Agent_Contract.md` (the immutable v0.1 spec).
The live contract is either uncommitted or lives somewhere outside version
control. Either way, the document designated to prevent contract drift is not
under change control — which is close to the definition of the risk it exists to
mitigate.

---

## P2-2 — Retention doc vs cron job mismatch

`05_Database_Schema.md` says `sync_sessions` is retained **1 year**. Job 3 in
the cron migration deletes `failed`/`pending` sessions after **7 days**.

Minor, and arguably intentional — but note `telemetry.sync_session_id` is
`ON DELETE SET NULL`, so deleting sessions nulls the link on any telemetry
uploaded under them. Since `get_drive_telemetry` looks up telemetry **by
`sync_session_id`**, that path silently returns nothing for affected drives.
*By inspection.*

---

## Answers to previously-open questions

| Question | Answer found in repo |
|---|---|
| NOTIFY channel name (OQ-5) | **`agent_trigger`**. Payload `{session_id, vehicle_id, triggered_at}` — note key is `session_id`, **not** `sync_session_id`, and there is **no `drive_ids`**. BUILD REQ §5's documented payload is wrong. |
| Do CHECK constraints exist? | **Yes** — `severity`, `urgency`, `category`, `status` all constrained; `confidence numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1)`. My earlier ask is already satisfied; §3 of the proposal is closed. |
| Trigger vs Edge Function emit | **Edge Function.** `notify_agent` is an RPC called by `device_sync_complete`, confirming BUILD REQ §5 over the contract's Option A. The critique in proposed-app-changes.md §1 stands. |
| How is telemetry associated to a drive? | `get_drive_telemetry` uses **`sync_session_id` + `timestamp BETWEEN started_at AND ended_at`**. A working convention exists — I was wrong to imply none did. But there is **no index on `telemetry.sync_session_id`** (only `(vehicle_id, timestamp DESC)`), so this filter scans. See below. |
| `drives.has_anomaly` | Set to `false` by `device_sync_complete` at insert and **never updated by anything in the repo**. So the schema doc's "flag set by agent" describes an intent nobody implemented. Ruling still needed. |
| `ecu_type` | `text CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other'))`, **nullable, no default**. `modifications jsonb NOT NULL DEFAULT '{}'`. |

### `telemetry.drive_id` — the ask just got much cheaper

`device_sync_complete` **already segments telemetry into drives in memory** to
compute `peak_metrics`/`summary_metrics`. At that moment it knows exactly which
samples belong to which drive — it just doesn't persist the association.

So populating `telemetry.drive_id` is close to free: the boundaries are already
computed. Add the column, and set it on the samples in each segment when the
drive row is inserted. That removes the unindexed `sync_session_id` + range scan
from the agent's hot path (and from `get_drive_telemetry`'s), and removes the
edge ambiguity for back-to-back drives within one session.
