# Proposed app-project changes — agent integration

Status: proposal for cross-project review.
Verified against `docs/05_Database_Schema.md` (v1) and `docs/ai-agent-contract.md`.
Supersedes the earlier draft (written against assumed schema).
Companion migration: `20260717000000_create_agent_role.sql`.

Founder has given agent design priority over existing app-side setup. The list
below is still deliberately minimal — every item is coordination cost against R1
(contract drift), so nothing is here that doesn't buy something concrete.

**Closed by reading the schema doc — no longer open questions:**

| Was | Now |
|---|---|
| OQ-3 sequence grants | Closed — every v1 PK is `uuid`. No sequences exist. |
| OQ-4 which tables have RLS | Answered — **all 26**, verified prod 2026-06-21. Every read table needs an agent policy. |
| `drives.sync_session_id` | **Already exists.** Proposed change withdrawn. |
| OQ-6 modification signal | **Already exists** — `vehicles.ecu_type` + `vehicles.modifications`. See §4. |

---

## 1. Trigger architecture — durable queue + NOTIFY as wake-up

### Current implementation (read from repo 2026-07-17)

`20260614000001_add_notify_agent.sql` defines a `notify_agent(p_session_id,
p_vehicle_id)` RPC that emits on channel **`agent_trigger`** with payload
`{session_id, vehicle_id, triggered_at}`. It is called by
`device_sync_complete/index.ts` as its last step.

So: **channel name is `agent_trigger`** (OQ-5 answered — my proposed
`caeorta_sync_complete` is withdrawn, no reason to rename a working channel).
The payload carries **no `drive_ids`**, contra BUILD REQ §5, and the key is
`session_id` not `sync_session_id`.

Two problems with the current implementation, both detailed in
`findings-from-repo-review.md`:

- **P0-4:** `notify_agent` is `SECURITY DEFINER` with no `REVOKE ... FROM
  PUBLIC`, so any authenticated user can call it via PostgREST RPC and trigger
  agent runs on arbitrary vehicles. Verified.
- **P1-3:** the Edge Function marks the session `completed` and notifies even
  when the drives insert failed, and the sequence isn't transactional — if it
  dies between the two, the notification is lost with no fallback. The code
  comments *"agent will poll as fallback"*; no polling fallback exists.

The queue design below fixes both structurally: enqueue moves to a table trigger
(atomic with the status transition, no RPC to expose), and the RPC can be
dropped entirely.

### The problem

The contract specifies NOTIFY (Option A); BUILD REQ §5 adds a 10-minute sweep as
backstop. But `NOTIFY` is **fire-and-forget** — a listener not connected at emit
time (restart, redeploy, crash, blip) loses the event permanently. The routine
SLO is **P95 < 60s** (§11). The sweep runs every **10 minutes**.

A dropped notification doesn't degrade the SLO gently — it misses by ~10x. Every
agent deploy during a sync window silently blows that user's drive.

The sweep is also expensive to run often: "completed sync_sessions with no
diagnostic_outputs for any drive in the session" is a three-table anti-join.
Worse, per the schema doc's index list, `sync_sessions` is indexed on
`(device_id, started_at DESC)` — **there is no index on `status`** — so the sweep
seq-scans. Which is presumably why it's set at 10 minutes rather than tighter.

### Proposed: `agent_work_queue`

Separate **durability** (a table, transactional) from **latency** (NOTIFY, a
hint). Standard pattern; fixes both at once.

