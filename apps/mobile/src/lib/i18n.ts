import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';

/**
 * i18next bootstrap. English is the only bundled language for v1, but all UI
 * text is routed through `t()` so adding Arabic/Hindi later (GCC/India launch)
 * is a resource drop-in, not a code change.
 *
 * `expo-localization` detects the device locale; on pilot devices this resolves
 * to `en`, and any non-English device falls back to `en` via `fallbackLng`.
 */
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

// `void` — init returns a promise, but resources are bundled (synchronous), so
// the default instance is usable immediately by `useTranslation()`.
// eslint-disable-next-line import/no-named-as-default-member -- `.use()` is the i18next instance method, not the named export.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  // React already escapes rendered values; double-escaping mangles text.
  interpolation: { escapeValue: false },
});

export default i18n;
