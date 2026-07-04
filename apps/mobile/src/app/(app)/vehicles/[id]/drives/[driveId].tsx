import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react-native';
import type { Tables } from '@caeorta/supabase';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { HealthIndicator } from '@/components/HealthIndicator';
import { DriveTelemetrySection } from '@/components/DriveTelemetrySection';
import { colorsDark } from '@/design';
import { useDrive, useDriveDiagnostics } from '@/hooks';
import { deriveDriveHealth } from '@/lib/driveHealth';
import { sortDiagnosticsByPriority } from '@/lib/diagnostics';
import { driveDateKey, formatDriveDateHeading, formatDriveTime } from '@/lib/drives';
import { formatDistanceKm, formatDuration, formatSpeedKph, selectPeakMetrics } from '@/lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// TODO(metric-keys): provisional keys — reconcile against the hardware/AI-agent
// contract before any live flip. Same provisional set + note as LastDriveCard;
// a key absent from a drive's `peak_metrics` is skipped silently by selectPeakMetrics.
// ─────────────────────────────────────────────────────────────────────────────
interface PeakMetricDisplay {
  labelKey: string;
  unit: string;
  decimals: number;
}
const PEAK_METRICS: Record<string, PeakMetricDisplay> = {
  rpm: { labelKey: 'rpm', unit: 'rpm', decimals: 0 },
  speed_kph: { labelKey: 'speed', unit: 'kph', decimals: 0 },
  coolant_temp_c: { labelKey: 'coolant', unit: '°C', decimals: 1 },
};
const PEAK_METRIC_KEYS = Object.keys(PEAK_METRICS);

// The Speed / Boost / Coolant telemetry charts (the app's first LIVE Edge Function read)
// live in <DriveTelemetrySection>. It depends only on `driveId` via `useDriveTelemetry` —
// no `useDrive`, no vehicle context — which is what lets the same code back both this screen
// and the `/dev/telemetry` harness. The provisional-metric-key and coolant-hot-threshold
// TODOs moved with it (see components/DriveTelemetrySection.tsx).

/** Severity → dot colour class (design tokens). Unknown/insufficient → neutral (§4.3). */
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-severity-critical',
  warning: 'bg-severity-warning',
  info: 'bg-severity-info',
  insufficient_data: 'bg-severity-insufficient',
};

/**
 * Drive detail — summary stats, a derived three-state health indicator, and the
 * diagnostics the AI agent linked to THIS drive. Built entirely against the design
 * tokens (§4): dark `surface/*` frame, `<Text variant>` type, `severity/*` colours,
 * `rounded-ds-*` card radii. Reached by tapping a row on the drives list.
 *
 * Error policy mirrors the vehicle-detail screen: a `useDrive` error blocks the
 * screen (there's nothing to show without the drive); the diagnostics query and the
 * telemetry charts each fail soft (an error there degrades just that section, not the
 * whole screen). The Speed/Boost/Coolant charts are the app's first LIVE Edge Function
 * read (`get_drive_telemetry`) — every other read on this screen is still mock.
 */
