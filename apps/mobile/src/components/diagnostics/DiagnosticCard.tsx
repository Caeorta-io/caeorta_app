import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  CircleDashed,
  Info,
  OctagonAlert,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import type { Tables } from '@caeorta/supabase';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import {
  deriveDiagnosticCardState,
  usesCriticalAcknowledgeLabel,
  type DiagnosticCardState,
} from '@/lib/diagnostics';
import type { FeedbackRating, SeenStatus } from '@/lib/data/diagnosticActions';
import { formatRelativeTime } from '@/lib/format';
import { colorsDark, MIN_TOUCH_TARGET, PRESSED_OPACITY } from '@/design';

/**
 * Diagnostic Card — design §5.1, Figma node 8:182. The single most-reused surface;
 * where the agent's voice lives. Renders a `diagnostic_outputs` row in one of four
 * visual states × collapsed/expanded = the 8 documented variants.
 *
 * The visual state is NEVER derived inline here — it comes from the canonical
 * {@link deriveDiagnosticCardState} (lib/diagnostics.ts), the one place the
 * severity→state / insufficient-data rule lives.
 *
 * State treatment (§4.3, the temperature-encodes-urgency ramp):
 *   • info · warning · critical  → left accent bar + tinted icon container in the
 *     severity colour; warmth climbs with severity.
 *   • insufficient_data          → OFF the ladder: NO accent bar, a dashed neutral
 *     border on the whole card + a dashed neutral icon ring. Never a severity hue
 *     (design principle #2).
 *
 * All colour/radius/type come from the semantic design tokens (PR #32): the
 * `bg-severity-*`, `text-fg-*`, `rounded-ds-*` classes and `colorsDark.*` values —
 * no raw hex, forward-only.
 *
 * ICON RATIONALE: the 36dp glyph encodes the STATE, not the category. §11 makes
 * this a hard accessibility rule — "every severity state pairs colour with an icon
 * + text label … distinguishable without hue" — so the glyph is the colourblind-safe
 * signal and the category is shown as the text Label eyebrow beside it.
 */

/**
 * One "WHAT IT SAW" tile: a provisional metric key + its display value/unit. The
 * CALLER supplies these (from a drive's `peak_metrics`); the card is pure display.
 *
 * TODO(metric-keys): `key` references the PROVISIONAL jsonb vocabulary owned by the
 * hardware/AI-agent contract, not this repo (see lib/data/mocks.ts
 * `PROVISIONAL_METRIC_KEYS`, CF-07 / R22). Reconcile against the canonical set before
 * any live diagnostic read is trusted; a wrong key is silently wrong, not caught by
 * the compiler.
 */
export interface DiagnosticMetric {
  /** Provisional metric key — TODO(metric-keys), see above. Used for the tile caption. */
  key: string;
  /** Pre-formatted display value, e.g. "118" or "101.5". */
  value: string;
  /** Optional unit suffix, e.g. "kPa", "°C". */
  unit?: string;
}

export interface DiagnosticCardProps {
  /** The row to render. */
  diagnostic: Tables<'diagnostic_outputs'>;
  /**
   * Whether the expanded body is shown. Controlled when provided (the header press
   * calls {@link onToggleExpanded}); uncontrolled otherwise (the card manages its
   * own toggle, defaulting to `defaultExpanded`).
   */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. Ignored if `expanded` is provided. */
  defaultExpanded?: boolean;
  /** Header-press handler (controlled mode). Omit to let the card self-toggle. */
  onToggleExpanded?: (next: boolean) => void;
  /**
   * "WHAT IT SAW" tiles (up to 3 shown, §5.1). Ignored for `insufficient_data`,
   * which shows a "WHAT'S NEEDED" note instead of metrics/confidence.
   */
  metrics?: readonly DiagnosticMetric[];
  /** Thumbs feedback handler — backed by the mock action seam this week. */
  onFeedback?: (rating: FeedbackRating) => void;
  /** Currently-selected thumb (for the active state); mock/local this week. */
  feedback?: FeedbackRating | null;
  /** Mark-seen / critical-acknowledge handler — backed by the mock action seam. */
  onMarkSeen?: (status: SeenStatus) => void;
  /** Whether the row has already been marked seen (disables the button). */
  seen?: boolean;
}

/** State → the glyph that encodes it (colourblind-safe signal, §11). */
const STATE_ICON: Record<DiagnosticCardState, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  critical: OctagonAlert,
  insufficient_data: CircleDashed,
};

/** State → the token colour for the glyph + accent bar (`colorsDark.severity.*`). */
const STATE_COLOR: Record<DiagnosticCardState, string> = {
  info: colorsDark.severity.info,
  warning: colorsDark.severity.warning,
  critical: colorsDark.severity.critical,
  insufficient_data: colorsDark.severity.insufficient,
};

/** State → left accent-bar class. `insufficient_data` has none (off the ladder). */
const ACCENT_BAR_CLASS: Record<DiagnosticCardState, string> = {
  info: 'bg-severity-info',
  warning: 'bg-severity-warning',
  critical: 'bg-severity-critical',
  insufficient_data: '',
};

