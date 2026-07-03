import { describe, expect, it } from 'vitest';

import {
  colorsDark,
  colorsLight,
  FONT_FAMILY,
  fontFamily,
  MIN_TOUCH_TARGET,
  PRESSED_OPACITY,
  radius,
  textStyles,
  type TextVariant,
} from '@/design';

// Data-level guard for the design tokens. This does NOT render RN (react-native
// is not renderable in this happy-dom env) — it verifies the token VALUES are
// correct and internally consistent. Runtime className/font resolution is verified
// by running the app (see the dev/tokens preview).

const HEX = /^#[0-9A-F]{6}$/;

describe('semantic colours (§4.2)', () => {
  it('dark and light are structurally identical (re-skin depends on it)', () => {
    // Same groups, and the same member keys within every group — so the Week-8
    // light switch is a mechanism swap, not a token re-authoring pass.
    expect(Object.keys(colorsLight)).toEqual(Object.keys(colorsDark));
    for (const group of Object.keys(colorsDark) as (keyof typeof colorsDark)[]) {
      expect(Object.keys(colorsLight[group])).toEqual(Object.keys(colorsDark[group]));
    }
  });

  it('every dark value is an uppercase 6-digit hex', () => {
    for (const group of Object.values(colorsDark)) {
      for (const value of Object.values(group)) {
        expect(value).toMatch(HEX);
      }
    }
  });

  it('spot-checks anchor tokens against the report', () => {
    expect(colorsDark.fg.primary).toBe('#F2F5F7'); // not pure white (§11)
    expect(colorsDark.brand.default).toBe('#2BB3D4'); // Caeorta blue
    expect(colorsDark.severity.warning).toBe('#E8A73C');
    expect(colorsDark.severity.critical).toBe('#E5484D'); // redline
    expect(colorsDark.fg['on-accent']).toBe('#0B0F14');
    expect(colorsLight.surface.canvas).toBe('#F5F7F9');
  });
});

describe('typography (§4.4)', () => {
  const variants = Object.keys(textStyles) as TextVariant[];

  it('encodes exactly the 12 named styles', () => {
    expect(variants).toHaveLength(12);
  });

  it('each style carries family + size + line-height + tracking', () => {
    for (const style of Object.values(textStyles)) {
      expect(typeof style.fontFamily).toBe('string');
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize); // generous
      expect(typeof style.letterSpacing).toBe('number');
    }
  });

  it('label is uppercase; data styles are Geist Mono (tabular)', () => {
    expect(textStyles.label.textTransform).toBe('uppercase');
    expect(textStyles['data-xl'].fontFamily).toBe(FONT_FAMILY.mono);
    expect(textStyles['data-lg'].fontFamily).toBe(FONT_FAMILY.mono);
    expect(textStyles.data.fontFamily).toBe(FONT_FAMILY.mono);
  });

  it('font families map to the four vendored weights', () => {
    expect(fontFamily.geist).toEqual([FONT_FAMILY.regular]);
    expect(fontFamily['geist-mono']).toEqual([FONT_FAMILY.mono]);
    expect(FONT_FAMILY).toEqual({
      regular: 'Geist-Regular',
      medium: 'Geist-Medium',
      semibold: 'Geist-SemiBold',
      mono: 'GeistMono-Medium',
    });
  });
});

describe('scale & interaction constants (§4.5, §3)', () => {
  it('radius scale matches the report (design-namespaced, additive)', () => {
    // Namespaced `ds-*` keys → rounded-ds-sm/md/lg/xl; they collide with nothing
    // in stock Tailwind, so stock rounded-* stays default (strict forward-only).
    // No `ds-full`: the design pill (999) renders as stock rounded-full (9999).
    expect(radius).toEqual({ 'ds-sm': '8px', 'ds-md': '12px', 'ds-lg': '16px', 'ds-xl': '20px' });
  });

  it('pressed opacity and min touch target', () => {
    expect(PRESSED_OPACITY).toBe(0.72);
    expect(MIN_TOUCH_TARGET).toBe(48);
  });
});
