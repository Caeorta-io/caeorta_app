import { useMemo, type ReactNode } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { DTC_GROUPING_ORDER, type Dtc, type DtcGrouping } from '@caeorta/types';

import { DtcCodeBadge } from '@/components/dtc/DtcCodeBadge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useDtcs } from '@/hooks';
import { deriveDtcBadgeSeverity, groupDtcs } from '@/lib/dtc';
import { dtcTitle } from '@/lib/dtcTitles';
import { formatRelativeTime } from '@/lib/format';
import { colorsDark, PRESSED_OPACITY } from '@/design';

/**
 * S5 · DTC list (design §6, Figma board `node 53:195`) — a vehicle's fault codes,
 * sectioned Active / Pending / History, each row a severity-tinted code badge plus a
 * plain-language title. Reached from the "View fault codes" link on vehicle detail;
 * a row taps through to S6 (`dtcs/[dtcId]`).
 *
 * Reads through the mock-backed `useDtcs` query (`DATA_SOURCE.dtcs = 'mock'`); no live
 * Supabase. Two carries gate a live flip — CF-29 (the Pending group has no schema
 * backing) and CF-28/CF-07 (freeze-frame keys, which S6 consumes, not this screen).
 *
 * DERIVATIONS ARE NOT DONE HERE. The three-way split + in-group ordering come from
 * `groupDtcs`, the severity tint from `deriveDtcBadgeSeverity`, the headline from
 * `dtcTitle` — three canonical helpers in `lib/`. This screen only lays them out, so
 * CF-29's eventual two-group collapse is a `groupDtcs` edit and NOT a screen edit:
 * sections are built by mapping over `DTC_GROUPING_ORDER`, so narrowing the
 * `DtcGrouping` union drops a section here automatically.
 *
 * `SectionList` (rather than the drives list's flat FlatList + interleaved headers)
 * because these sections are a FIXED, known set that must render even when empty — the
 * founder's session-34 call: all three headers always show, an empty group carries a
 * quiet one-line empty state. That keeps the three-group model legible and, more
 * importantly, keeps a CF-29 regression VISIBLE — if `DATA_SOURCE.dtcs` were ever
 * flipped live before CF-29 resolves, Pending would stand there permanently empty
 * rather than silently vanishing into a two-section layout §6 doesn't specify.
 *
 * Error policy: DTCs are this screen's entire content, so an error is surfaced
 * explicitly with a retry — "the list failed to load" and "you have no fault codes"
 * must never look the same (see the `useDtcs` doc comment).
 */

/** One S5 section. `key` drives both the i18n lookup and the empty-state copy. */
interface DtcSection {
  key: DtcGrouping;
  data: Dtc[];
}

export default function VehicleDtcsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useDtcs(id);
  const { data, isPending, isError } = query;

  const dtcs = useMemo(() => data ?? [], [data]);
  const groups = useMemo(() => groupDtcs(dtcs), [dtcs]);

  // Section order is the design's (`DTC_GROUPING_ORDER`: what's wrong now → what might
  // be → what's resolved), NOT this screen's opinion. Empty sections are KEPT — see
  // the header note.
  const sections = useMemo<DtcSection[]>(
    () => DTC_GROUPING_ORDER.map((key) => ({ key, data: groups[key] })),
    [groups],
  );

  if (isPending) {
    return (
      <Frame>
        <ScreenHeading />
        <DtcListSkeleton />
      </Frame>
    );
  }

  if (isError) {
    return (
      <Frame>
        <ScreenHeading />
        <View className="mt-6 rounded-ds-lg border border-border-default bg-surface-primary p-4">
          <Text variant="h3" className="text-fg-primary">
            {t('vehicles.dtcs.error.title')}
          </Text>
          <Text variant="body-sm" className="mt-1 text-fg-secondary">
            {t('vehicles.dtcs.error.body')}
          </Text>
          <View className="mt-4 self-start">
            <Button
              label={t('common.retry')}
              variant="primary"
              onPress={() => void query.refetch()}
            />
          </View>
        </View>
      </Frame>
    );
  }

  // No codes at ALL is its own state — the clean-car good news, not three empty
  // sections. (Same shape as the drives list's whole-list empty state.)
  if (dtcs.length === 0) {
    return (
      <Frame>
        <ScreenHeading />
        <View className="mt-4 rounded-ds-lg border border-dashed border-border-default p-4">
          <Text variant="body" className="text-fg-secondary">
            {t('vehicles.dtcs.empty')}
          </Text>
        </View>
      </Frame>
    );
  }

  return (
    <Frame>
      <ScreenHeading />
      <SectionList
        className="mt-2"
        sections={sections}
        keyExtractor={(dtc) => dtc.id}
        renderSectionHeader={({ section }) => <GroupHeader groupKey={section.key} />}
        // Empty groups keep their header and get a one-line state here. A footer (not a
        // placeholder row) so the section's `data` stays a clean `Dtc[]` — no sentinel
        // item, no widened row type.
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? <GroupEmpty groupKey={section.key} /> : null
        }
        renderItem={({ item }) => (
          <DtcRow
            dtc={item}
            onPress={() =>
              router.push({
                pathname: '/vehicles/[id]/dtcs/[dtcId]',
                params: { id, dtcId: item.id },
              })
            }
          />
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </Frame>
  );
}

