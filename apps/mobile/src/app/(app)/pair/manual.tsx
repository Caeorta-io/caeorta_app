import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { deviceSecretSchema } from '@caeorta/types';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function PairManual() {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const parsed = deviceSecretSchema.safeParse(code);
    if (!parsed.success) {
      setError(t('pair.manualInvalid'));
      return;
    }
    // Hand the trimmed secret to the result screen, which runs the pairing call.
    router.push({ pathname: '/pair/result', params: { secret: parsed.data } });
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('pair.manualTitle')}</Text>
        <Text className="mt-2 text-base text-neutral-500">{t('pair.manualSubtitle')}</Text>

        <Text className="mb-2 mt-8 text-sm font-medium text-neutral-700">
          {t('pair.manualLabel')}
        </Text>
        <TextInput
          className="rounded-xl border border-neutral-300 px-4 py-3 text-lg tracking-widest text-neutral-900"
          value={code}
          onChangeText={setCode}
          placeholder={t('pair.manualPlaceholder')}
          placeholderTextColor="#a3a3a3"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          editable
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
      </View>

      <View className="gap-3 pb-4">
        <Button label={t('pair.pairCta')} onPress={handleSubmit} />
        <View className="items-center pt-1">
          <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
