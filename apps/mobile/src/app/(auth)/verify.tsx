import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { otpSchema } from '@/lib/validation';

export default function Verify() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify() {
    setError(null);
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success || !email) {
      setError(t('auth.invalidCode'));
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data,
      type: 'email',
    });
    setSubmitting(false);

    if (verifyError) {
      setError(t('auth.verifyError'));
      return;
    }
    // On success the auth listener updates the store and the root guard swaps to
    // the (app) group automatically — no manual navigation needed here.
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-neutral-900">{t('auth.verifyTitle')}</Text>
        <Text className="mt-2 text-base text-neutral-500">
          {t('auth.verifySubtitle', { email })}
        </Text>

        <Text className="mb-2 mt-8 text-sm font-medium text-neutral-700">{t('auth.codeLabel')}</Text>
        <TextInput
          className="rounded-xl border border-neutral-300 px-4 py-3 text-2xl tracking-[8px] text-neutral-900"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder={t('auth.codePlaceholder')}
          placeholderTextColor="#a3a3a3"
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={6}
          editable={!submitting}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void handleVerify()}
        />
        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

        <Pressable
          className={`mt-6 items-center rounded-xl bg-blue-600 py-4 ${
            submitting ? 'opacity-50' : 'active:opacity-80'
          }`}
          disabled={submitting}
          onPress={() => void handleVerify()}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">{t('auth.verify')}</Text>
          )}
        </Pressable>

        <Pressable
          className="mt-4 items-center py-2"
          disabled={submitting}
          onPress={() => router.back()}
        >
          <Text className="text-sm font-medium text-blue-600">{t('auth.changeEmail')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