```sql
CREATE TABLE public.agent_work_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       uuid NOT NULL REFERENCES public.vehicles(id),
  kind             text NOT NULL CHECK (kind IN ('routine','deep','dtc')),
  sync_session_id  uuid REFERENCES public.sync_sessions(id),
  dtc_id           uuid REFERENCES public.dtcs(id),
  state            text NOT NULL DEFAULT 'pending'
                     CHECK (state IN ('pending','claimed','done','failed')),
  attempts         int  NOT NULL DEFAULT 0,
  enqueued_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at       timestamptz,
  completed_at     timestamptz,
  last_error       text
);

-- the only hot query path
CREATE INDEX agent_work_queue_pending
  ON public.agent_work_queue (enqueued_at) WHERE state = 'pending';

-- coalescing guard: at most one pending job per vehicle per kind
CREATE UNIQUE INDEX agent_work_queue_dedupe
  ON public.agent_work_queue (vehicle_id, kind) WHERE state = 'pending';

ALTER TABLE public.agent_work_queue ENABLE ROW LEVEL SECURITY;  -- design principle 2
GRANT SELECT, UPDATE ON public.agent_work_queue TO agent_role;
CREATE POLICY agent_select_work_queue ON public.agent_work_queue
  FOR SELECT TO agent_role USING (true);
CREATE POLICY agent_update_work_queue ON public.agent_work_queue
  FOR UPDATE TO agent_role USING (true) WITH CHECK (true);
```

(`text + CHECK` rather than enums, matching the existing schema convention — §3.)

**What it buys:**

- **No lost work.** The row is the durable record; NOTIFY is only a hint. Losing
  it costs latency, never correctness.
- **The sweep becomes cheap.** `WHERE state = 'pending'` on a partial index over
  a small table — not a three-table anti-join against an unindexed `status`. Run
  every **15–30s** instead of 10 min. Worst case on a dropped NOTIFY drops from
  ~10 min to ~30s: **inside the SLO.**
- **Cooldowns become declarative.** §5's "1 routine run per vehicle per hour"
  and burst-sync coalescing fall out of the partial unique index. No cooldown
  logic in agent code, no race between instances.
- **Retries survive restarts** — §12's 3-attempt cap lives in `attempts`.
- **Multi-instance safe** via `FOR UPDATE SKIP LOCKED`. The current design has no
  story here at all.

**Claim query:**

```sql
UPDATE public.agent_work_queue q
SET state = 'claimed', claimed_at = now(), attempts = attempts + 1
WHERE q.id = (
  SELECT id FROM public.agent_work_queue
  WHERE state = 'pending'
  ORDER BY enqueued_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

### One channel, not three

BUILD REQ §5 + the contract imply three trigger paths (sync-complete, weekly
deep, new active DTC). With a queue, all three are just **enqueue** operations
behind **one** channel and one consumer loop:

- **`agent_trigger`** — keep the existing channel name. Payload becomes empty or
  `{ job_id }`; nothing else. The agent reads the job row for everything else,
  which retires the 8000-byte NOTIFY payload concern rather than working around
  it.

### Emit from a trigger, not the Edge Function

BUILD REQ §5 says `device_sync_complete` emits NOTIFY "as its last step"; the
contract's Option A says a trigger on `sync_sessions`. **Trigger is correct:**

- Fires **atomically with the status transition**, in the same transaction.
  Can't be skipped, forgotten by a future code path, or fire on a commit that
  later rolls back.
- The Edge Function's "last step" only fires when that code path runs. Any other
  writer of `status='completed'` — backfill, admin action, a second sync path —
  silently produces no analysis.

```sql
CREATE OR REPLACE FUNCTION public.enqueue_agent_routine()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.agent_work_queue (vehicle_id, kind, sync_session_id)
  VALUES (NEW.vehicle_id, 'routine', NEW.id)
  ON CONFLICT DO NOTHING;               -- coalesce per dedupe index
  PERFORM pg_notify('agent_trigger', '');
  RETURN NEW;
END $$;

CREATE TRIGGER sync_session_completed_enqueue
  AFTER UPDATE OF status ON public.sync_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.enqueue_agent_routine();
