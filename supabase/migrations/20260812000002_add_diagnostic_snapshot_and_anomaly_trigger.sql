-- Migration: diagnostic_outputs.referenced_telemetry_snapshot + drives.has_anomaly trigger
--
-- Implements the two objects the ratified AI Agent Contract v0.3 (PR #56)
-- specifies but which exist in no migration:
--
--   1. diagnostic_outputs.referenced_telemetry_snapshot jsonb  -- contract §5
--   2. the drives.has_anomaly app-derived trigger              -- contract §11
--
-- These fill the unused 20260804000004 gap in the sequence -- the Platform
-- session that shipped 0001/0002/0003/0005 left the number free where exactly
-- these two were meant to sit. Numbered normally rather than back-filling the
-- gap, so migration order stays monotonic with wall-clock time.
--
-- DEAD CODE FLAGGED, NOT EDITED HERE: 20260804000001_create_agent_role.sql:119
-- still carries a commented-out
--     GRANT UPDATE (has_anomaly) ON public.drives TO agent_role;
-- left in place "if the agent does own this flag". After this migration it is
-- definitively dead -- the app owns the flag via the trigger below and the
-- agent's write surface stays diagnostic_outputs + agent_status. Removing that
-- block belongs to the conformance PR, not here; migrations are immutable once
-- applied and that file is already applied.


-- ============================================================================
-- 1. referenced_telemetry_snapshot  (contract §5)
-- ============================================================================
-- Raw telemetry is purged at 30 days; diagnostic_outputs is retained
-- indefinitely; referenced_telemetry_ids is a bare uuid[] with no FK or
-- cascade. From day 31 every diagnostic cites telemetry rows that no longer
-- exist, so this column becomes the ONLY surviving evidence for that
-- diagnostic. Design §5.1's "WHAT IT SAW" block renders from it for the whole
-- retained history; without it, no diagnostic older than 30 days can show its
-- evidence at all.
--
-- Nullable with NO default, deliberately. NULL means "written before this
-- shipped" and the app must tolerate it. An empty object and an absent
-- snapshot are DIFFERENT states and the app distinguishes them -- a NOT NULL
-- or a '{}' default would erase that distinction and make every historical row
-- claim it captured nothing rather than admitting it predates the column.
ALTER TABLE public.diagnostic_outputs
  ADD COLUMN IF NOT EXISTS referenced_telemetry_snapshot jsonb;

COMMENT ON COLUMN public.diagnostic_outputs.referenced_telemetry_snapshot IS
  'Retained evidence for this diagnostic, copied inline at write time so it survives the 30-day telemetry purge. Contract-pinned core shape (ai-agent-contract.md §5): { "schema": 1, "captured_at": "<iso8601>", "samples": [ { "t": "<iso8601>", "m": { "<metric_key>": <number> } } ] }. Guarantees: samples is ascending by t and MAY be empty; every key in m is from the canonical metric vocabulary (§3); values are JSON numbers, never strings; an absent metric is an ABSENT KEY, never null and never 0; schema increments only on a breaking change to those rules. insufficient_data rows additionally carry "insufficient_data": { "kind": "temporary"|"permanent", ... } per §7. The agent may add further keys freely without a schema bump. NULL means the row predates this column.';

-- agent_role write access: NOTHING TO ADD.
-- 20260804000001 grants INSERT at TABLE level --
--     GRANT INSERT ON public.diagnostic_outputs TO agent_role;
-- not column-scoped, so a newly added column is covered automatically and no
-- re-grant is needed. (Postgres column-level privileges only come into play
-- when a grant enumerates columns; a table-level INSERT covers all present and
-- future columns.) Checked rather than assumed, because the opposite case
-- would fail at the agent's first write with a bare permission error.


-- ============================================================================
-- 2. drives.has_anomaly — app-derived  (contract §11, decided 2026-08-03)
-- ============================================================================
-- has_anomaly is boolean NOT NULL DEFAULT false, set to false at insert by
-- device_sync_complete and never updated by anything in the repo -- currently
-- write-once-false. The contract resolves ownership: the APP derives it from
-- diagnostic_outputs.severity via this trigger. The agent's write surface
-- stays diagnostic_outputs + agent_status, exactly two tables.

CREATE OR REPLACE FUNCTION public.set_drive_has_anomaly()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY DEFINER is REQUIRED here, not stylistic. This trigger fires inside
-- the AGENT's INSERT transaction, executing as agent_role -- which holds only
-- SELECT on drives (20260804000001 §2) and must NOT be granted UPDATE, since
-- that would widen the agent's write surface past the two contract tables.
-- Without SECURITY DEFINER the UPDATE below raises a permission error that
-- aborts every single agent insert.
SECURITY DEFINER
-- Mandatory companion to SECURITY DEFINER: without a pinned search_path a
-- caller can prepend a schema and capture the unqualified names inside the
-- body. This is the exact omission that made notify_agent exploitable
-- (findings-from-repo-review.md P0-4), and Supabase's own linter flags it.
SET search_path = public, pg_temp
AS $$
BEGIN
  -- referenced_drive_id IS NOT NULL: the column is nullable AND
  -- ON DELETE SET NULL, so vehicle-scoped outputs (deep analysis) and outputs
  -- whose drive was later deleted simply no-op rather than erroring.
  --
  -- severity IN ('warning','critical'): "> info" as decided. Written as an
  -- explicit set membership, NOT a text comparison -- severity is text with a
  -- CHECK constraint, not an ordered type, and severity > 'info' only appears
  -- to work because 'warning' happens to sort after 'info' alphabetically.
  -- 'critical' does not, so the comparison would silently drop the most
  -- important case.
  IF NEW.referenced_drive_id IS NOT NULL
     AND NEW.severity IN ('warning','critical') THEN
    -- AND has_anomaly = false: the flag is ONE-WAY. Nothing ever unsets it, so
    -- re-asserting true is pointless; this also skips a redundant row write
    -- (and its WAL, and any replication traffic) for every subsequent
    -- diagnostic on an already-flagged drive.
    UPDATE public.drives
       SET has_anomaly = true
     WHERE id = NEW.referenced_drive_id
       AND has_anomaly = false;
  END IF;
  -- RETURN NULL is correct and intentional: the return value of an AFTER
  -- FOR EACH ROW trigger is ignored by Postgres. Returning NEW would imply a
  -- BEFORE-trigger contract that does not apply here.
  RETURN NULL;
END $$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default, and Supabase
-- exposes public-schema functions as PostgREST RPC. A trigger function is not
-- usefully callable directly, but leaving it world-executable is the same
-- defect class as P0-4 (notify_agent, SECURITY DEFINER with no REVOKE, callable
-- by any authenticated user). Closed at birth rather than in a later lockdown
-- migration.
REVOKE EXECUTE ON FUNCTION public.set_drive_has_anomaly() FROM PUBLIC;

DROP TRIGGER IF EXISTS diagnostic_output_sets_has_anomaly
  ON public.diagnostic_outputs;

-- AFTER INSERT only. The agent never UPDATEs diagnostic_outputs (contract §5:
-- writes are INSERT-only), and the APP's status transitions --
-- 'new' -> 'seen' | 'dismissed' | 'actioned' -- must not re-fire this. An
-- UPDATE trigger would re-run the derivation every time a user taps a card.
CREATE TRIGGER diagnostic_output_sets_has_anomaly
  AFTER INSERT ON public.diagnostic_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_drive_has_anomaly();

COMMENT ON FUNCTION public.set_drive_has_anomaly() IS
  'Derives drives.has_anomaly from diagnostic_outputs.severity. Contract §11 (2026-08-03): has_anomaly is APP-derived — the agent never writes it, and its write surface stays diagnostic_outputs + agent_status.';

COMMENT ON TRIGGER diagnostic_output_sets_has_anomaly ON public.diagnostic_outputs IS
  'Sets drives.has_anomaly = true on INSERT of a warning/critical drive-scoped output. One-way; AFTER INSERT only so app status transitions do not re-fire it.';


-- ============================================================================
-- 3. No backfill — deliberate
-- ============================================================================
-- Existing diagnostic_outputs rows do NOT retroactively set has_anomaly, and
-- there is no UPDATE statement in this migration.
--
-- Two reasons. First, has_anomaly is a quick-filtering hint for list UI, not a
-- correctness-bearing value -- nothing derives severity, health, or user-facing
-- copy from it, so a drive missing the flag renders correctly and merely sorts
-- or filters as unremarkable. Second, a backfill would be guessing: it would
-- flag drives from historical outputs whose referenced telemetry may already
-- have been purged at 30 days, writing a permanent one-way flag on the basis
-- of evidence no longer in the database. The flag becomes accurate from the
-- next agent insert onward, which is soon enough for a hint.
