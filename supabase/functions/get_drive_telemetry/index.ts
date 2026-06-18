import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

const MAX_POINTS = 300;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const url = new URL(req.url);
    const drive_id = url.searchParams.get('drive_id');
    const metric = url.searchParams.get('metric');

    if (!drive_id) {
      return errorResponse('drive_id is required', 400);
    }

    // Verify user owns this drive
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify drive belongs to user
    const { data: drive, error: driveError } = await adminClient
      .from('drives')
      .select('id, vehicle_id, sync_session_id, started_at, ended_at, duration_seconds')
      .eq('id', drive_id)
      .single();

    if (driveError || !drive) {
      return errorResponse('Drive not found', 404);
    }

    // Verify user owns the vehicle
    const { data: vehicle } = await adminClient
      .from('vehicles')
      .select('id, owner_user_id')
      .eq('id', drive.vehicle_id)
      .eq('owner_user_id', user.id)
      .single();

    if (!vehicle) {
      return errorResponse('Access denied', 403);
    }

    // Fetch all telemetry for this drive
    const { data: telemetry, error: telemetryError } = await adminClient
      .from('telemetry')
      .select('timestamp, metrics')
      .eq('sync_session_id', drive.sync_session_id)
      .gte('timestamp', drive.started_at)
      .lte('timestamp', drive.ended_at)
      .order('timestamp', { ascending: true });

    if (telemetryError) {
      return errorResponse('Failed to fetch telemetry', 500);
    }

    const rows = telemetry ?? [];

    // Downsample if needed using LTTB (Largest Triangle Three Buckets) approximation
    const downsampled = rows.length <= MAX_POINTS
      ? rows
      : downsample(rows, MAX_POINTS);

    // If a specific metric is requested, return just that series
    if (metric) {
      const series = downsampled.map(row => ({
        t: row.timestamp,
        v: (row.metrics as Record<string, number>)[metric] ?? null,
      })).filter(p => p.v !== null);

      return okResponse({
        drive_id,
        metric,
        points: series,
        total_rows: rows.length,
        returned_rows: series.length,
      });
    }

    // Return all metrics
    return okResponse({
      drive_id,
      points: downsampled.map(row => ({
        t: row.timestamp,
        metrics: row.metrics,
      })),
      total_rows: rows.length,
      returned_rows: downsampled.length,
    });

  } catch (err) {
    console.error('get_drive_telemetry error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// Simple nth-point downsampling — good enough for v1
// Replace with LTTB in v2 if chart fidelity becomes an issue
function downsample(rows: Array<{timestamp: string, metrics: unknown}>, maxPoints: number) {
  const step = Math.ceil(rows.length / maxPoints);
  const result = [];
  for (let i = 0; i < rows.length; i += step) {
    result.push(rows[i]);
  }
  // Always include last point
  const last = rows[rows.length - 1];
  if (result[result.length - 1] !== last) {
    result.push(last);
  }
  return result;
}
