# @caeorta/types

Shared TypeScript types and [Zod](https://zod.dev) schemas used across `apps/mobile` and `apps/admin`.

These are the single source of truth for cross-boundary shapes. Validate at boundaries
(DB ↔ app, API ↔ UI) with the Zod schemas here, per the project's validation convention.

## Layout

- `src/index.ts` — barrel; re-exports every domain module.
- `src/diagnostic.ts` — AI diagnostic_output schema
- `src/telemetry.ts` — telemetry row schema
- `src/vehicle.ts`, `src/device.ts`, `src/drive.ts`, `src/sync.ts` — domain schemas

Domain files are placeholders until each domain is implemented. The package ships
TypeScript source directly (no build step); consumers (Metro, Next) transpile it.

## Usage

```ts
import { /* SomeSchema */ } from '@caeorta/types';
```
