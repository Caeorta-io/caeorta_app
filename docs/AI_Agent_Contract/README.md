# AI Agent Contract — working folder

Artifacts received from the **AI agent project** on 2026-08-03 (authored 2026-07-17 against
`main`). Originally committed as received; `ai-agent-contract.md` has since been revised
here through ratification (see its changelog).

> ## Status as of 2026-09-30 — the contract is ratified at v0.3
>
> - **`ai-agent-contract.md` is the contract of record: v0.3, ratified** (PR #56, merged
>   2026-08-12). It supersedes `docs/06_AI_Agent_Contract.md` (v0.1). Both projects are
>   bound by it.
> - **Q-A, Q-B, Q-C and Q-D are all resolved.** The resolutions are recorded in the
>   proposal `.sql` file's own notes and in the shipped migration.
> - **The `agent_role` migration shipped — but not from this folder.** The shipped
>   migration is `supabase/migrations/20260804000001_create_agent_role.sql`. The `.sql`
>   file here is a **superseded proposal**, kept as the decision record. **It must NOT be
>   moved into `supabase/migrations/`.**
> - **The schema work the contract asked for is on `main`** (`supabase/migrations/`
>   `20260804000001`–`…0005` and `20260812000001`–`…0003`). Contract §12 is the running
>   record of what conforms. The three `20260812*` migrations have **not yet been pushed
>   to dev**.
> - **Still open:** the coolant-threshold single source of truth (contract §11 #4) and the
>   hard safety-threshold values (`docs/11` § CF-08).
>
> *What this block said until 2026-09-30:* "Nothing in this folder is applied, deployed,
> or authoritative yet. This is a proposal set awaiting joint review at a cross-project
> sync that has not happened. Until it does, `docs/06_AI_Agent_Contract.md` (v0.1) remains
> the ratified contract of record." That was accurate on 2026-08-03 and wrong from
> 2026-08-12, when the contract was ratified. **The sections below the Contents table are
> the 2026-08-03 text, kept as the record of what was open then** — each now carries a
> note saying how it ended. Whether a recurring cross-project sync is calendared is not
> something this repo can show; `docs/11` § CF-03 still lists it as outstanding.

---

## Contents

| File | What it is | Status (2026-09-30) |
|---|---|---|
| `ai-agent-contract.md` | **Contract v0.3** — supersedes `docs/06_AI_Agent_Contract.md` | **Ratified** (PR #56, 2026-08-12). *Was: "v0.2 (draft)… Proposed, not ratified".* |
| `findings-from-repo-review.md` | 4 P0 + 3 P1 defects the agent project found reading this repo, most verified against PostgreSQL 16 | Findings — the four headline items below are **fixed on `main`**; the other three were not re-checked one by one in this pass. *Was: "unfixed".* |
| `proposed-app-changes.md` | App-side asks: `agent_work_queue`, `telemetry.drive_id`, `referenced_telemetry_snapshot`, plus rulings needed | **Built on `main`**, except that the `telemetry.drive_id` backfill was deliberately not done (`20260812000001` explains why). The document is the proposal as received, not a description of what shipped. *Was: "Proposal".* |
| `20260717000000_create_agent_role.sql` | The **proposed** `agent_role` migration | ⛔ **Superseded proposal — do not apply, do not move.** Shipped as `supabase/migrations/20260804000001_create_agent_role.sql`. *Was: "Do not apply — see below".* |
| `safety_thresholds.yaml` | Hard safety floor ("dangerous for *any* car?"), separate from the adaptive per-vehicle baseline | **Unchanged** — template, every number blank, `status: unvalidated`. Open under CF-08. |

---

## ⛔ The `.sql` file is a superseded proposal, not a migration

> **2026-09-30:** this section was headed "The `.sql` file is NOT a migration yet", and
> ended with steps to take "when it is ratified". That path was not taken: the role
> shipped as a separate file, `supabase/migrations/20260804000001_create_agent_role.sql`.
> Q-A and Q-B below are both resolved — Q-A: the agent reads `vehicles.ecu_type` +
> `vehicles.modifications`; Q-B: `drives.has_anomaly` is app-derived by a trigger, and the
> agent does not write it. The rule in bold below still holds, for a stronger reason:
> moving the file now would apply a second, outdated `agent_role` migration.

`20260717000000_create_agent_role.sql` carries a migration-style timestamped filename but
**deliberately lives here, not in `supabase/migrations/`.**

**Do not move it into `supabase/migrations/` to "put it where it belongs."** It would be
picked up by the next `supabase db push` and applied. The file itself marked two questions
**"resolve before merge"** (both since resolved — see the note above):

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

~~**When it is ratified:** resolve Q-A and Q-B, uncomment or delete the conditional grant,
move the file to `supabase/migrations/`, apply to dev, verify with the role check in its
§5, then promote to prod per `docs/05` § "Promoting a migration to prod".~~ *(Superseded —
do not follow these steps. The role shipped as `20260804000001`.)*

---

## `findings-from-repo-review.md` — defects reported 2026-07-17, headline items since fixed

> **2026-09-30:** this section was headed "reports unfixed defects in this repo". The four
> headline items listed below are fixed on `main`, checked against the code:
> the downsample cron in `20260803000003_fix_downsample_cron.sql`; `notify_agent` locked
> down in `20260803000001` / `…0002` and then dropped in `20260804000005`; and the
> `vehicles.last_sync_at` write and the `peak_metrics` zero-seed both fixed in
> `supabase/functions/device_sync_complete/index.ts`. The remaining findings in the file
> were not re-checked one by one in this pass. The text below is the 2026-08-03 original.

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

> **2026-09-30:** the text below is the 2026-08-03 original and describes the position
> before ratification. Today `ai-agent-contract.md` here is **v0.3, ratified**, and is the
> contract of record; `docs/06` is the superseded v0.1. Of the four **[DECISION
> REQUIRED]** items it mentions, only #4 (the coolant threshold's single source of truth)
> is still open. `docs/06`'s own banner still says v0.1 is the contract of record — that
> file was not edited in this pass.

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

`docs/06_AI_Agent_Contract.md` (v0.1, superseded) · `docs/05_Database_Schema.md` ·
`docs/11_Carry_Forwards.md` § CF-03, CF-04, CF-07, CF-08, CF-17, CF-30 ·
`docs/09_Risks_And_Mitigations.md` R1, R22, R24 · workdiary session 40.
