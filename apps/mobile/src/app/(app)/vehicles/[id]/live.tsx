import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { ConnectionState, type ChannelStatus } from '@/components/ConnectionState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useCurrentState, useVehicle } from '@/hooks';
import { subscribeToCurrentStateSource } from '@/lib/data/source';
import { formatSecondsAgo, selectPeakMetrics } from '@/lib/format';

/**
 * Live mode — the one surface that opens a Realtime channel. It subscribes to the
 * vehicle's `current_state` on mount (via the data seam's mock/live emitter),
 * streams the metrics panel, and tears the channel down on unmount. Unlike every
 * other screen, its ConnectionState chip receives a *real* channelStatus.
 *
 * Subscription lifecycle is managed here with `useEffect` + a ref (NOT TanStack
 * Query, which is for fetching, not push, and NOT Zustand — this state is local to
 * the screen). `useCurrentState` supplies only the one-shot seed; Realtime pushes
 * overwrite it from there.
 */
export default function VehicleLiveScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const vehicleQuery = useVehicle(id);
  const seedQuery = useCurrentState(id);

  const [currentState, setCurrentState] = useState<Tables<'current_state'> | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>(null);
  // `true` once the first Realtime push lands — after that we stop letting the
  // one-shot seed overwrite live values (the seed query can resolve late).
  const liveReceivedRef = useRef(false);
  // Holds the emitter's unsubscribe fn so unmount can always tear the channel down.
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // A once-per-second heartbeat so the "Updated X ago" line counts up on its own.
  const [now, setNow] = useState(() => Date.now());

  // Seed the panel from the one-shot snapshot until the first live push arrives.
  useEffect(() => {
    if (!liveReceivedRef.current && seedQuery.data != null) {
      setCurrentState(seedQuery.data);
    }
  }, [seedQuery.data]);

  // Subscribe on mount / re-subscribe when the vehicle changes; always tear down.
  useEffect(() => {
    const unsubscribe = subscribeToCurrentStateSource(
      id,
      (payload) => {
        liveReceivedRef.current = true;
        setCurrentState(payload);
      },
      (status) => setChannelStatus(status),
    );
    unsubscribeRef.current = unsubscribe;
    return () => {
      // Unconditional: the channel must never outlive the screen.
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [id]);

  // Separate 1 s ticker for the relative "Updated X ago" display; cleared on unmount.
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const goBack = () => router.back();

  if (vehicleQuery.isError) {
    return (
      <Screen>
        <LiveHeader onBack={goBack} />
        <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="text-base font-medium text-red-700">{t('vehicles.live.error.title')}</Text>
          <Text className="mt-1 text-sm text-red-600">{t('vehicles.live.error.body')}</Text>
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

  if (vehicleQuery.isPending) {
    return (
      <Screen>
        <LiveHeader onBack={goBack} />
        <LiveMetricsSkeleton />
      </Screen>
    );
  }

  const vehicle = vehicleQuery.data;
  if (vehicle === null) {
    return (
      <Screen>
        <LiveHeader onBack={goBack} />
        <View className="mt-6">
          <Text className="text-2xl font-bold text-neutral-900">
            {t('vehicles.detail.notFoundTitle')}
          </Text>
          <Text className="mt-2 text-base leading-6 text-neutral-500">
            {t('vehicles.detail.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  const updatedAt = currentState?.updated_at ?? null;

  return (
    <Screen>
      <LiveHeader title={vehicle.nickname ?? t('vehicles.unnamed')} onBack={goBack} />

      <View className="mt-3">
        {/* The only surface with a live channel → channelStatus is real, not null. */}
        <ConnectionState channelStatus={channelStatus} currentStateUpdatedAt={updatedAt} />
      </View>

      <LiveMetricsPanel currentState={currentState} channelStatus={channelStatus} />

      {updatedAt !== null ? (
        <Text className="mt-3 text-xs text-neutral-400">
          {t('vehicles.live.updatedAgo', { value: formatSecondsAgo(updatedAt, now) })}
        </Text>
      ) : null}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO(metric-keys): provisional keys — reconcile against the hardware/AI-agent
// contract before flipping DATA_SOURCE.currentStateSubscription to 'live'. Keys
// must match the provisional jsonb vocabulary in lib/data/mocks.ts
// (PROVISIONAL_METRIC_KEYS); this mirrors LastDriveCard's peak_metrics set. A key
// absent from a given `latest_metrics` blob is skipped silently by
// `selectPeakMetrics` (no empty tile).
// ─────────────────────────────────────────────────────────────────────────────
interface LiveMetricDisplay {
  /** i18n key under `vehicles.live.metric.*`. */
  labelKey: string;
  /** Locale-neutral unit token shown after the value. */
  unit: string;
  /** Decimal places for the value. */
  decimals: number;
}

const LIVE_METRICS: Record<string, LiveMetricDisplay> = {
  rpm: { labelKey: 'rpm', unit: 'rpm', decimals: 0 },
  speed_kph: { labelKey: 'speed', unit: 'kph', decimals: 0 },
  coolant_temp_c: { labelKey: 'coolant', unit: '°C', decimals: 1 },
};
const LIVE_METRIC_KEYS = Object.keys(LIVE_METRICS);

interface LiveMetricsPanelProps {
  currentState: Tables<'current_state'> | null;
  channelStatus: ChannelStatus;
}

/**
 * The streaming metrics panel. Renders one of three overlapping conditions:
 *   - no snapshot yet (seed pending)        → skeleton
 *   - channel closed after being open       → "Disconnected" banner + last-known values
 *   - channel connecting (or pre-connect)   → "Connecting…" label over the panel
 * Live values (channelStatus 'open') render plainly. Last-known values stay visible
 * through a disconnect rather than blanking the screen.
 */
function LiveMetricsPanel({ currentState, channelStatus }: LiveMetricsPanelProps) {
  const { t } = useTranslation();

  const disconnected = channelStatus === 'closed';
  // `null` is the pre-connect frame before the emitter's synchronous 'connecting'.
  const connecting = channelStatus === 'connecting' || channelStatus === null;

  const metrics =
    currentState !== null ? selectPeakMetrics(currentState.latest_metrics, LIVE_METRIC_KEYS) : [];

  return (
    <View className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-neutral-500">{t('vehicles.live.title')}</Text>
        {connecting ? (
          <Text className="text-xs font-medium text-amber-600">{t('vehicles.live.connecting')}</Text>
        ) : null}
      </View>

      {disconnected ? (
        <View
          role="status"
          aria-label={t('vehicles.live.disconnected')}
          className="mt-3 rounded-lg bg-neutral-100 px-3 py-2"
        >
          <Text className="text-xs font-medium text-neutral-600">
            {t('vehicles.live.disconnected')}
          </Text>
        </View>
      ) : null}

      {currentState === null ? (
        <LiveMetricRowsSkeleton />
      ) : (
        <View className="mt-3 flex-row justify-between">
          {metrics.map(({ key, value }) => {
            const display = LIVE_METRICS[key];
            if (display === undefined) return null;
            return (
              <MetricTile
                key={key}
                label={t(`vehicles.live.metric.${display.labelKey}`)}
                value={`${value.toFixed(display.decimals)} ${display.unit}`}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

/** One label-over-value metric tile. Local to the live screen. */
function MetricTile({ label, value }: MetricTileProps) {
  return (
    <View className="flex-1">
      <Text className="text-xs text-neutral-400">{label}</Text>
      <Text className="mt-0.5 text-lg font-semibold text-neutral-900">{value}</Text>
    </View>
  );
}

interface LiveHeaderProps {
  title?: string;
  onBack: () => void;
}

/** Back control + vehicle nickname. `title` omitted while the vehicle is loading. */
function LiveHeader({ title, onBack }: LiveHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center pt-4">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        className="mr-3 active:opacity-60"
      >
        <Text className="text-base font-medium text-blue-600">‹ {t('common.back')}</Text>
      </Pressable>
      {title !== undefined ? (
        <Text className="flex-1 text-2xl font-bold text-neutral-900" numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View className="h-7 flex-1 rounded bg-neutral-200" />
      )}
    </View>
  );
}

/** Full metrics-panel placeholder (title chip + three metric tiles). */
function LiveMetricsSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4"
    >
      <View className="h-3 w-24 rounded bg-neutral-200" />
      <LiveMetricRowsSkeleton />
    </View>
  );
}

/** Three metric-tile placeholders, shared by the loading and pre-seed states. */
function LiveMetricRowsSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-3 flex-row justify-between"
    >
      {[0, 1, 2].map((i) => (
        <View key={i} className="flex-1">
          <View className="h-3 w-12 rounded bg-neutral-200" />
          <View className="mt-1.5 h-5 w-16 rounded bg-neutral-200" />
        </View>
      ))}
    </View>
  );
}
