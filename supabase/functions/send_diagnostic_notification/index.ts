import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_PER_USER_PER_HOUR = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { diagnostic_id } = await req.json();
    if (!diagnostic_id) {
      return errorResponse('diagnostic_id is required', 400);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the diagnostic
    const { data: diagnostic, error: diagError } = await adminClient
      .from('diagnostic_outputs')
      .select('id, vehicle_id, severity, title, summary, urgency')
      .eq('id', diagnostic_id)
      .single();

    if (diagError || !diagnostic) {
      return errorResponse('Diagnostic not found', 404);
    }

    // Only notify for warning and critical
    if (!['warning', 'critical'].includes(diagnostic.severity)) {
      return okResponse({ skipped: true, reason: 'severity is info — no notification needed' });
    }

    // Get vehicle owner
    const { data: vehicle } = await adminClient
      .from('vehicles')
      .select('owner_user_id')
      .eq('id', diagnostic.vehicle_id)
      .single();

    if (!vehicle) {
      return errorResponse('Vehicle not found', 404);
    }

    const user_id = vehicle.owner_user_id;

    // Check user notification preferences
    const { data: prefs } = await adminClient
      .from('user_preferences')
      .select('notification_severity_threshold, quiet_hours_start, quiet_hours_end, timezone')
      .eq('user_id', user_id)
      .single();

    if (prefs) {
      const threshold = prefs.notification_severity_threshold ?? 'warning';
      const severityRank: Record<string, number> = { info: 0, warning: 1, critical: 2 };
      if (severityRank[diagnostic.severity] < severityRank[threshold]) {
        return okResponse({ skipped: true, reason: 'below user severity threshold' });
      }
    }

    // Rate limit — max 3 per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from('device_push_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('last_used_at', oneHourAgo);

    if ((count ?? 0) >= MAX_PER_USER_PER_HOUR) {
      return okResponse({ skipped: true, reason: 'rate limit reached' });
    }

    // Get user push tokens
    const { data: tokens } = await adminClient
      .from('device_push_tokens')
      .select('id, token, platform')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      return okResponse({ skipped: true, reason: 'no push tokens for user' });
    }

    // Build notification
    const title = diagnostic.severity === 'critical'
      ? 'Action required'
      : 'Heads up';

    const body = diagnostic.title;

    const messages = tokens.map(t => ({
      to: t.token,
      title,
      body,
      data: { diagnostic_id, severity: diagnostic.severity },
      priority: diagnostic.severity === 'critical' ? 'high' : 'normal',
      sound: diagnostic.severity === 'critical' ? 'default' : undefined,
    }));

    // Send via Expo Push API
    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!expoResponse.ok) {
      console.error('Expo push error:', await expoResponse.text());
      return errorResponse('Failed to send push notification', 500);
    }

    // Update last_used_at on tokens
    await adminClient
      .from('device_push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user_id);

    return okResponse({ sent: true, tokens_notified: tokens.length });

  } catch (err) {
    console.error('send_diagnostic_notification error:', err);
    return errorResponse('Internal server error', 500);
  }
});
