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

export interface DtcCodeBadgeProps {
  /** Raw OBD-II code as reported by the ECU, e.g. 'P0299'. */
  code: string;
  /** Free-text ECU severity. Run through {@link deriveDtcBadgeSeverity} internally. */
  severityRaw: string | null;
}

export function DtcCodeBadge({ code, severityRaw }: DtcCodeBadgeProps) {
  const { t } = useTranslation();
  const severity = deriveDtcBadgeSeverity(severityRaw);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('vehicles.dtcs.badgeA11y', {
        severity: t(`vehicles.dtcs.severity.${severity}`),
        code,
      })}
      className={`flex-row items-center gap-1.5 self-start rounded-ds-sm px-2 py-1 ${SEVERITY_CONTAINER_CLASS[severity]}`}
    >
      <Icon icon={SEVERITY_ICON[severity]} size={14} color={SEVERITY_COLOR[severity]} />
      {/* `data` is the Geist Mono tabular style (§4.4) — a code is a machine string. */}
      <Text variant="data" className={SEVERITY_TEXT_CLASS[severity]}>
        {code}
      </Text>
    </View>
  );
}
