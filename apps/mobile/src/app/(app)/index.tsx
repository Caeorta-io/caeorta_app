import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sentry } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  function handleSignOut() {
    // The auth listener clears the store and the root guard swaps to (auth).
    void supabase.auth.signOut();
  }

  function handleThrowTestError() {
    // Explicit capture (not an uncaught throw) so it reliably reaches Sentry even
    // in Expo Go, where the native crash handler is unavailable.
    Sentry.captureException(new Error('Caeorta Sentry test error (home screen button)'));
    Alert.alert(t('home.testErrorSentTitle'), t('home.testErrorSentBody'));
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-2xl font-semibold text-neutral-900">
          {t('home.greeting', { email: user?.email ?? '' })}
        </Text>

        <Pressable
          className="mt-10 w-full items-center rounded-xl bg-blue-600 py-4 active:opacity-80"
          onPress={() => router.push('/pair')}
        >
          <Text className="text-base font-semibold text-white">{t('home.pairDevice')}</Text>
        </Pressable>

        <Pressable
          className="mt-3 w-full items-center rounded-xl bg-neutral-900 py-4 active:opacity-80"
          onPress={handleSignOut}
        >
          <Text className="text-base font-semibold text-white">{t('home.signOut')}</Text>
        </Pressable>

        {__DEV__ ? (
          <Pressable
            className="mt-3 w-full items-center rounded-xl border border-red-300 py-4 active:opacity-80"
            onPress={handleThrowTestError}
          >
            <Text className="text-base font-medium text-red-600">{t('home.throwTestError')}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
