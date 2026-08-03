# `create_vehicle` Edge Function — cross-track contract

**Status:** contract agreed App-side; Platform-side function **not yet built**.
**Owners:** App track (Muhammed) consumes it; Platform track (Sulaiman) builds it.
**Source of truth:** this document, until the function lands on `main`. Both sides
code against it; neither side changes the wire shape without editing this doc first.

The App-track add-vehicle flow (Week 3, Day 3) is **built, not E2E-verified** against
this contract — exactly the same carried status as the Wi-Fi provisioning flow. The
app's data seam (`apps/mobile/src/lib/data/source.ts`, capability `createVehicle`)
serves a mock today; flipping it to `'live'` is gated on this function shipping.

Related: `docs/05_Database_Schema.md` § `vehicles` (the Platform-track note), the
session-19/20/21 decisions-log rows, and the existing `pair_device` /
`mint_device_token` functions as the structural precedent.

---

## Function name

`create_vehicle`

## Auth

JWT required — the caller must be an authenticated user. The function reads
`auth.uid()` server-side (via a user-scoped Supabase client built from the
`Authorization: Bearer <access_token>` header, exactly as `pair_device` does). **The
client does not pass `user_id`** and cannot spoof the owner.

## Request body (JSON)

```jsonc
{
  "device_id":     "uuid",   // the device being linked to this vehicle (from pairing)
  "make":          "string",
  "model":         "string",
  "year":          0,         // integer
  "nickname":      "string",
  "ecu_type":      "string",  // REQUIRED, one of the canonical ECU set (below)
  "modifications": "string"   // OPTIONAL free text; omitted when the user left it blank
}
```

This is exactly the shape of `createVehicleInputSchema` in
`packages/types/src/vehicle.ts` (the single schema the app form, the mock seam, and —
once live — the real `fetch` all validate against). Field rules below MUST match it.

## Server-side validations (in order)

Perform these in **application code**, before any insert. Stop at the first failure
and return its error response (see table). Order matters — it determines which error
the user sees when more than one is true.

1. **`device_id` is a valid UUID and exists** in the `devices` table.
   → on missing/not-found: `device_not_claimed` (400). *(A device the app knows about
   but the DB doesn't is, from the user's perspective, "not claimed yet".)*
2. **`devices.claimed_by_user_id = auth.uid()`** — the caller owns the device.
   → else `not_device_owner` (403).
3. **`devices.status = 'active'`** — the device is claimed and live.
   → else `device_not_active` (400).
4. **No existing `vehicles` row where `device_id` matches** — one device → one
   vehicle in v1.
   → else `duplicate_vehicle` (409).
5. **Field length / range checks** matching `createVehicleInputSchema`:
   - `make`     — non-empty, ≤ 100 chars
   - `model`    — non-empty, ≤ 100 chars
   - `year`     — integer, `1980 ≤ year ≤ currentYear + 1`
   - `nickname` — non-empty, ≤ 60 chars
   - `ecu_type` — **required**, exactly one of
     `'oem' | 'haltech' | 'aem' | 'motec' | 'link' | 'other'` (see § ECU set below).
     **Do not default an absent or unrecognised value** — reject it. Defaulting to
     `'oem'` is worse than rejecting: it is an affirmative claim that the car is
     stock, and the agent's baselining trusts it from drive one.
   - `modifications` — optional; when present, a string ≤ 500 chars
   → on any failure: `validation_error` (422) with a `fieldErrors` map.

> Validate fields server-side even though the client already does. The client check
> is UX; the server check is the trust boundary. Both read the same rules from this
> contract, so they don't drift.

## On success

Insert with the **service-role client** (RLS blocks direct inserts — see RLS note),
stamping the owner from `auth.uid()`:

```sql
INSERT INTO vehicles (owner_user_id, device_id, make, model, year, nickname, ecu_type, modifications)
VALUES (auth.uid(), $device_id, $make, $model, $year, $nickname, $ecu_type,
        CASE WHEN $modifications IS NULL OR btrim($modifications) = ''
             THEN '{}'::jsonb
             ELSE jsonb_build_object('notes', btrim($modifications)) END)
RETURNING *;
```

