import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the data-seam unit tests (hooks + factory + mocks). Scoped to
 * `src/**` test files only — there are no native/Expo modules in this graph, so a
 * plain happy-dom environment is enough to render the TanStack Query hooks.
 *
 * `resolve.tsconfigPaths` makes Vite honour the `@/*` alias from tsconfig.json
 * natively (no extra plugin), so the alias lives in exactly one place.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // `__DEV__` is a React Native global that Metro injects; under vitest it would be an
  // undefined identifier and throw at import time. `mocks.ts` reads it to gate the
  // dev-only DTC fixture variants, so define it here. Tests therefore always see the
  // DEV branch — which is what we want to exercise; the production branch is a bundler
  // substitution, not app logic worth asserting.
  define: { __DEV__: true },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
