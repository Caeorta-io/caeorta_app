import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';

/**
 * STUB — vehicle detail (Week 3, Day 4). For now it just echoes the routed id so
 * tapping a list card has a real destination. Replace with the real detail screen
 * (header + current state + last drive + recent diagnostics) when Day 4 lands.
 */
export default function VehicleDetailStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen center>
      <View className="items-center">
        <Text className="text-lg font-semibold text-neutral-900">Vehicle detail</Text>
        <Text className="mt-2 text-sm text-neutral-500">Coming in Week 3 · Day 4</Text>
        <Text className="mt-1 text-xs text-neutral-400">id: {id}</Text>
      </View>
    </Screen>
  );
}
