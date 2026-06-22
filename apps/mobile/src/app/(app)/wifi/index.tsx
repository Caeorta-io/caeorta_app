import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

// Entry point of the Wi-Fi setup flow, reached after a device is paired. These
// screens deliberately have no nested `_layout`, so they join the existing `(app)`
// Stack and `dismissAll()` collapses the whole onboarding back to home.
export default function WifiIntro() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('wifi.introTitle')}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">{t('wifi.introBody')}</Text>
        <Text className="mt-4 text-base leading-6 text-neutral-500">{t('wifi.introHotspotHint')}</Text>
      </View>

      <View className="gap-3 pb-4">
        <Button label={t('wifi.introCta')} onPress={() => router.push('/wifi/credentials')} />
        <View className="items-center pt-1">
          <Button
            label={t('wifi.skipForNow')}
            variant="ghost"
            onPress={() => {
              if (router.canDismiss()) router.dismissAll();
              else router.replace('/');
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
