// @caeorta/supabase — shared Supabase client factory + generated database types.
// `database.types.ts` is auto-generated (`pnpm --filter @caeorta/supabase gen:types`); do not edit by hand.

export { createSupabaseClient } from './client';
export type { CaeortaSupabaseClient, CreateSupabaseClientParams } from './client';

// Re-export the auth types apps commonly need, so consumers (e.g. apps/mobile) can type
// sessions/users/auth events without taking a direct dependency on @supabase/supabase-js.
export type {
  Session,
  User,
  AuthChangeEvent,
  AuthError,
  SupabaseClientOptions,
} from '@supabase/supabase-js';

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database.types';
export { Constants } from './database.types';
