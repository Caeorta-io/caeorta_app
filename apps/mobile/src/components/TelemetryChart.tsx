import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Area, CartesianChart, Line } from 'victory-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { TelemetrySample } from '@/lib/telemetry';

/** Fixed chart body height (dp). No axes chrome — a compact trend, per design §3/§10. */
const CHART_HEIGHT = 140;
/** Translucent fill under the line, per the design's filled-area treatment. */
const AREA_OPACITY = 0.14;

/** The five distinct error shapes the telemetry read can surface (see fetchDriveTelemetryLive). */
export type TelemetryErrorVariant = 'unauthorized' | 'forbidden' | 'notFound' | 'server' | 'network';

export interface TelemetryChartCardProps {
  /** i18n label-key suffix under `vehicles.drives.detail.charts.*` (e.g. `speed`). */
  channel: 'speed' | 'boost' | 'coolant';
  /** The channel's samples (already split from the all-channel response). */
  samples: TelemetrySample[];
  /** Normal-state line/fill colour (boost cyan for every channel, per design D2). */
  color: string;
  /**
   * Coolant only: a value at/above which the line/fill switches to `hotColor` — the
   * "coolant peak amber" treatment (design §10). Provisional; see the call site's
   * TODO(coolant-hot-threshold).
   */
  hotThreshold?: number;
  /** Colour used when the coolant peak is hot (severity/warning amber). */
  hotColor?: string;
  /** Whole-query state — shared by all three cards (loading/error), but rendered per card. */
  status: 'loading' | 'error' | 'ready';
  /** Which error copy to show when `status === 'error'`. */
  errorVariant?: TelemetryErrorVariant;
  /** Re-run the single telemetry request (refetch) for all three charts. */
  onRetry: () => void;
}

/**
 * One drive-detail telemetry chart card: a label over a Victory Native line/area chart
 * (Skia-backed). Used three times (Speed / Boost / Coolant). Each card owns its own
 * loading / error / empty state so a telemetry failure degrades JUST the charts, never
 * the whole screen — the same fail-soft precedent as the diagnostics section.
 *
 * No axes chrome, no pinch/zoom, no metric picker: the design explicitly rules out
 * bespoke chart interactions here (§3, §10); that lives on Diagnostic detail (Week 5).
 */
export function TelemetryChartCard({
  channel,
  samples,
  color,
  hotThreshold,
  hotColor,
  status,
  errorVariant = 'server',
  onRetry,
}: TelemetryChartCardProps) {
  const { t } = useTranslation();
  const label = t(`vehicles.drives.detail.charts.${channel}.label`);

  return (
    <View className="mt-3 rounded-ds-lg border border-border-subtle bg-surface-primary p-4">
      <Text variant="label" className="text-fg-tertiary">
        {label}
      </Text>
      <View className="mt-2" style={{ height: CHART_HEIGHT }}>
        {status === 'loading' ? (
          <ChartSkeleton />
        ) : status === 'error' ? (
          <ChartError
            copy={t(`vehicles.drives.detail.charts.error.${errorVariant}`)}
            retryLabel={t('common.retry')}
            onRetry={onRetry}
          />
        ) : samples.length === 0 ? (
          <ChartEmpty copy={t('vehicles.drives.detail.charts.empty')} />
        ) : (
          <TelemetryLineChart
            samples={samples}
            color={color}
            hotThreshold={hotThreshold}
            hotColor={hotColor}
          />
        )}
      </View>
    </View>
  );
}

/** The Skia line+area itself. Only mounted when there is data to draw. */
function TelemetryLineChart({
  samples,
  color,
  hotThreshold,
  hotColor,
}: Pick<TelemetryChartCardProps, 'samples' | 'color' | 'hotThreshold' | 'hotColor'>) {
  // "Hot peak" treatment: if the coolant peak reaches the provisional threshold, the whole
  // series renders in severity/warning amber (design §10 "coolant peak amber"). Other
  // channels pass no threshold and always render in the normal cyan.
  const isHot =
    hotThreshold !== undefined && hotColor !== undefined && samples.some((s) => s.y >= hotThreshold);
  const strokeColor = isHot && hotColor !== undefined ? hotColor : color;

  return (
    <CartesianChart data={samples} xKey="x" yKeys={['y']} domainPadding={{ top: 8, bottom: 8 }}>
      {({ points, chartBounds }) => (
        <>
          <Area
            points={points.y}
            y0={chartBounds.bottom}
            color={strokeColor}
            opacity={AREA_OPACITY}
            curveType="natural"
          />
          <Line points={points.y} color={strokeColor} strokeWidth={2} curveType="natural" />
        </>
      )}
    </CartesianChart>
  );
}

/** Pulsing-free placeholder box while the shared telemetry query is pending. */
function ChartSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-full w-full rounded-ds-md bg-surface-elevated"
    />
  );
}

/** Quiet inline error with a retry — does NOT take over the screen. */
function ChartError({
  copy,
  retryLabel,
  onRetry,
}: {
  copy: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View className="h-full items-center justify-center">
      <Text variant="body-sm" className="text-center text-fg-tertiary">
        {copy}
      </Text>
      <View className="mt-2">
        <Button label={retryLabel} variant="ghost" onPress={onRetry} />
      </View>
    </View>
  );
}

/** Honest "this drive has no samples for this metric" — an empty result, not an error. */
function ChartEmpty({ copy }: { copy: string }) {
  return (
    <View className="h-full items-center justify-center">
      <Text variant="body-sm" className="text-center text-fg-tertiary">
        {copy}
      </Text>
    </View>
  );
}
