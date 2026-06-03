// @caeorta/supabase — shared Supabase client factory + generated database types.
// `database.types.ts` is auto-generated (`pnpm --filter @caeorta/supabase gen:types`); do not edit by hand.

export { createSupabaseClient } from './client';
export type { CaeortaSupabaseClient, CreateSupabaseClientParams } from './client';

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
