import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Tables } from '@caeorta/supabase';

import { DiagnosticCard, type DiagnosticMetric } from '@/components/diagnostics/DiagnosticCard';
import { Text } from '@/components/ui/Text';
import { deriveDiagnosticCardState } from '@/lib/diagnostics';
import {
  mockDiagnostics,
  mockOtherDriveDiagnostics,
  mockLastDrive,
} from '@/lib/data/mocks';
import { mockDiagnosticActions, type FeedbackRating, type SeenStatus } from '@/lib/data/diagnosticActions';
import { selectPeakMetrics } from '@/lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only harness for the Diagnostic Card (design §5.1, node 8:182). Renders the
// REAL <DiagnosticCard> for all FOUR states × {collapsed, expanded} = the 8
// documented variants, stacked, so the atom can be eyeballed on-device before it's
// swapped into drive-detail / the diagnostics feed (Day 2+). Same convention as
// /dev/telemetry and /dev/tokens: `__DEV__`-gated, not linked from any screen.
//
// Feedback + mark-seen route through {@link mockDiagnosticActions} — the no-op mock
// write seam (NO Supabase I/O this week; live-wired Week 6). Local state reflects the
// tap so the active thumb / "seen" state is visible on-device.
// ─────────────────────────────────────────────────────────────────────────────

// The four state fixtures, one per `deriveDiagnosticCardState` outcome. Indexing is
// cast to the row type because `noUncheckedIndexedAccess` widens it to `| undefined`;
// these are fixed, always-present fixtures (same idiom as diagnostics.test.ts).
type Diagnostic = Tables<'diagnostic_outputs'>;
const CRITICAL = mockDiagnostics[0] as Diagnostic; // category 'turbo'   → 'critical'
const WARNING = mockDiagnostics[1] as Diagnostic; //  category 'cooling' → 'warning'
const INFO = mockDiagnostics[2] as Diagnostic; //     category 'engine'  → 'info'
const INSUFFICIENT = mockOtherDriveDiagnostics[1] as Diagnostic; // 'insufficient_data' → off-ladder

/**
 * "WHAT IT SAW" tiles for the on-ladder cards, built from the referenced drive's
 * peak_metrics. TODO(metric-keys): these keys are the PROVISIONAL vocabulary owned by
 * the hardware/AI-agent contract, not this repo — see lib/data/mocks.ts
 * `PROVISIONAL_METRIC_KEYS` and CF-07 / R22. Reconcile before any live read.
 */
const METRIC_KEYS = ['boost_pressure_kpa', 'coolant_temp_c', 'rpm'] as const;
const METRIC_UNIT: Record<(typeof METRIC_KEYS)[number], string> = {
  boost_pressure_kpa: 'kPa',
  coolant_temp_c: '°C',
  rpm: 'rpm',
};

const WHAT_IT_SAW: DiagnosticMetric[] = selectPeakMetrics(mockLastDrive.peak_metrics, METRIC_KEYS).map(
  (m) => ({
    key: m.key,
    value: String(m.value),
    unit: METRIC_UNIT[m.key as (typeof METRIC_KEYS)[number]],
  }),
);

interface Variant {
  diagnostic: Tables<'diagnostic_outputs'>;
  /** Metrics for the "WHAT IT SAW" panel; omitted for the off-ladder card. */
  metrics?: DiagnosticMetric[];
}

const VARIANTS: Variant[] = [
  { diagnostic: INFO, metrics: WHAT_IT_SAW },
  { diagnostic: WARNING, metrics: WHAT_IT_SAW },
  { diagnostic: CRITICAL, metrics: WHAT_IT_SAW },
  { diagnostic: INSUFFICIENT }, // no metrics/confidence — "WHAT'S NEEDED" note instead
];

export function DiagnosticCardHarness() {
  return (
    <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="p-5">
      <Text variant="h1" className="mb-1 text-fg-primary">
        Diagnostic Card
      </Text>
      <Text variant="body-sm" className="mb-5 text-fg-secondary">
        Dev harness · §5.1 node 8:182 · 4 states × collapsed/expanded = 8 variants
      </Text>

      {VARIANTS.map((v) => (
        <VariantBlock key={v.diagnostic.id} variant={v} />
      ))}

      <View className="h-10" />
    </ScrollView>
  );
}

/** One state's pair of cards (collapsed + expanded), with a heading. */
function VariantBlock({ variant }: { variant: Variant }) {
  const state = deriveDiagnosticCardState(variant.diagnostic);
  return (
    <View className="mb-8">
      <Text variant="label" className="mb-3 text-fg-tertiary">
        {state}
      </Text>
      <HarnessCard variant={variant} expanded={false} />
      <View className="h-3" />
      <HarnessCard variant={variant} expanded />
    </View>
  );
}

/**
 * Wraps a single card with local feedback/seen state so taps visibly land, and
 * routes the writes through the mock action seam (no live I/O). `expanded` is fixed
 * per card so both members of the pair are on screen at once.
 */
function HarnessCard({ variant, expanded }: { variant: Variant; expanded: boolean }) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [seen, setSeen] = useState(false);

  return (
    <DiagnosticCard
      diagnostic={variant.diagnostic}
      metrics={variant.metrics}
      expanded={expanded}
      feedback={feedback}
      seen={seen}
      onFeedback={(rating) => {
        setFeedback(rating);
        void mockDiagnosticActions.submitFeedback({ diagnosticId: variant.diagnostic.id, rating });
      }}
      onMarkSeen={(status: SeenStatus) => {
        setSeen(true);
        void mockDiagnosticActions.markSeen({ diagnosticId: variant.diagnostic.id, status });
      }}
    />
  );
}
