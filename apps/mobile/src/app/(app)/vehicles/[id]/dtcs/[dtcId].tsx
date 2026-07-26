import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useDtc } from '@/hooks';

/**
 * S6 · DTC detail — **STUB, built in the next session (Week 5 Day 4).**
 *
 * It exists now so the S5 row tap has a real destination rather than a dead end (§7:
 * "every tappable link/chevron resolves to a real screen") and so the `dtcId` route
 * param is wired end-to-end and verifiable on-device in this build.
 *
 * It deliberately renders only what proves that chain works — the resolved code and
 * plain-language title from `useDtc`. NONE of §6's S6 inventory is here: no large code
 * badge + status pill, no "what it means", no likely-causes, no freeze-frame Metric
 * Tiles (§5.5, which `toFreezeFrameTiles` already prepares), no related Diagnostic
 * Card, no auto-clear note. Day 4 builds those; do not grow this file incrementally.
 */
export default function DtcDetailStubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, dtcId } = useLocalSearchParams<{ id: string; dtcId: string }>();

  const { data: dtc, isPending } = useDtc(id, dtcId);

  return (
    <Frame>
      <View className="flex-1 justify-center">
        <Text variant="label" className="text-fg-tertiary">
          {t('vehicles.dtcs.detail.eyebrow')}
        </Text>
        <Text variant="data-lg" className="mt-2 text-fg-primary">
          {isPending ? '…' : (dtc?.code ?? t('vehicles.dtcs.detail.notFound'))}
        </Text>
        <Text variant="body-lg" className="mt-4 text-fg-secondary">
          {t('vehicles.dtcs.detail.stubBody')}
        </Text>
      </View>
      <View className="pb-4">
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </View>
    </Frame>
  );
}

/** Same token frame as S5 / drive-detail. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-surface-canvas" edges={['top']}>
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}
