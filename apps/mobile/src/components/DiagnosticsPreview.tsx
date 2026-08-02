import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { DiagnosticCard } from '@/components/diagnostics/DiagnosticCard';
import { mockDiagnosticActions, type FeedbackRating, type SeenStatus } from '@/lib/data/diagnosticActions';
import { sortDiagnosticsByPriority } from '@/lib/diagnostics';

interface DiagnosticsPreviewProps {
  diagnostics: Tables<'diagnostic_outputs'>[];
  /** Owning vehicle — used to build the "View all" route. */
  vehicleId: string;
}

const PREVIEW_LIMIT = 3;

/**
 * The "Recent diagnostics" preview panel on the vehicle-detail screen (design §6,
 * Home/Vehicle Detail: "Recent Diagnostics preview (3× Diagnostic Card instances)").
 * Sorts the incoming rows by severity then recency (pure {@link sortDiagnosticsByPriority}),
 * shows up to three, and links to the full list. `status` is deliberately not shown here —
 * it belongs to the full diagnostics screen (future work).
 *
 * ROWS ARE NOW THE REAL DIAGNOSTIC CARD ATOM (§5.1, PR #40). This replaced the simplified
 * severity-dot stand-in that stood here through Weeks 1–4 — the LAST of the three
 * stand-ins, after drive-detail's (PR #41), so CF-13 closes with this. The screen-local
 * `SEVERITY_DOT` map is gone with it: the severity→visual rule now lives ONLY in
 * `deriveDiagnosticCardState`, which also closes the CF-30 mis-render this panel carried
 * (a contract-shaped `insufficient_data` row rendered a blue *info* dot here; the card
 * gives it the off-ladder dashed treatment §4.3 requires).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KNOWN VISUAL, NOT A BUG — CF-15. The card is token-styled for the dark canvas
 * (`bg-surface-primary`, `text-fg-*`), and vehicle-detail is an un-migrated Week-1–3
 * screen still on the stock light palette. So dark cards sit on a white screen until
 * Week 8 migrates the host screen. This is the deliberate cost of the forward-only token
 * policy, accepted by the founder (session 35) rather than either restyling a CF-15 screen
 * ahead of schedule or leaving a third stand-in in the codebase. The panel's OWN chrome
 * (heading, empty state, "View all" link) is deliberately left on stock Tailwind so it
 * still matches its neighbours on this screen; only the diagnostic RENDERING changed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function DiagnosticsPreview({ diagnostics, vehicleId }: DiagnosticsPreviewProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const top = sortDiagnosticsByPriority(diagnostics).slice(0, PREVIEW_LIMIT);

  return (
    <View className="mt-6">
      <Text className="text-sm font-medium text-neutral-500">{t('vehicles.detail.diagnostics')}</Text>

      {top.length === 0 ? (
        <Text className="mt-2 text-sm text-neutral-400">{t('vehicles.detail.noDiagnostics')}</Text>
      ) : (
        <View className="mt-2">
          {/* gap-3 replaces the old rows' hairline dividers: the cards are discrete
              surfaces with their own borders, so they separate by spacing, not rules.
              Same treatment as drive-detail's swapped list. */}
          <View className="gap-3">
            {top.map((d) => (
              <PreviewDiagnosticCard key={d.id} diagnostic={d} />
            ))}
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: '/vehicles/[id]/diagnostics', params: { id: vehicleId } })
            }
            className="mt-1 self-start py-2 active:opacity-70"
          >
            <Text className="text-sm font-medium text-blue-600">
              {t('vehicles.detail.viewAll')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * One preview row, rendered through the real atom — collapsed by default, self-toggling on
 * header press.
 *
 * No `metrics` are passed: "WHAT IT SAW" tiles come from a specific drive's `peak_metrics`,
 * and this panel is vehicle-scoped across several drives, so there is no one correct set to
 * show. Drive-detail passes them because it has exactly one drive in hand.
 *
 * Feedback + mark-seen route through {@link mockDiagnosticActions} — the no-op write seam
 * (live-wired Week 6). Local state reflects the tap so the active thumb and "seen" state
 * are visible; nothing persists, so it resets on remount. That is the honest behaviour of a
 * mock write seam, not a bug to work around here.
 */
function PreviewDiagnosticCard({ diagnostic }: { diagnostic: Tables<'diagnostic_outputs'> }) {
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
