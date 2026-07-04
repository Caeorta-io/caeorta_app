import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TelemetryChartCard, type TelemetryErrorVariant } from '@/components/TelemetryChart';
import { colorsDark } from '@/design';
import { useDriveTelemetry } from '@/hooks';
import { splitTelemetryChannels, TelemetryFetchError, type TelemetrySample } from '@/lib/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// TODO(metric-keys): the three telemetry-chart channels. PROVISIONAL keys from the
// SAME vocabulary as the drive-detail PEAK_METRICS — `speed_kph` and `coolant_temp_c`
// are reused verbatim; `boost_pressure_kpa` is the provisional boost key (already present
// in the mock `PROVISIONAL_METRIC_KEYS`, though not in the peaks display map). Reconcile all
// three against the hardware/AI-agent contract before trusting them on live data — the
// jsonb `metrics` blob is opaque, so a wrong key silently yields an empty chart, not an
// error. (Note: telemetry is a LIVE-only capability, so there is no mock fixture path
// for these charts — see DATA_SOURCE.driveTelemetry.)
//
// TODO(coolant-hot-threshold): a SECOND, adjacent provisional guess — distinct from the
// key-name guess above so a future reconciliation pass catches both. No canonical coolant
// "hot" cutoff is defined anywhere in the docs; 105 °C is a placeholder sitting just above
// typical operating temperature. Above it, the coolant chart switches to severity/warning
// (design §10 "coolant peak amber"). Replace with the real threshold when the metric
// contract lands. Flagged in the PR, not just here, so it doesn't read as authoritative.
// ─────────────────────────────────────────────────────────────────────────────
const COOLANT_HOT_THRESHOLD_C = 105;

interface ChartChannel {
  channel: 'speed' | 'boost' | 'coolant';
  metricKey: string;
  hotThreshold?: number;
}
const CHART_CHANNELS: ChartChannel[] = [
  { channel: 'speed', metricKey: 'speed_kph' },
  { channel: 'boost', metricKey: 'boost_pressure_kpa' },
  { channel: 'coolant', metricKey: 'coolant_temp_c', hotThreshold: COOLANT_HOT_THRESHOLD_C },
];
const CHART_CHANNEL_KEYS = CHART_CHANNELS.map((c) => c.metricKey);

/** Map a thrown telemetry error to the per-chart copy variant (distinct 401/403/404/500/network). */
function telemetryErrorVariant(error: unknown): TelemetryErrorVariant {
  if (error instanceof TelemetryFetchError) {
    switch (error.status) {
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'notFound';
      case 'network':
        return 'network';
      default:
        return 'server';
    }
  }
  return 'server';
}

/**
 * The drive's Speed / Boost / Coolant telemetry charts — the app's first LIVE Edge
 * Function read (`get_drive_telemetry`), keyed by `driveId` alone via `useDriveTelemetry`.
 * Deliberately depends on NOTHING but the `driveId`: no `useDrive`, no vehicle context,
 * no drive/diagnostics mock capability. That independence is what lets the same rendering
 * code back both the real drive-detail screen and the `/dev/telemetry` harness (which
 * skips the still-mocked drive lookup) — one component, so the two can never drift.
 *
 * ONE request feeds all three cards, so an error is a whole-section failure — rendered once
 * (one message, one retry) rather than as three identical per-card error boxes. Loading
 * (skeletons) and empty stay per-card: emptiness is genuinely per-channel (e.g. boost absent
 * while speed has data). Each card still fails soft (design §6 S4, §10).
 */
export function DriveTelemetrySection({ driveId }: { driveId: string }) {
  const { t } = useTranslation();
  const telemetryQuery = useDriveTelemetry(driveId);

  // Telemetry: one request → all channels, split client-side into three per-channel series.
  // The whole-query status drives each card's loading/error state; per-channel emptiness
  // (a channel absent from every point) is an honest empty state, decided inside the card.
  const telemetryStatus: 'loading' | 'error' | 'ready' = telemetryQuery.isPending
    ? 'loading'
    : telemetryQuery.isError
      ? 'error'
      : 'ready';
  const telemetrySeries: Record<string, TelemetrySample[]> = telemetryQuery.data
    ? splitTelemetryChannels(telemetryQuery.data.points, CHART_CHANNEL_KEYS)
    : {};
  const telemetryError = telemetryErrorVariant(telemetryQuery.error);

  return (
    <View className="mt-6">
      <Text variant="label" className="text-fg-tertiary">
        {t('vehicles.drives.detail.charts.title')}
      </Text>
      {telemetryStatus === 'error' ? (
        <TelemetrySectionError
          copy={t(`vehicles.drives.detail.charts.error.${telemetryError}`)}
          retryLabel={t('common.retry')}
          onRetry={() => void telemetryQuery.refetch()}
        />
      ) : (
        CHART_CHANNELS.map((ch) => (
          <TelemetryChartCard
            key={ch.channel}
            channel={ch.channel}
            samples={telemetrySeries[ch.metricKey] ?? []}
            color={colorsDark.brand.default}
            hotThreshold={ch.hotThreshold}
            hotColor={colorsDark.severity.warning}
            status={telemetryStatus}
            onRetry={() => void telemetryQuery.refetch()}
          />
        ))
      )}
    </View>
  );
}

/**
 * Section-level telemetry error. One live `get_drive_telemetry` request backs all three
 * charts, so a failure is a single event — shown once (one message + one retry) instead of
 * three identical per-card errors. Quiet token card; does NOT take over the screen.
 */
export function TelemetrySectionError({
  copy,
  retryLabel,
  onRetry,
}: {
  copy: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View className="mt-3 items-center rounded-ds-lg border border-border-subtle bg-surface-primary p-6">
      <Text variant="body-sm" className="text-center text-fg-tertiary">
        {copy}
      </Text>
      <View className="mt-2">
        <Button label={retryLabel} variant="ghost" onPress={onRetry} />
      </View>
    </View>
  );
}
