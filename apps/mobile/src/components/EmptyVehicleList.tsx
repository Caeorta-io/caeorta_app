import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

interface EmptyVehicleListProps {
  /** Navigate to the add-vehicle flow (Week 3, Day 3). */
  onAdd: () => void;
}

/**
 * Empty state for the vehicle list when the user owns zero vehicles. This is the
 * "you have no cars yet" state — distinct from the "this car has no drives yet"
 * empty state that lives on the detail screen. Kept as a standalone component so
 * it renders/tests in isolation.
 */
export function EmptyVehicleList({ onAdd }: EmptyVehicleListProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-base text-neutral-500">{t('vehicles.empty.body')}</Text>
      <View className="mt-8 w-full">
        <Button label={t('vehicles.empty.addCta')} onPress={onAdd} />
      </View>
    </View>
  );
}
