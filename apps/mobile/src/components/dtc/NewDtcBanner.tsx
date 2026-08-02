import { useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, X } from 'lucide-react-native';
import type { Dtc } from '@caeorta/types';

import { DtcCodeBadge } from '@/components/dtc/DtcCodeBadge';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { deriveDtcBadgeSeverity } from '@/lib/dtc';
import { selectNewDtcNotifications } from '@/lib/dtcNotifications';
import { useDtcNotificationPrefsStore, useDtcSeenStore } from '@/lib/dtcNotificationStore';
import { dtcTitle } from '@/lib/dtcTitles';
import { colorsDark, MIN_TOUCH_TARGET, PRESSED_OPACITY } from '@/design';

/**
 * New-DTC in-app notification — the Week-5 line item "In-app notification when new DTCs
 * detected after sync" (`docs/08` § Week 5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IN-APP ONLY — NOT A PUSH NOTIFICATION. No `expo-notifications`, no permission prompt,
 * no delivery when the app is closed. Design §4.3 gives **warning** "triggers a push
 * notification"; that is Week-7 work and deliberately absent here.
 *
 * PLACEMENT IS AN APP-TRACK CALL (founder, session 36), because the design does not
 * specify this surface. §4.3's only in-app answer is for **critical** — "full-screen
 * takeover on next app open, persists until acknowledged", specified as `T3 · Critical
 * takeover` (§6 App States) — and T3 is written diagnostic-shaped ("11 psi vs 25 floor",
 * "See the full reading" → S2), not DTC-shaped. There is no DTC banner in §6 and no row
 * for one in §7's link graph. Rather than approximate T3 with DTC content ahead of its
 * real build, this ships as a banner on vehicle detail, which is the shape `docs/08`
 * Week 6 already documents for the diagnostics equivalent ("warning → prominent banner
 * on vehicle detail"). One surface therefore serves BOTH notifying tiers, so S8's
 * Warning preference is not a dead toggle. Logged as a designer-owned §6/§7 gap
 * (CF-37), same species as CF-24.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT SHOWS is decided entirely by `selectNewDtcNotifications` — the S8 preference
 * gate (`shouldNotifyForDtc`, which reuses `deriveDtcBadgeSeverity`'s tier and adds no
 * second severity vocabulary) crossed with the "new = unacknowledged" predicate. This
 * component derives nothing itself beyond the badge tint it hands to `DtcCodeBadge`,
 * which re-derives from the same canonical helper.
 *
 * TWO ACTIONS, mirroring T3's own two ("I've got it — dismiss" + "See the full reading")
 * and principle #7's "one acknowledgment, not a gauntlet":
 *   • DISMISS acknowledges every code currently surfaced, in one tap. The banner does
 *     not come back for them — that is the whole point of the acknowledged-set.
 *   • TAPPING THE BODY navigates and acknowledges NOTHING. Going to look at a code is
 *     not the same as being done with it, and a user who taps through and backs out
 *     should find the banner where they left it.
 *
 * Routes per the count: exactly one code goes straight to that code's S6 detail; several
 * go to the S5 list, which is the only screen that can show them all.
 *
 * Token-styled on an un-migrated screen (CF-15) — vehicle detail is still stock-palette
 * Week-1–3 code, so this dark-canvas banner sits on a white screen until Week 8. That is
 * the same trade the founder accepted for the `DiagnosticsPreview` swap in session 35
 * (see CF-13); the alternative was a stock-Tailwind banner that would have to be
 * rewritten in Week 8.
 */

/**
 * Copy note: singular/plural is chosen with explicit `titleOne` / `titleMany` keys and a
 * plain `{{n}}` interpolation, NOT i18next's `count` pluralisation. `count` would resolve
 * through `Intl.PluralRules`, which is a Hermes/ICU runtime assumption this app has never
 * had to make (no plural key exists anywhere in `en.json`). A first-render notification is
 * the wrong place to take that bet; the explicit form also matches the `ctaOne`/`ctaMany`
 * pair below. Revisit if a locale with non-binary plural rules is added.
 */

/** Max codes listed before the banner switches to a bare count. Keeps it a banner. */
const MAX_LISTED_CODES = 3;

export interface NewDtcBannerProps {
  /**
   * The vehicle's DTCs, straight from `useDtcs`. Accepts the query's unresolved/errored
   * shapes too — `selectNewDtcNotifications` absorbs them and yields an empty selection,
   * so the caller does not have to guard before rendering.
   */
  dtcs: readonly Dtc[] | null | undefined;
  vehicleId: string;
}

