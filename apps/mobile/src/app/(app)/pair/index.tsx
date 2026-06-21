import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function PairIntro() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('pair.introTitle')}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">{t('pair.introSubtitle')}</Text>
      </View>

      <View className="gap-3 pb-4">
        <Button label={t('pair.scanCta')} onPress={() => router.push('/pair/scan')} />
        <Button
          label={t('pair.manualCta')}
          variant="secondary"
          onPress={() => router.push('/pair/manual')}
        />
        <View className="items-center pt-1">
          <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