**`modifications` crosses the wire as a scalar string and is encoded server-side** into
the jsonb column as `{"notes": "..."}`, or left at the `'{}'` default when blank. The
client never sends raw jsonb — that keeps the body flat and length-checkable, and keeps
the encoding decision in exactly one place. The app mirrors this encoding in its mock
seam via `encodeModifications` in `packages/types/src/vehicle.ts`; **if you change the
persisted shape, change it there in the same PR** or mock and live will disagree in a
way that only surfaces after the `'live'` flip.

`RETURNING *` is load-bearing — see the response note above. The app hands the returned
row straight to the success screen and types it as the full `Tables<'vehicles'>`.

Respond **HTTP 201** with the inserted row:

```jsonc
{ "vehicle": { /* the full vehicles row, shape = Tables<'vehicles'> */ } }
```

The app validates this body and hands `vehicle` straight to the success screen, so it
must be the complete generated `vehicles` Row (all columns, including the db-generated
`id` and `created_at`).

## Error responses

**The `error` field carries a STABLE MACHINE CODE, not a human message.** This is a
deliberate divergence from `pair_device`, which puts a human string in `error` and
asks the client to key off the HTTP status. Here the App-side orchestrator
(`apps/mobile/src/lib/vehicles.ts`) maps the **`error` code string** onto its
`VehicleCreateError` union, so the codes below are the contract — they must be emitted
verbatim. Use the existing `_shared/errors.ts` helper but pass the code as the message.

| Condition                         | `error` code        | HTTP |
|-----------------------------------|---------------------|------|
| Caller doesn't own the device     | `not_device_owner`  | 403  |
| `device_id` missing / not a claimed device | `device_not_claimed` | 400  |
| Device exists but not `active`    | `device_not_active` | 400  |
| A vehicle already links that device | `duplicate_vehicle` | 409  |
| Field validation failed           | `validation_error`  | 422  |
| Any unexpected server error       | *(generic)*         | 500  |

`validation_error` additionally carries a `fieldErrors` map (same shape Zod's
`flatten().fieldErrors` produces — `Record<string, string[]>`):

```jsonc
{ "error": "validation_error", "fieldErrors": { "year": ["Year is out of range"] } }
```

On a 500, **do not leak internals** — return a generic body (`{ "error": "Internal
server error" }`) and `console.error` the detail server-side, as `pair_device` does.
The app collapses any unrecognised failure (500, transport error, timeout) onto its
`network` variant.

## RLS note

`vehicles_no_direct_insert` (`WITH CHECK (false)`) blocks all direct user inserts into
`vehicles`. The Edge Function runs the insert with the **service-role** key to bypass
RLS — **all of the ownership/status/duplicate/field checks above are performed in
application code before the insert, never delegated to RLS.** This mirrors the
established `pair_device` pattern (user-scoped client to read identity; service-role
client for the privileged write). Consider an `audit_log` row on success
(`action: 'vehicle.created'`), consistent with `pair_device`'s `device.claimed`.

## Cross-track dependencies

- **App-side:** `apps/mobile/src/lib/vehicles.ts` maps the HTTP error body's `error`
  field to `VehicleCreateError` codes. **This mapping must stay in sync with the table
  above.** The display strings live in `apps/mobile/src/locales/en.json`
  (`vehicles.add.*`).
- **Platform-side:** once the function is deployed, the App track wires the real
  `fetch` in `source.ts`'s `createVehicle` live branch (POST to
  `/functions/v1/create_vehicle`, Bearer access token, parse `{ vehicle }` on 201,
  throw an error carrying the `error` code on non-2xx) and flips
  `DATA_SOURCE.createVehicle` to `'live'` (or sets `EXPO_PUBLIC_DATA_SOURCE=live`).
- **E2E verification is gated on this function landing.** Until then the App screen is
  "built, not E2E-verified" — same status as Wi-Fi provisioning.

## ECU set — RESOLVED (was the "open question")

**`ecu_type` is enum-constrained, and always has been at the database level.** The
column carries a CHECK constraint dating from the initial schema:

```sql
-- supabase/migrations/20260602130000_initial_schema.sql
ecu_type text CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other')),
```