export default function DriveDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, driveId } = useLocalSearchParams<{ id: string; driveId: string }>();

  const driveQuery = useDrive(id, driveId);
  const diagnosticsQuery = useDriveDiagnostics(id, driveId);

  if (driveQuery.isPending) {
    return (
      <Frame>
        <DriveDetailSkeleton />
      </Frame>
    );
  }

  if (driveQuery.isError) {
    return (
      <Frame>
        <View className="mt-6 rounded-ds-lg border border-border-default bg-surface-primary p-4">
          <Text variant="h3" className="text-fg-primary">
            {t('vehicles.drives.detail.error.title')}
          </Text>
          <Text variant="body-sm" className="mt-1 text-fg-secondary">
            {t('vehicles.drives.detail.error.body')}
          </Text>
          <View className="mt-4 self-start">
            <Button
              label={t('common.retry')}
              variant="primary"
              onPress={() => void driveQuery.refetch()}
            />
          </View>
        </View>
      </Frame>
    );
  }

  const drive = driveQuery.data;
  if (drive === null) {
    return (
      <Frame>
        <View className="flex-1 justify-center">
          <Text variant="h1" className="text-fg-primary">
            {t('vehicles.drives.detail.notFoundTitle')}
          </Text>
          <Text variant="body-lg" className="mt-3 text-fg-secondary">
            {t('vehicles.drives.detail.notFoundBody')}
          </Text>
        </View>
        <View className="pb-4">
          <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Frame>
    );
  }

  // Diagnostics fail soft (empty on error), same as the vehicle-detail secondary hooks.
  const diagnostics = diagnosticsQuery.isError ? [] : (diagnosticsQuery.data ?? []);
  const health = deriveDriveHealth(diagnostics);
  const sorted = sortDiagnosticsByPriority(diagnostics);
  const peaks = selectPeakMetrics(drive.peak_metrics, PEAK_METRIC_KEYS);

  const dateHeading = formatDriveDateHeading(driveDateKey(drive.started_at));

  return (
    <Frame>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header: date eyebrow, distance headline, start time · duration, health pill. */}
        <View className="pt-4">
          <Text variant="label" className="text-fg-tertiary">
            {dateHeading}
          </Text>
          <Text variant="display" className="mt-1 text-fg-primary">
            {formatDistanceKm(drive.distance_km)}
          </Text>
          <Text variant="body" className="mt-1 text-fg-secondary">
            {formatDriveTime(drive.started_at)} · {formatDuration(drive.duration_seconds)}
          </Text>
          <View className="mt-3">
            <HealthIndicator health={health} />
          </View>
        </View>

        {/* Summary metrics card. */}
        <View className="mt-6 rounded-ds-lg border border-border-subtle bg-surface-primary p-4">
          <Text variant="label" className="text-fg-tertiary">
            {t('vehicles.drives.detail.summary')}
          </Text>
          <View className="mt-3 flex-row justify-between">
            <Stat label={t('vehicles.detail.distance')} value={formatDistanceKm(drive.distance_km)} />
            <Stat label={t('vehicles.detail.duration')} value={formatDuration(drive.duration_seconds)} />
            <Stat label={t('vehicles.detail.avgSpeed')} value={formatSpeedKph(drive.average_speed_kph)} />
          </View>

          {peaks.length > 0 ? (
            <View className="mt-4 border-t border-border-subtle pt-3">
              <Text variant="label" className="text-fg-tertiary">
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

        {/* Telemetry charts: Speed / Boost / Coolant (coolant peak → amber). The app's first
            LIVE Edge Function read; depends only on `driveId`, so the same component backs the
            /dev/telemetry harness. See components/DriveTelemetrySection.tsx. */}
        <DriveTelemetrySection driveId={driveId} />

        {/* Route map slot (design §6 S4, between charts and diagnostics). Placeholder only —
            see DriveMapPlaceholder / TODO(gps-route). */}
        <DriveMapPlaceholder />

        {/* Diagnostics linked to this drive. */}
        <View className="mt-6">
          <Text variant="label" className="text-fg-tertiary">
            {t('vehicles.drives.detail.diagnostics')}
          </Text>
          {diagnosticsQuery.isPending ? (
            <DiagnosticsSkeleton />
          ) : sorted.length === 0 ? (
            <Text variant="body-sm" className="mt-2 text-fg-tertiary">
              {t('vehicles.drives.detail.noDiagnostics')}
            </Text>
          ) : (
            <View className="mt-2">
              {sorted.map((d) => (
                <DriveDiagnosticRow key={d.id} diagnostic={d} />
              ))}
            </View>
          )}
        </View>

        <View className="h-6" />
      </ScrollView>
    </Frame>
  );
}

