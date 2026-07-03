import { FONT_FAMILY } from '@/design';

// Static Geist / Geist Mono assets (OFL, vendored under assets/fonts — see the
// bundled Geist-OFL.txt). require() is the Metro-native way to bundle fonts; the
// map keys are the family names from tokens.js (FONT_FAMILY) so the names the app
// loads and the names the text styles reference can never drift.
//
// Only the four weights §4.4 uses are bundled: Geist Regular/Medium/SemiBold +
// Geist Mono Medium. Consumed by the root layout's boot sequence (useFonts), which
// gates the splash so there is no unstyled-text flash.
export const fontMap = {
  [FONT_FAMILY.regular]: require('../../assets/fonts/Geist-Regular.ttf'),
  [FONT_FAMILY.medium]: require('../../assets/fonts/Geist-Medium.ttf'),
  [FONT_FAMILY.semibold]: require('../../assets/fonts/Geist-SemiBold.ttf'),
  [FONT_FAMILY.mono]: require('../../assets/fonts/GeistMono-Medium.ttf'),
};
