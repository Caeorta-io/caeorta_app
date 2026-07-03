import type { LucideIcon, LucideProps } from 'lucide-react-native';

import { colorsDark } from '@/design';

export interface IconProps extends Omit<LucideProps, 'size'> {
  /** A lucide glyph, e.g. `import { Activity } from 'lucide-react-native'`. */
  icon: LucideIcon;
  /** Glyph size in dp. Default 18 — the common 18-in-36-container pairing (§4.6). */
  size?: number;
}

/**
 * Thin wrapper over lucide-react-native enforcing the icon convention (§4.6):
 * ~2px stroke, round caps/joins (lucide defaults), and a token colour (defaults
 * to `fg/secondary`). Pass colour from a token, never a raw hex:
 *
 * @example <Icon icon={Activity} />                                   // 18dp, fg/secondary
 * @example <Icon icon={AlertTriangle} color={colorsDark.severity.warning} />
 *
 * The 36dp touch/visual container is the caller's layout (a 36dp View); icon-only
 * controls must still pad the tap target to {@link MIN_TOUCH_TARGET} (§3).
 */
export function Icon({
  icon: Glyph,
  size = 18,
  color = colorsDark.fg.secondary,
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} {...rest} />;
}
