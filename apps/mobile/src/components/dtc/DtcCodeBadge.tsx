import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CircleHelp,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { deriveDtcBadgeSeverity, type DtcBadgeSeverity } from '@/lib/dtc';
import { colorsDark } from '@/design';

/**
 * Severity-tinted DTC code badge — design §6 `S5` ("severity-tinted code badges"),
 * tinted on the §4.3 heat ramp.
 *
 * The severity is NEVER derived inline here — it comes from the canonical
 * {@link deriveDtcBadgeSeverity} (lib/dtc.ts), the one place the free-text
 * `severity_raw` → UI severity rule lives.
 *
 * §11 COMPLIANCE — the accessibility rule is "never colour alone; every severity state
 * pairs colour with an icon + text label". All three signals are present, but split
 * across the badge and the row that hosts it:
 *
 *   • COLOUR — the tint fill + border + glyph colour (severity tokens).
 *   • ICON   — a distinct glyph per tier (Info / TriangleAlert / OctagonAlert /
 *              CircleHelp), so the four states are separable with no hue at all.
 *   • TEXT   — the badge's own text is the RAW CODE, because §6 specifies a *code*
 *              badge and the code is the thing a user cross-references against a
 *              scanner or a forum. The severity's text LABEL therefore lives on the
 *              row's meta line ("Warning · 3 d ago"), not inside the badge — see
 *              `DtcRow`. Both must be present for §11; the badge alone is not enough,
 *              which is why {@link DtcCodeBadge} is not exported for general reuse
 *              without that meta line.
 *
 * `accessibilityLabel` collapses all of it into one spoken string so a screen reader
 * announces the tier and the code together rather than reading a bare "P0299".
 *
 * `'unknown'` is OFF the ladder (§4.3): neutral slate + a DASHED border and no tint
 * fill — the same visual grammar `insufficient_data` uses on a Diagnostic Card. It
 * reads "we can't rank this", never "this is fine".
 */

/** Badge severity → the glyph that encodes it (the colourblind-safe signal, §11). */
const SEVERITY_ICON: Record<DtcBadgeSeverity, LucideIcon> = {
  critical: OctagonAlert,
  warning: TriangleAlert,
  info: Info,
  unknown: CircleHelp,
};

/** Badge severity → token colour for the glyph + code text. */
const SEVERITY_COLOR: Record<DtcBadgeSeverity, string> = {
  critical: colorsDark.severity.critical,
  warning: colorsDark.severity.warning,
  info: colorsDark.severity.info,
  unknown: colorsDark.severity.insufficient,
};

/** Badge severity → container classes. Warmth climbs with the tier; unknown is dashed. */
const SEVERITY_CONTAINER_CLASS: Record<DtcBadgeSeverity, string> = {
  critical: 'border border-severity-critical bg-severity-critical-tint',
  warning: 'border border-severity-warning bg-severity-warning-tint',
  // info is the quietest tier and "must not manufacture urgency" (§4.3) — it borrows
  // the neutral sunken surface rather than a chroma tint of its own.
  info: 'border border-border-subtle bg-surface-sunken',
  unknown: 'border border-dashed border-severity-insufficient',
};

/** Badge severity → the `text-severity-*` class for the code text. */
const SEVERITY_TEXT_CLASS: Record<DtcBadgeSeverity, string> = {
  critical: 'text-severity-critical',
  warning: 'text-severity-warning',
  info: 'text-severity-info',
  unknown: 'text-severity-insufficient',
};

/**
 * Badge scale. `default` is the S5 row badge; `large` is S6's "large code badge" (§6) —
 * the same component, the same severity rule and the same §11 signals, stepped up one
 * type size (Data/Base → Data/Large, §4.4) with proportionally larger padding and glyph.
 * A separate size rather than a separate component, so the two screens cannot drift.
 */
export type DtcCodeBadgeSize = 'default' | 'large';

const SIZE_CLASS: Record<DtcCodeBadgeSize, string> = {
  default: 'gap-1.5 px-2 py-1 rounded-ds-sm',
  large: 'gap-2 px-3 py-2 rounded-ds-md',
};

const SIZE_ICON: Record<DtcCodeBadgeSize, number> = { default: 14, large: 22 };

/** `data` / `data-lg` are the Geist Mono tabular styles (§4.4) — a code is a machine string. */
const SIZE_TEXT_VARIANT = { default: 'data', large: 'data-lg' } as const;

export interface DtcCodeBadgeProps {
  /** Raw OBD-II code as reported by the ECU, e.g. 'P0299'. */
  code: string;
  /** Free-text ECU severity. Run through {@link deriveDtcBadgeSeverity} internally. */
  severityRaw: string | null;
  /** Visual scale. Defaults to the S5 row size; S6 passes `'large'`. */
  size?: DtcCodeBadgeSize;
}

export function DtcCodeBadge({ code, severityRaw, size = 'default' }: DtcCodeBadgeProps) {
  const { t } = useTranslation();
  const severity = deriveDtcBadgeSeverity(severityRaw);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('vehicles.dtcs.badgeA11y', {
        severity: t(`vehicles.dtcs.severity.${severity}`),
        code,
      })}
      className={`flex-row items-center self-start ${SIZE_CLASS[size]} ${SEVERITY_CONTAINER_CLASS[severity]}`}
    >
      <Icon icon={SEVERITY_ICON[severity]} size={SIZE_ICON[size]} color={SEVERITY_COLOR[severity]} />
      <Text variant={SIZE_TEXT_VARIANT[size]} className={SEVERITY_TEXT_CLASS[severity]}>
        {code}
      </Text>
    </View>
  );
}