/**
 * Dark, token-framed screen chrome — identical to drive-detail's `Frame`. Deliberately
 * NOT `components/ui/Screen`, which is hardcoded `bg-white` for the un-migrated
 * Week 1–3 screens (CF-15); S5 is new, so it renders on the design canvas per the
 * forward-only token policy.
 */
function Frame({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-surface-canvas" edges={['top']}>
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}

function ScreenHeading() {
  const { t } = useTranslation();
  return (
    <Text variant="h1" className="pt-2 text-fg-primary">
      {t('vehicles.dtcs.title')}
    </Text>
  );
}

/** Active / Pending / History section header. */
function GroupHeader({ groupKey }: { groupKey: DtcGrouping }) {
  const { t } = useTranslation();
  return (
    <View className="bg-surface-canvas pb-2 pt-5">
      <Text variant="label" className="text-fg-tertiary">
        {t(`vehicles.dtcs.group.${groupKey}`)}
      </Text>
    </View>
  );
}

/** Quiet one-line state for a section with no codes. Per-group copy (§8 voice). */
function GroupEmpty({ groupKey }: { groupKey: DtcGrouping }) {
  const { t } = useTranslation();
  return (
    <Text variant="body-sm" className="pb-1 text-fg-tertiary">
      {t(`vehicles.dtcs.groupEmpty.${groupKey}`)}
    </Text>
  );
}

/**
 * One DTC row: severity-tinted code badge, plain-language title as the headline, then
 * a meta line carrying the severity's TEXT LABEL and the `last_seen_at` recency.
 *
 * The severity label lives on the meta line rather than inside the badge because §6
 * asks for a *code* badge (the code is what a user cross-references elsewhere) while
 * §11 still requires a text label alongside the colour + icon. Both signals are on the
 * row; neither surface carries the rule alone. See `DtcCodeBadge`'s header.
 *
 * The title is `dtcTitle`, never the raw code and never `description` directly — §8
 * rules raw SAE jargon out of a headline (CF-31); the helper's fallback chain handles
 * an uncovered code.
 */
function DtcRow({ dtc, onPress }: { dtc: Dtc; onPress: () => void }) {
  const { t } = useTranslation();
  const severity = deriveDtcBadgeSeverity(dtc.severity_raw);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      className="flex-row items-center gap-3 border-b border-border-subtle py-3"
    >
      <View className="flex-1">
        <DtcCodeBadge code={dtc.code} severityRaw={dtc.severity_raw} />
        <Text variant="h3" className="mt-2 text-fg-primary">
          {dtcTitle(dtc)}
        </Text>
        <Text variant="caption" className="mt-1 text-fg-tertiary">
          {t('vehicles.dtcs.rowMeta', {
            severity: t(`vehicles.dtcs.severity.${severity}`),
            lastSeen: formatRelativeTime(dtc.last_seen_at),
          })}
        </Text>
      </View>
      <Icon icon={ChevronRight} size={20} color={colorsDark.fg.tertiary} />
    </Pressable>
  );
}

/** Placeholder while the first read resolves: two groups, a couple of rows each. */
function DtcListSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-4"
    >
      {[0, 1].map((group) => (
        <View key={group} className={group === 0 ? '' : 'mt-6'}>
          <View className="h-3 w-20 rounded-ds-sm bg-surface-sunken" />
          {[0, 1].map((row) => (
            <View key={row} className="mt-3 border-b border-border-subtle pb-3">
              <View className="h-6 w-20 rounded-ds-sm bg-surface-sunken" />
              <View className="mt-2 h-4 w-3/4 rounded-ds-sm bg-surface-sunken" />
              <View className="mt-2 h-3 w-32 rounded-ds-sm bg-surface-sunken" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