```

`sync_sessions.vehicle_id` exists, so the trigger has everything it needs.
Analogous: `dtcs` AFTER INSERT WHERE `is_active` → `kind='dtc'`; pg_cron weekly →
`kind='deep'` (alongside `20260614000002_add_pg_cron_jobs`).

`pg_notify` fires on **commit**, so the agent can never wake to a row that isn't
visible yet.

### Connection mode (fails invisibly)

Agent must use **session mode** (Supavisor `5432`), not transaction mode
(`6543`). Transaction pooling silently breaks `LISTEN` — listener looks healthy,
receives nothing. Worth pinning in the contract and asserting in the §14.3 e2e
test.

---

## 2. `telemetry.drive_id` — the one schema addition still needed

Current `telemetry` columns: `id`, `vehicle_id`, `sync_session_id`, `timestamp`,
`metrics`. **There is no association from a telemetry sample to a drive.**

```sql
ALTER TABLE public.telemetry
  ADD COLUMN drive_id uuid REFERENCES public.drives(id);
CREATE INDEX telemetry_drive_id_timestamp
  ON public.telemetry (drive_id, "timestamp");
```

**Correction to my earlier draft:** I claimed no association exists. That was
wrong — `get_drive_telemetry/index.ts` already uses a working convention:

```ts
.from('telemetry').select('timestamp, metrics')
  .eq('sync_session_id', drive.sync_session_id)
  .gte('timestamp', drive.started_at)
  .lte('timestamp', drive.ended_at)
```

Compound `sync_session_id` + timestamp range. It works. Two problems remain:

- **It's unindexed.** `telemetry`'s only index is `(vehicle_id, timestamp DESC)`
  — there is **no index on `sync_session_id`**. So this filter scans on the
  heaviest table in the schema, inside a 60s budget, on every analysis. (The
  same cost is already being paid by the app's drive-detail chart.)
- **It's ambiguous at the edges** — samples at idle, during ignition-off, or
  between back-to-back drives *within the same session* fall in no drive or
  arguably two.

**The ask is nearly free, which I didn't realise before reading the repo:**
`device_sync_complete` **already segments telemetry into drives in memory** to
compute `peak_metrics` / `summary_metrics`. At that exact moment it knows which
samples belong to which drive — it just discards the association. Persisting it
is setting a column on rows it has already grouped.

The contract makes it worth doing: `referenced_telemetry_ids` (required, §4)
means citing specific sample UUIDs per drive. With the FK that's an index scan;
without it, every citation re-derives an unindexed, ambiguous range filter.

Nullable is correct — samples outside any drive (live mode, idle) legitimately
have `drive_id IS NULL`.

**Backfill:** dev has fixture telemetry (~361 rows per the schema doc's PR #37
note) and pilot hasn't launched, so a one-time backfill by range join is cheap
now and gets more expensive every week.

**Alternative if you'd rather not add the column:** index
`telemetry (sync_session_id, "timestamp")` — fixes the performance half, leaves
the ambiguity. Cheaper, but strictly worse, and it doesn't make
`referenced_telemetry_ids` any easier.

---

## 3. Enums vs `text + CHECK` — withdrawing my earlier proposal

I previously proposed converting `severity`/`urgency`/`category` to Postgres
enums. **Withdrawn.** The v1 schema uses `text` consistently across all 26
tables and is applied to prod. Converting types on a live table for a stylistic
win isn't worth the migration risk, or the precedent of the agent project
churning the app's conventions.

The actual requirement is narrower: **invalid LLM output must fail loudly at the
DB boundary** rather than writing a row the app can't render.

**This is already satisfied.** Verified against `20260602130000_initial_schema.sql`:

```sql
severity    text NOT NULL CHECK (severity IN ('info','warning','critical')),
urgency     text NOT NULL CHECK (urgency IN ('now','soon','monitor')),
category    text NOT NULL CHECK (category IN ('engine','fuel','cooling',
              'transmission','electrical','turbo','insufficient_data','other')),
