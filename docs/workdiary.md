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

- **GitHub**: [Caeorta-AI/caeorta_app](https://github.com/Caeorta-AI/caeorta_app) — **private**
- **Local working path**: `C:\Code\caeorta_app` (NOT OneDrive)
- **Default branch**: `main`
- **Workspace manager**: pnpm 11 workspaces (`apps/*`, `packages/*`)
- **Founder roles**: App founder owns Expo mobile app + UI + AI agent integration + design implementation. Platform founder owns Supabase schema/RLS/Edge Functions + Next.js admin + Framer marketing + OTA + push backend + device pairing + CI/CD.
- **Founders' commit identities**:
  - App founder: `user.name` = `Muhammed_Raslan` (repo-scoped — global `user.name` currently empty), `user.email` = `muhammedraslanthalassery@gmail.com` (global)
  - Platform founder: TBD when they set up

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
