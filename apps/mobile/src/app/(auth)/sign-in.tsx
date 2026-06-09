import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { emailSchema } from '@/lib/validation';

export default function SignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode() {
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(t('auth.invalidEmail'));
      return;
    }

    setSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      // Code-only OTP: create the user on first sign-in; no magic-link redirect.
      options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
    setSubmitting(false);

    if (otpError) {
      setError(t('auth.sendCodeError'));
      return;
    }
    router.push({ pathname: '/verify', params: { email: parsed.data } });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-neutral-900">{t('auth.signInTitle')}</Text>
        <Text className="mt-2 text-base text-neutral-500">{t('auth.signInSubtitle')}</Text>

        <Text className="mb-2 mt-8 text-sm font-medium text-neutral-700">
          {t('auth.emailLabel')}
        </Text>
        <TextInput
          className="rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900"
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor="#a3a3a3"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          inputMode="email"
          keyboardType="email-address"
          editable={!submitting}
          returnKeyType="send"
          onSubmitEditing={() => void handleSendCode()}
        />
        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

        <Pressable
          className={`mt-6 items-center rounded-xl bg-blue-600 py-4 ${
            submitting ? 'opacity-50' : 'active:opacity-80'
          }`}
          disabled={submitting}
          onPress={() => void handleSendCode()}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">{t('auth.sendCode')}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
