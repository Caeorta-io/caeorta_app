/** @type {import('tailwindcss').Config} */
// Design tokens are the single source of truth (design/tokens.js), required here
// so the semantic scales below and the typed app layer never drift. See
// docs/design/00_design_system.md §4 and docs/conventions.md → "Design system".
const {
  colorsDark,
  spacing,
  radius,
  fontFamily,
  boxShadow,
} = require('./design/tokens.js');

module.exports = {
  // Include the token module so its ELEVATION recipe class strings are generated.
  content: ['./src/**/*.{js,jsx,ts,tsx}', './design/tokens.js'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // DARK is the default theme. Semantic groups → `bg-surface-canvas`,
      // `text-fg-primary`, `border-border-default`, `text-severity-warning`, …
      // (`fg` == Figma `text/*`). Additive: none of these keys exist in stock
      // Tailwind, so the un-migrated Week 1–3 screens are unaffected.
      colors: colorsDark,
      // Documentary (values equal stock 4dp scale); pins the design's closed set.
      spacing,
      // Re-defines rounded-sm/md/lg/xl/full to the design scale (differs from
      // stock). Forward-only note in conventions.md.
      borderRadius: radius,
      // Named families only — the app default font is left as system so old
      // screens keep their current typography until the Week 8 pass. New type
      // comes through the <Text variant> component / these utilities.
      fontFamily,
      boxShadow,
    },
  },
  plugins: [],
};
