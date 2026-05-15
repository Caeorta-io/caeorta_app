# Caeorta

Mobile app (Expo / React Native), admin web dashboard (Next.js), and Supabase backend for the Caeorta v1 pilot. Android-only in v1; iOS deferred post-pilot.

This is the **app & web build** repo. Hardware, firmware, AI agent, and business strategy live in separate repos.

## Getting started

Both founders should be running locally in under 30 minutes.

```sh
# 1. Node + pnpm (one-time setup)
fnm install 22 && fnm default 22
corepack enable && corepack prepare pnpm@latest --activate

# 2. Clone and install
git clone https://github.com/Caeorta-io/caeorta_app.git
cd caeorta_app
pnpm install

# 3. Link Supabase (dev project ref in 1Password)
supabase link --project-ref <dev-project-ref>

# 4. Copy env files (dev keys in 1Password)
#    cp apps/mobile/.env.example apps/mobile/.env.local
#    cp apps/admin/.env.example  apps/admin/.env.local

# 5. Run (Week 1+, once apps are scaffolded)
#    pnpm --filter mobile dev   # Expo Go on a physical Android device via QR
#    pnpm --filter admin dev    # http://localhost:3000
```

## Required tools

- Node 22 LTS (via fnm or nvm-windows)
- pnpm 11+ (via corepack)
- Supabase CLI
- GitHub CLI (`gh`)
- OpenJDK 17 (for Android builds)
- Android Studio (or just `adb` from platform-tools)
- Physical Android device with USB debugging enabled

## Docs

Read [`docs/00_README.md`](docs/00_README.md) first to find the right file for what you need. Highlights:

- [`01_Project_Identity.md`](docs/01_Project_Identity.md) — what we're building and why
- [`02_Working_Agreements.md`](docs/02_Working_Agreements.md) — how to work in this repo
- [`04_Repository_Structure.md`](docs/04_Repository_Structure.md) — layout, environments, CI/CD
- [`08_12_Week_Action_Plan.md`](docs/08_12_Week_Action_Plan.md) — what we're building, in which week
- [`10_Out_Of_Scope.md`](docs/10_Out_Of_Scope.md) — "should we also build X?" — check here first

## Conventions

- Branches: `feat/...`, `fix/...`, `chore/...`, `docs/...`, `refactor/...`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
- PRs: reviewed by the other founder; squash-merged into `main`
- Migrations are immutable once applied — write a new one and update [`docs/05_Database_Schema.md`](docs/05_Database_Schema.md) in the same PR

## License

Proprietary. All rights reserved.