The previous version of this section claimed the column was "plain `text` with no DB
enum/CHECK", and the whole "free text until the hardware track locks a canonical set"
posture followed from that. **The claim was wrong.** It was inferred from
`database.types.ts` showing `ecu_type: string | null`, but Supabase's type generator
only renders true Postgres enum *types* as string unions — it does not represent CHECK
constraints at all. A nullable `text` column with a CHECK generates exactly that type.

Consequences, now fixed:

- The client's `z.string().min(1).max(60)` accepted values the database would reject
  with a `23514` check violation on insert. The `'denso-gen4'` mock fixture was one
  such value — it could never have been written to a real `vehicles` row.
- `packages/types/src/vehicle.ts` now exports `ECU_TYPES` and validates
  `ecu_type: z.enum(ECU_TYPES)`, mirroring the constraint exactly. A unit test pins
  the set to the migration so the two can't drift silently.

There is no longer a canonical-set question blocking the `'live'` flip. If the hardware
track later wants to *extend* the set, that is a new migration plus a matching
`ECU_TYPES` change in lockstep — the ordinary schema-change path, not an open question.

Note the column remains **nullable** in Postgres. Requiring `ecu_type` is an
application-level rule enforced in the Zod schema, the form, and this function; the
database will still accept a NULL from any other writer.

---

## Deployed implementation — conformance gaps (Platform track)

`supabase/functions/create_vehicle/index.ts` **exists on `main`** (Platform session 12,
`1dc0589`). It is not yet contract-conformant. Audited 2026-08-03 while requiring
`ecu_type` App-side; every item below is a **live-flip blocker**, because the App
orchestrator (`apps/mobile/src/lib/vehicles.ts`) is built to this contract, not to the
function as written. None of them break anything today — `DATA_SOURCE.createVehicle` is
still `'mock'`, so the function is unreachable from the app.

| # | Contract says | Function does | Effect on the live flip |
|---|---|---|---|
| 1 | `ecu_type` required; reject if absent/unknown | `ecu_type: ecu_type ?? 'oem'` | **Silently marks every car stock.** Defeats the agent's whole modified-vs-stock signal — an affirmative wrong claim, worse than a NULL, which is at least detectable as unknown. |
| 2 | `modifications` arrives as a string, server wraps to `{"notes": …}` | `modifications: modifications ?? {}` — inserts the client value verbatim | Stores a bare JSON string instead of the `{notes}` object the agent reads. |
| 3 | `error` carries a **stable machine code** (`not_device_owner`, `device_not_claimed`, `device_not_active`, `duplicate_vehicle`) | Human strings: `'Device not found'`, `'Device does not belong to you'`, `'Device is not active'`, `'Device already has a vehicle registered'` | **Every mapped error collapses to `network`.** `PASSTHROUGH_ERROR_CODES` matches the code strings exactly, so all four specific recovery paths in `add/error.tsx` become unreachable — the user gets "check your internet" for a device-ownership failure. |
| 4 | 201 with the **complete** `vehicles` row (`RETURNING *`) | `.select('id, make, model, year, nickname, device_id, created_at')` | Response is missing `owner_user_id`, `vin`, `ecu_type`, `modifications`. The app types this as the full `Tables<'vehicles'>`. |
| 5 | Field length/range checks → `validation_error` (422) + `fieldErrors` | No field validation at all; no 422 path | Out-of-range years and over-long strings reach the insert; the client's inline field errors have no server counterpart. |
| 6 | `nickname` required, non-empty | `nickname: nickname ?? \`${make} ${model}\`` | Server invents a nickname the user never chose. |

