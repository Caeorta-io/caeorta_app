import '../global.css';
// Side-effect import: bootstraps the i18next default instance before any screen
// calls `useTranslation()`.
import '@/lib/i18n';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthLifecycle } from '@/hooks/useAuthLifecycle';
import { initSentry, Sentry } from '@/lib/sentry';
import { useAuthStore } from '@/lib/store';

initSentry();

// Hold the native splash until the session restore settles (see useAuthLifecycle).
void SplashScreen.preventAutoHideAsync();

// One shared QueryClient for the app. No queries are registered yet — this is
// the provider wiring so server-state hooks can be added later without churn.
const queryClient = new QueryClient();

function RootLayout() {
  useAuthLifecycle();
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  // Keep the splash up rather than flashing a screen we may immediately redirect.
  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Protected group: only reachable with a session. */}
            <Stack.Protected guard={Boolean(session)}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            {/* Public group: only reachable when signed out. */}
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
