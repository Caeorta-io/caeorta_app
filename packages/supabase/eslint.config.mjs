import config from '@caeorta/config/eslint';

export default [
  ...config,
  // Generated file — not hand-maintained, do not lint.
  { ignores: ['src/database.types.ts'] },
];
