-- Migration: add notify_agent RPC function
-- Called by device_sync_complete Edge Function when a sync session completes.
-- The AI agent project listens for this notification via pg_listen.

CREATE OR REPLACE FUNCTION public.notify_agent(
  p_session_id uuid,
  p_vehicle_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify(
    'agent_trigger',
    json_build_object(
      'session_id', p_session_id,
      'vehicle_id', p_vehicle_id,
      'triggered_at', now()
    )::text
  );
END;
$$;
