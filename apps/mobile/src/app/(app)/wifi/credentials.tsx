import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { wifiCredentialsSchema } from '@caeorta/types';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

// SSID + password entry. The creds are device-local and never stored in the cloud;
// they're passed straight to the result screen, which hands them to the device
// over its SoftAP. (Passing them as route params mirrors how the pairing flow
// threads the device secret — fine for native, in-memory params.)
export default function WifiCredentials() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const parsed = wifiCredentialsSchema.safeParse({ ssid, password });
    if (!parsed.success) {
      setError(t('wifi.credentialsInvalid'));
      return;
    }
    router.push({
      pathname: '/wifi/result',
      params: { ssid: parsed.data.ssid, password: parsed.data.password },
    });
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('wifi.credentialsTitle')}</Text>
        <Text className="mt-2 text-base text-neutral-500">{t('wifi.credentialsSubtitle')}</Text>

        <Text className="mb-2 mt-8 text-sm font-medium text-neutral-700">{t('wifi.ssidLabel')}</Text>
        <TextInput
          className="rounded-xl border border-neutral-300 px-4 py-3 text-lg text-neutral-900"
          value={ssid}
          onChangeText={setSsid}
          placeholder={t('wifi.ssidPlaceholder')}
          placeholderTextColor="#a3a3a3"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          autoFocus
          returnKeyType="next"
        />

        <Text className="mb-2 mt-5 text-sm font-medium text-neutral-700">
          {t('wifi.passwordLabel')}
        </Text>
        <TextInput
          className="rounded-xl border border-neutral-300 px-4 py-3 text-lg text-neutral-900"
          value={password}
          onChangeText={setPassword}
          placeholder={t('wifi.passwordPlaceholder')}
          placeholderTextColor="#a3a3a3"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
      </View>

      <View className="gap-3 pb-4">
        <Button label={t('wifi.sendCta')} onPress={handleSubmit} />
        <View className="items-center pt-1">
          <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
