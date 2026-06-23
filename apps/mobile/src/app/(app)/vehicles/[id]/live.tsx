import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';

/**
 * STUB — live mode (Week 3, Day 5). Reached via the "Go live" button on the vehicle
 * detail screen. The real screen opens a Realtime channel (channelStatus !== null)
 * and streams `current_state` — see useCurrentState / subscribeToCurrentState.
 */
export default function VehicleLiveStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen center>
      <View className="items-center">
        <Text className="text-lg font-semibold text-neutral-900">Live mode</Text>
        <Text className="mt-2 text-sm text-neutral-500">Coming in Week 3 · Day 5</Text>
        <Text className="mt-1 text-xs text-neutral-400">id: {id}</Text>
      </View>
    </Screen>
  );
}
