# ADR-0001 — Monorepo with pnpm workspaces

- **Status**: Accepted
- **Date**: 2026-06-19
- **Context window**: Pre-Week-0 — this decision predates Caeorta App's session 1; recorded retroactively in the Week 1 retrospective.

## Context

Caeorta App spans several deployable surfaces that share types and contracts: the Expo mobile app, the Next.js admin dashboard, a reserved marketing path (Framer hosts the actual site), and shared packages (Zod schemas, the Supabase client factory + generated DB types, shared ESLint/Prettier/TS config). The diagnostic-output shape and DB types in particular must stay identical across the mobile app and the admin dashboard, or the two drift.

Three layouts were considered:

- **Polyrepo** — one repo per app/package. Rejected: sharing types means publishing internal packages or copy-pasting; a schema change becomes a multi-repo, multi-PR dance, which is exactly the drift this project can't afford with a two-person team.
- **Monorepo with a build orchestrator (Turborepo / Nx)** — task graph, remote caching, generators. Rejected for v1: real value at larger scale, but it adds a tool, its config, and a mental model for a two-person team whose build is currently `pnpm -r typecheck/lint/test`. Can be layered on later without restructuring if build times warrant it.
- **Monorepo with pnpm workspaces** — workspaces are native to the package manager already in use; no extra tool.

## Decision

Single repository (`caeorta_app`) using **pnpm workspaces** (`apps/*`, `packages/*`). Apps consume packages via the `workspace:*` protocol. No Turborepo, no Nx. Cross-workspace version consistency, where required, is enforced with `pnpm.overrides` in the root `package.json` (e.g. `typescript: 5.9.3`).

## Consequences

- Shared types, Zod schemas, the Supabase client, and lint/TS config live in `packages/*` and are imported as TS source — a schema change is one PR, consumed everywhere immediately.
- Zero added build tooling; recursive scripts (`pnpm -r ...`) cover lint/typecheck/test. If build times grow, a task runner can be added later without moving files.
- Costs: a single lockfile that all workspaces share (a dependency bump ripples), and a need to pin certain deps repo-wide — handled via `pnpm.overrides` (see `docs/04_Repository_Structure.md` § Monorepo-wide version pinning).
- pnpm's strict isolated linker occasionally needs a transitive dep promoted to a direct dep (e.g. `react-native-css-interop` for NativeWind) — a known, documented trade-off of keeping strict linking rather than `node-linker=hoisted`.

## References

- `docs/03_Tech_Stack.md` — "pnpm workspaces over Turborepo / Nx" rationale
- `docs/04_Repository_Structure.md` — monorepo layout, workspace package conventions, `pnpm.overrides`
