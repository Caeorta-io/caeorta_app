import { useCallback, useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { AnomalyBadge } from '@/components/AnomalyBadge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useDrives } from '@/hooks';
import { buildDriveListItems, formatDriveTime, type DriveListItem } from '@/lib/drives';
import { formatDistanceKm, formatDuration } from '@/lib/format';

/**
 * Paginated, date-grouped list of a vehicle's completed drives. Reached via the
 * "View all drives" link on the vehicle-detail screen. Reads through the mock-backed
 * `useDrives` infinite query (DATA_SOURCE.drives='mock'); no live Supabase this week.
 *
 * A single FlatList (per the Week-4 "use FlatList for lists" instruction) renders a
 * flat array that interleaves date-section headers with drive rows — see
 * `buildDriveListItems`. Scroll-to-end loads the next page. Loading is a skeleton
 * (not a spinner), matching the Week-3 convention; error and empty have their own
 * states.
 */
export default function VehicleDrivesScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useDrives(id);
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Flatten the loaded pages, then interleave date headers. Memoised so grouping only
  // re-runs when a new page arrives, not on every unrelated re-render.
  const drives = useMemo(() => data?.pages.flatMap((page) => page.drives) ?? [], [data]);
  const items = useMemo(() => buildDriveListItems(drives), [drives]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) {
    return (
      <Screen>
        <ScreenHeading />
        <DrivesListSkeleton />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeading />
        <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-base font-medium text-red-700">{t('vehicles.drives.error.title')}</Text>
          <Text className="mt-1 text-sm text-red-600">{t('vehicles.drives.error.body')}</Text>
          <View className="mt-4 self-start">
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => void query.refetch()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (drives.length === 0) {
    return (
      <Screen>
        <ScreenHeading />
        <View className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <Text className="text-sm text-neutral-500">{t('vehicles.drives.empty')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeading />
      <FlatList
        className="mt-2"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DriveListRow item={item} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <LoadMoreSkeleton /> : null}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function ScreenHeading() {
  const { t } = useTranslation();
  return <Text className="pt-2 text-2xl font-semibold text-neutral-900">{t('vehicles.drives.title')}</Text>;
}

/** Dispatch a flat-list row to its header or drive presentation. */
function DriveListRow({ item }: { item: DriveListItem }) {
  if (item.kind === 'header') {
    return (
      <View className="bg-white pb-1 pt-5">
        <Text className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {item.label}
        </Text>
      </View>
    );
  }
  return <DriveRow drive={item.drive} />;
}

/** One drive: distance headline, start time · duration below, amber marker if flagged. */
function DriveRow({ drive }: { drive: Tables<'drives'> }) {
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-100 py-3">
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-neutral-900">
          {formatDistanceKm(drive.distance_km)}
        </Text>
        <Text className="mt-0.5 text-sm text-neutral-500">
          {formatDriveTime(drive.started_at)} · {formatDuration(drive.duration_seconds)}
        </Text>
      </View>
      {drive.has_anomaly ? <AnomalyBadge /> : null}
    </View>
  );
}

/** Placeholder while the first page resolves: two date groups, a few rows each. */
function DrivesListSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-4"
    >
      {[0, 1].map((group) => (
        <View key={group} className={group === 0 ? '' : 'mt-6'}>
          <View className="h-3 w-24 rounded bg-neutral-200" />
          {[0, 1, 2].map((row) => (
            <View key={row} className="mt-3 border-b border-neutral-100 pb-3">
              <View className="h-4 w-20 rounded bg-neutral-200" />
              <View className="mt-2 h-3 w-32 rounded bg-neutral-200" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Footer placeholder while the next page loads (scroll-to-load-more). */
function LoadMoreSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="py-3"
    >
      <View className="h-4 w-20 rounded bg-neutral-200" />
      <View className="mt-2 h-3 w-32 rounded bg-neutral-200" />
    </View>
  );
}
