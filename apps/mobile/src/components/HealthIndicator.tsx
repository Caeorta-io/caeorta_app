import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Eye, TriangleAlert, type LucideIcon } from 'lucide-react-native';

import { colorsDark } from '@/design';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { DriveHealth } from '@/lib/driveHealth';

/**
 * The three-state drive-health pill — the "temperature-encodes-urgency" ladder
 * (docs/design/00_design_system.md §4.3) as a single at-a-glance chip. Replaces the
 * old binary has_anomaly badge; the drives list and the last-drive card now render
 * this from a {@link DriveHealth} verdict (see `deriveDriveHealth`).
 *
 * §11 (never colour alone): every tier carries an icon AND a text label, not just a
 * colour, so the signal survives colour-blindness and greyscale.
 *
 * SURFACE-AGNOSTIC treatment: colour lives in the icon + label + border, with NO
 * tint fill. The dark `severity/*-tint` fills the design specs for warning/critical
 * would render as near-black blobs on the still-light (un-migrated Week 1–3) drives
 * list and last-drive card that also mount this pill. Border-plus-foreground reads
 * correctly on both the light call sites and the new dark drive-detail screen; the
 * full tint-fill treatment lands with the Week-8 dark flip.
 */
export interface HealthIndicatorProps {
  health: DriveHealth;
}

interface TierStyle {
  icon: LucideIcon;
  /** Icon colour — a token value (never a raw hex), passed to the {@link Icon} wrapper. */
  iconColor: string;
  /** Border + label colour class. `clean` is neutral — NOT severity/info (§4.3). */
  borderClass: string;
  textClass: string;
}

// `clean` is intentionally quiet/neutral (fg + border tokens): it is not a severity
// state, so it must not borrow the severity/info colour. warning/critical use the
// severity foreground tokens (amber/redline).
const TIER_STYLE: Record<DriveHealth, TierStyle> = {
  clean: {
    icon: CircleCheck,
    iconColor: colorsDark.fg.tertiary,
    borderClass: 'border-border-strong',
    textClass: 'text-fg-secondary',
  },
  needs_look: {
    icon: Eye,
    iconColor: colorsDark.severity.warning,
    borderClass: 'border-severity-warning',
    textClass: 'text-severity-warning',
  },
  check_now: {
    icon: TriangleAlert,
    iconColor: colorsDark.severity.critical,
    borderClass: 'border-severity-critical',
    textClass: 'text-severity-critical',
  },
};

export function HealthIndicator({ health }: HealthIndicatorProps) {
  const { t } = useTranslation();
  const style = TIER_STYLE[health];
  const label = t(`vehicles.health.${health}`);

  return (
    <View
      role="status"
      aria-label={label}
      className={`flex-row items-center self-start rounded-full border px-2.5 py-1 ${style.borderClass}`}
    >
      <Icon icon={style.icon} size={14} color={style.iconColor} />
      <Text variant="caption" className={`ml-1.5 ${style.textClass}`}>
        {label}
      </Text>
    </View>
  );
}
