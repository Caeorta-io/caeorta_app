import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  deriveConnectionState,
  type ChannelStatus,
  type ConnectionStateValue,
} from '@/lib/connectionState';

// Re-export the pure rule + constant so callers can `import { deriveConnectionState }
// from '@/components/ConnectionState'` without reaching into the logic module.
export {
  deriveConnectionState,
  SYNCED_THRESHOLD_MS,
  type ChannelStatus,
  type ConnectionStateValue,
} from '@/lib/connectionState';

interface ConnectionStateProps {
  /** Realtime channel status; pass `null` on surfaces with no open channel (the list). */
  channelStatus: ChannelStatus;
  /** ISO `current_state.updated_at`, or `null` when the vehicle has never reported. */
  currentStateUpdatedAt: string | null;
}

/** Colour-dot Tailwind class per state. Skeleton tokens — reconcile when design lands. */
const DOT_CLASS: Record<ConnectionStateValue, string> = {
  live: 'bg-green-500',
  synced: 'bg-blue-500',
  connecting: 'bg-amber-500',
  offline: 'bg-neutral-400',
};

/**
 * Small status chip (colour dot + label) for a vehicle's connection state. The
 * label and accessible description are derived from {@link deriveConnectionState}
 * — this component is presentation only; the rule lives in `./connectionState`.
 */
export function ConnectionState({ channelStatus, currentStateUpdatedAt }: ConnectionStateProps) {
  const { t } = useTranslation();
  const state = deriveConnectionState({ channelStatus, currentStateUpdatedAt });

  const label = t(`vehicles.connection.${state}`);
  const description = t(`vehicles.connectionA11y.${state}`);

  return (
    <View
      role="status"
      aria-label={description}
      className="flex-row items-center self-start rounded-full bg-neutral-100 px-2.5 py-1"
    >
      <View className={`mr-1.5 h-2 w-2 rounded-full ${DOT_CLASS[state]}`} />
      <Text className="text-xs font-medium text-neutral-700">{label}</Text>
    </View>
  );
}