/** State → 36dp icon-container class. Warmth climbs via the tint; info stays quiet. */
const ICON_CONTAINER_CLASS: Record<DiagnosticCardState, string> = {
  info: 'bg-surface-sunken',
  warning: 'bg-severity-warning-tint',
  critical: 'bg-severity-critical-tint',
  // Dashed neutral ring, no fill — the §4.3 "dashed icon ring" treatment.
  insufficient_data: 'border border-dashed border-severity-insufficient',
};

export function DiagnosticCard({
  diagnostic,
  expanded,
  defaultExpanded = false,
  onToggleExpanded,
  metrics,
  onFeedback,
  feedback = null,
  onMarkSeen,
  seen = false,
}: DiagnosticCardProps) {
  const { t } = useTranslation();

  // Controlled when `expanded` is provided; otherwise the card owns the toggle.
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const isExpanded = expanded ?? uncontrolled;

  const handleToggle = useCallback(() => {
    const next = !isExpanded;
    if (onToggleExpanded) onToggleExpanded(next);
    else setUncontrolled(next);
  }, [isExpanded, onToggleExpanded]);

  const state = deriveDiagnosticCardState(diagnostic);
  const isInsufficient = state === 'insufficient_data';
  const StateGlyph = STATE_ICON[state];

  // Off the ladder → dashed neutral border on the whole card; on the ladder → the
  // solid elevation-1 border (surface-step + border, §4.5), with the accent bar
  // carrying the severity hue.
  const cardBorderClass = isInsufficient
    ? 'border border-dashed border-severity-insufficient'
    : 'border border-border-subtle';

  const markSeenLabel = usesCriticalAcknowledgeLabel(state)
    ? t('diagnosticCard.gotIt')
    : t('diagnosticCard.markSeen');
  // Critical acknowledge writes 'actioned'; everything else writes 'seen' (docs/06).
  const seenStatus: SeenStatus = usesCriticalAcknowledgeLabel(state) ? 'actioned' : 'seen';

  return (
    <View className={`overflow-hidden rounded-ds-lg bg-surface-primary ${cardBorderClass}`}>
      {/* Left accent bar (severity colour). Absent for insufficient_data. */}
      {!isInsufficient && (
        <View
          className={`absolute bottom-0 left-0 top-0 w-1 ${ACCENT_BAR_CLASS[state]}`}
          // Decorative — the state is already conveyed by the glyph + label (§11).
          accessible={false}
        />
      )}

      {/* ── Collapsed header (always shown); the whole header toggles expansion. ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={t(isExpanded ? 'diagnosticCard.collapse' : 'diagnosticCard.expand')}
        onPress={handleToggle}
        style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
        // Extra left padding clears the 4dp accent bar so copy never sits on it.
        className={`flex-row gap-3 p-4 ${isInsufficient ? '' : 'pl-5'}`}
      >
        {/* 36dp icon container (§4.6) with the state glyph. */}
        <View
          className={`h-9 w-9 items-center justify-center rounded-ds-sm ${ICON_CONTAINER_CLASS[state]}`}
        >
          <Icon icon={StateGlyph} size={18} color={STATE_COLOR[state]} />
        </View>

        <View className="flex-1">
          {/* Category eyebrow (Label). Falls back to the raw value for unknown categories. */}
          <Text variant="label" className="text-fg-tertiary">
            {t(`diagnosticCard.category.${diagnostic.category}`, diagnostic.category)}
          </Text>
          <Text variant="h3" className="mt-0.5 text-fg-primary">
            {diagnostic.title}
          </Text>
          <Text variant="caption" className="mt-1 text-fg-tertiary">
            {formatRelativeTime(diagnostic.generated_at)}
          </Text>
          <Text variant="body" className="mt-2 text-fg-secondary">
            {diagnostic.summary}
          </Text>
        </View>

        {/* Expand affordance; rotates when open. */}
        <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
          <Icon icon={ChevronDown} size={20} color={colorsDark.fg.tertiary} />
        </View>
      </Pressable>

      {/* ── Expanded body ── */}
      {isExpanded && (
        <View className={`px-4 pb-4 ${isInsufficient ? '' : 'pl-5'}`}>
          <View className="mb-4 h-px bg-border-subtle" />

          {isInsufficient ? (
            // WHAT'S NEEDED note — no metrics, no confidence (§5.1). The honest
            // "what's missing" copy IS the row's explanation (contract's "I don't
            // know" path, docs/06), rendered as-is.
            <View>
              <Text variant="label" className="text-fg-tertiary">
                {t('diagnosticCard.whatsNeeded')}
              </Text>
              <Text variant="body" className="mt-2 text-fg-secondary">
                {diagnostic.explanation}
              </Text>
            </View>
          ) : (
            <View>
              <Text variant="body" className="text-fg-secondary">
                {diagnostic.explanation}
              </Text>

              {diagnostic.recommended_action !== null && (
                <View className="mt-4">
                  <Text variant="label" className="text-fg-tertiary">
                    {t('diagnosticCard.recommendedAction')}
                  </Text>
                  <Text variant="body" className="mt-2 text-fg-primary">
                    {diagnostic.recommended_action}
                  </Text>
                </View>
              )}

              <WhatItSawPanel metrics={metrics} />
              <ConfidenceBar confidence={diagnostic.confidence} />
            </View>
          )}

          {/* Feedback thumbs — every diagnostic gets a thumbs UI (docs/06 guarantee). */}
          <View className="mt-5 flex-row items-center gap-1">
            <Text variant="body-sm" className="mr-1 text-fg-tertiary">
              {t('diagnosticCard.feedbackPrompt')}
            </Text>
            <ThumbButton
              glyph={ThumbsUp}
              label={t('diagnosticCard.thumbsUp')}
              active={feedback === 'up'}
              onPress={() => onFeedback?.('up')}
            />
            <ThumbButton
              glyph={ThumbsDown}
              label={t('diagnosticCard.thumbsDown')}
              active={feedback === 'down'}
              onPress={() => onFeedback?.('down')}
            />
          </View>

          {/* Mark as seen → "I've got it" only on critical (principle #7). */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: seen }}
            disabled={seen}
            onPress={() => onMarkSeen?.(seenStatus)}
            style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
            className={`mt-4 items-center rounded-ds-md py-3 ${
              seen ? 'bg-interactive-disabled' : 'bg-brand-default'
            }`}
          >
            <Text variant="body" className={seen ? 'text-fg-disabled' : 'text-fg-on-accent'}>
              {markSeenLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const MAX_METRIC_TILES = 3;

/** "WHAT IT SAW" — up to 3 Data/Base value + caption tiles (§5.1). */
function WhatItSawPanel({ metrics }: { metrics?: readonly DiagnosticMetric[] }) {
  const { t } = useTranslation();
  if (metrics === undefined || metrics.length === 0) return null;
  const tiles = metrics.slice(0, MAX_METRIC_TILES);

  return (
    <View className="mt-4">
      <Text variant="label" className="text-fg-tertiary">
        {t('diagnosticCard.whatItSaw')}
      </Text>
      <View className="mt-2 flex-row gap-2">
        {tiles.map((m) => (
          <View
            key={m.key}
            className="flex-1 rounded-ds-sm border border-border-subtle bg-surface-sunken p-3"
          >
            <Text variant="data" className="text-fg-primary">
              {m.value}
              {m.unit !== undefined ? <Text variant="caption" className="text-fg-tertiary"> {m.unit}</Text> : null}
            </Text>
            {/* TODO(metric-keys): provisional key as the caption — reconcile per CF-07/R22. */}
            <Text variant="caption" className="mt-1 text-fg-tertiary" numberOfLines={1}>
              {m.key}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Confidence indicator — a LABELED BAR (styled View, NOT a chart; no Victory Native).
 * Fill width tracks `confidence` (0.00–1.00, docs/06), clamped defensively. The fill
 * is brand-cyan (the instrument-reading motif), deliberately not a severity colour —
 * confidence is a meta-signal, not part of the heat ramp.
 */
function ConfidenceBar({ confidence }: { confidence: number }) {
  const { t } = useTranslation();
  // `confidence` is a plain numeric column; guard NaN / out-of-range at the boundary.
  const safe = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;
  const percent = Math.round(safe * 100);

  return (
    <View
      className="mt-4"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={t('diagnosticCard.confidence')}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="label" className="text-fg-tertiary">
          {t('diagnosticCard.confidence')}
        </Text>
        <Text variant="data" className="text-fg-secondary">
          {t('diagnosticCard.confidenceValue', { percent })}
        </Text>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-ds-sm bg-surface-sunken">
        <View
          className="h-full rounded-ds-sm bg-brand-default"
          style={{ width: `${percent}%` }}
          accessible={false}
        />
      </View>
    </View>
  );
}

/**
 * A single feedback thumb: drawn 44px, but the touch target pads to
 * {@link MIN_TOUCH_TARGET} (48dp) per §3 — the Pressable is 48×48, the visual circle
 * inside is 44px. Active state fills brand-tint + brand-coloured glyph.
 */
function ThumbButton({
  glyph,
  label,
  active,
  onPress,
}: {
  glyph: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        opacity: pressed ? PRESSED_OPACITY : 1,
      })}
      className="items-center justify-center"
    >
      {/* 44px drawn visual centred inside the 48dp tap target. */}
      <View
        className={`h-11 w-11 items-center justify-center rounded-full ${
          active ? 'bg-brand-tint' : 'bg-surface-sunken'
        }`}
      >
        <Icon
          icon={glyph}
          size={20}
          color={active ? colorsDark.brand.text : colorsDark.fg.tertiary}
        />
      </View>
    </Pressable>
  );
}