status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','seen','dismissed','actioned')),
confidence  numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
```

**Section closed — no change requested.** The constraints are real, and the
`confidence` range check is exactly the one I was going to ask for (worth noting
`numeric(3,2)` alone constrains precision, not range — it would accept `9.99`;
someone already thought about this).

One genuine gap: `recommended_action` is **nullable** in the DDL, but BUILD REQ
§4 lists it as required. Minor — agent will always populate it. Flagging only so
the docs match.

---

## 4. Baselining — resolved by the existing schema (OQ-6 withdrawn)

I'd asked for a modified/stock signal. Two corrections from the schema doc:

1. **`vehicle_modifications` is empty and reserved for v2.** BUILD REQ §1 and the
   contract both tell the agent to read it. Followed literally, the agent reads
   an empty table forever and concludes every car is stock. **Docs need
   correcting.**
2. **The signal already exists on `vehicles`:** `ecu_type` (`'oem' | 'haltech' |
   'aem' | 'motec' | 'link' | 'other'`) and `modifications` (free-form jsonb).

`ecu_type != 'oem'` is a definitive "this car is modified" — enough to stop the
agent treating a Haltech car's deliberately-rich AFR under boost as an anomaly
from drive one. It's asymmetric (`'oem'` doesn't prove stock — intake/exhaust on
a stock ECU is still modified), so stock reference bands stay **advisory** for
`'oem'` cars rather than alarm-capable. Still a far better cold-start position
than "assume nothing."

`modifications` jsonb is free-form, so it's LLM-readable context rather than
something the deterministic pre-filter can key on. That split matches the
pre-filter/LLM division cleanly: **code keys on `ecu_type`, the LLM reads
`modifications` as prose context.**

**Ask:** the Week-3 add-vehicle screen / `create_vehicle` Edge Function should
require `ecu_type` and prompt for `modifications`. An unpopulated `ecu_type`
defaults the agent to its most conservative behaviour — the worst cold-start
experience for exactly the enthusiast cars this product targets.

### Related: `drives` is the right baselining substrate, not `telemetry`

Retention: `telemetry` raw is **30 days**, then downsampled to per-minute
aggregates. `drives` has **no retention limit** — `peak_metrics` and
`summary_metrics` persist indefinitely.

So the adaptive per-vehicle baseline should be computed from `drives` aggregates,
not raw telemetry. Better anyway: already the right granularity (per-drive),
small, survives the 30-day window, and the baseline doesn't silently degrade at
day 31. Raw telemetry is then only needed for the current drive under analysis —
inside the retention window by definition.

Agent-side design note, not an app change. Recorded because it depends on the
retention policy holding.

---

## 5. `drives.has_anomaly` — contract gap, needs a ruling

Schema doc: *"has_anomaly | bool | Flag set by agent for quick filtering."*

BUILD REQ §1: *"WRITES … diagnostic_outputs, agent_status … You DO NOT touch any
other tables. The contract surface is rigid."*
Contract §"What the agent writes": `diagnostic_outputs`, `agent_status`. Only.

**These contradict** — and the repo shows nobody resolved it: `has_anomaly
boolean NOT NULL DEFAULT false` is set to `false` by `device_sync_complete` at
insert and **never updated by anything in the repo**. The column is currently
write-once-false. The schema doc describes an intent nobody implemented.

Options:

- **(a) Agent owns it.** Third write target; both docs need updating. The
  migration has a commented-out **column-level** grant ready
  (`GRANT UPDATE (has_anomaly) ON drives`) — column-scoped so the agent can never
  touch `distance_km`, `peak_metrics`, etc.
- **(b) App derives it.** A trigger on `diagnostic_outputs` insert setting
  `has_anomaly` where severity > 'info'. Keeps the agent's write surface at two
  tables and keeps the flag consistent with the outputs by construction.
  **Recommended** — it's derived data, best owned by whoever owns the source of
  truth.
- **(c) Drop the column** if nothing reads it.

Agent project has no preference beyond wanting the ruling before it builds.

---

## 6. Telemetry retention vs `referenced_telemetry_ids` — data integrity

- `telemetry` raw: **30 days**, then rows are downsampled away.
- `diagnostic_outputs`: **retained indefinitely** ("small, important user
  history").
- Every `diagnostic_outputs` row carries `referenced_telemetry_ids uuid[]` — a
  bare array. **No FK, no cascade, nothing enforcing it.**

At day 31, every diagnostic in a user's permanent history cites telemetry rows
that no longer exist. If the app's diagnostic detail UI ever renders "here's the
data behind this," it breaks silently for all historical diagnostics. Product-
visible, and it gets worse over time.

Options, cheapest first:

- **(a) Accept and document.** References are a debugging aid with a 30-day
  useful life; the app must tolerate empty lookups. Zero cost — but write the
  constraint down in the contract or someone will build a UI on it.
- **(b) Snapshot the cited samples.** Add `referenced_telemetry_snapshot jsonb`
  to `diagnostic_outputs`; the agent copies the handful of cited samples inline
  at write time. Self-contained, survives retention, small (the agent cites a few
  samples, not thousands). Costs one column.
- **(c) Exempt cited telemetry from downsampling.** Retention job skips rows
  whose id appears in any `referenced_telemetry_ids`. Correct, but the anti-join
  makes cleanup expensive and couples retention to the agent.

**Recommend (b)** — it makes each diagnostic self-contained, which is also what
the eval loop wants: evaluating a diagnostic against feedback months later is far
easier when the evidence travels with the row.

---

## 7. Still needed from the app project

Both migrations have now been read from the repo; those asks are closed. What
remains:

- **Ruling on `drives.has_anomaly`** (§5) — recommend (b), app-derived.
- **Ruling on `referenced_telemetry_ids` vs retention** (§6) — recommend (b),
  snapshot column.
- **Backfill decision** for `telemetry.drive_id` (§2).
- **Hard safety thresholds** — per-engine coolant/oil-pressure limits. These
  decide when `critical` fires on a user's car; they must come from factory specs
  or a domain reference, not the agent project's judgement. **This is the only
  remaining item the agent project cannot source or decide for itself.**

Separately, `findings-from-repo-review.md` lists 4 P0 and 3 P1 bugs found while
reading the repo — including a nightly cron job that has never run, and an RPC
any authenticated user can call to trigger agent runs on arbitrary vehicles.
Both are dev-only and cheap to fix now. Those are app-project bugs rather than
agent-integration asks, but P0-3 (raw/downsampled telemetry indistinguishable)
and P1-2 (`peak_metrics` wrong for negative-peak metrics) directly corrupt the
agent's analysis inputs, so the agent project has a stake in them.

## 8. Doc corrections requested

- **BUILD REQ §1 + contract:** agent reads `vehicle_modifications` → should be
  `vehicles.ecu_type` + `vehicles.modifications` for v1.
- **BUILD REQ §3:** pilot described as "10 friendly enthusiasts in India with
  **modified** petrol cars." Founder confirms vehicles may be stock or modified.
  This materially changed the baselining design.
- **BUILD REQ §5 / contract:** NOTIFY payload documented as
  `{ sync_session_id, vehicle_id, drive_ids: [...] }`. The **shipped** payload is
  `{session_id, vehicle_id, triggered_at}` — no `drive_ids`, and the key is
  `session_id`. The docs describe a payload that was never built. Correct the
  docs (or adopt §1, which changes it again).
- **BUILD REQ §5 / contract:** channel name documented as "TBD". It is
  **`agent_trigger`**, shipped since Week 5.
- **Contract "Open questions" §1:** trigger mechanism is NOTIFY — but the doc
  offers Option A (trigger on `sync_sessions`) while the implementation is the
  Edge Function's last step. Implementation and contract disagree; the docs
  should record what shipped.
- **Schema doc `drives.has_anomaly`:** whatever §5 resolves to.
- **BUILD REQ §4:** `recommended_action` listed as required; DDL has it nullable.
- **`docs/ai-agent-contract.md` does not exist in the repo** (see
  `findings-from-repo-review.md` P2-1). BUILD REQ §4 calls it "THE source of
  truth" and R1 tracks contract drift as the primary risk — but the document
  meant to prevent drift isn't under version control. Only
  `06_AI_Agent_Contract.md` (the immutable v0.1) is committed. Worth resolving
  before Week 11; it's the root cause of most of the mismatches above.
