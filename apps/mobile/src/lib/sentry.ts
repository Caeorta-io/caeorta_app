import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialise Sentry. Call once, as early as possible (before the root component
 * renders), from the root layout module.
 *
 * Scope for this session is basic crash/error capture against the dev DSN.
 * Release tracking, sourcemap upload (the `@sentry/react-native/expo` config
 * plugin + Metro wrapper + `@sentry/cli`) and a tuned prod `tracesSampleRate`
 * are deferred to Week 10.
 *
 * Note: in Expo Go the native layer is unavailable, so native crashes are not
 * captured — but JS errors sent via `Sentry.captureException` still reach the
 * dashboard, which is what the home-screen test button exercises.
 */
export function initSentry(): void {
  Sentry.init({
    dsn,
    // No DSN locally? Run as a no-op rather than throwing, so dev without a
    // configured Sentry project still boots.
    enabled: Boolean(dsn),
    // Dev: capture everything. Lowered for prod in Week 10.
    tracesSampleRate: 1.0,
    debug: __DEV__,
  });
}

export { Sentry };
