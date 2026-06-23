import { Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';

/**
 * STUB — add-vehicle flow (Week 3, Day 3). The real screen is a
 * make/model/year/nickname/ecu_type form with Zod validation, orchestrated by
 * `lib/vehicles.ts` against the Platform-track `create_vehicle` Edge Function
 * (see docs/08_12_Week_Action_Plan.md, Week 3 App-track scope).
 */
export default function AddVehicleStub() {
  return (
    <Screen center>
      <View className="items-center">
        <Text className="text-lg font-semibold text-neutral-900">Add a vehicle</Text>
        <Text className="mt-2 text-sm text-neutral-500">Coming in Week 3 · Day 3</Text>
      </View>
    </Screen>
  );
}
