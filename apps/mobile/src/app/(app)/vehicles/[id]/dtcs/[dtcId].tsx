import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Dtc, DtcGrouping } from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

import { DiagnosticCard } from '@/components/diagnostics/DiagnosticCard';
import { DtcCodeBadge } from '@/components/dtc/DtcCodeBadge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useDiagnosticForDtc, useDtc } from '@/hooks';
import { mockDiagnosticActions, type FeedbackRating, type SeenStatus } from '@/lib/data/diagnosticActions';
import { deriveDtcBadgeSeverity, deriveDtcStatus, toFreezeFrameTiles, type FreezeFrameTile } from '@/lib/dtc';
import { dtcTitle } from '@/lib/dtcTitles';
import { formatRelativeTime } from '@/lib/format';

/**
 * S6 · DTC detail (design §6, Figma board `node 53:195`) — one fault code in full:
 * large code badge + status pill, what it means, likely causes, the conditions when it
 * set (§5.5 Metric Tiles), the related Diagnostic Card (§5.1), and the auto-clear note.
 * Reached by tapping a row on S5; §7 routes on from the related card to Diagnostic
 * detail (S2).
 *
 * Replaces the Day-3 stub wholesale (it existed only to prove the `dtcId` route param
 * resolved end-to-end). Reads through the mock-backed `useDtc` / `useDiagnosticForDtc`
 * queries; no live Supabase.
 *
 * DERIVATIONS ARE NOT DONE HERE — same discipline as S5. The status pill comes from
 * `deriveDtcStatus` (itself implemented by `groupDtcs`, so the pill and S5's sections
 * cannot disagree), the badge tint from `deriveDtcBadgeSeverity`, the headline from
 * `dtcTitle`, and the freeze-frame tiles from `toFreezeFrameTiles`. The related card
 * derives its own visual state internally via `deriveDiagnosticCardState`. This screen
 * lays them out.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO SECTIONS RENDER A DECLARED CONTENT GAP, NOT CONTENT — TODO(dtc-body) → CF-35.
 *
 * §6 asks for a "what it means" written for a TUNED/modified engine and a likely-causes
 * list. NEITHER HAS A SOURCE the app can reach:
 *   • `dtcs.description` is verbatim SAE J2012 jargon and null on some rows — a technical
 *     description, precisely the register §6 rejects. It is shown, labelled as the ECU's
 *     own wording, but it is not an explanation.
 *   • `dtcTitles.ts` supplies a plain-language TITLE only; there is no body (CF-31).
 *   • Platform's seeded `dtc_lookup` has a `common_causes` column, but it is generic
 *     OBD-II text and is NOT wired into the DTC seam (see CF-32's flip note).
 * Writing per-code prose here would mean inventing engineering claims about a modified
 * engine — §8's calibrated honesty rules that out, and it is the one failure mode a
 * tuned-car owner would catch instantly. So both sections render ALWAYS, carrying copy
 * that states the gap. The sections stay visible so the gap is visible; when the content
 * lands, only the i18n values change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default function DtcDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, dtcId } = useLocalSearchParams<{ id: string; dtcId: string }>();

  const query = useDtc(id, dtcId);
  const { data: dtc, isPending, isError } = query;

  // Fails soft (see the hook): the related card is supplementary, so its error reads as
  // "nothing linked" rather than blocking the code the user came here to read.
  const relatedQuery = useDiagnosticForDtc(id, dtcId);
  const related = relatedQuery.isError ? null : (relatedQuery.data ?? null);

  if (isPending) {
    return (
      <Frame>
        <DtcDetailSkeleton />
      </Frame>
    );
  }

  if (isError) {
    return (
      <Frame>
        <View className="mt-6 rounded-ds-lg border border-border-default bg-surface-primary p-4">
          <Text variant="h3" className="text-fg-primary">
            {t('vehicles.dtcs.detail.error.title')}
          </Text>
          <Text variant="body-sm" className="mt-1 text-fg-secondary">
            {t('vehicles.dtcs.detail.error.body')}
          </Text>
          <View className="mt-4 self-start">
            <Button label={t('common.retry')} variant="primary" onPress={() => void query.refetch()} />
          </View>
        </View>
        <BackRow onPress={() => router.back()} />
      </Frame>
    );
  }

  // `null` means the id resolved to nothing — a cleared-and-purged code, or a stale deep
  // link. Distinct from the error state above: nothing went wrong, the code isn't there.
  if (dtc === null || dtc === undefined) {
    return (
      <Frame>
        <View className="flex-1 justify-center">
          <Text variant="h1" className="text-fg-primary">
            {t('vehicles.dtcs.detail.notFoundTitle')}
          </Text>
          <Text variant="body-lg" className="mt-3 text-fg-secondary">
            {t('vehicles.dtcs.detail.notFoundBody')}
          </Text>
        </View>
        <BackRow onPress={() => router.back()} />
      </Frame>
    );
  }

  const tiles = toFreezeFrameTiles(dtc.freeze_frame_metrics);

  return (
    <Frame>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <DtcHeader dtc={dtc} />
        <MeaningSection dtc={dtc} />
        <CausesSection />
        <FreezeFrameSection tiles={tiles} />
        <RelatedSection diagnostic={related} isPending={relatedQuery.isPending} />
        <AutoClearNote status={deriveDtcStatus(dtc)} />
        <View className="h-6" />
      </ScrollView>
    </Frame>
  );
}

/** Dark, token-framed screen chrome — identical to S5 / drive-detail. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-surface-canvas" edges={['top']}>
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}

function BackRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="pb-4">
      <Button label={t('common.back')} variant="ghost" onPress={onPress} />
    </View>
  );
}

/** A section heading — one type/spacing rule for all six sections below. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <Text variant="label" className="mt-7 text-fg-tertiary">
      {children}
    </Text>
  );
}

/**
 * The header block: eyebrow, LARGE code badge, status pill, the plain-language title, and
 * the seen/cleared dates.
 *
 * §11 COMPLIANCE. `DtcCodeBadge` carries colour + icon but its own text is the CODE, so it
 * is deliberately not §11-compliant standing alone (see its header). The severity's TEXT
 * LABEL therefore sits on the meta line directly beneath it — "Critical severity · Last
 * seen 3 d ago" — the same split S5's row uses. Both signals are on the screen; neither
 * surface carries the rule alone.
 */
