// Flat config: Expo's recommended config + Caeorta strict rules.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const strict = require('@caeorta/config/eslint-strict');

module.exports = defineConfig([
  expoConfig,
  strict,
  { ignores: ['dist/*', '.expo/*', 'expo-env.d.ts', 'nativewind-env.d.ts'] },
]);
