import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * The amber "Anomaly detected" pill shown on a drive that flagged something worth a
 * look (`drives.has_anomaly`). Shared by the last-drive card and the drives list so
 * the anomaly signal reads identically wherever a drive is summarised. Renders
 * nothing about layout margins — the caller positions it.
 */
export function AnomalyBadge() {
  const { t } = useTranslation();
  return (
    <View
      role="status"
      aria-label={t('vehicles.detail.anomaly')}
      className="flex-row items-center self-start rounded-full bg-amber-100 px-2.5 py-1"
    >
      <View className="mr-1.5 h-2 w-2 rounded-full bg-amber-500" />
      <Text className="text-xs font-medium text-amber-800">{t('vehicles.detail.anomaly')}</Text>
    </View>
  );
}
