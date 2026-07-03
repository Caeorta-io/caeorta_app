// Hand-written types for the CommonJS single-source `tokens.js`. Kept in lockstep
// with that file so the typed app layer (src/design/*) sees checked token keys.

export interface ColorTokens {
  surface: Record<'canvas' | 'primary' | 'elevated' | 'sunken', string>;
  /** `fg` == Figma semantic `text/*`. */
  fg: Record<'primary' | 'secondary' | 'tertiary' | 'disabled' | 'on-accent', string>;
  border: Record<'default' | 'strong' | 'subtle', string>;
  brand: Record<'default' | 'pressed' | 'tint' | 'text', string>;
  severity: Record<
    'info' | 'warning' | 'warning-tint' | 'critical' | 'critical-tint' | 'insufficient',
    string
  >;
  status: Record<'success' | 'live' | 'offline', string>;
  interactive: Record<'default' | 'pressed' | 'disabled', string>;
}

export const colorsDark: ColorTokens;
export const colorsLight: ColorTokens;

export const spacing: Record<string, string>;
export const radius: Record<'ds-sm' | 'ds-md' | 'ds-lg' | 'ds-xl', string>;
export const fontFamily: Record<string, string[]>;

export const FONT_FAMILY: {
  regular: string;
  medium: string;
  semibold: string;
  mono: string;
};

/** The 12 named text styles (§4.4). */
export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'data-xl'
  | 'data-lg'
  | 'data';

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform?: 'uppercase';
}

export const textStyles: Record<TextVariant, TextStyleToken>;

export const ELEVATION: Record<0 | 1 | 2, string>;
export const boxShadow: Record<'elev-1' | 'elev-2', string>;

export const PRESSED_OPACITY: number;
export const MIN_TOUCH_TARGET: number;
