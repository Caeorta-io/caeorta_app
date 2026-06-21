import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { PairDeviceError, PairDeviceResult } from '@caeorta/types';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { pairDevice } from '@/lib/pairing';

type Phase = { phase: 'pending' } | { phase: 'done'; result: PairDeviceResult };

export default function PairResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ secret?: string }>();
  const secret = typeof params.secret === 'string' ? params.secret : '';
  const [state, setState] = useState<Phase>({ phase: 'pending' });

  // Fires the pairing call and resolves into 'done'. State is only set in the
  // async `.then` (never synchronously in the effect), and the returned cleanup
  // drops a result that arrives after unmount/re-run.
  const attempt = useCallback(() => {
    let cancelled = false;
    void pairDevice(secret).then((result) => {
      if (!cancelled) setState({ phase: 'done', result });
    });
    return () => {
      cancelled = true;
    };
  }, [secret]);

  // Initial state is already 'pending', so the mount effect just kicks off the call.
  useEffect(() => attempt(), [attempt]);

  // Retry affordance (button-driven): reset to the spinner, then attempt again.
  const run = useCallback(() => {
    setState({ phase: 'pending' });
    attempt();
  }, [attempt]);

  // Collapse the whole pairing flow and land back on home with no back-stack to it.
  const goHome = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  }, [router]);

  if (state.phase === 'pending') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" size="large" />
          <Text className="mt-6 text-base text-neutral-500">{t('pair.pairing')}</Text>
        </View>
      </Screen>
    );
  }

  const { result } = state;

  if (result.ok) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-neutral-900">{t('pair.successTitle')}</Text>
          <Text className="mt-3 text-base leading-6 text-neutral-500">{t('pair.successBody')}</Text>
        </View>
        <View className="pb-4">
          <Button label={t('pair.successCta')} onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const { title, body } = errorCopy(result, t);

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{title}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">{body}</Text>
      </View>
      <View className="gap-3 pb-4">
        {renderActions(result, { run, goHome, router, t })}
      </View>
    </Screen>
  );
}

function errorCopy(
  error: PairDeviceError,
  t: (key: string) => string,
): { title: string; body: string } {
  switch (error.status) {
    case 404:
      return { title: t('pair.errNotFoundTitle'), body: t('pair.errNotFoundBody') };
    case 409:
      return { title: t('pair.errAlreadyClaimedTitle'), body: t('pair.errAlreadyClaimedBody') };
    case 'network':
      return { title: t('pair.errNetworkTitle'), body: t('pair.errNetworkBody') };
    case 401:
      return { title: t('pair.errUnauthorizedTitle'), body: t('pair.errUnauthorizedBody') };
    case 400:
    case 500:
      return { title: t('pair.errGenericTitle'), body: t('pair.errGenericBody') };
  }
}

function renderActions(
  error: PairDeviceError,
  deps: {
    run: () => void;
    goHome: () => void;
    router: ReturnType<typeof useRouter>;
    t: (key: string) => string;
  },
) {
  const { run, goHome, router, t } = deps;
  switch (error.status) {
    case 404:
      // Unrecognized code — let the user re-scan or retype; neither retry re-runs blindly.
      return (
        <>
          <Button label={t('pair.scanAgainCta')} onPress={() => router.replace('/pair/scan')} />
          <Button
            label={t('pair.manualCta')}
            variant="secondary"
            onPress={() => router.replace('/pair/manual')}
          />
          <View className="items-center pt-1">
            <Button label={t('common.cancel')} variant="ghost" onPress={goHome} />
          </View>
        </>
      );
    case 409:
      // Already claimed — retrying can't help; offer home or a different device.
      return (
        <>
          <Button label={t('pair.doneCta')} onPress={goHome} />
          <Button
            label={t('pair.differentDeviceCta')}
            variant="secondary"
            onPress={() => router.replace('/pair')}
          />
        </>
      );
    case 'network':
      // Transient — retry the same secret, or fall back to typing it.
      return (
        <>
          <Button label={t('common.retry')} onPress={run} />
          <Button
            label={t('pair.manualCta')}
            variant="secondary"
            onPress={() => router.replace('/pair/manual')}
          />
          <View className="items-center pt-1">
            <Button label={t('common.cancel')} variant="ghost" onPress={goHome} />
          </View>
        </>
      );
    case 401:
      return (
        <View className="pb-0">
          <Button label={t('pair.doneCta')} onPress={goHome} />
        </View>
      );
    case 400:
    case 500:
      return (
        <>
          <Button label={t('common.retry')} onPress={run} />
          <View className="items-center pt-1">
            <Button label={t('common.cancel')} variant="ghost" onPress={goHome} />
          </View>
        </>
      );
  }
}
