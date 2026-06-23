import { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { ConnectionState } from '@/components/ConnectionState';
import { EmptyVehicleList } from '@/components/EmptyVehicleList';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useCurrentState, useLastDrive, useVehicles } from '@/hooks';
import { formatDriveSummary, formatRelativeTime } from '@/lib/format';

/**
 * Post-auth default view: the user's vehicles, each with a connection chip, last
 * sync time, and last-drive summary. All reads go through the mock-backed hooks
 * (DATA_SOURCE='mock') — no live Supabase calls this week.
 */
export default function VehiclesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const vehiclesQuery = useVehicles();

  const goToAdd = useCallback(() => router.push('/vehicles/add'), [router]);

  if (vehiclesQuery.isPending) {
    return (
      <Screen>
        <ScreenHeading />
        <VehicleListSkeleton />
      </Screen>
    );
  }

  if (vehiclesQuery.isError) {
    return (
      <Screen>
        <ScreenHeading />
        <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-base font-medium text-red-700">{t('vehicles.error.title')}</Text>
          <Text className="mt-1 text-sm text-red-600">{t('vehicles.error.body')}</Text>
          <View className="mt-4 self-start">
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => void vehiclesQuery.refetch()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const vehicles = vehiclesQuery.data;
  if (vehicles.length === 0) {
    return (
      <Screen>
        <ScreenHeading />
        <EmptyVehicleList onAdd={goToAdd} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeading />
      <FlatList
        className="mt-4"
        data={vehicles}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => router.push({ pathname: '/vehicles/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function ScreenHeading() {
  const { t } = useTranslation();
  return (
    <Text className="text-2xl font-semibold text-neutral-900">{t('vehicles.title')}</Text>
  );
}

interface VehicleCardProps {
  vehicle: Tables<'vehicles'>;
  onPress: () => void;
}

/**
 * A single vehicle row. Each card owns its `useCurrentState` / `useLastDrive`
 * queries — they must live in a component (not in the list's `renderItem` body)
 * to satisfy the rules of hooks under the React Compiler.
 *
 * TODO(perf): in mock mode this fans out two queries per card. That's expected
 * and fine here (fixtures resolve synchronously, TanStack Query dedupes/caches by
 * key). Revisit batching only if a live Supabase swap makes it costly.
 */
function VehicleCard({ vehicle, onPress }: VehicleCardProps) {
  const { t } = useTranslation();
  const currentStateQuery = useCurrentState(vehicle.id);
  const lastDriveQuery = useLastDrive(vehicle.id);

  const updatedAt = currentStateQuery.data?.updated_at ?? null;
  const lastSync = formatRelativeTime(updatedAt);
  const driveSummary = formatDriveSummary(lastDriveQuery.data ?? null);

  const subtitle = [vehicle.make, vehicle.model, vehicle.year]
    .filter((part): part is string | number => part !== null && part !== undefined && part !== '')
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-xl border border-neutral-200 bg-white p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-neutral-900">
            {vehicle.nickname ?? t('vehicles.unnamed')}
          </Text>
          {subtitle.length > 0 ? (
            <Text className="mt-0.5 text-sm text-neutral-500">{subtitle}</Text>
          ) : null}
        </View>
        {/* List view never opens a Realtime channel → channelStatus is null. */}
        <ConnectionState channelStatus={null} currentStateUpdatedAt={updatedAt} />
      </View>

      <View className="mt-3 flex-row justify-between">
        <Text className="text-sm text-neutral-600">
          {t('vehicles.lastSync', { value: lastSync })}
        </Text>
        <Text className="text-sm text-neutral-600">{driveSummary}</Text>
      </View>
    </Pressable>
  );
}

/** Three static placeholder cards while the vehicle list resolves. */
function VehicleListSkeleton() {
  return (
    <View className="mt-4">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4"
        >
          <View className="h-4 w-32 rounded bg-neutral-200" />
          <View className="mt-2 h-3 w-44 rounded bg-neutral-200" />
          <View className="mt-4 h-3 w-24 rounded bg-neutral-200" />
        </View>
      ))}
    </View>
  );
}
