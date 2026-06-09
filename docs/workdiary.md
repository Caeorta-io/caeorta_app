# Caeorta Work Diary

A running log of development on the Caeorta app/web/Supabase build. Updated at the end of any session that involved meaningful work.

**Read top-to-bottom for chronology.** Newest entries go at the bottom. Three living sections at the top — **Current tool inventory**, **Repository facts**, and **Decisions log** — get kept current as the project moves. Each session also writes a new dated entry under **Diary entries**.

When something is installed, upgraded, or replaced, update the tool inventory row. When a non-trivial decision is taken, add a row to the decisions log AND mention it in that day's diary entry.

---

## Current tool inventory

(Updated whenever a tool is installed, upgraded, or replaced. App founder's machine unless noted.)

| Tool | Version | Path | Notes |
|---|---|---|---|
| Node.js | 22.22.2 | `C:\Users\muham\AppData\Local\fnm_multishells\...\node.exe` | Active LTS as of 2026-05; fnm-managed |
| pnpm | 11.1.1 | corepack-managed via fnm | Pinned in root `package.json` via `packageManager` |
| fnm | 1.39.0 | `C:\Users\muham\AppData\Local\Microsoft\WinGet\Packages\Schniz.fnm_...\fnm.exe` | Init line in PowerShell `$PROFILE` |
| Git | 2.37.1 | pre-existing (Windows installer) | Older — update at convenience |
| GitHub CLI (`gh`) | 2.92.0 | `C:\Program Files\GitHub CLI\gh.exe` | Authenticated as `MuhammedRaslan`; scopes: gist, read:org, repo, workflow |
| Supabase CLI | 2.98.2 | `C:\Users\muham\scoop\shims\supabase.exe` | Installed via scoop (Supabase's recommended Windows path; no winget package) |
| scoop | 0.5.3 | `C:\Users\muham\scoop\shims\scoop.ps1` | Added to provide Supabase CLI |
| 7-Zip | 26.01 | `C:\Users\muham\scoop\apps\7zip\current\` | Pulled in as scoop dep for Supabase CLI extraction |
| OpenJDK (Microsoft) | 17.0.19 LTS | `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot\` | `JAVA_HOME` set machine-scope |
| Android platform-tools | 37.0.0 (adb 1.0.41) | `C:\Users\muham\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_...\platform-tools\adb.exe` | Standalone install for immediate `adb` |
| Android Studio | 2025.3.4.7 | `C:\Program Files\Android\Android Studio\` | First-launch SDK Manager wizard not yet run |
| VS Code + Claude Code ext. | (installed) | system PATH | Signed in with Anthropic account |

Tools intentionally **not** installed (per project decisions or scope):

- **Xcode / iOS toolchain** — Android-only for v1 pilot (see decisions log)
- **Expo CLI globally** — modern Expo (SDK 50+) uses `npx expo`; no global install needed
- **Cursor** — Claude Code VS Code extension chosen instead (see `docs/03_Tech_Stack.md`)

---

## Repository facts

- **GitHub**: [Caeorta-io/caeorta_app](https://github.com/Caeorta-io/caeorta_app) — **private** (org renamed from `Caeorta-AI` on 2026-05-15; see decisions log)
- **Local working path** (App founder): `c:\Users\muham\Documents\1_Caeorta_dev\caeorta_app` (NOT OneDrive; the `#` prefix was dropped on 2026-06-03 because Tailwind 4's oxide compiler corrupts paths containing `#` — see decisions log)
- **Default branch**: `main`
- **Workspace manager**: pnpm 11 workspaces (`apps/*`, `packages/*`)
- **Founder roles**:
  - **App founder — Muhammed Raslan Thalassery:** owns and implements the Expo mobile app, UI, AI agent output integration, design implementation. Sole code author for this repo.
  - **Platform founder — Sulaiman Shiyas Ali:** owns Supabase schema, RLS, Edge Functions, admin web (Next.js), marketing site (Framer), OTA, push backend, device pairing, CI/CD as decision-maker. Reviews all Platform-area PRs. Code in this repo is authored by Muhammed under Sulaiman's ownership.
- **Founders' commit identities**:
  - App (Muhammed Raslan): `user.name` = `Muhammed_Raslan` (repo-scoped); `user.name` = `Muhammed Raslan` (global, set 2026-05-15); `user.email` = `muhammedraslanthalassery@gmail.com` (global)
  - Platform (Sulaiman Shiyas Ali): does not author commits in this repo; PR review only

---

## Decisions log

Sortable by date. Every non-trivial decision goes here AND is described in the diary entry for that day.

| Date | Decision | Driver | Where it shows up |
|---|---|---|---|
| 2026-05-13 | **Android-only for v1 pilot; iOS deferred post-pilot.** | Budget (no Apple Developer enrollment until funded) + hardware (no Mac on team) | `CLAUDE.md`, `docs/01_Project_Identity.md`, `docs/08_12_Week_Action_Plan.md`, `docs/10_Out_Of_Scope.md` |
| 2026-05-13 | **Node 22 LTS** (not Node 20 as in original docs). | Node 20 went EOL 2026-04 | `docs/04_Repository_Structure.md`, `docs/08_12_Week_Action_Plan.md`, `.nvmrc` |
| 2026-05-13 | **pnpm 11** (not pnpm 9 as in original docs). | corepack installed latest; same workspace semantics | `docs/04_Repository_Structure.md`, `package.json` |
| 2026-05-13 | **Repo named `caeorta_app`** (not `caeorta`). | Disambiguate from sibling repos (`caeorta_hardware`, `caeorta_ai_agent`) | `docs/04_Repository_Structure.md` line 5 |
| 2026-05-13 | **GitHub org slug: `Caeorta-AI`.** | Founder choice | `docs/04_Repository_Structure.md`, this file |
| 2026-05-13 | **Repo lives at `C:\Code\caeorta_app`, not under OneDrive.** | Avoid OneDrive sync churn for `node_modules` and .git locking issues | This file |
| 2026-05-13 | **Defer full Apple Developer ($99/yr) + Google Play Console ($25 one-time) until funded.** Implication: APNs deferred (push v1 is FCM-only); Play Internal Testing deferred until before pilot launch. | Founder budget constraint | `docs/08_12_Week_Action_Plan.md` Section 0 |
| 2026-05-13 | **Founder split confirmed** with names: Muhammed Raslan (App), Sulaiman Shiyas Ali (Platform). | Pre-Week-1 decision per founder agreement | `docs/01_Project_Identity.md` Stage section, `docs/08_12_Week_Action_Plan.md` Section 0 status, this file's Repository facts |
| 2026-05-13 | **Section 0 closed.** All external accounts (GitHub, Supabase dev+prod, Vercel, Expo, Anthropic, Sentry, PostHog, Cloudflare Registrar + domain, Google Workspace, Resend, Framer) created and stored in 1Password "Caeorta" vault. Founder agreement (YC template) signed. Both founders' dev environments set up. | Week 1 readiness | `docs/08_12_Week_Action_Plan.md` Section 0 status block |
| 2026-05-13 | **R18 logged: Apple Developer will eventually enroll as Individual, not Organization.** No D-U-N-S; Caeorta not yet incorporated. Acceptable for pilot; plan org transfer Weeks 12–16 post-incorporation. | No incorporated entity at enrollment time | `docs/09_Risks_And_Mitigations.md` R18 |
| 2026-05-13 | **Week 1 start: Monday 2026-05-18.** | Next-Monday cadence from today (Wed 2026-05-13). Subject to founder revision. | `docs/01_Project_Identity.md` Stage section |
| 2026-05-13 | **iOS app development paused for v1 pilot — Android-only confirmed.** Apple Developer enrollment is not a Week 1–12 blocker; it's a post-pilot requirement. Google Play Console remains a Week-10 dependency for the Android pilot distribution. Resolves the Section 0 status block contradiction. | Founder confirmation after I surfaced the conflict between the new Section 0 status text and the earlier Android-only decision. | `docs/08_12_Week_Action_Plan.md` Section 0 status block (deferred-items list rewritten) |
| 2026-05-15 | **GitHub org renamed from `Caeorta-AI` to `Caeorta-io`.** Old org no longer accessible to App founder; new org created and MuhammedRaslan granted access. Repo recreated at `github.com/Caeorta-io/caeorta_app`; local history (4 commits) pushed as new initial remote main. | Founder decision (organizational rename; old org effectively retired for this project). | `README.md`, `CLAUDE.md` (indirect via docs), `docs/01_Project_Identity.md`, `docs/04_Repository_Structure.md`, `docs/08_12_Week_Action_Plan.md` Section 0 status block, this file's Repository facts |
| 2026-05-15 | **App founder's working path updated to `c:\Users\muham\Documents\#1_Caeorta_dev\caeorta_app`** (was `C:\Code\caeorta_app` per session 1). Path appears to have moved between sessions; this entry captures current truth without rewriting historical session 1 / session 2 narration. | Path moved on App founder's machine; reason TBD by founder. Documenting the current reality. | `docs/08_12_Week_Action_Plan.md` Section 0 status block, this file's Repository facts |
| 2026-06-02 | **Execution model clarified: Muhammed is sole code author for caeorta_app; Sulaiman reviews PRs and owns Platform-area decisions.** Role accountability (App vs Platform) preserved; only the execution split changes. | Founder bandwidth + working preference. | All Week 1+ work. Reflected in `CLAUDE.md`, `README.md`, `docs/00_README.md`, `docs/01_Project_Identity.md`, `docs/02_Working_Agreements.md`, `docs/04_Repository_Structure.md`, `docs/05_Database_Schema.md`, `docs/08_12_Week_Action_Plan.md`, `docs/09_Risks_And_Mitigations.md` (R14 reframed), this file's Repository facts |
| 2026-06-02 | **`app_versions` PK changed from `(version)` to `(version, platform)`** in the schema doc + initial migration. A `version`-only PK conflicts the moment the same release ships on both stores (e.g. v1.0.5 on iOS and v1.0.5 on Android). Surfaced as a doc bug while writing the initial-schema SQL. | Schema doc's stated PK conflicted with the platform column's purpose. Founder approved via "Recommended" pick on the placeholder-shape question (composite PKs not contested separately; the deviation is flagged in PR #6's description for explicit reviewer attention). | `docs/05_Database_Schema.md` § `app_versions`; `supabase/migrations/20260602130000_initial_schema.sql` |
| 2026-06-02 | **v2 community placeholders + `vehicle_modifications` shipped with minimum shape** — `id` PK + key FKs + `created_at` only, no domain columns. v2 will add columns via additive migrations (non-destructive). | Schema doc explicitly defers detail to v2 planning; locking in column shapes today would risk a destructive v2 migration. Founder approved via "Minimum: id PK + key FKs + created_at" pick. | `supabase/migrations/20260602130000_initial_schema.sql` (the seven tables: `vehicle_modifications`, `posts`, `comments`, `groups`, `group_members`, `events`, `event_attendees`) |
| 2026-06-02 | **Community placeholders get `ENABLE ROW LEVEL SECURITY` with no policies** (deny-all to non-service-role) rather than RLS-off as the brief literally said. Defense-in-depth: tables exist with no UI in v1, but PostgREST exposes them by default; RLS-off would leave them readable/writable by any authenticated user. v2 adds policies additively when community UI ships. | Brief's "skip community placeholders" interpreted as a v1-no-policies goal, not a literal RLS-off goal. Founder approved via "Recommended" pick. | `supabase/migrations/20260602150000_rls_policies.sql` — Community placeholders section |
| 2026-06-02 | **`devices` UPDATE policy is row-level only; column-level restriction deferred to a Week-2 follow-up migration.** Owner can UPDATE any column on owned devices rows at the DB level; columns the owner should not write (`device_secret`, `claimed_by_user_id`, `claimed_at`, `created_at`, `last_seen_at`, `firmware_version`, `last_sync_at`) are application-layer-enforced for now. Column-level GRANT/REVOKE waits for `mint_device_token` + Edge Function column-write contract to firm up. | Postgres RLS is row-level only; column scope is a separate concern. Locking column GRANTs in before the device-JWT contract is built risks a fixup migration in Week 2. Founder approved via "Recommended" pick. | `supabase/migrations/20260602150000_rls_policies.sql` — `devices` UPDATE policy comment + this row |
| 2026-06-03 | **Captured 13 working-pattern items into `docs/conventions.md`, `docs/05_Database_Schema.md`, `docs/04_Repository_Structure.md`, `CLAUDE.md`.** Codifies patterns that emerged through Week 1 sessions: RLS regression suite, `supabase/seed.sql` plan, dev→prod migration promotion ritual, spec-deviation protocol, stacked-PR discipline, squash-only repo-settings enforcement, self-merge ban, `ask_user_input_v0` usage, scope-mismatch protocol, PR description template, PR queue management, test coverage triage. | Patterns were lived through Weeks 0–1 but not yet written down; future sessions inherit them without re-derivation. | `docs/conventions.md` (new), `docs/05_Database_Schema.md` (Migration discipline § Promoting a migration to prod, new Testing § and Test fixtures §), `docs/04_Repository_Structure.md` (Branch strategy § squash-only enforcement), `CLAUDE.md` (Behavior expectations + new Claude Code never self-merges section) |
| 2026-06-03 | **Accept latest scaffolder majors: Expo SDK 56 (not 53) + Next.js 16 (not 15).** Both `create-expo-app` and `create-next-app` now emit a full major beyond the docs; by mid-2026 SDK 53 / Next 15 are stale. The brief's "SDK 53+" anticipated this. | Founder picked "Accept latest (56/16)" when the drift was surfaced. SDK 53 likely outside Expo's active support window now. | `docs/03_Tech_Stack.md` (Expo 56, Next 16, reanimated 4 rows), `docs/01_Project_Identity.md` (Next 16 line), `apps/mobile` (SDK 56), `apps/admin` (Next 16) |
| 2026-06-03 | **Standardize TypeScript on 5.9.3 across the monorepo** via `pnpm.overrides`. Expo 56's template pins TS ~6.0.3, Next 16 pins ~5.9; `@typescript-eslint` and NativeWind don't support TS 6 yet. | Avoid a split TS major and bleeding-edge `@typescript-eslint` incompatibility; TS 6 buys nothing here. Part of the "pin one TS version" path the founder approved. | root `package.json` `pnpm.overrides.typescript`, all package/app `typescript` devDeps |
| 2026-06-03 | **Drop the `#` from the repo folder name** (`#1_Caeorta_dev` → `1_Caeorta_dev`). Tailwind 4's `@tailwindcss/oxide` injects a null byte at the `#` in the absolute path, 500-ing every admin CSS compile. Founder removes the folder `#`; admin CSS then compiles with zero code changes. | Known Tailwind-v4 special-character-in-path bug; only robust fix is a `#`-free path. Also de-risks EAS / Metro caching. | Repository facts path above; founder action (folder rename), no code change |
| 2026-06-03 | **NativeWind workaround: `react-native-css-interop@0.2.4` added as a direct dep of `@caeorta/mobile`.** NativeWind's babel JSX transform emits `import 'react-native-css-interop/jsx-runtime'`, which pnpm's strict isolated linker doesn't expose (it's a transitive dep of nativewind). Pinned to nativewind's exact version. | Keeps pnpm's strict isolated linking (the reason pnpm was chosen) instead of switching to `node-linker=hoisted`; Android export then bundles cleanly (1493 modules). Re-check the pin when bumping nativewind. | `apps/mobile/package.json` |
| 2026-06-03 | **Catch-up PRs #11/#12 to reconcile `main`.** The Week-1 stacked PRs (#6–#10) had merged into their base branches, not `main`, so `main` was missing the schema + RLS migrations, `database.types.ts`, and docs sessions 6–8. Replayed the reviewed commits onto `main` via two rebase-merged PRs. | Stacked-merge trap (flagged as a risk in session 7's notes). Founder explicitly authorized the merge ("merge it, like it should be") — one-off override of the no-self-merge rule for already-reviewed content. | `main` history (commits `6b40baa`, `4fad9a7`, `86a748e`, `56db595`, `6e23d5b`) |
| 2026-06-09 | Captured 5 new patterns from sessions 8-9 (stacked-merge reconciliation, scaffolder drift policy, environmental gotchas, pnpm.overrides, dev-vs-prod migration tracking) and fixed 6 staleness issues across CLAUDE.md and 04. Documented self-merge exception clause. | Targeted gap-fix/pattern-capture pass so sessions 8-9 learnings land in the source-of-truth docs before Week 2. | `CLAUDE.md`, `docs/03_Tech_Stack.md`, `docs/04_Repository_Structure.md`, `docs/05_Database_Schema.md`, `docs/conventions.md` |

---

## Diary entries

### 2026-05-13 — Week 0 kickoff (session 1)

**Goal of session:** Orient the assistant; do Section 0 pre-checks (tooling + repo creation).

**Orientation.**
- First Claude Code session in this repo. Read `CLAUDE.md` and `docs/00_README.md` → `docs/02_Working_Agreements.md` to understand project identity, scope, founder constraints, behavior expectations.
- Flagged a doc inconsistency: `CLAUDE.md` references doc files as `docs/00-readme.md` (lowercase-dashed) but the actual filenames are `docs/00_README.md` (capitalized-underscored). Resolves via Glob, fails via direct Read. **Still pending normalization.**
- Speaker self-identified as **App Founder**; Platform role therefore belongs to the other founder. Captured in the file map at top.

**Scope decision: Android-only for v1 pilot.**
- Discussed: budget (no Apple Developer enrollment until funded) and hardware (no Mac on team, Xcode is macOS-only). India pilot has ~5–10% iOS share, so Android-only is defensible for v1. Future iOS re-enablement budgeted at ~2 weeks (Apple Developer + ID verification + Mac procurement + iOS Wi-Fi provisioning workaround + native QA pass + App Store review). GCC commercial launch will need iOS.
- **Docs updated:**
  - `CLAUDE.md` line 67 — TestFlight → Play Internal Testing only (Android-only)
  - `docs/01_Project_Identity.md` line 79 — same change; new Android-only scope-decision bullet with reasoning + integration-cost estimate; Wi-Fi provisioning bullet rewritten to subsume into the Android-only one
  - `docs/08_12_Week_Action_Plan.md` — Section 0 (Apple Developer, Xcode, iPhone all `**DEFERRED (post-pilot, Android-only v1):**` with strike-through preserving original text); Week 7 (APNs deferred); Week 9 (iOS-specific issues deferred, replaced with explicit Android-specific issues line); Week 10 (Apple App Store Connect, TestFlight submission, iPhone/iPad screenshots deferred); Week 12 (Apple Sign-In deferred)
  - `docs/10_Out_Of_Scope.md` — "What v1 IS" line updated; "Public app store releases" section updated; new "iOS in v1 pilot" entry added with budget + hardware reasoning and a flagged GCC implication

**Tooling installs.** Performed on App founder's Windows 11 machine. winget was the primary installer; scoop covered the gap for Supabase CLI.

- **winget** (one batch, ran in background):
  - `Schniz.fnm` → fnm 1.39.0
  - `GitHub.cli` → gh 2.92.0
  - `Microsoft.OpenJDK.17` → OpenJDK 17.0.19 LTS
  - `Google.PlatformTools` → 37.0.0 (adb 1.0.41)
  - `Google.AndroidStudio` → 2025.3.4.7
- **Node + pnpm via fnm + corepack:**
  - `fnm install 22 && fnm default 22 && fnm use 22` → Node v22.22.2
  - `corepack enable && corepack prepare pnpm@latest --activate` → pnpm 11.1.1
  - Pre-existing system Node v24.14.0 left in place (no longer on PATH after `fnm use 22`)
- **PowerShell profile.** Added `fnm env --use-on-cd | Out-String | Invoke-Expression` to `C:\Users\muham\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` so new sessions auto-load fnm and switch Node per directory based on `.nvmrc`. Note: the profile itself is on OneDrive — long-term move-out deferred.
- **Supabase CLI.** Not on winget. Installed scoop 0.5.3 via `Invoke-RestMethod https://get.scoop.sh | iex`; added supabase bucket; `scoop install supabase` → 2.98.2 (7zip 26.01 pulled in as transitive dep).
- **Expo CLI** intentionally not installed globally — modern Expo (SDK 50+) uses `npx expo`. The "Expo CLI" line in `docs/08_12_Week_Action_Plan.md` Section 0 around line 61 is obsolete; **pending cleanup**.

**GitHub authentication.**
- Founder ran `gh auth login` interactively in their own terminal (after closing/reopening the shell to refresh PATH — winget installs don't update PATH in already-running sessions).
- Logged in as `MuhammedRaslan`. Token scopes: `gist`, `read:org`, `repo`, `workflow`.
- Org membership confirmed: `Caeorta-AI` (the display name "Caeorta AI" slugifies to `Caeorta-AI`).

**Repo creation.**
- **Source-of-truth discovery.** During the initial copy attempt, cmd `dir` and PowerShell both showed `C:\Users\muham\OneDrive\Documents\Caeorta_App\` as empty (only an empty `docs` subdirectory). My earlier Read/Edit tool calls had succeeded against that same path. Investigation revealed that `C:\Users\muham\OneDrive\Documents` is an `IO_REPARSE_TAG_CLOUD` placeholder (OneDrive Files-On-Demand), while the actual files live at the non-redirected `C:\Users\muham\Documents\Caeorta_App\`. Read/Edit were resolving through path indirection; raw filesystem ops were not. **Lesson: use `C:\Users\muham\Documents\Caeorta_App\` as the real source path, never the OneDrive one.**
- Created target dir `C:\Code\caeorta_app`. Copied from real source:
  - `CLAUDE.md` (5600 bytes, with the Android-only edit intact)
  - `.gitignore` (96-byte starter — replaced below with comprehensive version)
  - `docs/` (11 files, all earlier edits intact)
- Scaffolded six monorepo root files:
  - `.nvmrc` → `22`
  - `pnpm-workspace.yaml` → `apps/*`, `packages/*`
  - `package.json` → name `caeorta`, private, `packageManager: pnpm@11.1.1`, Node ≥22 engine
  - `tsconfig.base.json` → strict, ES2022, `moduleResolution: Bundler`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`
  - `README.md` → quickstart, required tools list, docs map, conventions
  - `.gitignore` → comprehensive Node + Expo + Next.js + Android (iOS section kept ignored even though deferred) + Windows + macOS (replaced 10-line starter)
- Doc edit: line 5 of `docs/04_Repository_Structure.md` updated:
  - `caeorta` → `caeorta_app`
  - "a Caeorta organization" → "the **Caeorta-AI** organization"
- `git init -b main`
- git config: repo-scoped `user.name = Muhammed_Raslan` (global was empty — flagged). `user.email` inherited from global = `muhammedraslanthalassery@gmail.com` — flagged for founder to consider switching to GitHub no-reply email for privacy on public visibility.
- Initial commit `b82e653 chore: initial repository scaffold` — 18 files, 2828 insertions.
- `gh repo create Caeorta-AI/caeorta_app --private --source=. --remote=origin --push --description "..."` → live at https://github.com/Caeorta-AI/caeorta_app.

**Tool versions captured (end of session):** see "Current tool inventory" above.

**Open items rolled forward:**

- Apple Developer ($99/yr) + Google Play Console ($25 one-time) — deferred per budget. Google Play is cheap and one-time; recommend doing it before Week 7 (push notifications scaffolding).
- Founder agreement (Y Combinator template) — Section 0 doc item.
- Brief design system doc with designer (color tokens, type scale, spacing) — Section 0 doc item.
- AI Agent Contract v0 placeholder — Section 0 doc item, filled in Week 1.
- Working agreement decisions: daily 15-min sync time, Friday 60-min retro time, branch strategy + PR review cadence, GitHub Issues + project board setup.
- WhatsApp Business account setup — Section 0 item.
- Decide on `git config --global user.name` (currently empty) and whether to switch `user.email` to GitHub no-reply.
- `.gitattributes` for line-ending consistency (LF normalization) — defer to Week 1 alongside ESLint/Prettier config.
- Fix `CLAUDE.md` filename references (dashes-lowercase) to match actual filenames (underscores-capitalized).
- Cleanup: delete `C:\Users\muham\Documents\Caeorta_App\` (original source) and `C:\Users\muham\OneDrive\Documents\Caeorta_App\` (empty stub) once founder confirms GitHub repo is canonical. **Destructive — awaiting explicit go-ahead.**
- Remove the obsolete "Expo CLI" line from `docs/08_12_Week_Action_Plan.md` Section 0.
- Long-term: move PowerShell profile out of OneDrive.

**Notes / lessons:**

- OneDrive Known Folder Move can redirect `Documents` to `OneDrive\Documents` via an `IO_REPARSE_TAG_CLOUD` placeholder. For this account, real `Documents` is the local one. Verify with `fsutil reparsepoint query <path>` if there's confusion about where files actually live.
- After winget installs, already-running shells don't see the new PATH. Either close + reopen the shell, or refresh inline: `$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")`.
- Git on Windows defaults `core.autocrlf=true` → LF/CRLF warnings on `git add`. Benign for an all-Windows team; revisit if mixed-OS contributors join.
- fnm shells are managed via `fnm_multishells`; the Node binary path is per-shell-session. Don't hard-code it — `(Get-Command node).Source` shows the active shell's resolved path.

---

### 2026-05-13 (later same day) — Doc reconciliation (session 2)

**Goal of session:** Reconcile project knowledge with actual Section 0 completion state. Founder provided 6 specific doc updates to perform.

**Done:**
- Added **Section 0 status — closed 2026-05-13** block to `docs/08_12_Week_Action_Plan.md` immediately under the Section 0 heading. Preserves the original checklist below as historical context.
- Replaced the workdiary row in `docs/00_README.md` with the founder's shorter spec: `| workdiary.md | Living log; read latest entry at session start, append at session end |`.
- Replaced the **Stage when this project starts** section in `docs/01_Project_Identity.md` with current Week-1-starting state: repo live, Section 0 closed, designer kickoff scheduled, AI agent Contract v0 review scheduled.
- Appended **R18 — Apple Developer enrolled as Individual, not Organization** in `docs/09_Risks_And_Mitigations.md`, with Status "Active. Tracked for post-pilot."
- Restructured the **docs/** subtree in `docs/04_Repository_Structure.md` to explicitly list the 11 numbered files and `workdiary.md`, keeping the aspirational lowercase files (`ai-agent-contract.md`, `schema.md`, `api-contracts.md`, `12-week-plan.md`, `adr/`) intact.
- Added a **Workdiary** bullet to the **Documentation discipline** section in `docs/04_Repository_Structure.md`.
- Added a **Workdiary discipline** section to `docs/02_Working_Agreements.md`, placed before "When Claude should END a conversation cleanly".

**Tools / versions touched:** none — docs only.

**Files / commits:**
- `docs/00_README.md`, `docs/01_Project_Identity.md`, `docs/02_Working_Agreements.md`, `docs/04_Repository_Structure.md`, `docs/08_12_Week_Action_Plan.md`, `docs/09_Risks_And_Mitigations.md`, `docs/workdiary.md`
- Single commit: `docs: reconcile project knowledge with Section 0 completion + add R18`

**Decisions confirmed (recorded above in Decisions log):**
- Founder split: Muhammed Raslan = App, Sulaiman Shiyas Ali = Platform
- Section 0 closed; accounts done; founder agreement signed
- R18 logged for post-pilot tracking
- Week 1 start = Mon 2026-05-18 (next Monday)

**Open items rolled forward:**
- ~~CONTRADICTION TO RECONCILE — flagged to founder.~~ **RESOLVED 2026-05-13 (later same day).** Founder confirmed option (B): iOS app development is paused for v1; Android-only is the pilot path; Apple Developer enrollment is a post-pilot concern, not a Week 7/10 v1 blocker. Section 0 status block's deferred-items list rewritten accordingly in a follow-up commit. All earlier Android-only edits stand as-is.
- Cleanup of `C:\Users\muham\Documents\Caeorta_App\` (real source) and `C:\Users\muham\OneDrive\Documents\Caeorta_App\` (empty stub) — destructive, awaiting go-ahead.
- `.gitattributes` for line-ending consistency (Week 1, alongside ESLint/Prettier).
- `git config --global user.name` (currently empty); decide whether to switch `user.email` to GitHub no-reply.
- Update Git from 2.37.1 to current (silences `credential-manager` deprecation stderr noise).
- Remove the obsolete `Expo CLI` line from `docs/08_12_Week_Action_Plan.md` Section 0 tooling checklist (modern Expo uses `npx expo`).
- Long-term: move PowerShell `$PROFILE` out of OneDrive-redirected Documents.
- Section 0 doc items still in checklist (preserved as history) — confirm with Platform founder which of those are physically true, and consider replacing checkbox states with checkmarks in a future cleanup pass.

**Notes / lessons:**
- The Edit tool tracks file state per absolute path. After copying files to `C:\Code\caeorta_app\`, even copies of files I'd read earlier (at the OneDrive path or the real-Documents path) required a fresh Read at the new path before Edit would accept them.
- When a founder provides a structured list of doc edits with exact text, the right move is to match their text verbatim and flag contradictions separately, not to smooth conflicts silently. Doing so preserves their authorship over the project's source of truth.
- Section 0 status block style — "summary at top, original checklist preserved below" — is a useful pattern for converting checklist docs into living state docs without losing history. Worth reusing for future week-end retros.

---

### 2026-05-15 — GitHub auth swap + Week 0 soft blockers (session 3)

**Goal of session:** Switch VS Code's GitHub auth to the correct account, verify push, and clear App-founder soft blockers from session-1/2 open items so Week 1 can start cleanly.

**Done:**
- gh CLI confirmed already authed as `MuhammedRaslan`. Surfaced an org change the docs hadn't caught up to: `Caeorta-AI` is no longer accessible to MuhammedRaslan; a new org `Caeorta-io` has been created and MuhammedRaslan has been granted access.
- VS Code GitHub session refreshed (sign-out + sign-in) as `MuhammedRaslan`.
- Git global identity set: `user.name = "Muhammed Raslan"`, `user.email = muhammedraslanthalassery@gmail.com`. Repo-scoped `Muhammed_Raslan` (underscore) continues to override commits inside this repo, as session 1 set up.
- `.gitattributes` added at repo root: LF normalization for source files; CRLF kept for `*.ps1`/`*.psm1`/`*.psd1`/`*.bat`/`*.cmd`; lock files marked `linguist-generated` with `-merge` so they collapse in PR diffs; explicit binary list for assets, fonts, and mobile signing material.
- CLAUDE.md doc-path references fixed (11 references): `docs/##-name-with-dashes.md` (which didn't exist on disk) → `docs/##_Capitalized_Underscored.md` (the actual filenames). Closes the inconsistency flagged in session 1.
- `docs/08_12_Week_Action_Plan.md` Section 0:
  - Obsolete `Expo CLI` tooling-checklist line struck through with reason (`**OBSOLETE (Expo SDK 50+ uses ``npx expo``; no global install needed):** ~~Expo CLI~~`), matching the strikethrough-with-reason style used for deferred iOS items.
  - Working path in the status block updated to current App-founder path.
- Org rename `Caeorta-AI` → `Caeorta-io` applied to `README.md` clone URL, `docs/01_Project_Identity.md` Stage section, `docs/04_Repository_Structure.md` line 5, and `docs/08_12_Week_Action_Plan.md` Section 0 status block.
- Workdiary: Repository facts updated (new org slug + new working path with provenance notes); two new decisions-log rows added (2026-05-15) for the rename and the path change. Historical session 1 / session 2 diary entries left intact — they record events of 2026-05-13 and shouldn't be retconned.
- Old `Caeorta-AI/caeorta_app` returns 404 from MuhammedRaslan's view. Created fresh `Caeorta-io/caeorta_app` (private). Pushed local main (4 prior commits) as initial remote main; cut `chore/week0-soft-blockers` from main; committed all the above as `a6d6e85`; pushed branch.
- PR #1 opened against `Caeorta-io/caeorta_app:main`, authored by `MuhammedRaslan` (verified via GitHub API). Ready for Sulaiman to review and squash-merge.

**Tools / versions touched (no inventory changes; harness-shell caveats noted):**
- The Claude Code harness shell doesn't auto-load fnm via `$PROFILE`, so it resolved `node` to the legacy system Node 24 (`C:\Program Files\nodejs\node.exe`) and couldn't find `pnpm` at all. Founder's interactive PowerShell with `$PROFILE` should still see fnm-managed Node 22.22.2 / pnpm 11.1.1 per session 1. **Verification step for founders: run `node --version` and `pnpm --version` in a fresh PowerShell window to confirm.**
- Git 2.37.1 still emits `git: 'credential-manager' is not a git command` on push. Benign; push succeeds. Tracked since session 1.

**Files / commits:**
- Branch `chore/week0-soft-blockers`, commit `a6d6e85`: `.gitattributes` (new), `CLAUDE.md`, `README.md`, `docs/01_Project_Identity.md`, `docs/04_Repository_Structure.md`, `docs/08_12_Week_Action_Plan.md`, `docs/workdiary.md` (Repository facts + decisions log only).
- This session-3 diary entry committed in a follow-up on the same branch.
- PR #1: https://github.com/Caeorta-io/caeorta_app/pull/1

**Decisions taken (also in Decisions log):**
- 2026-05-15 — GitHub org renamed from `Caeorta-AI` to `Caeorta-io`. Repo recreated; local history pushed as new initial main.
- 2026-05-15 — App founder's working path updated to `c:\Users\muham\Documents\#1_Caeorta_dev\caeorta_app` (was `C:\Code\caeorta_app` per session 1). Reason for the move TBD by founder.

**Open items rolled forward:**
- **Branch protection on `main` unavailable** on `Caeorta-io` under GitHub Free for private repos (`403 — Upgrade to GitHub Pro`). Convention-only enforcement per CLAUDE.md ("no direct commits to main except in emergencies") for now. Revisit when team scales or paid plan is otherwise justified.
- Update Git from 2.37.1 to current (silences `credential-manager` deprecation noise on every push). `winget upgrade Git.Git` at convenience.
- Google Play Console ($25 one-time) — blocker for Week 10 Play Internal Testing; aim to activate by end of Week 9.
- Designer kickoff brief — send ≥48h before Week 1 designer session.
- AI Agent Contract v0 — Week 1 deliverable.
- Working-agreement decisions still pending: daily 15-min sync time, Friday 60-min retro time, branch strategy + PR review cadence, GitHub Issues + project board setup.
- WhatsApp Business account setup.
- Cleanup of `C:\Users\muham\Documents\Caeorta_App\` (original source) and `C:\Users\muham\OneDrive\Documents\Caeorta_App\` (empty stub) — destructive, still awaiting explicit go-ahead.
- Long-term: move PowerShell `$PROFILE` out of OneDrive-redirected Documents.
- Section 0 doc checklist items (preserved as history below the status block) — Platform founder confirmation of which are physically true; consider a future cleanup pass to checkmark them.

**Notes / lessons:**
- **PowerShell 5.1 + native `git` + `@'...'@` here-strings is unreliable when the message body contains double quotes.** Embedded `"Expo CLI"` terminated `-m` early; git interpreted the remainder as pathspecs and errored with `error: pathspec '...' did not match any file(s)`. Fix that always works: write the message to a file inside `.git/` (untracked by definition) and run `git commit -F .git/COMMIT_MSG.txt`. Same trick for PR bodies with `gh pr create --body-file`. Worth adopting as the default for any non-trivial multi-line message on Windows.
- When external state (org slug, working path) drifts away from what living docs say, fold the doc fixes into whatever PR is already touching docs. Keeps `main` internally consistent and avoids a churny follow-up PR. Historical narration in dated diary entries stays as-is — it's a record of what happened, not a description of current state.
- Branch protection on GitHub private repos requires a paid plan. Worth knowing before assuming "main is protected" as part of the workflow — at Caeorta's current scale, the two-founder PR-review convention is the enforcement mechanism, not GitHub rules.
- Old org was 404 from the new account's view (not visible, not transferable, no admin access). For session 1's record-keeping discipline this is a useful lesson: when an org is recreated/renamed, the previous remote URL is dead from the new identity's perspective, and the cleanest recovery is a fresh `gh repo create --source=. --push` after removing the stale `origin` — local history is preserved end-to-end because the commits never lived on the dead remote, only on local + the dead remote.

---

### 2026-06-02 — Founder split reframe (session 4)

**Goal of session:** Reframe the founder split across project docs to reflect reality — Muhammed Raslan is the sole code author for `caeorta_app`; Sulaiman Shiyas Ali is co-founder, owns Platform-area decisions, and reviews PRs but does not author code in this repo. Two-role accountability preserved; only the execution model changes.

**Done:**
- Reviewed all six explicitly-listed files (`docs/01`, `02`, `04`, `08`, `workdiary`, `CLAUDE.md`) plus spot-checked the auxiliary docs (`05`, `06`, `07`, `09`, `10`) for two-founder execution language. Surfaced findings outside the original scope before editing: `README.md`, `docs/00_README.md`, `docs/05_Database_Schema.md` (pg_dump), `docs/09_Risks_And_Mitigations.md` (R14 entire risk, plus R15 and R16 mitigations), and a handful of `docs/04` lines (local dev env, version-pinning rationale, CLAUDE.md sharing). Founder approved expanded scope to fold all of these into one PR.
- Reframed 10 files in total in commit `06014f1`:
  - `CLAUDE.md` — "talking to one of two co-founders" → explicit Muhammed-as-sole-author; PR-review line names Sulaiman.
  - `README.md` — getting-started + PR conventions lines.
  - `docs/00_README.md` — "Who" line.
  - `docs/01_Project_Identity.md` — Founders section adds execution clarifier; Stage section reworded (Sulaiman has GitHub web access for PR review, not a local clone).
  - `docs/02_Working_Agreements.md` — Founder constraints section. Intentionally left the "Two people, full-time, 12-week target" line untouched; honest team-size-vs-timeline retro is a separate conversation.
  - `docs/04_Repository_Structure.md` — branch strategy, local dev env, version pinning rationale, CLAUDE.md sharing rationale, local dev checklist heading.
  - `docs/05_Database_Schema.md` — pg_dump backup line names Sulaiman explicitly (he owns Supabase admin access).
  - `docs/08_12_Week_Action_Plan.md` — role-split header (adds explicit "Execution model" statement), Section 0 status block, Section 0 tools heading, Week 1 annotation `> Note` callout that applies implicitly to all weeks, Week 1 Definition of Done, Week 8 `### Both, splitting screens` → `### App founder` (only Week-level "Both" that assumed dual coding), Operational rhythms (PR cadence + reviewer/merger split).
  - `docs/09_Risks_And_Mitigations.md` — R14 rewritten in place from "Two founders' coding styles diverge" to "Sole code author for caeorta_app — bus factor / unavailability." R15 risk description and mitigation, and R16 mitigation, also reworded.
  - `docs/workdiary.md` — Repository facts Founder roles rewritten; commit-identities updated (the now-stale "global user.name currently empty" was corrected to record the 2026-05-15 set value); decisions-log row added (2026-06-02).
- PR #2 stacked on PR #1's `chore/week0-soft-blockers` because PR #1 was still open. Stacking kept the per-PR diff clean and made GitHub auto-collapse the diff once PR #1 merged.
- Both PRs merged: PR #1 went in as fast-forward / rebase-merge (individual commits `a6d6e85`, `da0b2f4` on main); PR #2 came in via a merge commit (`0dd69f5 Merge pull request #2 ...`). Deviation from the squash-merge convention in `CLAUDE.md` / `docs/04` — flagged in this session's notes; fixable by restricting allowed merge strategies in the GitHub repo settings.

**Tools / versions touched:** none — docs only. Tool inventory unchanged.

**Files / commits:**
- Branch `docs/reframe-founder-split` → PR #2: https://github.com/Caeorta-io/caeorta_app/pull/2
- Commit `06014f1 docs: reframe founder split - Muhammed sole code author, Sulaiman PR reviewer`
- Merge commit `0dd69f5 Merge pull request #2 from Caeorta-io/docs/reframe-founder-split`
- This session-4 entry committed on `docs/session-4-workdiary` (separate small PR; couldn't add to the merged PR after the fact).

**Decisions taken (also in Decisions log, row added in the merged PR):**
- 2026-06-02 — Execution model clarified: Muhammed is sole code author for caeorta_app; Sulaiman reviews PRs and owns Platform-area decisions. Role accountability (App vs Platform) preserved; only the execution split changes.

**Open items rolled forward:**
- **Repo settings:** Enable "Allow squash merging only" in Caeorta-io/caeorta_app Settings → General → Pull Requests, so the squash-merge convention can't be deviated from accidentally. Branch protection on `main` itself is still unavailable on Free plan.
- **Merged-branch cleanup:** Local and remote branches `chore/week0-soft-blockers` and `docs/reframe-founder-split` still exist; both can be deleted now that their PRs are merged. Destructive; awaiting explicit go-ahead. Suggested commands recorded in session 4 conversation.
- **R14 mitigation work-out:** The new "sole code author bus factor" R14 lists mitigations that don't yet exist as artifacts — particularly the EAS Update + EAS Build emergency-release runbook for Sulaiman. Track as a Week-1-or-2 follow-up so the mitigation is real, not just listed.
- Update Git from 2.37.1 to current (still emitting `credential-manager` deprecation noise on every push).
- Google Play Console ($25 one-time) — pre-Week 10.
- Designer kickoff brief — send ≥48h before Week 1 designer session.
- AI Agent Contract v0 — Week 1 deliverable.
- Working-agreement decisions still pending: daily 15-min sync time, Friday 60-min retro time, GitHub Issues + project board setup.
- WhatsApp Business account setup.
- Cleanup of `C:\Users\muham\Documents\Caeorta_App\` (original source) and `C:\Users\muham\OneDrive\Documents\Caeorta_App\` (empty stub) — destructive, still awaiting go-ahead.
- Long-term: move PowerShell `$PROFILE` out of OneDrive-redirected Documents.
- Section 0 doc checklist items (preserved as history below the status block) — confirm with Sulaiman which are physically true; consider checkmarking in a future cleanup pass.

**Notes / lessons:**
- **Stacked PRs work, even on a private repo without branch protection.** Cutting PR #2 off PR #1's branch (rather than `main`) kept each PR's diff focused on its own changes. Once PR #1 merged, PR #2's diff auto-collapsed. Worth using again whenever a follow-up touches the same files as an in-flight PR. The cost is a dependency: PR #2 can't merge before PR #1 (or before #1's content lands on main some other way).
- **Rewriting a numbered risk in place** (R14: "Two founders' coding styles diverge" → "Sole code author bus factor") preserved the risk register slot while killing the obsolete framing. Used the Status line to record the rewrite date and what the old text said, so the audit trail isn't lost. Pattern reusable for any risk whose framing breaks when reality shifts.
- **Squash-merge convention isn't enforced by GitHub Free private repos.** Both merge strategies (merge commit, rebase) were available at click time. The "Squash merge into main" convention in `CLAUDE.md` / `docs/04` was honored in spirit (both PRs in cleanly) but not in mechanism. The fix is in repo Settings, not in process discipline; restricting allowed merge strategies removes the deviation surface entirely.
- **Fact-level mentions of "two founders" are not the same as execution claims.** When sweeping for two-author language, found ~6 mentions that describe shared access or shared usage rather than dual coding (1Password vault, Expo org membership, admin dashboard users, EAS access, Cursor pricing, cross-cutting agreement requirement). Left them in place. Worth distinguishing in future sweeps — `both founders` in the predicate (do X) is usually wrong under the new model; `both founders` as subject of access/usage is usually fine.

---

### 2026-06-02 (later same day) — Dev Supabase link + extensions migration + Realtime smoke (session 5)

**Goal of session:** Link the Supabase CLI on the App founder's machine to dev (defer prod), enable the four Postgres extensions on dev via a migration, and run a Realtime smoke test against dev. Light Week-1 prep work; nothing schema-substantive.

**Done:**
- **Tool versions matched the inventory exactly.** Node 22.22.2, pnpm 11.1.1, supabase 2.98.2. Same harness-shell caveat as session 3: the assistant's PowerShell doesn't auto-load fnm via `$PROFILE`, so every command needed `fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression; fnm use 22 | Out-Null` inlined. App founder's interactive PowerShell still resolves correctly.
- `pnpm install` at root — no-op against the zero-dep workspace. `pnpm-lock.yaml` got generated locally but was intentionally not committed; it'll come in with the first real dep.
- **Supabase CLI authenticated and linked to dev.** App founder ran `supabase login` interactively in their own terminal (browser OAuth flow, no token in chat). Assistant ran `supabase link --project-ref pseksdzkrimtzamcuzzh` against `caeorta-dev` (Mumbai). `supabase projects list` shows `caeorta-dev` marked LINKED and `caeorta-prod` (ref `blfovbkrkrgyrzkuycxr`, also Mumbai) listed but not linked — prod link deferred to later this week per founder instruction.
- **Extensions migration applied to dev.** Wrote `supabase/migrations/20260602125801_enable_extensions.sql` with the four `CREATE EXTENSION IF NOT EXISTS` statements from `docs/05_Database_Schema.md` § Extensions. `supabase db push --linked --dry-run` showed the single migration; `supabase db push --linked` (no dry-run) applied cleanly. **pg_cron did NOT need the Dashboard fallback the docs warn about** — Supabase managed permitted the `CREATE EXTENSION` via SQL with the project's `postgres` role. pgcrypto reported `42710 already exists, skipping` (Supabase preinstalls it; the `IF NOT EXISTS` clause handled it). Verified via Dashboard SQL `SELECT extname, extversion FROM pg_extension`: pgcrypto 1.3, pg_cron 1.6.4, pg_trgm 1.6, vector (pgvector) 0.8.0. `supabase migration list --linked` shows Local == Remote at `20260602125801`.
- **Added `supabase/.gitignore`** with `.temp/` and `.branches/` so the CLI's per-machine scratch (linked-project state, version probes, pooler URL) stays out of git. Did not run `supabase init` — `supabase db push --linked` doesn't require `config.toml`; it uses `supabase/.temp/linked-project.json` instead.
- **Realtime smoke test passed.** App founder created `_realtime_smoke` table in dev via Dashboard SQL editor + `ALTER PUBLICATION supabase_realtime ADD TABLE _realtime_smoke`. Assistant installed `@supabase/supabase-js` in `%TEMP%\caeorta-realtime-smoke\` (out-of-repo, no pollution), wrote a 30-line `subscribe.mjs` script using the dev publishable key, ran it as a background process. Subscription reached `SUBSCRIBED` at 0.48s; INSERT delivered to the client at 25.59s of script lifetime with full payload `{"id":2,"msg":"hello from smoke test","inserted_at":"2026-06-02T07:53:45.168574+00:00"}`. Eyeball latency: indistinguishable from instant. Temp dir wiped after.
- **PR #4 opened.** `feat/enable-extensions` → `main`, branched off `origin/main` (not stacked on PR #3 — the migration is unrelated to the session-4 workdiary entry, no benefit to stacking). Commit `54f4018 feat(db): enable pgcrypto, pg_cron, pgvector, pg_trgm extensions`, two files, ten lines: the migration and `supabase/.gitignore`.

**Tools / versions touched:** None — no installs/upgrades/replacements. Inventory table unchanged. Two upgrades surfaced for a future tooling pass: supabase CLI 2.98.2 → 2.104.0, pnpm 11.1.1 → 11.5.0.

**Files / commits:**
- Branch `feat/enable-extensions`, commit `54f4018` — `supabase/.gitignore` (new), `supabase/migrations/20260602125801_enable_extensions.sql` (new). PR #4 against `main`.
- This session-5 diary entry committed on `docs/session-5-workdiary`, stacked on `docs/session-4-workdiary` (PR #3, still OPEN) because both touch this file. PR #5 targets `main`; diff auto-collapses to just the session-5 entry once PR #3 merges.

**Decisions taken:** None this session — pure execution against existing decisions (Supabase, the extensions list, the migration discipline).

**Open items rolled forward:**
- **Drop temp table on dev** — App founder action: `DROP TABLE _realtime_smoke;` in Dashboard SQL editor. Surfaced mid-session; awaiting confirmation that it actually happened. Not load-bearing (table is small, RLS-default), but a clean-up loose end.
- **Sulaiman review queue:** PR #3 (session-4 workdiary, OPEN since 2026-06-02 07:00 UTC), PR #4 (extensions migration, OPEN since 2026-06-02 13:xx UTC), PR #5 (this entry).
- **Promote extensions migration to prod.** Link CLI to `caeorta-prod` (ref `blfovbkrkrgyrzkuycxr`), `supabase db push --linked`, verify with the same `SELECT FROM pg_extension`. Targeted later this week (Week 0 wrap, pre-Week-1).
- **Possible doc edit:** `docs/05_Database_Schema.md` § Extensions — the assistant's task brief had a defensive note about pg_cron possibly needing a Dashboard fallback. Reality: it didn't. The schema doc itself doesn't carry that caveat (the doc just lists the four), so no change required. Lesson logged below for future task briefs.
- **Repo settings:** "Allow squash merging only" still not set on `Caeorta-io/caeorta_app` (session-4 carry-over). Branch protection on `main` still requires a paid plan.
- **Merged-branch cleanup:** `chore/week0-soft-blockers`, `docs/reframe-founder-split` still unpurged locally and remotely. After this session also: `docs/session-4-workdiary`, `docs/session-5-workdiary`, `feat/enable-extensions` once merged. Destructive, awaiting explicit go-ahead.
- **R14 mitigation work-out:** EAS Update / EAS Build emergency-release runbook for Sulaiman. Still a paper mitigation.
- Supabase CLI 2.98.2 → 2.104.0 — bundle with future tooling pass.
- pnpm 11.1.1 → 11.5.0 — bundle similarly.
- Update Git from 2.37.1 to current (still emitting `credential-manager` deprecation noise on every push; session-1 origin).
- Google Play Console ($25 one-time) — pre-Week 10.
- Designer kickoff brief — pre-Week 1.
- AI Agent Contract v0 — Week 1 deliverable.
- Working-agreement decisions still pending: daily 15-min sync time, Friday 60-min retro time, GitHub Issues + project board.
- WhatsApp Business account setup.
- Cleanup of `C:\Users\muham\Documents\Caeorta_App\` (original source) and `C:\Users\muham\OneDrive\Documents\Caeorta_App\` (empty stub) — destructive, awaiting go-ahead.
- Long-term: move PowerShell `$PROFILE` out of OneDrive-redirected Documents.
- Section 0 doc checklist items physical-truth pass with Sulaiman.

**Notes / lessons:**
- **pg_cron on Supabase managed enables via migration without superuser fuss.** The "you may need Dashboard fallback" warning in the task brief turned out to be unnecessary — Supabase grants the project `postgres` role enough to enable pg_cron via SQL, so it slots into a normal migration. Worth remembering when writing future task briefs: don't pre-warn about a Supabase-managed superuser limitation that the managed plan actually handles for you. Defensive caveats have a cost; they bias execution toward Dashboard side-channels that won't reproduce in CI.
- **Supabase's new `sb_publishable_...` key works transparently with supabase-js v2.** The dev project's Settings → API panel now exposes the publishable+secret key pair (not the legacy `anon` + `service_role` JWTs). The supabase-js Realtime client accepted the publishable key without configuration changes; websocket auth succeeded and INSERT events flowed to the client. For docs that still reference the anon key (e.g., `docs/04_Repository_Structure.md` env-var sections naming `EXPO_PUBLIC_SUPABASE_ANON_KEY`), the env-var name can stay — the *value* is just the publishable key. No doc edit needed yet; flag if Supabase ever sunsets the old name.
- **Out-of-repo temp dir for one-off scripts that pull deps.** Installing `@supabase/supabase-js` in `%TEMP%\caeorta-realtime-smoke\` kept the repo clean: no incidental `package.json` change, no pnpm-lock churn, no node_modules tracked or to `.gitignore`. Cleanup was `Remove-Item -Recurse -Force` on one directory. Reusable for any future one-off verification that pulls deps but shouldn't live in the repo. (For verifications using only the standard library or pre-installed tools, no temp dir needed — write straight into `%TEMP%` directly.)
- **`run_in_background` + tailable output file is a clean async pattern.** Spawning the subscribe script in background and tailing its output file (`Read` mid-run) made human-in-the-loop timing painless: assistant could confirm "SUBSCRIBED" was reached before asking App founder to INSERT, and the script's exit notification triggered cleanup. Cheaper than polling.
- **Human-in-the-loop async tests need ≥90s of runway, not 60s.** First subscribe run had a 60s window that closed before App founder's first INSERT landed in chat (their first SQL block had errored on a second invocation — recovery took longer than expected). The second run bumped to 120s caught the event cleanly at 25.59s. Lesson: when an external human action is on the critical path of a smoke test, default the listener to ≥120s and let it idle if the action completes early. Re-running was cheap because the script + temp dir survived; just bumped `RUN_MS` and re-launched.
- **`supabase link` doesn't run a full `supabase init` scaffold.** It creates only `supabase/.temp/` with linked-project state. `supabase db push --linked` is happy with that — it doesn't need `config.toml`. If we later want `supabase functions serve` locally, or seed-data scaffolding, we'll need `supabase init` separately. Adding `supabase/.gitignore` manually now should merge cleanly with a future `supabase init`.
- **Re-staging the same task brief for a different shell.** Two of this session's pre-flight steps (versions check, then every supabase call) had to re-run `fnm env … | Invoke-Expression; fnm use 22` because PowerShell state doesn't persist between Bash-tool invocations. This is identical to session 3's harness-shell observation; it's just now load-bearing on every CLI tool call rather than a one-time gotcha. Two reasonable long-term fixes: (a) install fnm-managed Node at a path the harness shell finds without `$PROFILE`, or (b) accept the inline-init pattern as standard. Doing (b) for now; revisit if it becomes annoying.

---

### 2026-06-02 (later same day) — Initial v1 schema migration (session 6)

**Goal of session:** Write the initial Supabase migration creating the v1 schema per `docs/05_Database_Schema.md`, apply to dev, generate TypeScript types, commit.

**Done:**
- **Sanity-checked the four extensions** from session 5 are still applied on dev via `supabase migration list --linked` (Remote: `20260602125801`). Skipped a direct `SELECT FROM pg_extension` because PowerShell BOM-prefixed every `supabase db query` stdin attempt; the migration-list ack was sufficient.
- **Surfaced two gaps in `docs/05_Database_Schema.md` before writing SQL** (per CLAUDE.md "schema doc is the spec; surface gaps"):
  - **Q1: v2 placeholder shape** — `vehicle_modifications` and the six community tables (`posts`, `comments`, `groups`, `group_members`, `events`, `event_attendees`) have no columns listed; doc says "Detailed schema deferred to v2 planning." App founder picked **minimum: id PK + key FKs + `created_at` only**. v2 adds domain columns via additive migrations.
  - **Q2: branch base** — extensions migration (PR #4) is still open against `main`. Picked **stack on `feat/enable-extensions`**; same pattern session 4/5 used. PR #6 base = `feat/enable-extensions`; auto-rebases to `main` once PR #4 merges.
- **Wrote `supabase/migrations/20260602130000_initial_schema.sql`** (~256 lines). Creation order respects FK dependencies (users → devices → vehicles → sync_sessions → telemetry, drives before diagnostic_outputs, etc.) while preserving the doc's logical groupings as section headers. Conventions: `gen_random_uuid()` defaults on all UUID PKs except `users.id` (mirrors `auth.users.id`); `timestamptz` everywhere; explicit `ON DELETE` on every FK; `CHECK` constraints on enum-like text columns (`severity`, `urgency`, `category`, `status`, `ecu_type`, `platform`, `rating`, `notification_severity_threshold`, `type`) plus `confidence BETWEEN 0 AND 1`; one-line `COMMENT ON TABLE` per table using the doc's own language.
- **One shared trigger function** `public.set_updated_at()` attached to the four tables with auto-updated `updated_at`: `users`, `user_preferences`, `current_state`, `agent_status`. Other "last_*_at" columns are not auto-updated (they're explicit application writes).
- **Dry-run** showed only the new file would be pushed (no DROPs). `supabase db push --linked` applied cleanly in well under 30 seconds.
- **Verified on dev:** **26 tables**, **36 indexes**. All 10 explicit indexes from the doc's Indexing strategy section present by exact name. Tables list confirmed against the schema doc's section headers.
- **Generated `packages/supabase/src/database.types.ts`** via `supabase gen types typescript --linked`. First attempt collapsed to one line because PowerShell concatenates strings to arrays without preserving newlines; fix was `cmd /c "supabase gen types ... > $tmp"` to redirect cleanly, then `File.ReadAllText` + `File.WriteAllText` with explicit UTF-8 no-BOM. Final file: 32055 bytes, 1146 lines. Header comment in place. Spot-checked `Database['public']['Tables']['diagnostic_outputs' | 'telemetry' | 'users' | 'vehicles']` — all columns and FK relationships match the schema doc.
- **Doc deviation reconciled in the same PR:** `app_versions.version` was listed as PK alone, but the same version ships on both stores (iOS + Android), so a `version`-only PK conflicts. Made PK composite `(version, platform)` and updated `docs/05_Database_Schema.md` Notes column to match. Flagged in PR #6 description for explicit reviewer attention.
- **PR #6 opened**: `feat/initial-schema` → `feat/enable-extensions` → `main`. One commit, message per task brief: `feat(db): initial schema migration for v1 (all tables, indexes, updated_at triggers)`. PR description calls out the FK ON DELETE rationale, the `app_versions` PK change, and that Sulaiman should review schema correctness and FK behavior — not the generated types file verbatim.

**Tools / versions touched:** None. Inventory unchanged. Same upgrade backlog as session 5 (supabase CLI 2.98.2 → 2.104.0; pnpm 11.1.1 → 11.5.0). The harness-shell `fnm`-not-auto-loaded pattern from session 5 is now a fixture; every `supabase`/`node` call inlines `fnm env … | Out-String | Invoke-Expression; fnm use 22 | Out-Null`.

**Files / commits:**
- Branch `feat/initial-schema`, commit `63d9029` — `supabase/migrations/20260602130000_initial_schema.sql` (new), `packages/supabase/src/database.types.ts` (new), `docs/05_Database_Schema.md` (1-line PK fix in `app_versions`).
- PR #6: https://github.com/Caeorta-io/caeorta_app/pull/6 (base `feat/enable-extensions`, depends on PR #4 merging first).
- This session-6 diary entry committed on `docs/session-6-workdiary`, stacked on `docs/session-5-workdiary` (PR #5, still OPEN). Same stacking discipline as session 4 → session 5 → session 6.

**Decisions taken (also in Decisions log):**
- 2026-06-02 — `app_versions` PK changed from `(version)` to `(version, platform)`. Doc fix shipped with the migration.
- 2026-06-02 — v2 community placeholders (six tables) + `vehicle_modifications` shipped with minimum identity-only shape; columns deferred to additive v2 migrations.

**Open items rolled forward:**
- **Sulaiman review queue grew:** PR #3 (session-4 workdiary, OPEN), PR #4 (extensions migration, OPEN), PR #5 (session-5 workdiary, OPEN, stacked on #3), PR #6 (initial schema, OPEN, stacked on #4), this PR #7 (session-6 workdiary, stacked on #5). Recommend merge order #3 → #5 → #7 (workdiary stack) and #4 → #6 (schema stack), in either interleaving — the two stacks don't touch each other's files.
- **RLS policies migration** — separate migration this week per task brief scope. Mirrors the patterns in `docs/05_Database_Schema.md` § RLS Philosophy.
- **`agent_role` Postgres read-only role** — separate migration, paired with RLS work.
- **Promote initial schema to prod** — link CLI to `caeorta-prod` (ref `blfovbkrkrgyrzkuycxr`), `supabase db push --linked`, verify same 26-table / 36-index totals.
- **`pg_cron` downsampling job + retention DELETEs** — Week 4 work, not part of this week's schema sprint.
- **Long-running carry-overs (unchanged from session 5):** repo "squash merge only" setting, branch protection on Free plan, supabase CLI / pnpm / git upgrades, Google Play Console pre-Week-10, designer kickoff, AI Agent Contract v0, working-agreement decisions, WhatsApp Business, source-folder cleanup (destructive, awaiting go-ahead), PowerShell `$PROFILE` move out of OneDrive, Section 0 doc checklist physical-truth pass.

**Notes / lessons:**
- **`supabase gen types typescript` output and PowerShell string-array concatenation don't mix.** First types-file generation collapsed `\n` into spaces because `$x = & supabase ...` makes `$x` a `string[]` and `$header + $x` flattens to one line. The fix: redirect stdout from inside `cmd /c`, then `File.ReadAllText` + `File.WriteAllText`. Always write generated multi-line text via direct file redirection on Windows; don't capture into PowerShell variables for re-emission.
- **Sane FK ON DELETE rules come from "would I want this row to outlive its parent?"** Child-of-parent rows (telemetry of vehicle, comments of post) are `CASCADE` — they have no meaning without the parent. Provenance refs (telemetry pointing back at its sync session, DTC pointing at the user who cleared it, audit log pointing at the actor) are `SET NULL` — the row's primary value is in its own data, the FK is just lineage. `vehicles.device_id` is `RESTRICT` because both rows are first-class entities and deletion should be an explicit pairing change, not a cascade side-effect. This three-bucket framing made every FK call obvious; worth keeping as a mental model when extending schema.
- **Stacked-PR ordering scales fine to 4+ open PRs as long as the two stacks don't touch each other's files.** Workdiary stack (PR #3 → #5 → this #7) and schema stack (PR #4 → #6) live in completely different parts of the tree; merge order between the two stacks doesn't matter. The cost is bookkeeping in PR descriptions ("merge PR #X first"); the benefit is no single PR carries unrelated changes.
- **Surfacing schema-doc gaps via `AskUserQuestion` paid off.** The placeholder-shape question (minimum vs. provisional v2 columns) had a real downside — provisional columns risk a destructive v2 migration, violating principle 6 of the schema doc. App founder confirmed "minimum" was right; without the question, I might have guessed plausible v2 columns and silently locked us in. Lesson: when the spec literally says "deferred to v2 planning," that's a question, not a license to invent.
- **`COMMENT ON TABLE` is a useful place to store the doc's own language verbatim.** `pg_description` is queryable from Postgres tooling, ORMs, and the Dashboard; the doc text follows the schema into every consumer surface. Worth keeping the comments updated as the schema doc evolves — they're a no-effort companion to whatever the doc says.

---

### 2026-06-02 (later same day) — RLS policies migration (session 7)

**Goal of session:** Write the second migration — RLS policies for all v1 tables per the three-actor model (authenticated user / service role / device JWT) in `docs/05_Database_Schema.md` § RLS Philosophy — and verify behavior on dev to the extent possible without `mint_device_token`.

**Done:**
- **Two clarifying questions surfaced before writing SQL**, both answered "Recommended":
  - **Q1: `devices` UPDATE column scope.** Brief says "UPDATE limited fields by owner"; Postgres RLS is row-level. Picked row-level only with a flag — column-level `GRANT/REVOKE` deferred to a Week-2 follow-up once `mint_device_token` + Edge Function column-write contract firms up. Logged in the decisions table above.
  - **Q2: community placeholders RLS posture.** Brief says "skip community placeholders"; literal skip would leave them readable/writable by any authenticated user via PostgREST. Picked `ENABLE ROW LEVEL SECURITY` with no policies (deny-all to non-service-role) as defense-in-depth. Logged in the decisions table above.
- **Wrote `supabase/migrations/20260602150000_rls_policies.sql`** (~504 lines). Source of truth comment block at the top names the three actors, the provisional `device_id` JWT claim format (finalized Week 2 with `mint_device_token`), and the two deferred items (`agent_role`, community-placeholder policies). Policies follow the schema doc's naming convention (`<actor>_<action>_<scope>_<table>` mostly; some shortened where unambiguous). `TO authenticated` on owner-facing policies; `TO authenticated, anon` for `app_versions` SELECT (force-update check pre-login); no `TO` for `firmware_versions` (defaults closed to all but the listed `authenticated` policy). Device JWT pattern uses `auth.jwt() ->> 'device_id'` exactly as the schema doc samples. `current_state` UPSERT path covered by paired INSERT-WITH-CHECK + UPDATE-USING+WITH-CHECK policies.
- **Coverage**: 19 active v1 tables get explicit policies (1–4 each, matching SEL/INS/UPD/DEL coverage in the brief); 6 community placeholders get RLS-on / zero-policies; `audit_log` gets RLS-on / zero-policies (service-role-only by design). Total: 26 tables RLS-enabled.
- **Dry-run + push applied cleanly on dev** (`supabase db push --linked`); `supabase migration list --linked` shows Local == Remote at `20260602150000`.
- **Pg-side verification via `supabase db query --linked -f <file>`** (single-result-set Management API; restructured tests into one collected `rls_results` temp table to return all outcomes in one SELECT after a first-pass attempt returned only the last query's result):
  - `pg_tables.rowsecurity` = true on all 26 tables.
  - `pg_policies` count per table matches the brief: `users`/`vehicles`/`devices` = SEL+INS+UPD (3, with INS being `WITH CHECK (false)`); `current_state`/`sync_sessions`/`dtcs`/`user_preferences` = SEL+INS+UPD (3, no delete); `device_wifi_credentials`/`device_push_tokens`/`diagnostic_feedback`/`vehicle_modifications` = full CRUD (4); `device_events`/`telemetry`/`feedback` = SEL+INS (2); `agent_status`/`drives`/`diagnostic_outputs`/`app_versions`/`firmware_versions` = SEL only (1, writes service-role); `audit_log` + community placeholders = 0 policies.
  - **Seeded 3 fake users** (auth.users + public.users) with one vehicle each, fixed UUIDs `111…`/`222…`/`333…` and vehicle ids `aaa…1`/`aaa…2`/`aaa…3`. ON CONFLICT DO NOTHING so the script is idempotent. Left in place on dev — useful for Prompt-5 mobile-auth testing; real magic-link login will overwrite naturally.
  - **12-step isolation suite, all PASS:** user1/user2 SELECT scoping (1 row each, correct nickname), direct INSERT vehicles blocked (RLS violation on no_direct_insert), cross-user UPDATE returns 0 rows (RLS row-filter hides the row from the UPDATE), user1 SELECT users returns only own profile, anon SELECT app_versions allowed (no permission error), anon SELECT vehicles 0 rows, authenticated INSERT firmware_versions blocked, authenticated SELECT audit_log 0 rows, authenticated SELECT posts 0 rows (community deny-all), service-role/migration sees all 3 vehicles (bypass), user1 INSERT with `owner_user_id` = user2 blocked (WITH CHECK (false) catches the spoof too).
- **Deferred to Week 2** (documented in PR #8 description): device JWT INSERT/UPSERT path (`telemetry`, `current_state`, `sync_sessions`, `dtcs`, `device_events` INSERT) — needs `mint_device_token` to issue a real JWT with a `device_id` claim; cross-vehicle INSERT blocking via device JWT — same dependency; full `agent_role` read-only verification — separate migration.
- **PR #8 opened**: `feat/rls-policies` → `feat/initial-schema` → `main`. One commit. Conventional Commits message `feat(db): RLS policies for v1 tables`. PR description enumerates the 19 tables, lists the 12 verification steps with results, names the two deferred items, and flags the two devation decisions for Sulaiman's call.

**Tools / versions touched:** None — no installs/upgrades/replacements. Same upgrade backlog from sessions 5/6 (supabase CLI 2.98.2 → 2.104.0, pnpm 11.1.1 → 11.5.0). Same harness-shell `fnm`-not-auto-loaded pattern.

**Files / commits:**
- Branch `feat/rls-policies`, commit `032f8dd` — `supabase/migrations/20260602150000_rls_policies.sql` (new). PR #8 against `feat/initial-schema`.
- This session-7 diary entry committed on `docs/session-7-workdiary`, stacked on `docs/session-6-workdiary` (PR #7, still OPEN). Same stacking discipline as sessions 4 → 5 → 6.

**Decisions taken (also in Decisions log):**
- 2026-06-02 — Community placeholders get `ENABLE ROW LEVEL SECURITY` with no policies (deny-all to non-service-role), not literal RLS-off as the brief said. Defense-in-depth.
- 2026-06-02 — `devices` UPDATE policy is row-level only; column-level restriction deferred to a Week-2 follow-up migration once `mint_device_token` + Edge Function column-write contract firms up.

**Open items rolled forward:**
- **Sulaiman review queue:** PR #7 (session-6 workdiary, OPEN, stacked on #5 — but #3/#4/#5 already merged, so #7 base auto-rebases to main), PR #8 (RLS policies, OPEN, stacked on #6), this PR #9 (session-7 workdiary, stacked on #7). Recommend merge order: #7 → #9 (workdiary stack), and #6 → #8 (schema stack), interleaving free.
- **Promote RLS migration to prod** — link CLI to `caeorta-prod` (ref `blfovbkrkrgyrzkuycxr`), `supabase db push --linked`. Pair with the initial-schema prod promotion that session 6 rolled forward; do both in one prod-link session.
- **`devices` column-scope follow-up migration** — Week 2, after `mint_device_token` finalizes which columns device-vs-owner write. REVOKE UPDATE on the device-managed columns from `authenticated`; GRANT UPDATE on the owner-writable subset (likely just `status`).
- **Device JWT claim format finalization** — Week 2. If the claim name changes from `device_id`, every device-path policy in this migration needs a fixup migration.
- **`agent_role` Postgres read-only role** — separate migration, paired with AI Agent Contract v0.
- **Fake test users + vehicles on dev** — UUIDs `11111111-…`, `22222222-…`, `33333333-…`, vehicle ids `aaaaaaa1-…`, `aaaaaaa2-…`, `aaaaaaa3-…`. Left in place for Prompt-5 mobile-auth testing; magic-link login on the same emails (`rls-test-1@caeorta.local` etc.) will rotate them naturally. If they become a nuisance, `DELETE FROM auth.users WHERE email LIKE 'rls-test-%@caeorta.local'` cascades through `public.users` and `public.vehicles` cleanly.
- **`pg_cron` downsampling job + retention DELETEs** — Week 4.
- **Long-running carry-overs (unchanged from session 6):** repo "squash merge only" setting, branch protection on Free plan, supabase CLI / pnpm / git upgrades, Google Play Console pre-Week-10, designer kickoff, AI Agent Contract v0, working-agreement decisions, WhatsApp Business, source-folder cleanup (destructive, awaiting go-ahead), PowerShell `$PROFILE` move out of OneDrive, Section 0 doc checklist physical-truth pass.

**Notes / lessons:**
- **`supabase db query --linked` returns only the LAST result-set** (Management API, single envelope). Multi-statement scripts with several `SELECT` / `DO` blocks show only the final query's output, silently swallowing earlier results. Fix: collect everything into a temp table with `ON COMMIT DROP`, then a single trailing `SELECT * FROM temp_table ORDER BY step`. Worth standardizing for future RLS / data-shape verification scripts.
- **`SET LOCAL ROLE authenticated` inside a `DO` block affects everything until end of block.** Forgot to `RESET ROLE` before `INSERT INTO rls_results` on the first pass — permission denied for the temp table because `authenticated` didn't own it. Fix: always `RESET ROLE` before writing to verification-state tables. Cleaner pattern: do the role-scoped read into a variable, exit the role scope, then write the row.
- **The schema doc's "Sample RLS pattern" for telemetry uses a redundant JOIN** (`vehicles v JOIN devices d ON d.id = v.device_id WHERE d.id::text = auth.jwt() ->> 'device_id'`) that's equivalent to `WHERE v.device_id::text = auth.jwt() ->> 'device_id'`. Followed the schema doc's exact pattern verbatim to keep the migration matching the spec — if we want the simpler form later, do it everywhere at once for consistency. The brief explicitly asked to use the doc's pattern.
- **`WITH CHECK (false)` policies are clearer than no-INSERT-policy** for tables where INSERT is intentionally blocked. With RLS enabled, no-INSERT-policy also blocks INSERTs, but the explicit `WITH CHECK (false)` documents intent and shows up in `pg_policies`. Used for `users`, `vehicles`, `devices` — three tables where Edge Functions own the INSERT path.
- **PostgreSQL RLS row-level vs column-level distinction matters for spec interpretation.** The brief's "UPDATE limited fields by owner" reads like a column-level constraint, which RLS can't enforce directly. The judgment call (row-level now + flag, vs lock in column GRANTs before the device contract exists) is a real spec-vs-mechanism gap. Surfaced via AskUserQuestion before writing SQL — pattern repeats from session 6's placeholder shape question. When the brief implies a constraint Postgres RLS can't express alone, that's a question to surface, not a license to silently weaken the constraint.
- **Stacked-PR chain length is now five (PR #6, #7, #8, #9 open against various bases).** Each PR's base resolves to the previous in its chain; once a base merges, the child's base auto-rebases to main. No conflicts because the two stacks (workdiary vs schema) touch different file trees. Worth a brief sanity check before opening PR #10 (whenever it comes) — confirm GitHub still resolves the chain cleanly. If chain depth ever stalls reviews, an alternative is "merge then rebase the children" but that requires Sulaiman to merge in dependency order.

---

### 2026-06-03 — Week 1 working-pattern conventions captured (session 8)

**Goal of session:** Codify 13 working-pattern items that emerged across Week 1 sessions but weren't yet in `docs/`, so future Claude Code sessions inherit them without re-derivation.

**Done:**
- **Conflict pre-check.** Before writing, checked the three areas the brief flagged as possible-overlap risks:
  - PR description template (Item 11) vs existing `CLAUDE.md` / `docs/02`: no collision. `docs/02` has a "what 'complete' looks like for a build task" checklist (deliverable / DoD / ownership / dependencies / blocks / time estimate / risks), which is build-scoping, not PR-description. The new PR template covers a different slot.
  - `ask_user_input_v0` (Item 8): `docs/02` line 22 already mentions the tool; CLAUDE.md didn't. New CLAUDE.md text adds the "2–4 options" and "≤3 questions per call" constraints, reinforcing 02 without restating it.
  - Self-merge ban (Item 7): CLAUDE.md line 78 had "No self-merge." as a generic workflow rule; new section sharpens it specifically to Claude Code agent behavior ("never merges PRs even when asked, session ends after PR open"). Reinforces, doesn't conflict.
- **Created `docs/conventions.md`** with 5 sections: Spec deviations (item 4), PR stacking (item 5), PR description template (item 11), PR queue management (item 12), Test coverage in early build (item 13). One-line intro: "Working patterns and conventions that span multiple areas. Updated as new patterns emerge."
- **Updated `docs/05_Database_Schema.md`:**
  - Expanded **Migration discipline** with a new **Promoting a migration to prod** subsection (8-step ritual + an "Currently outstanding promotions" callout for the three dev-only migrations).
  - Added **Testing** section at the end with the 12-step pg-side RLS isolation suite. Each test reconstructed from `supabase/migrations/20260602150000_rls_policies.sql` (not invented), grouped: authenticated-user scoping (tests 1–3), direct-INSERT blocks (4–6), cross-user write attempts (7), anon-role gating (8–9), deny-all on service-role-only tables (10–11), service-role bypass (12). Each entry has the query body, expected result, and a one-line note on what would automate it.
  - Added **Test fixtures** section right after Testing — `supabase/seed.sql` plan, what goes in v1, when to build (Week 2 after Edge Functions land), and an open question about whether to keep PR-#8's ad-hoc fixtures or wipe and reseed.
- **Updated `docs/04_Repository_Structure.md`** Branch strategy with the squash-only repo-settings enforcement procedure (item 6).
- **Updated `CLAUDE.md`** Behavior expectations with:
  - `ask_user_input_v0` usage (item 8).
  - Scope-mismatch protocol — flag conflicts between session prompt and docs rather than silently re-interpreting (item 9).
  - Cross-link to `docs/conventions.md` § Spec deviations (item 10).
  - New top-level section **Claude Code never self-merges** between Behavior expectations and Scope discipline (item 7).
- **Updated workdiary** — this entry + a decisions-log row above.

**Tools / versions touched:** None — docs only.

**Files / commits:**
- Branch `docs/week1-conventions`, stacked on `docs/session-7-workdiary` (PR #9 still OPEN). Single commit per the task brief: `docs: capture Week 1 working-pattern conventions (RLS tests, seed.sql plan, migration promotion, PR discipline, etc.)`.
- Files: `docs/conventions.md` (new), `docs/05_Database_Schema.md`, `docs/04_Repository_Structure.md`, `CLAUDE.md`, `docs/workdiary.md`.

**Decisions taken (also in Decisions log):**
- 2026-06-03 — Captured 13 working-pattern items into `docs/conventions.md`, `docs/05`, `docs/04`, `CLAUDE.md`.

**Open items rolled forward:**
- None new from this session. Carry-forwards from session 7 stand unchanged:
  - **Sulaiman review queue:** PR #6, #7, #8, #9 OPEN; this session adds a sixth (the conventions PR), stacked on #9. Workdiary stack now #7 → #9 → this PR; schema stack #6 → #8.
  - **Promote outstanding migrations to prod:** extensions (PR #4 — merged on main, applied on dev, not prod), initial schema (PR #6 — open), RLS (PR #8 — open). Bundle into one prod-link session per the new ritual in `docs/05`.
  - **`supabase/seed.sql`** — Week 2, after Edge Functions land.
  - **`devices` column-scope follow-up migration** — Week 2, after `mint_device_token` contract firms up.
  - **Device JWT claim format finalization** — Week 2 (`mint_device_token`).
  - **`agent_role` Postgres read-only role** — separate migration with AI Agent Contract v0.
  - Long-running carry-overs unchanged from session 7.

**Notes / lessons:**
- **"Conflict check before writing" is the right opening move for a multi-file docs PR.** The brief explicitly listed three overlap risks; running through each before touching files surfaced that they all reinforced rather than collided. Would have been easy to add duplicate language otherwise (e.g. an `ask_user_input_v0` paragraph in CLAUDE.md that nearly word-for-word matches the one already in `docs/02`). Keep the brief's "ASK BEFORE PROCEEDING" list as a literal pre-flight checklist on future docs PRs of this shape.
- **Reconstruct, don't invent, when documenting tests.** The brief was explicit: "RECONSTRUCT the queries from the schema doc and the RLS migration file, not invent them." Source was the actual RLS migration file (read via `git show`) plus the test script run in session 7 (since deleted with the temp dir). Every test in the new "Testing" section maps to a specific policy in the migration and a specific assertion that was actually observed pass on dev. Mark "TODO" if reconstruction isn't possible rather than guessing — none needed here because the migration file is complete and the session 7 script was straightforward to redrive.
- **`docs/conventions.md` is the right home for cross-cutting patterns.** Items 4/5/11/12/13 don't belong in any single numbered doc — they span schema, CI/CD, PR discipline, session conduct. A separate `conventions.md` keeps them findable without bloating any one numbered file. Worth re-checking on future sessions whether new conventions accumulate or whether some should graduate to a numbered doc (e.g. PR template might eventually become its own `.github/pull_request_template.md`).
- **One PR, five files, no new code.** Docs-only PRs of this size are exempt from the "queue depth ≤ 3 code PRs" rule that this very PR codifies, but worth tracking the meta-pattern: a single docs PR that captures a batch of session learnings is much easier to review than five small ones because the reviewer can read it linearly. The "Workdiary-only PRs can be brief" carve-out in the new PR template covers the smaller docs PRs; this kind of "captured-conventions" PR should follow the full template.

---

### 2026-06-03 (later same day) — Monorepo scaffold (session 9)

**Goal of session:** Scaffold the monorepo per `docs/04_Repository_Structure.md` — `apps/mobile`, `apps/admin`, `packages/config`, `packages/types`, `packages/supabase` as functioning pnpm workspaces; both dev servers bootable; shared TS/ESLint/Prettier configs; `.env.example` in both apps.

**Reconciled `main` first (catch-up PRs #11/#12).** Discovered the scaffold's prerequisite (`packages/supabase/src/database.types.ts`) wasn't on `main`: the Week-1 stacked PRs (#6–#10) had merged into their *base branches*, not `main`, so `main` was stuck at session-4 state minus the schema/RLS migrations, `database.types.ts`, and docs sessions 6–8. Surfaced to founder; on the founder's explicit instruction ("merge it, like it should be") replayed the already-reviewed commits onto `main` via two rebase-merged PRs (#11 schema stack, #12 docs stack). Verified `main` whole: 3 migrations, `database.types.ts`, `conventions.md`, workdiary 1–8, and `docs/05` carrying BOTH the `app_versions` PK fix and the Testing/Fixtures sections (clean union). Then branched `feat/monorepo-scaffold` off the reconciled `main`.

**Scaffolders had drifted a full major** (surfaced + founder chose "accept latest"):
- Mobile: `create-expo-app` → **Expo SDK 56** (React 19.2, RN 0.85, reanimated 4, `src/app/` layout, TS 6.0). Stripped the demo template to a minimal NativeWind placeholder.
- Admin: `create-next-app` → **Next.js 16.2.7**, Tailwind 4 (✓, no v3 problem), ESLint 9 flat config.
- Standardized TS on **5.9.3** monorepo-wide via `pnpm.overrides` (TS 6 unsupported by `@typescript-eslint`/NativeWind).

**Packages.** `@caeorta/config` (strict tsconfig base composed via `extends` array; flat ESLint config for packages + rules-only `eslint-strict` fragment for apps to avoid double-registering `@typescript-eslint`; Prettier config). `@caeorta/types` (zod + 6 placeholder domain files, ships TS source). `@caeorta/supabase` (universal `createSupabaseClient` factory parameterized for Expo/Next env; re-exports `Database` + helpers; **`database.types.ts` left untouched**). Apps consume packages as TS source (`transpilePackages` in Next; Metro transpiles for mobile).

**Three environmental gotchas hit and resolved/flagged:**
1. **pnpm 11 reads build-script allowlist + settings from `pnpm-workspace.yaml`, not `package.json`/`.npmrc`.** `onlyBuiltDependencies` in `package.json` was ignored; pnpm auto-rewrote `pnpm-workspace.yaml` with an `allowBuilds:` map. Set `allowBuilds` for `@tailwindcss/oxide`, `esbuild`, `msgpackr-extract`, `sharp`, `unrs-resolver`. (`pnpm.overrides` in `package.json` *is* still read — TS override worked.)
2. **Tailwind 4 + `#` in the repo path** → `@tailwindcss/oxide` null-byte path corruption, 500 on every admin CSS compile. Founder is removing the `#` from the folder name (decision logged). **Admin CSS is unverified until that move**; it compiles with zero code changes once the path is `#`-free.
3. **NativeWind + pnpm isolated linker** → `react-native-css-interop/jsx-runtime` unresolved. Fixed surgically by adding `react-native-css-interop@0.2.4` as a direct mobile dep (vs. switching to `node-linker=hoisted`, which would weaken pnpm's strictness).

**shadcn 4.x changed materially** — no `--style`/`--base-color` flags (preset-based now), and its init hung non-interactively. Set it up manually for Tailwind 4: `components.json` (new-york, gray, css-variables), `lib/utils.ts` (`cn`), the standard oklch token block in `globals.css`, and deps (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`). Placeholder until the designer's Sunday session.

**Verification.**
- `pnpm install` resolves clean (exit 0; native build scripts run).
- `pnpm -r typecheck` — green across all 5 projects.
- `pnpm -r lint` — green across all 5 projects.
- Mobile: `expo start` boots the dev server; `expo export --platform android` bundles successfully (1493 modules, 3.7 MB hbc) — NativeWind included. Android is the pilot target.
- Admin: `next dev` boots on :3000; route renders 500 **only** due to the `#`-path Tailwind bug (see gotcha 2). Everything else (structure, typecheck, lint, build graph) is green.

**Tools / versions touched:** none installed/upgraded on the machine (used `pnpm dlx`). Inventory unchanged. Same harness-shell `fnm`-not-auto-loaded pattern; every node/pnpm call inlines the fnm bootstrap.

**Files / commits:** Branch `feat/monorepo-scaffold` off `main`. One commit: `feat: monorepo scaffold (apps/mobile, apps/admin, packages/config, packages/types, packages/supabase)`. ~85 files (mostly official scaffolder output) + the version/doc edits + this entry. PR opened against `main`.

**Decisions taken (also in Decisions log):** accept Expo 56 / Next 16; TS 5.9.3 monorepo-wide; drop `#` from folder; `react-native-css-interop` direct-dep workaround; catch-up PRs #11/#12.

**Open items rolled forward:**
- **Founder: remove the `#` from the repo folder** (`#1_Caeorta_dev` → `1_Caeorta_dev`), then re-verify `next dev` serves the admin placeholder. No code change needed.
- **Re-run `database.types.ts` codegen** is unaffected (left untouched this session).
- shadcn theming is a placeholder — designer reworks it Sunday.
- Wire Sentry / PostHog / i18next — Prompt 5 (next), explicitly out of scope here.
- Mobile placeholders don't yet import `@caeorta/types`/`@caeorta/supabase` (deps declared only); first real import will exercise cross-package resolution end-to-end.
- Long-running carry-overs unchanged from session 8 (prod migration promotion, `seed.sql`, `devices` column-scope follow-up, device JWT claim, `agent_role`, Google Play Console, etc.).

**Notes / lessons:**
- **Stacked PRs merge into their base, not `main`.** When the base branch still exists at merge time, GitHub advances *that* branch; `main` only moves if the base itself merges to `main`. Five stacked PRs showing "merged" left `main` three stacks behind. Fix: fresh PRs from the stack tips → `main`, rebase-merged to preserve the reviewed commits. Worth a `git ls-tree origin/main <path>` sanity check after any stacked-merge session.
- **pnpm 11 centralizes config in `pnpm-workspace.yaml`.** Build-script approval is `allowBuilds:` there (not `onlyBuiltDependencies` in `package.json`), and `.npmrc`'s `node-linker` was silently ignored (`pnpm config get node-linker` → undefined). `pnpm.overrides` in `package.json` still works. Check `pnpm config get <key>` to confirm a setting actually took effect before assuming it did.
- **`#` (and `[`, `(`) in an absolute path breaks Tailwind 4's oxide.** It surfaced as a null byte injected at the `#` in the compiler's path string. Latent landmine for any path-sensitive native tool (EAS, Metro cache). Keep project paths free of shell/url metacharacters.
- **Expo SDK 56 bundles fine under pnpm's isolated linker** (1493 modules) — only NativeWind's `react-native-css-interop/jsx-runtime` needed a direct-dep nudge. Reach for `node-linker=hoisted` only if a cascade of phantom-dep failures appears; a single targeted dep preserved pnpm strictness here.
- **Verify Expo bundling with `expo export --platform android`, not a hand-built `/index.bundle` URL.** The manual URL produced a misleading `./index` resolution error (wrong entry); `export` uses the real `main` entry and is the authoritative check.

---

### 2026-06-09 — Gap-fix + pattern-capture pass after sessions 8-9 (session 10)

**Goal of session:** Targeted update pass — fix six staleness issues in existing docs and capture five new patterns that emerged in sessions 8-9. Docs-only; no new files; one PR.

**Done:**
- **CLAUDE.md** — three fixes: corrected the auth decision (`Email magic link auth in v1` → `Email OTP (code-only) auth in v1; phone OTP later in v2`) to match the OTP-code-only decision taken in chat before Prompt 5; bumped the Stack section (Expo `53+` → `56+`, Next.js `15` → `16`); added a self-merge **exception clause** to the "Claude Code never self-merges" section documenting the session-9 catch-up-PR precedent (rebase-merge already-reviewed content to reconcile stacked-branch drift, only with explicit founder instruction).
- **docs/04_Repository_Structure.md** — `pnpm 9` → `pnpm 11` in the dev-setup checklist; example commit bumped to `SDK 56.0.5`; added `conventions.md` to the docs/ tree listing; new **Known environmental gotchas** section (pnpm 11 build-script config moved to `pnpm-workspace.yaml`; Tailwind 4 oxide `#`-in-path corruption; NativeWind needs `react-native-css-interop@0.2.4` as a direct mobile dep); new **Monorepo-wide version pinning via pnpm.overrides** subsection.
- **docs/conventions.md** — added the session-9 incident paragraph to the PR stacking section, plus a new **Reconciliation when stacks merge into base branches instead of main** subsection (the catch-up-PR procedure).
- **docs/03_Tech_Stack.md** — new **Handling scaffolder drift between doc and reality** section (floor-with-`+` semantics; accept newest stable major; update the floor in the same scaffolding session).
- **docs/05_Database_Schema.md** — new **Tracking dev-only state across weeks** subsection under Migration discipline; rewrote the **Currently outstanding promotions** callout to current state (all three migrations now on `main` and dev, none on prod).

**Surfaced one discrepancy before editing (per CLAUDE.md spec-conflict protocol):** Item 8's prescribed text attached "reconciled via PR #11" to the extensions migration, but the workdiary shows PR #4 (extensions) merged to `main` directly in session 5/6 — it was not part of the session-9 reconciliation (only schema #6 and RLS #8 were). Founder chose to drop "reconciled via PR #11" from the extensions line only; schema and RLS lines keep it.

**Known item flagged for Prompt 9 (Friday retro):** `docs/08_12_Week_Action_Plan.md` Week 1 deliverables may still say "magic link." Intentionally not touched this session — that's the retro's job. Called out in the PR description.

**Tools / versions touched:** none — docs only. Inventory unchanged.

**Files / commits:** Branch `docs/gap-fix-sessions-8-9` off `main`. One commit: `docs: gap-fix sessions 8-9 conventions (versions, self-merge exception, scaffolder drift, env gotchas, pnpm.overrides, migration state)`. Files: `CLAUDE.md`, `docs/03_Tech_Stack.md`, `docs/04_Repository_Structure.md`, `docs/05_Database_Schema.md`, `docs/conventions.md`, `docs/workdiary.md`.

**Decisions taken (also in Decisions log):**
- 2026-06-09 — Captured 5 new patterns from sessions 8-9 + fixed 6 staleness issues + documented the self-merge exception clause.

**Open items rolled forward:**
- **Prod promotion of all three migrations** (extensions, initial schema, RLS) — procedure documented in `docs/05`; execution still pending; do all three in one prod-link session before any prod-touching Week 2 work.
- **`docs/03_Tech_Stack.md` scope-tightening pass** — deferred until the tech stack stabilizes through Week 2.
- **Action-plan "magic link" reference** — for Prompt 9 (Friday retro) to reconcile.
- Long-running carry-overs unchanged from session 9 (`seed.sql`, `devices` column-scope follow-up, device JWT claim, `agent_role`, repo squash-only setting, Google Play Console, source-folder cleanup, etc.).

**Notes / lessons:**
- **A prescribed verbatim edit can still carry a factual error.** Item 8's text would have written a wrong provenance (extensions "reconciled via PR #11") into the schema doc. Cross-checking the named PR numbers against the workdiary before writing caught it. When a task dictates exact text for a factual callout, still verify the facts against the source of truth — the source-of-truth doc is exactly where silent drift is most expensive.

---

## Template for future entries

When starting a new entry, copy this scaffold to the bottom of the file. Keep prose tight; cross-reference the decisions log and tool inventory rather than re-describing.

```markdown
### YYYY-MM-DD — short summary (session N)

**Goal of session:** …

**Done:**
- …

**Tools / versions touched:** (also update the inventory table at top)
- …

**Files / commits:**
- …

**Decisions taken:** (also add a row to the decisions log)
- …

**Open items rolled forward:**
- …

**Notes / lessons:**
- …
```