/** Dark, token-framed screen chrome (safe-area + horizontal padding). */
function Frame({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-surface-canvas" edges={['top']}>
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}

/** One label-over-value metric column (mono value for tabular alignment). */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text variant="caption" className="text-fg-tertiary">
        {label}
      </Text>
      <Text variant="data" className="mt-0.5 text-fg-primary">
        {value}
      </Text>
    </View>
  );
}

/**
 * A single diagnostic row: severity dot + title + urgency chip. A token-styled
 * counterpart to DiagnosticsPreview's row (which stays stock-Tailwind on the
 * un-migrated vehicle-detail screen — not a clean lift across the token boundary).
 * The full eight-variant Diagnostic Card (design §5.1) is a Week-5 build.
 */
function DriveDiagnosticRow({ diagnostic }: { diagnostic: Tables<'diagnostic_outputs'> }) {
  const { t } = useTranslation();
  const dotClass = SEVERITY_DOT[diagnostic.severity] ?? 'bg-severity-insufficient';

  return (
    <View className="flex-row items-center border-b border-border-subtle py-3">
      <View
        className={`mr-3 h-2.5 w-2.5 rounded-full ${dotClass}`}
        aria-label={t(`vehicles.detail.severity.${diagnostic.severity}`, diagnostic.severity)}
      />
      <Text variant="body-sm" className="flex-1 pr-3 text-fg-primary" numberOfLines={1}>
        {diagnostic.title}
      </Text>
      <View className="rounded-full border border-border-strong px-2 py-0.5">
        <Text variant="caption" className="text-fg-secondary">
          {t(`vehicles.detail.urgency.${diagnostic.urgency}`, diagnostic.urgency)}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO(gps-route): render a real route map here once BOTH are settled — (1) a GPS
// location key is confirmed in the metric vocabulary (none exists today; docs/07 mentions
// GPS only conditionally — "distance_km from GPS if available, else …" — and there is no
// lat/lng key anywhere in the provisional set), and (2) a map library is chosen (the stack
// currently lists MapLibre for the *admin* surface only, not the app). No map dependency is
// added here on purpose. Distinct from TODO(metric-keys)/TODO(coolant-hot-threshold): this
// is a missing capability + missing key, not a provisional guess to reconcile.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Route-map slot (design §6 S4 places a map between the charts and the diagnostics).
 * Honest placeholder — an empty state, not "coming soon": if this drive carries no GPS
 * location data there is genuinely nothing to draw. Reads in the app's calibrated-honesty
 * voice (§8), the same register as the per-chart "no data for this metric" empty state.
 */
function DriveMapPlaceholder() {
  const { t } = useTranslation();
  return (
    <View className="mt-6">
      <Text variant="label" className="text-fg-tertiary">
        {t('vehicles.drives.detail.map.title')}
      </Text>
      <View className="mt-2 items-center rounded-ds-lg border border-border-subtle bg-surface-primary p-8">
        <Icon icon={MapPin} size={24} color={colorsDark.fg.tertiary} />
        <Text variant="body-sm" className="mt-3 text-center text-fg-tertiary">
          {t('vehicles.drives.detail.map.body')}
        </Text>
      </View>
    </View>
  );
}

/** Full-screen placeholder while the drive resolves: header, a card, a few rows. */
function DriveDetailSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="pt-4">
      <View className="h-4 w-28 rounded bg-surface-elevated" />
      <View className="mt-2 h-9 w-40 rounded bg-surface-elevated" />
      <View className="mt-2 h-4 w-36 rounded bg-surface-elevated" />
      <View className="mt-3 h-7 w-28 rounded-full bg-surface-elevated" />
      <View className="mt-6 h-28 w-full rounded-ds-lg bg-surface-elevated" />
      <DiagnosticsSkeleton />
    </View>
  );
}

/** Three short row placeholders for the diagnostics section. */
function DiagnosticsSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="mt-6">
      <View className="h-4 w-32 rounded bg-surface-elevated" />
      {[0, 1, 2].map((i) => (
        <View key={i} className="mt-3 h-4 w-full rounded bg-surface-elevated" />
      ))}
    </View>
  );
}
