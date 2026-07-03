// ─────────────────────────────────────────────────────────────────────────────
// Caeorta design tokens — SINGLE SOURCE OF TRUTH.
//
// Translated verbatim from docs/design/00_design_system.md §4.1–4.6. This file is
// plain CommonJS (no React Native imports) so it can be required by BOTH:
//   • tailwind.config.js  (build-time, generates the className scales), and
//   • the typed app layer  (src/design/*, via the hand-written tokens.d.ts),
// keeping colour/spacing/type values in exactly one place — no drift.
//
// POLICY (see docs/conventions.md → "Design system"):
//   • Dark is the default theme. Its values are LIVE below (colorsDark).
//   • Light is a committed re-skin (colorsLight) that is NOT wired yet; turning
//     it on is a Week-8 task and needs no screen changes (classNames are bound to
//     semantic token names, not to hex).
//   • Colour group `fg` == Figma semantic `text/*` (aliased to avoid the
//     `text-text-*` class stutter). Every other group keeps its Figma name.
//   • NEVER hard-code a raw hex in a component — bind to a token.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic colour tokens — DARK (default, live). §4.2, "Dark → primitive" column.
 * Nested so Tailwind emits `bg-surface-canvas`, `text-fg-primary`, etc., and so
 * app code can read a value (`colorsDark.brand.default`) for the few APIs that
 * take a colour string rather than a className (e.g. the lucide Icon `color` prop).
 */
const colorsDark = {
  surface: {
    canvas: '#0B0F14', // slate/950
    primary: '#141A21', // slate/850
    elevated: '#1C242E', // slate/800
    sunken: '#101720', // slate/900
  },
  // `fg` == Figma `text/*`.
  fg: {
    primary: '#F2F5F7', // slate/050 — NOT pure white (glare on dark; §11)
    secondary: '#A5B0BC', // slate/200
    tertiary: '#6B7885', // slate/400
    disabled: '#3A4650', // slate/600
    'on-accent': '#0B0F14', // slate/950 — text on brand fills
  },
  border: {
    default: '#2A343F', // slate/700
    strong: '#3A4650', // slate/600
    subtle: '#1C242E', // slate/800
  },
  brand: {
    default: '#2BB3D4', // boost/500 — "Caeorta blue"
    pressed: '#1B8FAD', // boost/600
    tint: '#0F2933', // boost/tint
    text: '#8ADAEC', // boost/300 — brand-coloured text/links
  },
  severity: {
    info: '#8CA0B3', // slate/300 — quietest; must not manufacture urgency
    warning: '#E8A73C', // amber/500
    'warning-tint': '#2B2311', // amber/tint
    critical: '#E5484D', // redline/500 — the "redline"
    'critical-tint': '#2B1416', // redline/tint
    insufficient: '#6B7885', // slate/400 — OFF the ladder (dashed/neutral; §4.3)
  },
  status: {
    success: '#46A758', // green/500
    live: '#54C6E2', // boost/400
    offline: '#6B7885', // slate/400 — connection ≠ health (§2 rule 3)
  },
  interactive: {
    default: '#2BB3D4', // boost/500
    pressed: '#1B8FAD', // boost/600
    disabled: '#2A343F', // slate/700
  },
};

/**
 * Semantic colour tokens — LIGHT re-skin. §4.2, "Light (hex)" column.
 * COMMITTED FOR LATER, NOT WIRED. Kept structurally identical to `colorsDark` so
 * the Week-8 light-mode task is a mechanism swap, not a token re-authoring pass.
 */
const colorsLight = {
  surface: { canvas: '#F5F7F9', primary: '#FFFFFF', elevated: '#FFFFFF', sunken: '#EDF1F4' },
  fg: {
    primary: '#0B0F14',
    secondary: '#3A4650',
    tertiary: '#586573',
    disabled: '#A5B0BC',
    'on-accent': '#FFFFFF',
  },
  border: { default: '#D3DAE1', strong: '#A5B0BC', subtle: '#EDF1F4' },
  brand: { default: '#1B8FAD', pressed: '#166F87', tint: '#E4F4F8', text: '#166F87' },
  severity: {
    info: '#586573',
    warning: '#B37516',
    'warning-tint': '#FBF1DE',
    critical: '#C43B41',
    'critical-tint': '#FCE9EA',
    insufficient: '#6B7885',
  },
  status: { success: '#2F7D3D', live: '#1B8FAD', offline: '#8CA0B3' },
  interactive: { default: '#1B8FAD', pressed: '#166F87', disabled: '#D3DAE1' },
};

