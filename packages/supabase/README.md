# @caeorta/supabase

Shared Supabase client factory and generated database types for `apps/mobile` and `apps/admin`.

## Exports

- `createSupabaseClient({ supabaseUrl, supabaseAnonKey, options })` — universal, typed client
  factory. Env-agnostic: each app passes its own platform-prefixed env values.
- `CaeortaSupabaseClient` — `SupabaseClient<Database>` alias.
- `Database`, `Json`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`,
  `Constants` — re-exported from the generated types.

## Usage

```ts
// apps/admin (Next.js)
import { createSupabaseClient } from '@caeorta/supabase';

const supabase = createSupabaseClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});
```

```ts
// apps/mobile (Expo) — provide React Native auth storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@caeorta/supabase';

const supabase = createSupabaseClient({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  options: {
    auth: {
      storage: AsyncStorage,
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
});
```

## Generated types

`src/database.types.ts` is generated from the linked Supabase project and **must not be edited
by hand**. Regenerate after every schema migration:

```bash
pnpm --filter @caeorta/supabase gen:types
```
