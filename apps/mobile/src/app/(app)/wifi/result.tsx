import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ProvisioningResult } from '@caeorta/types';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { provisionWifiCredentials } from '@/lib/provisioning';

type Phase = { phase: 'pending' } | { phase: 'done'; result: ProvisioningResult };

export default function WifiResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ ssid?: string; password?: string }>();
  const ssid = typeof params.ssid === 'string' ? params.ssid : '';
  const password = typeof params.password === 'string' ? params.password : '';
  const [state, setState] = useState<Phase>({ phase: 'pending' });

  // Kick off provisioning; state only ever set in the async resolve, and the
  // cleanup drops a result that lands after unmount/re-run (same pattern as
  // pair/result).
  const attempt = useCallback(() => {
    let cancelled = false;
    void provisionWifiCredentials({ ssid, password }).then((result) => {
      if (!cancelled) setState({ phase: 'done', result });
    });
    return () => {
      cancelled = true;
    };
  }, [ssid, password]);

  useEffect(() => attempt(), [attempt]);

  const run = useCallback(() => {
    setState({ phase: 'pending' });
    attempt();
  }, [attempt]);

  const goHome = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  }, [router]);

  if (state.phase === 'pending') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" size="large" />
          <Text className="mt-6 text-base text-neutral-500">{t('wifi.sending')}</Text>
        </View>
      </Screen>
    );
  }

  const { result } = state;

  if (result.reason === 'success') {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-neutral-900">{t('wifi.successTitle')}</Text>
          <Text className="mt-3 text-base leading-6 text-neutral-500">{t('wifi.successBody')}</Text>
        </View>
        <View className="pb-4">
          <Button label={t('wifi.successCta')} onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const { title, body } = errorCopy(result.reason, t);

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{title}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">{body}</Text>
      </View>
      <View className="gap-3 pb-4">{renderActions(result.reason, { run, goHome, router, t })}</View>
    </Screen>
  );
}

type ErrorReason = Exclude<ProvisioningResult['reason'], 'success'>;

function errorCopy(
  reason: ErrorReason,
  t: (key: string) => string,
): { title: string; body: string } {
  switch (reason) {
    case 'device-not-found':
      return { title: t('wifi.errNotFoundTitle'), body: t('wifi.errNotFoundBody') };
    case 'wrong-pop':
      return { title: t('wifi.errPopTitle'), body: t('wifi.errPopBody') };
    case 'wifi-auth-failed':
      return { title: t('wifi.errAuthTitle'), body: t('wifi.errAuthBody') };
    case 'timeout':
      return { title: t('wifi.errTimeoutTitle'), body: t('wifi.errTimeoutBody') };
    case 'network':
      return { title: t('wifi.errNetworkTitle'), body: t('wifi.errNetworkBody') };
  }
}

function renderActions(
  reason: ErrorReason,
  deps: {
    run: () => void;
    goHome: () => void;
    router: ReturnType<typeof useRouter>;
    t: (key: string) => string;
  },
) {
  const { run, goHome, router, t } = deps;
  const editCredentials = (
    <Button
      label={t('wifi.editCredentialsCta')}
      variant="secondary"
      onPress={() => router.replace('/wifi/credentials')}
    />
  );
  const cancel = (
    <View className="items-center pt-1">
      <Button label={t('common.cancel')} variant="ghost" onPress={goHome} />
    </View>
  );

  switch (reason) {
    case 'wifi-auth-failed':
      // The creds were wrong — leading action is to fix them, retry is secondary.
      return (
        <>
          {editCredentials}
          <Button label={t('common.retry')} onPress={run} />
          {cancel}
        </>
      );
    case 'device-not-found':
      // Device probably isn't in setup mode / on its hotspot — retry, or re-check creds.
      return (
        <>
          <Button label={t('common.retry')} onPress={run} />
          {editCredentials}
          {cancel}
        </>
      );
    case 'timeout':
    case 'network':
    case 'wrong-pop':
      // Transient or session-level — retrying is the primary recovery.
      return (
        <>
          <Button label={t('common.retry')} onPress={run} />
          {cancel}
        </>
      );
  }
}