export function NewDtcBanner({ dtcs, vehicleId }: NewDtcBannerProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const prefs = useDtcNotificationPrefsStore((state) => state.prefs);
  const seenIds = useDtcSeenStore((state) => state.seenIds);
  const hydrated = useDtcSeenStore((state) => state.hydrated);
  const hydrate = useDtcSeenStore((state) => state.hydrate);
  const markSeen = useDtcSeenStore((state) => state.markSeen);

  // Read the persisted acknowledged-set once. `hydrate` is idempotent and never rejects,
  // so a re-run (StrictMode double-mount, a remount on navigation) is harmless.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const seenIdSet = useMemo(() => new Set(seenIds), [seenIds]);
  const newDtcs = useMemo(
    () => selectNewDtcNotifications(dtcs, seenIdSet, prefs),
    [dtcs, seenIdSet, prefs],
  );

  // Render nothing until the acknowledged-set is loaded, otherwise an already-dismissed
  // banner flashes for a frame while `seenIds` is still its empty initial value.
  if (!hydrated || newDtcs.length === 0) return null;

  // `selectNewDtcNotifications` sorts by severity, so the first code is the most urgent
  // and its tier is what the banner's heading speaks for.
  const leadDtc = newDtcs[0] as Dtc;
  const leadSeverity = deriveDtcBadgeSeverity(leadDtc.severity_raw);
  const listed = newDtcs.slice(0, MAX_LISTED_CODES);
  const overflow = newDtcs.length - listed.length;

  const openCodes = () => {
    // One code has a specific destination; several do not — S5 is the only screen that
    // shows them together. Matches §7's "no dead ends".
    if (newDtcs.length === 1) {
      router.push({
        pathname: '/vehicles/[id]/dtcs/[dtcId]',
        params: { id: vehicleId, dtcId: leadDtc.id },
      });
      return;
    }
    router.push({ pathname: '/vehicles/[id]/dtcs', params: { id: vehicleId } });
  };

  return (
    <View
      // One region, so a screen reader announces the finding as a unit rather than as
      // loose badges. The dismiss control stays separately focusable below.
      accessibilityRole="alert"
      className={`mt-4 flex-row items-start gap-3 rounded-ds-lg border p-4 ${CONTAINER_CLASS[leadSeverity]}`}
    >
      {/* No `accessibilityLabel` here on purpose: an explicit label would REPLACE the
          children, and the children (per-code badge labels + plain-language titles) are
          more informative than any summary string. Let the reader walk them. */}
      <Pressable
        accessibilityRole="button"
        onPress={openCodes}
        style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
        className="flex-1 flex-row items-start gap-3"
      >
        <View className="flex-1">
          <Text variant="label" className={HEADING_CLASS[leadSeverity]}>
            {t(`vehicles.dtcs.notification.eyebrow.${leadSeverity}`)}
          </Text>
          <Text variant="h3" className="mt-1 text-fg-primary">
            {newDtcs.length === 1
              ? t('vehicles.dtcs.notification.titleOne')
              : t('vehicles.dtcs.notification.titleMany', { n: newDtcs.length })}
          </Text>

          {/* The codes themselves, badge + plain-language title, so the banner answers
              "what is it?" without a tap. Capped at MAX_LISTED_CODES. */}
          <View className="mt-3 gap-2">
            {listed.map((dtc) => (
              <View key={dtc.id} className="flex-row items-center gap-2">
                <DtcCodeBadge code={dtc.code} severityRaw={dtc.severity_raw} />
                <Text variant="body-sm" className="flex-1 text-fg-secondary" numberOfLines={1}>
                  {dtcTitle(dtc)}
                </Text>
              </View>
            ))}
          </View>

          {overflow > 0 ? (
            <Text variant="caption" className="mt-2 text-fg-tertiary">
              {t('vehicles.dtcs.notification.more', { n: overflow })}
            </Text>
          ) : null}

          <View className="mt-3 flex-row items-center gap-1">
            <Text variant="body-sm" className="text-brand-text">
              {newDtcs.length === 1
                ? t('vehicles.dtcs.notification.ctaOne')
                : t('vehicles.dtcs.notification.ctaMany')}
            </Text>
            <Icon icon={ChevronRight} size={16} color={colorsDark.brand.text} />
          </View>
        </View>
      </Pressable>

      {/* Acknowledge-all. Separate from the body press so "look at it" and "I'm done with
          it" stay distinct actions — see the header note. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('vehicles.dtcs.notification.dismissA11y')}
        onPress={() => markSeen(newDtcs.map((dtc) => dtc.id))}
        // A 20px glyph in a 4px-padded corner; the hitSlop takes the touchable area to
        // MIN_TOUCH_TARGET (48dp, §3) without a 48px hole in the banner's layout.
        hitSlop={(MIN_TOUCH_TARGET - 20) / 2}
        style={({ pressed }) => ({ opacity: pressed ? PRESSED_OPACITY : 1 })}
      >
        <Icon icon={X} size={20} color={colorsDark.fg.tertiary} />
      </Pressable>
    </View>
  );
}

/**
 * Container tint per the lead code's tier (§4.3's heat ramp). `info` and `unknown` are
 * reachable only if the user turns those tiers ON in S8 (both default off), so they are
 * styled for completeness rather than for the default path — quiet surfaces that must
 * not manufacture urgency.
 */
const CONTAINER_CLASS: Record<ReturnType<typeof deriveDtcBadgeSeverity>, string> = {
  critical: 'border-severity-critical bg-severity-critical-tint',
  warning: 'border-severity-warning bg-severity-warning-tint',
  info: 'border-border-subtle bg-surface-primary',
  unknown: 'border-dashed border-severity-insufficient bg-surface-primary',
};

/** Eyebrow colour per tier — the §11 text signal that pairs with the tint. */
const HEADING_CLASS: Record<ReturnType<typeof deriveDtcBadgeSeverity>, string> = {
  critical: 'text-severity-critical',
  warning: 'text-severity-warning',
  info: 'text-fg-tertiary',
  unknown: 'text-severity-insufficient',
};
