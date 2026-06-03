/**
 * Shared Prettier config for Caeorta.
 * Consumed via `"prettier": "@caeorta/config/prettier"` in each package's package.json.
 * @type {import('prettier').Config}
 */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 100,
};