/**
 * Spacing scale (§4.5, 4dp base). Keys mirror the Figma `space/N` tokens; the
 * half-step `space/0-5` (=2dp) is keyed `0.5` here (Tailwind can't key on a dot in
 * Figma but can in a class → `p-0.5`). These values equal Tailwind's own default
 * scale, so declaring them is documentary — it pins the design's closed set and
 * makes the mapping explicit without changing how any stock class renders.
 */
const spacing = {
  0: '0px',
  0.5: '2px', // space/0-5 — the half-step
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
};

/**
 * Radius scale (§4.5). NOTE: these deliberately DIFFER from Tailwind's stock
 * radii, so wiring them into `borderRadius` re-defines `rounded-sm/md/lg/xl/full`.
 * See docs/conventions.md → "Design system" for the forward-only implication for
 * the un-migrated Week 1–3 screens.
 */
const radius = {
  sm: '8px', // chips, small controls
  md: '12px', // buttons, inputs
  lg: '16px', // cards
  xl: '20px', // modals / critical takeover
  full: '999px',
};

/**
 * Font families as registered with expo-font (see src/design/fonts.ts). Only the
 * weights §4.4 actually uses are bundled. RN does not synthesise weights from one
 * file, so each weight is its own family and the type styles set `fontFamily`
 * explicitly rather than leaning on `fontWeight`.
 */
const FONT_FAMILY = {
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  mono: 'GeistMono-Medium', // tabular numerals
};

/** Tailwind `fontFamily` map → `font-geist`, `font-geist-medium`, etc. */
const fontFamily = {
  geist: [FONT_FAMILY.regular],
  'geist-medium': [FONT_FAMILY.medium],
  'geist-semibold': [FONT_FAMILY.semibold],
  'geist-mono': [FONT_FAMILY.mono],
};

/**
 * The 12 named text styles (§4.4) — the single typography source. Consumed by the
 * <Text variant> component (src/components/ui/Text.tsx) so screens reference a
 * style by name, never by re-specifying size/weight/tracking. fontSize/lineHeight
 * are dp numbers (RN); line-heights are deliberately generous to tolerate ~30%
 * dynamic font scaling — do not pixel-lock text containers.
 */
const textStyles = {
  display: { fontFamily: FONT_FAMILY.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: FONT_FAMILY.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: FONT_FAMILY.semibold, fontSize: 21, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: FONT_FAMILY.semibold, fontSize: 17, lineHeight: 24, letterSpacing: 0 },
  'body-lg': { fontFamily: FONT_FAMILY.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  body: { fontFamily: FONT_FAMILY.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  'body-sm': { fontFamily: FONT_FAMILY.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: FONT_FAMILY.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  'data-xl': { fontFamily: FONT_FAMILY.mono, fontSize: 44, lineHeight: 48, letterSpacing: -0.5 },
  'data-lg': { fontFamily: FONT_FAMILY.mono, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  data: { fontFamily: FONT_FAMILY.mono, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
};

/**
 * Elevation recipes (§4.5). On dark, separation is surface-step + border, not
 * shadow. Exposed as className strings so surfaces don't re-type the combo; the
 * near-invisible optional shadows are `boxShadow` tokens (elev-1 / elev-2).
 */
const ELEVATION = {
  0: 'bg-surface-canvas',
  1: 'bg-surface-primary border border-border-subtle',
  2: 'bg-surface-elevated border border-border-default',
};

const boxShadow = {
  'elev-1': '0px 1px 2px rgba(0,0,0,0.35)',
  'elev-2': '0px 8px 24px rgba(0,0,0,0.45)',
};

/** Interaction constants (§3). Pressed opacity replaces hover; 48dp min tap. */
const PRESSED_OPACITY = 0.72;
const MIN_TOUCH_TARGET = 48;

module.exports = {
  colorsDark,
  colorsLight,
  spacing,
  radius,
  fontFamily,
  FONT_FAMILY,
  textStyles,
  ELEVATION,
  boxShadow,
  PRESSED_OPACITY,
  MIN_TOUCH_TARGET,
};
