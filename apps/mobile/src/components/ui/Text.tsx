import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { textStyles, type TextVariant } from '@/design';

export interface TextProps extends RNTextProps {
  /**
   * One of the 12 named type styles (§4.4). Sets family + size + line-height +
   * tracking so screens reference a style by name, never by re-specifying them.
   * Defaults to `body`.
   */
  variant?: TextVariant;
}

/**
 * The typography primitive. Applies a named text style; COLOUR is intentionally
 * left to a className (`text-fg-primary`, `text-severity-warning`, …) so the two
 * axes compose and a caller can recolour any variant without a new style.
 *
 * Line-heights are generous by design (§4.4) to tolerate ~30% dynamic font
 * scaling — do not wrap this in a fixed-height container.
 *
 * @example <Text variant="h1" className="text-fg-primary">Golf GTI</Text>
 * @example <Text variant="data-lg" className="text-fg-primary">2.1</Text>  // tabular
 */
export function Text({ variant = 'body', style, ...rest }: TextProps) {
  // Variant first so an explicit `style` prop can still override per-instance.
  return <RNText style={[textStyles[variant], style]} {...rest} />;
}
