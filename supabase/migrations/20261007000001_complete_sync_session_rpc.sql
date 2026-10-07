-- Migration: complete_sync_session() — transactional completion of a sync
--
-- device_sync_complete used to persist a sync in three separate PostgREST
-- requests: one INSERT per drive, a batched telemetry.drive_id backfill, and
-- the sync_sessions status UPDATE. Each committed on its own, so they could
-- diverge (found in session 51):
--
--   1. The status UPDATE's error was never inspected. If it failed, the device
--      still got 200 and never retried; the session stayed 'streaming', which
--      nothing ever repairs (cleanup-stale-sync-sessions only deletes
--      'failed' / 'pending'), so sync_session_completed_enqueue never fired
--      and the agent never analysed that sync — silently and permanently.
--   2. On a partial failure (drive 1 inserted, drive 2 failed) the status was
--      written 'failed', and a retry re-inserted drive 1: the handler's guard
--      only skips 'completed', and drives has no UNIQUE constraint.
--   3. Two overlapping calls (a device timing out and retrying) both read
--      'streaming' and both inserted every drive.
--
-- This function does all three writes in ONE transaction (a PostgREST RPC
-- call is a single transaction), so they commit or roll back together. The
-- FOR UPDATE row lock on the session serialises overlapping calls: the second
-- caller blocks until the first commits, then sees 'completed' and returns
-- early without inserting anything.
--
-- Segmentation and every metric (peak/summary/distance_km) stay in the Edge
-- Function's TypeScript. This function receives finished drive objects and
-- only persists them. vehicle_id and sync_session_id are taken from the locked
-- session row, never from the payload; has_anomaly is always inserted false
-- (it is app-derived by diagnostic_output_sets_has_anomaly, 20260812000002).
--
-- Backfill: one UPDATE per drive over the drive's [started_at, ended_at] on
-- this session's telemetry, using telemetry_sync_session_id_timestamp_idx.
-- This replaces the old id-list batching (and its "URI too long" failure
-- class) and makes the backfill all-or-nothing instead of best-effort. It is
-- only correct if drive ranges are disjoint, which segmentation guarantees
-- (drives split where consecutive samples are > 5 min apart). The function
-- ASSERTS that rather than assuming it: drives must be in time order with no
-- overlap, and every drive must match at least one telemetry row, or the
-- whole call raises and rolls back.

CREATE OR REPLACE FUNCTION public.complete_sync_session(
  p_session_id uuid,
  p_device_id  uuid,
  p_drives     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
-- SECURITY DEFINER + pinned search_path, as with every function since P0-4
-- (findings-from-repo-review.md: notify_agent was SECURITY DEFINER with no
-- search_path and no REVOKE). Only service_role can execute it — see the
-- grants below.
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session       record;
  v_drive         jsonb;
  v_drive_id      uuid;
  v_started_at    timestamptz;
  v_ended_at      timestamptz;
  v_prev_ended_at timestamptz;
  v_rows          int;
  v_created       int := 0;
BEGIN
  -- (a) Lock the session row. Overlapping calls for the same session queue
  -- here until this transaction ends.
  SELECT id, vehicle_id, status
    INTO v_session
    FROM public.sync_sessions
   WHERE id = p_session_id
     AND device_id = p_device_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found', 'drives_created', 0);
  END IF;

  -- (b) The authoritative already-completed check — made under the lock, so a
  -- caller that waited on a concurrent completion lands here.
  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object('outcome', 'already_completed', 'drives_created', 0);
  END IF;

  IF p_drives IS NULL OR jsonb_typeof(p_drives) <> 'array' THEN
    RAISE EXCEPTION 'complete_sync_session: p_drives must be a jsonb array, got %',
      coalesce(jsonb_typeof(p_drives), 'NULL');
  END IF;

  FOR v_drive IN SELECT value FROM jsonb_array_elements(p_drives) LOOP
    v_started_at := (v_drive->>'started_at')::timestamptz;
    v_ended_at   := (v_drive->>'ended_at')::timestamptz;

    IF v_started_at IS NULL OR v_ended_at IS NULL OR v_ended_at < v_started_at THEN
      RAISE EXCEPTION 'complete_sync_session: drive has an invalid time range (% .. %)',
        v_started_at, v_ended_at;
    END IF;
    -- Disjoint, ordered ranges are what make the BETWEEN backfill below
    -- assign each telemetry row to exactly one drive.
    IF v_prev_ended_at IS NOT NULL AND v_started_at <= v_prev_ended_at THEN
      RAISE EXCEPTION 'complete_sync_session: drive starting % overlaps or precedes the previous drive ending %',
        v_started_at, v_prev_ended_at;
    END IF;
    v_prev_ended_at := v_ended_at;

    -- (c) Insert the drive.
    INSERT INTO public.drives (
      vehicle_id, sync_session_id, started_at, ended_at, duration_seconds,
      distance_km, peak_metrics, summary_metrics, has_anomaly
    ) VALUES (
      v_session.vehicle_id,
      p_session_id,
      v_started_at,
      v_ended_at,
      (v_drive->>'duration_seconds')::int,
      (v_drive->>'distance_km')::numeric,          -- JSON null → SQL NULL (unknown)
      coalesce(v_drive->'peak_metrics', '{}'::jsonb),
      coalesce(v_drive->'summary_metrics', '{}'::jsonb),
      false
    )
    RETURNING id INTO v_drive_id;

    -- (d) Backfill this drive's telemetry in one statement.
    UPDATE public.telemetry
       SET drive_id = v_drive_id
     WHERE sync_session_id = p_session_id
       AND timestamp BETWEEN v_started_at AND v_ended_at;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      -- A drive is built FROM this session's telemetry, so zero matches means
      -- the caller's timestamps do not round-trip (precision/format drift).
      -- Fail loudly: committing a drive with no telemetry is the silent
      -- failure this function exists to remove.
      RAISE EXCEPTION 'complete_sync_session: drive % .. % matched no telemetry in session %',
        v_started_at, v_ended_at, p_session_id;
    END IF;

    v_created := v_created + 1;
  END LOOP;

  -- (e) The status transition sync_session_completed_enqueue fires on — now in
  -- the same transaction as the inserts, so the agent is enqueued if and only
  -- if the drives exist. error_message is cleared: a session that previously
  -- failed and is now retried successfully must not keep the stale message.
  UPDATE public.sync_sessions
     SET status        = 'completed',
         completed_at  = now(),
         error_message = NULL
   WHERE id = p_session_id;

  -- (f)
  RETURN jsonb_build_object('outcome', 'completed', 'drives_created', v_created);
END $$;

-- REVOKE FROM PUBLIC alone is NOT enough on Supabase: anon and authenticated
-- receive their own default EXECUTE grants on new public-schema functions
-- (found in session 44), and public functions are exposed as PostgREST RPC.
-- Revoke each explicitly, then grant only the role the Edge Function uses.
REVOKE EXECUTE ON FUNCTION public.complete_sync_session(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_sync_session(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_sync_session(uuid, uuid, jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_sync_session(uuid, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.complete_sync_session(uuid, uuid, jsonb) IS
  'Persists a completed sync atomically: inserts the drives device_sync_complete segmented, backfills telemetry.drive_id per drive, and sets the session completed — one transaction, so the three cannot diverge. The FOR UPDATE lock on the session serialises overlapping device retries; a retry after completion returns outcome=already_completed and inserts nothing. Service-role only.';
