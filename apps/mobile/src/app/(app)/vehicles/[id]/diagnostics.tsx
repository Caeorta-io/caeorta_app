import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';

/**
 * STUB — full diagnostics list (post-Week-3). Reached via the "View all" link on the
 * vehicle detail screen's diagnostics preview. The real screen shows every
 * diagnostic with its `status` ('new' / 'seen' / 'dismissed' / 'actioned'), which
 * the preview deliberately omits.
 */
export default function VehicleDiagnosticsStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen center>
      <View className="items-center">
        <Text className="text-lg font-semibold text-neutral-900">All diagnostics</Text>
        <Text className="mt-2 text-sm text-neutral-500">Coming after Week 3</Text>
        <Text className="mt-1 text-xs text-neutral-400">id: {id}</Text>
      </View>
    </Screen>
  );
}
