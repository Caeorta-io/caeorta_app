// Typed app-facing entry point for the design system. Import from `@/design`.
//
// The raw token VALUES live in the CommonJS single source (../../design/tokens.js,
// typed by its sibling .d.ts) so tailwind.config.js and the app share one source.
// This barrel re-exports them with types for app code — e.g. a colour value for
// the lucide Icon `color` prop, the `textStyles` registry for <Text variant>, and
// the interaction constants (PRESSED_OPACITY, MIN_TOUCH_TARGET).
export * from '../../design/tokens';
