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
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
