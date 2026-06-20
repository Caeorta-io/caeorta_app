# ADR-0002 — Use Expo Router v6 `Stack.Protected` for auth guards

- **Status**: Accepted
- **Date**: 2026-06-09
- **Context window**: Session 11 (Prompt 5 — mobile auth)

## Context

Expo Router has supported multiple patterns for gating screens behind authentication. Prior to SDK 53, the common pattern was an `(auth)` route group with a `_layout.tsx` that rendered `<Redirect>` to push unauthenticated users to a sign-in route. This worked but required manual `router.replace` calls after sign-in or sign-out events, which created subtle race conditions during auth state transitions.

Expo Router v6 (bundled with SDK 56) introduces `Stack.Protected` — a declarative guard on the navigation stack itself. The guard's truthiness controls which routes are reachable; flipping the guard automatically navigates to the appropriate stack without manual redirects.

## Decision

Use `Stack.Protected` guards in `src/app/_layout.tsx` to gate the `(app)` group behind session presence. Public routes live in the `(auth)` group with no guard. Auth state lifecycle is wired in `src/hooks/useAuthLifecycle.ts` and pushed into Zustand; the guard reads Zustand session state.

## Consequences

- No manual `router.replace` after `supabase.auth.signInWithOtp` verification or `supabase.auth.signOut()`. The guard flip drives navigation.
- The protected/public split is visible at the root layout, not buried inside group layouts. Easier to reason about.
- Tied to Expo Router v6. A future SDK downgrade (unlikely but possible) would require migrating back to `<Redirect>`. Cost: under a day; pattern is well-documented.
- Race conditions during auth state transitions are eliminated: the guard observes Zustand and updates on every state change without separate side-effect coordination.

## References

- Expo Router v6 docs: https://docs.expo.dev/router/advanced/protected/
- `src/app/_layout.tsx` for the implementation
- `src/hooks/useAuthLifecycle.ts` for the auth state wiring
- Session 11 workdiary entry (2026-06-09)