/**
 * Strict Caeorta rule overrides, layered on top of a framework ESLint config
 * (eslint-config-expo, eslint-config-next). These configs already register the
 * @typescript-eslint plugin, so this fragment only sets rules — it does not re-register
 * the plugin (which would error in flat config).
 *
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