function DtcHeader({ dtc }: { dtc: Dtc }) {
  const { t } = useTranslation();
  const severity = deriveDtcBadgeSeverity(dtc.severity_raw);
  const status = deriveDtcStatus(dtc);

  return (
    <View className="pt-2">
      <Text variant="label" className="text-fg-tertiary">
        {t('vehicles.dtcs.detail.eyebrow')}
      </Text>

      <View className="mt-2 flex-row items-center gap-3">
        <DtcCodeBadge code={dtc.code} severityRaw={dtc.severity_raw} size="large" />
        <StatusPill status={status} />
      </View>

      <Text variant="h1" className="mt-4 text-fg-primary">
        {dtcTitle(dtc)}
      </Text>

      {/* The severity WORD — the §11 text signal for the badge above. */}
      <Text variant="caption" className="mt-2 text-fg-tertiary">
        {t('vehicles.dtcs.detail.severityMeta', {
          severity: t(`vehicles.dtcs.severity.${severity}`),
        })}
      </Text>

      <View className="mt-3 gap-1">
        <Text variant="body-sm" className="text-fg-secondary">
          {t('vehicles.dtcs.detail.seen.first', { when: formatRelativeTime(dtc.first_seen_at) })}
        </Text>
        <Text variant="body-sm" className="text-fg-secondary">
          {t('vehicles.dtcs.detail.seen.last', { when: formatRelativeTime(dtc.last_seen_at) })}
        </Text>
        {dtc.cleared_at !== null ? (
          <Text variant="body-sm" className="text-fg-secondary">
            {t('vehicles.dtcs.detail.seen.cleared', { when: formatRelativeTime(dtc.cleared_at) })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Active / Pending / Cleared. Neutral surfaces, NOT severity colours: the status says
 * where a code sits in its lifecycle, and the severity ladder (§4.3) is reserved for how
 * urgent it is. Mixing them would give a cleared critical code a calm-looking pill and a
 * pending info code an alarming one. Same reasoning §5.3 gives for the Sync Banner
 * carrying no severity colour — connection (and here, lifecycle) is not health.
 */
const STATUS_PILL_CLASS: Record<DtcGrouping, string> = {
  active: 'border-border-default bg-surface-elevated',
  pending: 'border-dashed border-border-default bg-surface-sunken',
  history: 'border-border-subtle bg-surface-sunken',
};

const STATUS_TEXT_CLASS: Record<DtcGrouping, string> = {
  active: 'text-fg-primary',
  pending: 'text-fg-secondary',
  history: 'text-fg-tertiary',
};

function StatusPill({ status }: { status: DtcGrouping }) {
  const { t } = useTranslation();
  const label = t(`vehicles.dtcs.detail.status.${status}`);

  // Stock `rounded-full`, like HealthIndicator's pill: the design radius scale is
  // namespaced `ds-sm/md/lg/xl` (CF-15) and has no `full` member.
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('vehicles.dtcs.detail.statusA11y', { status: label })}
      className={`self-start rounded-full border px-3 py-1 ${STATUS_PILL_CLASS[status]}`}
    >
      <Text variant="label" className={STATUS_TEXT_CLASS[status]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * "What it means" — see the TODO(dtc-body) / CF-35 block in the module header. Renders the
 * declared gap, plus the ECU's own technical wording when the row carries it, clearly
 * labelled as the ECU's rather than presented as the explanation.
 */
function MeaningSection({ dtc }: { dtc: Dtc }) {
  const { t } = useTranslation();
  const ecuDescription = dtc.description?.trim() ?? '';

  return (
    <View>
      <SectionHeading>{t('vehicles.dtcs.detail.meaning.heading')}</SectionHeading>
      <GapNote>{t('vehicles.dtcs.detail.meaning.pending')}</GapNote>

      {ecuDescription.length > 0 ? (
        <View className="mt-3">
          <Text variant="caption" className="text-fg-tertiary">
            {t('vehicles.dtcs.detail.meaning.ecuHeading')}
          </Text>
          {/* Mono: this is the ECU's machine wording, not the product's voice. */}
          <Text variant="data" className="mt-1 text-fg-secondary">
            {ecuDescription}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Likely causes" — the same declared gap; see the module header. */
function CausesSection() {
  const { t } = useTranslation();
  return (
    <View>
      <SectionHeading>{t('vehicles.dtcs.detail.causes.heading')}</SectionHeading>
      <GapNote>{t('vehicles.dtcs.detail.causes.pending')}</GapNote>
    </View>
  );
}

/**
 * The shared treatment for a section whose CONTENT doesn't exist yet: dashed neutral
 * border, secondary text. Borrows the off-the-ladder grammar §4.3 gives
 * `insufficient_data` — "more data needed", never "error" and never a severity hue —
 * because that is exactly what these panels mean.
 */
function GapNote({ children }: { children: ReactNode }) {
  return (
    <View className="mt-2 rounded-ds-lg border border-dashed border-border-default p-4">
      <Text variant="body" className="text-fg-secondary">
        {children}
      </Text>
    </View>
  );
}

/**
 * Freeze-frame conditions as §5.5 Metric Tiles. ALWAYS RENDERED — matching S5's
 * always-render discipline, so "this code has no captured conditions" is a visible
 * statement rather than a section that silently vanishes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EMPTY PANEL IS DELIBERATELY AMBIGUOUS. TODO(metric-keys) → CF-28 / CF-07.
 * Zero tiles has two causes this screen CANNOT tell apart:
 *   (a) the DTC genuinely has no freeze frame (`device_sync_chunk` had no telemetry row
 *       buffered in that chunk and wrote null), or
 *   (b) a frame WAS captured, but under metric keys the provisional vocabulary doesn't
 *       recognise, so `toFreezeFrameTiles` returns [] — silently empty, not an error.
 * The copy therefore states only the observable fact ("No freeze-frame data for this
 * code") and asserts NO cause. Distinguishing (a) from (b) needs the canonical key set
 * (CF-07); it is a seam-diagnostic concern, not something to guess at in the panel.
 *
 * `state` (normal/warning/critical, §5.5) is NOT derived: every tile renders `normal`.
 * There is no per-metric threshold source — the one threshold the app has is the
 * provisional 105 °C coolant cutoff (CF-08), which is a chart-recolour value, not a
 * general tile-state rule. Tinting a freeze-frame reading amber on a guessed threshold
 * would manufacture urgency about a number we can't rank.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function FreezeFrameSection({ tiles }: { tiles: readonly FreezeFrameTile[] }) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionHeading>{t('vehicles.dtcs.detail.freezeFrame.heading')}</SectionHeading>

      {tiles.length === 0 ? (
        <GapNote>{t('vehicles.dtcs.detail.freezeFrame.empty')}</GapNote>
      ) : (
        <>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {tiles.map((tile) => (
              <MetricTile key={tile.key} tile={tile} />
            ))}
          </View>
          {/* CF-28: the capture point is the last telemetry row of the sync chunk, not the
              sample at fault time. Until that's reconciled cross-track, the copy must not
              claim more precision than the ingestion path delivers. */}
          <Text variant="caption" className="mt-2 text-fg-tertiary">
            {t('vehicles.dtcs.detail.freezeFrame.caveat')}
          </Text>
        </>
      )}
    </View>
  );
}

/**
 * One §5.5 Metric Tile: named value / unit / label layers. Two-per-row via `flex-wrap` +
 * a 48% basis, so a partial capture (two tiles) and a full one (seven) both lay out.
 *
 * TODO(metric-keys): the caption is the PROVISIONAL key itself — the same stopgap the
 * Diagnostic Card's "WHAT IT SAW" tiles use, and the same CF-07 reconciliation retires
 * both. Human-readable labels need the canonical key set first.
 */
function MetricTile({ tile }: { tile: FreezeFrameTile }) {
  return (
    <View
      className="min-w-[48%] flex-1 rounded-ds-sm border border-border-subtle bg-surface-sunken p-3"
    >
      <Text variant="data-lg" className="text-fg-primary">
        {tile.value}
        {tile.unit !== undefined ? (
          <Text variant="caption" className="text-fg-tertiary"> {tile.unit}</Text>
        ) : null}
      </Text>
      <Text variant="caption" className="mt-1 text-fg-tertiary" numberOfLines={1}>
        {tile.key}
      </Text>
    </View>
  );
}

/**
 * The related Diagnostic Card (§6, §5.1) — the agent's take on the same event, rendered
 * through the REAL atom, collapsed by default (consistent with drive-detail's swap).
 * Tapping the card's header expands it; §7's route on to Diagnostic detail (S2) is the
 * card's own affordance, not a second one here.
 *
 * Absent by default: only one fixture carries a `referenced_dtc_ids` link today
 * (`MOCK_LINKED_DTC_ID`), so most codes show the empty note — which is the honest common
 * case, since the agent links an output to a code only when it actually analysed one.
 */
function RelatedSection({
  diagnostic,
  isPending,
}: {
  diagnostic: Tables<'diagnostic_outputs'> | null;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionHeading>{t('vehicles.dtcs.detail.related.heading')}</SectionHeading>
      {isPending ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="mt-2 h-24 rounded-ds-lg bg-surface-sunken"
        />
      ) : diagnostic === null ? (
        <GapNote>{t('vehicles.dtcs.detail.related.none')}</GapNote>
      ) : (
        <View className="mt-2">
          <RelatedDiagnosticCard diagnostic={diagnostic} />
        </View>
      )}
    </View>
  );
}

/**
 * Feedback + mark-seen route through {@link mockDiagnosticActions} — the no-op write seam
 * (live-wired Week 6). Local state reflects the tap so the active thumb and "seen" state
 * are visible; nothing persists, so it resets on remount. That is the honest behaviour of
 * a mock write seam. Mirrors drive-detail's `DriveDiagnosticCard`.
 *
 * No `metrics` are passed: the "WHAT IT SAW" tiles come from a DRIVE's `peak_metrics`,
 * and this card is reached from a code, not a drive. The freeze-frame panel above already
 * carries this code's readings — passing them here would show the same numbers twice
 * under a label ("what it saw") that means something different.
 */
function RelatedDiagnosticCard({ diagnostic }: { diagnostic: Tables<'diagnostic_outputs'> }) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [seen, setSeen] = useState(false);

  const handleFeedback = useCallback(
    (rating: FeedbackRating) => {
      setFeedback(rating);
      void mockDiagnosticActions.submitFeedback({ diagnosticId: diagnostic.id, rating });
    },
    [diagnostic.id],
  );

  const handleMarkSeen = useCallback(
    (status: SeenStatus) => {
      setSeen(true);
      void mockDiagnosticActions.markSeen({ diagnosticId: diagnostic.id, status });
    },
    [diagnostic.id],
  );

  return (
    <DiagnosticCard
      diagnostic={diagnostic}
      defaultExpanded={false}
      feedback={feedback}
      onFeedback={handleFeedback}
      seen={seen}
      onMarkSeen={handleMarkSeen}
    />
  );
}

/**
 * §6's auto-clear note. Two variants, because the sentence a user needs differs by
 * lifecycle: a code that is still set gets the "most codes clear themselves, you don't
 * need to do anything" reassurance; one already in History gets the "it's gone, this is
 * kept as history" framing. Keyed off the SAME `deriveDtcStatus` the pill uses, so the
 * note can never contradict the pill.
 *
 * Pending shares the active copy: a pending code has not cleared, and the drive-cycle
 * explanation is if anything more relevant to it.
 */
function AutoClearNote({ status }: { status: DtcGrouping }) {
  const { t } = useTranslation();
  const body =
    status === 'history'
      ? t('vehicles.dtcs.detail.autoClear.cleared')
      : t('vehicles.dtcs.detail.autoClear.active');

  return (
    <View>
      <SectionHeading>{t('vehicles.dtcs.detail.autoClear.heading')}</SectionHeading>
      <Text variant="body-sm" className="mt-2 text-fg-secondary">
        {body}
      </Text>
    </View>
  );
}

/** Placeholder while the first read resolves: header block, then two section stubs. */
function DtcDetailSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="pt-2"
    >
      <View className="h-3 w-20 rounded-ds-sm bg-surface-sunken" />
      <View className="mt-2 flex-row gap-3">
        <View className="h-11 w-32 rounded-ds-md bg-surface-sunken" />
        <View className="h-8 w-20 rounded-full bg-surface-sunken" />
      </View>
      <View className="mt-4 h-7 w-3/4 rounded-ds-sm bg-surface-sunken" />
      <View className="mt-3 h-4 w-40 rounded-ds-sm bg-surface-sunken" />
      {[0, 1].map((section) => (
        <View key={section} className="mt-7">
          <View className="h-3 w-28 rounded-ds-sm bg-surface-sunken" />
          <View className="mt-2 h-20 rounded-ds-lg bg-surface-sunken" />
        </View>
      ))}
    </View>
  );
}
