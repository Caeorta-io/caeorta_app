# AI Agent Contract — working folder

Artifacts received from the **AI agent project** on 2026-08-03 (authored 2026-07-17 against
`main`). Committed **as received**: no edits, no reformatting.

> ## ⚠️ Nothing in this folder is applied, deployed, or authoritative yet.
>
> This is a **proposal set awaiting joint review** at a cross-project sync that has not
> happened. Until it does, `docs/06_AI_Agent_Contract.md` (v0.1) remains the ratified
> contract of record.

---

## Contents

| File | What it is | Status |
|---|---|---|
| `ai-agent-contract.md` | **Contract v0.2 (draft)** — proposes to supersede `docs/06_AI_Agent_Contract.md` | Proposed, **not ratified** |
| `findings-from-repo-review.md` | 4 P0 + 3 P1 defects the agent project found reading this repo, most verified against PostgreSQL 16 | Findings — **unfixed** |
| `proposed-app-changes.md` | App-side asks: `agent_work_queue`, `telemetry.drive_id`, `referenced_telemetry_snapshot`, plus rulings needed | Proposal |
| `20260717000000_create_agent_role.sql` | **PROPOSED migration.** Creates the least-privilege `agent_role` + its RLS policies | ⛔ **Do not apply** — see below |
| `safety_thresholds.yaml` | Hard safety floor ("dangerous for *any* car?"), separate from the adaptive per-vehicle baseline | Template — every number blank, `status: unvalidated` |

---

## ⛔ The `.sql` file is NOT a migration yet

`20260717000000_create_agent_role.sql` carries a migration-style timestamped filename but
**deliberately lives here, not in `supabase/migrations/`.**

**Do not move it into `supabase/migrations/` to "put it where it belongs."** It would be
picked up by the next `supabase db push` and applied. The file itself marks two questions
**"resolve before merge"**:

- **[Q-A]** Does the agent read `vehicle_modifications` (which the schema doc says is empty
  and reserved for v2) or `vehicles.ecu_type` + `vehicles.modifications`? The contract and
  BUILD REQ say the former; the schema says the latter is the real v1 signal.
- **[Q-B]** `drives.has_anomaly` — does the agent write it? `docs/05` says the agent sets
  the flag; the contract says the agent writes **only** `diagnostic_outputs` and
  `agent_status`. Nothing in the repo has ever updated the column. The `GRANT UPDATE
  (has_anomaly)` and its policy are commented out pending a ruling.

The filename is kept unchanged because `ai-agent-contract.md` §1 and
`proposed-app-changes.md` both reference it by name, and the agent project's own BUILD REQ
does too. Renaming it here would break those cross-references ahead of the review that is
supposed to reconcile them.

**When it is ratified:** resolve Q-A and Q-B, uncomment or delete the conditional grant,
move the file to `supabase/migrations/`, apply to dev, verify with the role check in its
§5, then promote to prod per `docs/05` § "Promoting a migration to prod".

---

## ⚠️ `findings-from-repo-review.md` reports unfixed defects in this repo

Four P0 and three P1. They are **findings, not fixes** — nothing in this folder patches
them. The headline items, all in **dev-only** migrations or Edge Functions (none promoted
to prod — see `docs/11` § CF-17):

- The nightly `downsample-old-telemetry` cron job **has never successfully run** (hard SQL
  error; fails silently into `cron.job_run_details`).
- `notify_agent` is `SECURITY DEFINER` with **no `REVOKE EXECUTE ... FROM PUBLIC`**, so any
  authenticated user can call it via PostgREST RPC. Two-line fix, given in the file.
- `device_sync_complete` writes `vehicles.last_sync_at` — **a column that does not exist**
  (it is on `devices`). The result is unchecked, so it fails silently on every sync.
- `peak_metrics` seeds with `Math.max(x ?? 0, val)`, so any metric peaking negative (boost
  under vacuum, fuel trims, sub-zero temps) records `0`.

These are Platform-area (Sulaiman's) to triage. They are **not** tracked in
`docs/11_Carry_Forwards.md` yet — that sweep is deliberately deferred until after
ratification, so the registry records agreed work rather than one project's proposals.

---

## How this relates to `docs/06_AI_Agent_Contract.md`

`docs/06` is **v0.1** — drafted ~2026-05, never jointly reviewed, and the origin of R1 /
CF-03 (contract drift). It remains the contract of record until v0.2 is ratified.

`ai-agent-contract.md` here is **v0.2**, which reconciles the doc with the shipped schema
and marks four **[DECISION REQUIRED]** items. The two most consequential for the App track:

- **§3 pins the canonical telemetry metric vocabulary** (`speed_kph`, `rpm`,
  `coolant_temp_c`, `boost_pressure_kpa` — **kPa, not bar** — `engine_load_pct`), adopting
  the app's provisional set. That is the input **CF-07 / R22 / `TODO(metric-keys)`** has
  been gated on since Week 3.
- **§8 flags the coolant threshold as having two owners** — the app's
  `COOLANT_HOT_THRESHOLD_C = 105` and this folder's `safety_thresholds.yaml` (**CF-08**).

**On ratification**, the decision to take is whether v0.2 replaces `docs/06` in place (and
this folder keeps only the supporting artifacts) or the numbered doc stays the stable
snapshot with the live contract living here. Note the agent project's BUILD REQ references
a flat `docs/ai-agent-contract.md`, which still does not resolve — that path question should
be settled at the same time (`findings-from-repo-review.md` P2-1).

---

## Cross-references

`docs/06_AI_Agent_Contract.md` (v0.1, ratified) · `docs/05_Database_Schema.md` ·
`docs/11_Carry_Forwards.md` § CF-03, CF-04, CF-07, CF-08, CF-17, CF-30 ·
`docs/09_Risks_And_Mitigations.md` R1, R22, R24 · workdiary session 40.
