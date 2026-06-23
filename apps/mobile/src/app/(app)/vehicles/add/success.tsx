import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

/**
 * Screen 2 of the add-vehicle flow — the success state. Presentational: the form
 * has already created the vehicle and routed here (via `router.replace`, so Back
 * doesn't return to the form) with the new vehicle's display fields as params.
 */
export default function AddVehicleSuccess() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    nickname?: string;
    make?: string;
    model?: string;
    year?: string;
  }>();

  const nickname = typeof params.nickname === 'string' ? params.nickname : '';
  const make = typeof params.make === 'string' ? params.make : '';
  const model = typeof params.model === 'string' ? params.model : '';
  const year = typeof params.year === 'string' ? params.year : '';

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('vehicles.add.successTitle')}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">
          {t('vehicles.add.successBody', { nickname, make, model, year })}
        </Text>
      </View>
      <View className="pb-4">
        <Button
          label={t('vehicles.add.successCta')}
          onPress={() => router.replace('/vehicles')}
        />
      </View>
    </Screen>
  );
}
