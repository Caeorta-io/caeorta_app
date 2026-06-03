import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * A Supabase client typed against the Caeorta `public` schema.
 */
export type CaeortaSupabaseClient = SupabaseClient<Database>;

export interface CreateSupabaseClientParams {
  /**
   * Project URL.
   * - Mobile (Expo): `process.env.EXPO_PUBLIC_SUPABASE_URL`
   * - Admin (Next.js): `process.env.NEXT_PUBLIC_SUPABASE_URL`
   */
  supabaseUrl: string;
  /**
   * Anon / publishable key.
   * - Mobile (Expo): `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`
   * - Admin (Next.js): `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
   */
  supabaseAnonKey: string;
  /**
   * Optional supabase-js options. Pass platform-specific bits here, e.g. on mobile:
   * `{ auth: { storage: AsyncStorage, detectSessionInUrl: false, persistSession: true,
   * autoRefreshToken: true } }`.
   */
  options?: SupabaseClientOptions<'public'>;
}

/**
 * Universal factory for a typed Supabase client, used by both `apps/mobile` (Expo) and
 * `apps/admin` (Next.js). The factory is intentionally env-agnostic: each app reads its own
 * platform-prefixed env vars and passes the resolved values in, so this package has no
 * dependency on a particular runtime's env handling.
 */
export function createSupabaseClient({
  supabaseUrl,
  supabaseAnonKey,
  options,
}: CreateSupabaseClientParams): CaeortaSupabaseClient {
  if (!supabaseUrl) {
    throw new Error('createSupabaseClient: `supabaseUrl` is required but was empty.');
  }
  if (!supabaseAnonKey) {
    throw new Error('createSupabaseClient: `supabaseAnonKey` is required but was empty.');
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}
