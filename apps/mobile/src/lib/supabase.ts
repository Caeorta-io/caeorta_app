// `react-native-url-polyfill` gives Hermes a WHATWG `URL` implementation, which
// supabase-js relies on when building request URLs. Import for side effect, first.
import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient, type CaeortaSupabaseClient } from '@caeorta/supabase';

/**
 * Supabase persists the auth session via this storage adapter. We back it with
 * `expo-secure-store` (per the v1 auth decision) so tokens live in the Android
 * Keystore rather than plain AsyncStorage.
 *
 * Note: SecureStore warns above ~2048 bytes per value. Supabase sessions are
 * usually under that on Android; if larger sessions ever fail to persist, swap
 * this for an encrypted-AsyncStorage ("LargeSecureStore") wrapper. Tracked as a
 * carry-forward item for the auth work.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Process-wide Supabase client for the mobile app. Reads `EXPO_PUBLIC_*` env
 * vars (inlined into the bundle at build time) and wires SecureStore-backed
 * session persistence. `detectSessionInUrl` is off because there is no browser
 * URL to parse on native — the OTP code is entered manually in the app.
 */
export const supabase: CaeortaSupabaseClient = createSupabaseClient({
  supabaseUrl,
  supabaseAnonKey,
  options: {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
});
