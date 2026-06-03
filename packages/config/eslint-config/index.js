const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

/**
 * Shared strict ESLint flat config for plain TypeScript packages (@caeorta/types,
 * @caeorta/supabase). Apps (mobile, admin) keep their framework configs (expo, next) and
 * layer on the rules-only fragment from `@caeorta/config/eslint-strict` instead, to avoid
 * double-registering the @typescript-eslint plugin.
 *
 * @type {import('eslint').Linter.Config[]}
 */
module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Quality bar is non-negotiable: no untyped escape hatches without justification.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Keep ESLint out of Prettier's lane; must come last.
  prettier,
];
