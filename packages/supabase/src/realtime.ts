import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CaeortaSupabaseClient } from './client';
import type { Database } from './database.types';

type CurrentState = Database['public']['Tables']['current_state']['Row'];
type AgentStatus = Database['public']['Tables']['agent_status']['Row'];
type SyncSession = Database['public']['Tables']['sync_sessions']['Row'];
type DiagnosticOutput = Database['public']['Tables']['diagnostic_outputs']['Row'];

/**
 * Subscribe to live OBD metrics for a vehicle.
 * Called when user enters live mode.
 */
export function subscribeToCurrentState(
  supabase: CaeortaSupabaseClient,
  vehicleId: string,
  onUpdate: (state: CurrentState) => void,
): RealtimeChannel {
  return supabase
    .channel(`current_state:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'current_state',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          onUpdate(payload.new as CurrentState);
        }
      },
    )
    .subscribe();
}

/**
 * Subscribe to AI agent status for a vehicle.
 * Shows "Analysing your drive..." banner in the app.
 */
export function subscribeToAgentStatus(
  supabase: CaeortaSupabaseClient,
  vehicleId: string,
  onUpdate: (status: AgentStatus) => void,
): RealtimeChannel {
  return supabase
    .channel(`agent_status:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_status',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          onUpdate(payload.new as AgentStatus);
        }
      },
    )
    .subscribe();
}

/**
 * Subscribe to sync session updates for a vehicle.
 * Shows sync progress indicator in the app.
 */
export function subscribeToSyncSession(
  supabase: CaeortaSupabaseClient,
  vehicleId: string,
  onUpdate: (session: SyncSession) => void,
): RealtimeChannel {
  return supabase
    .channel(`sync_sessions:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sync_sessions',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          onUpdate(payload.new as SyncSession);
        }
      },
    )
    .subscribe();
}

/**
 * Subscribe to new diagnostic outputs for a vehicle.
 * Triggers notification banner when agent produces a new insight.
 */
export function subscribeToDiagnosticOutputs(
  supabase: CaeortaSupabaseClient,
  vehicleId: string,
  onInsert: (diagnostic: DiagnosticOutput) => void,
): RealtimeChannel {
  return supabase
    .channel(`diagnostic_outputs:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'diagnostic_outputs',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          onInsert(payload.new as DiagnosticOutput);
        }
      },
    )
    .subscribe();
}

/**
 * Unsubscribe and clean up a Realtime channel.
 * Always call this when a screen unmounts.
 */
export async function unsubscribe(
  supabase: CaeortaSupabaseClient,
  channel: RealtimeChannel,
): Promise<void> {
  await supabase.removeChannel(channel);
}
