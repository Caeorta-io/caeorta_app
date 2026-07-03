import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { HealthIndicator } from '@/components/HealthIndicator';
import { formatDistanceKm, formatDuration, formatSpeedKph, selectPeakMetrics } from '@/lib/format';
import type { DriveHealth } from '@/lib/driveHealth';

interface LastDriveCardProps {
  drive: Tables<'drives'>;
  /** Derived three-state health for this drive (see `deriveDriveHealth`). */
  health: DriveHealth;
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO(metric-keys): provisional keys — reconcile against hardware/AI-agent
// contract before any live flip. Canonical set not yet confirmed.
//
// The display config below names at most three peak metrics to surface on the
// card. Keys must match the provisional jsonb vocabulary in lib/data/mocks.ts
// (PROVISIONAL_METRIC_KEYS); a key absent from a given drive's `peak_metrics` is
// skipped silently by `selectPeakMetrics` (no empty row).
// ─────────────────────────────────────────────────────────────────────────────
interface PeakMetricDisplay {
  /** i18n key under `vehicles.detail.peak.*`. */
  labelKey: string;
  /** Locale-neutral unit token shown after the value. */
  unit: string;
  /** Decimal places for the value. */
  decimals: number;
}

const PEAK_METRICS: Record<string, PeakMetricDisplay> = {
  rpm: { labelKey: 'rpm', unit: 'rpm', decimals: 0 },
  speed_kph: { labelKey: 'speed', unit: 'kph', decimals: 0 },
  coolant_temp_c: { labelKey: 'coolant', unit: '°C', decimals: 1 },
};
// Order is the display order; capped at 3 keys per the metric-keys note above.
const PEAK_METRIC_KEYS = Object.keys(PEAK_METRICS);

/**
 * Summary card for a vehicle's most recent completed drive: distance, duration,
 * average speed, an optional anomaly indicator, and up to three peak metrics.
 *
 * Presentation only — all values come from the passed `drive` row; formatting and
 * peak-metric selection are delegated to the pure helpers in `lib/format`.
 */
export function LastDriveCard({ drive, health }: LastDriveCardProps) {
  const { t } = useTranslation();
  const peaks = selectPeakMetrics(drive.peak_metrics, PEAK_METRIC_KEYS);

  return (
    <View className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <Text className="text-sm font-medium text-neutral-500">{t('vehicles.detail.lastDrive')}</Text>

      <View className="mt-3 flex-row justify-between">
        <Stat label={t('vehicles.detail.distance')} value={formatDistanceKm(drive.distance_km)} />
        <Stat label={t('vehicles.detail.duration')} value={formatDuration(drive.duration_seconds)} />
        <Stat label={t('vehicles.detail.avgSpeed')} value={formatSpeedKph(drive.average_speed_kph)} />
      </View>

      <View className="mt-4">
        <HealthIndicator health={health} />
      </View>

      {peaks.length > 0 ? (
        <View className="mt-4 border-t border-neutral-100 pt-3">
          <Text className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {t('vehicles.detail.peakTitle')}
          </Text>
          <View className="mt-2 flex-row justify-between">
            {peaks.map(({ key, value }) => {
              const display = PEAK_METRICS[key];
              if (display === undefined) return null;
              return (
                <Stat
                  key={key}
                  label={t(`vehicles.detail.peak.${display.labelKey}`)}
                  value={`${value.toFixed(display.decimals)} ${display.unit}`}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface StatProps {
  label: string;
  value: string;
}

/** One label-over-value column. Local to the card. */
function Stat({ label, value }: StatProps) {
  return (
    <View className="flex-1">
      <Text className="text-xs text-neutral-400">{label}</Text>
      <Text className="mt-0.5 text-base font-semibold text-neutral-900">{value}</Text>
    </View>
  );
}

/**
 * Inline empty state for a loaded vehicle that has no drives yet — distinct from
 * the list screen's "no vehicles" full-screen empty state. Renders in place of the
 * {@link LastDriveCard}.
 */
export function NoLastDriveState() {
  const { t } = useTranslation();
  return (
    <View className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <Text className="text-sm font-medium text-neutral-700">{t('vehicles.detail.lastDrive')}</Text>
      <Text className="mt-1 text-sm text-neutral-500">{t('vehicles.detail.noDrives')}</Text>
    </View>
  );
}