Also worth noting: the HTTP statuses on the device checks differ from the table above
(404/403/403 vs. the contract's 400/403/400).

**Owner:** Platform track. This is a follow-up PR against the function, not an App-track
change — the App side of the contract is already built and unit-tested. Item 1 is the
one that matters most for the agent; item 3 is the one that matters most for UX.

---

## Sulaiman's Claude Code prompt — paste-ready

> **Historical note:** the prompt below commissioned the original build of this
> function, which has since landed. It is kept for provenance. Task 4 has been
> corrected in place (it previously told the session *not* to enforce an ECU enum,
> which followed from the mistaken "no CHECK constraint" reading). For the work that
> remains, see **Deployed implementation — conformance gaps** above.

> Paste the block below into a Platform-track Claude Code session. It is the handoff
> artefact: this contract doc IS the spec, and the prompt points the session at it.

```text
GOAL
Build the create_vehicle Supabase Edge Function exactly to the contract in
docs/create_vehicle_contract.md. This is the Platform-side counterpart of the
App-track add-vehicle flow already merged (built, not E2E-verified, against this
contract). Do not add capabilities beyond the contract.

READ FIRST (in this order)
- docs/create_vehicle_contract.md — THE spec for this function. Build to it exactly.
- docs/05_Database_Schema.md — vehicles + devices columns, RLS (vehicles_no_direct_insert),
  and the create_vehicle Platform-track note.
- supabase/functions/pair_device/index.ts — the structural precedent: user-scoped
  client for auth.uid(), service-role client for the privileged write, audit_log row.
- supabase/functions/mint_device_token/index.ts — second precedent for auth + service-role.
- supabase/functions/_shared/errors.ts and _shared/cors.ts — the shared response +
  CORS helpers to reuse (errorResponse puts its argument in the flat { error } body).

VERIFY MAIN FIRST
1. git fetch; confirm the App-track add-vehicle PR has merged to main and that
   docs/create_vehicle_contract.md is present on main. If the contract doc is not on
   main yet, STOP — this function depends on it as the agreed spec.
2. Branch feat/platform-create-vehicle off the up-to-date main (do not stack).

TASKS
1. Create supabase/functions/create_vehicle/index.ts implementing the contract:
   - JWT auth: read auth.uid() from a user-scoped client built from the Authorization
     header (mirror pair_device). Reject missing/invalid auth with 401.
   - Parse the JSON body { device_id, make, model, year, nickname, ecu_type }.
   - Run the server-side validations IN THE ORDER specified in the contract, returning
     the exact { error: <code> } body + HTTP status from the contract's error table
     (codes are STABLE MACHINE STRINGS, not human messages — note the divergence from
     pair_device, which the contract spells out).
   - validation_error (422) must include the fieldErrors map.
   - On success: service-role INSERT ... RETURNING *, respond 201 with { vehicle: <row> }.
   - Add an audit_log row (action: 'vehicle.created'), consistent with pair_device.
   - On unexpected error: console.error the detail, return a generic 500 (no internals).
2. Reuse _shared/errors.ts and _shared/cors.ts; handle the OPTIONS preflight as the
   other functions do.
3. Update docs/05_Database_Schema.md's vehicles Platform-track note to document the
   new write-path (alongside vehicles_no_direct_insert), per the same-PR doc-update
   convention in CLAUDE.md / docs/conventions.md.
4. Enforce ecu_type as a required enum matching the migration's existing CHECK
   ('oem','haltech','aem','motec','link','other'). Reject an absent or unrecognised
   value with validation_error — do NOT default it to 'oem'. Accept modifications as
   an optional string (≤ 500 chars) and encode it into the jsonb column as
   {"notes": "..."} , leaving the '{}' default when blank.

ASK BEFORE PROCEEDING
- If devices.status uses values other than 'active'/'unclaimed' than the contract
  assumes, surface what the schema actually has before coding the status check.
- If you find the contract under-specifies anything you need (e.g. whether year's
  upper bound is computed server-side from the clock), ask rather than guessing — and
  update docs/create_vehicle_contract.md with the answer so both tracks stay in sync.

DEFINITION OF DONE
- supabase/functions/create_vehicle/index.ts implements the contract exactly.
- Deployed to the dev Supabase project and smoke-tested (happy path + at least the
  not_device_owner, device_not_active, and duplicate_vehicle error paths) with a real
  user JWT. List what you verified vs. deferred in the PR's Testing section.
- docs/05_Database_Schema.md vehicles note updated in the same PR.
- No change to the wire shape in docs/create_vehicle_contract.md without editing that
  doc in the same PR and flagging it (App-side mapping depends on it).

PR CONVENTIONS
- Conventional Commits; branch feat/platform-create-vehicle off main.
- Open a PR for @22SHY review. Do NOT self-merge (per CLAUDE.md).
- In the PR body: link this contract doc, note that the App-track flow is already
  built against it, and flag that flipping DATA_SOURCE.createVehicle to 'live' is a
  follow-up App-track step once this merges and is verified.
```
