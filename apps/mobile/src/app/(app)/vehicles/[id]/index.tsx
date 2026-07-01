import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ConnectionState } from '@/components/ConnectionState';
import { DiagnosticsPreview } from '@/components/DiagnosticsPreview';
import { LastDriveCard, NoLastDriveState } from '@/components/LastDriveCard';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useCurrentState, useLastDrive, useRecentDiagnostics, useVehicle } from '@/hooks';

/**
 * Vehicle detail — the persistent view a user lands on after tapping a vehicle
 * card. Header + last-drive summary + recent-diagnostics preview + a live-mode
 * entry point. All reads go through the mock-backed hooks (DATA_SOURCE='mock');
 * no live Supabase calls this week.
 *
 * Error policy: a `useVehicle` error blocks the screen (error + retry), since
 * there's nothing to show without it. The secondary hooks (last drive,
 * diagnostics, current state) fail soft — their errors render as "no data" rather
 * than crashing the screen.
 */
export default function VehicleDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const vehicleQuery = useVehicle(id);
  const lastDriveQuery = useLastDrive(id);
  const diagnosticsQuery = useRecentDiagnostics(id, 3);
  // TODO(perf): one extra query for the header's connection chip. Fine in mock mode
  // (fixtures resolve synchronously, TanStack dedupes by key). channelStatus stays
  // null here — the live Realtime channel is opened on the (Day-5) live screen, not
  // this view. Revisit batching only if a live Supabase swap makes it costly.
  const currentStateQuery = useCurrentState(id);

  if (vehicleQuery.isPending) {
    return (
      <Screen>
        <VehicleDetailSkeleton />
      </Screen>
    );
  }

  if (vehicleQuery.isError) {
    return (
      <Screen>
        <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-base font-medium text-red-700">
            {t('vehicles.detail.error.title')}
          </Text>
          <Text className="mt-1 text-sm text-red-600">{t('vehicles.detail.error.body')}</Text>
          <View className="mt-4 self-start">
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => void vehicleQuery.refetch()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const vehicle = vehicleQuery.data;
  if (vehicle === null) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-neutral-900">
            {t('vehicles.detail.notFoundTitle')}
          </Text>
          <Text className="mt-3 text-base leading-6 text-neutral-500">
            {t('vehicles.detail.notFoundBody')}
          </Text>
        </View>
        <View className="pb-4">
          <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // Secondary hooks fail soft: an error reads as "no data", not a crashed screen.
  const lastDrive = lastDriveQuery.isError ? null : (lastDriveQuery.data ?? null);
  const diagnostics = diagnosticsQuery.isError ? [] : (diagnosticsQuery.data ?? []);
  const currentStateUpdatedAt = currentStateQuery.data?.updated_at ?? null;

  const subtitle = [vehicle.make, vehicle.model, vehicle.year]
    .filter((part): part is string | number => part !== null && part !== undefined && part !== '')
    .join(' · ');

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="pt-4">
          <Text className="text-3xl font-bold text-neutral-900">
            {vehicle.nickname ?? t('vehicles.unnamed')}
          </Text>
          {subtitle.length > 0 ? (
            <Text className="mt-1 text-base text-neutral-500">{subtitle}</Text>
          ) : null}
          <View className="mt-3">
            {/* Detail view never opens a Realtime channel → channelStatus is null. */}
            <ConnectionState channelStatus={null} currentStateUpdatedAt={currentStateUpdatedAt} />
          </View>
        </View>

        {lastDriveQuery.isPending ? (
          <LastDriveCardSkeleton />
        ) : lastDrive !== null ? (
          <LastDriveCard drive={lastDrive} />
        ) : (
          <NoLastDriveState />
        )}

        {/* Entry point to the full, paginated drives history — additional to the
            last-drive summary above, which stays as the at-a-glance view. */}
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/vehicles/[id]/drives', params: { id: vehicle.id } })
          }
          className="mt-2 self-start py-2 active:opacity-70"
        >
          <Text className="text-sm font-medium text-blue-600">{t('vehicles.drives.viewAll')}</Text>
        </Pressable>

        {diagnosticsQuery.isPending ? (
          <DiagnosticsSkeleton />
        ) : (
          <DiagnosticsPreview diagnostics={diagnostics} vehicleId={vehicle.id} />
        )}
      </ScrollView>

      <View className="pb-4 pt-3">
        <Button
          label={t('vehicles.detail.goLive')}
          onPress={() => router.push({ pathname: '/vehicles/[id]/live', params: { id: vehicle.id } })}
        />
      </View>
    </Screen>
  );
}

/** Full-screen placeholder layout: tall header, a card, three short rows. */
function VehicleDetailSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="pt-4"
    >
      <View className="h-8 w-48 rounded bg-neutral-200" />
      <View className="mt-2 h-4 w-36 rounded bg-neutral-200" />
      <View className="mt-3 h-6 w-24 rounded-full bg-neutral-200" />
      <LastDriveCardSkeleton />
      <DiagnosticsSkeleton />
    </View>
  );
}

/** Card-shaped placeholder for the last-drive card while it resolves. */
function LastDriveCardSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4"
    >
      <View className="h-3 w-20 rounded bg-neutral-200" />
      <View className="mt-3 h-5 w-full rounded bg-neutral-200" />
      <View className="mt-3 h-4 w-2/3 rounded bg-neutral-200" />
    </View>
  );
}

/** Three short row placeholders for the diagnostics preview while it resolves. */
function DiagnosticsSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-6"
    >
      <View className="h-3 w-28 rounded bg-neutral-200" />
      {[0, 1, 2].map((i) => (
        <View key={i} className="mt-3 h-4 w-full rounded bg-neutral-200" />
      ))}
    </View>
  );
}
