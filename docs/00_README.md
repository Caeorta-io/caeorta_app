# Caeorta — App & Web Build Project

This Claude Project contains the complete context for building the **Caeorta phone app and web properties**. It is scoped specifically to this build — other Caeorta concerns (hardware, AI agent development, legal, pilot logistics, blockchain) live in separate projects and are deliberately **out of scope here**.

---

## How to navigate these documents

If a future Claude (or you) opens a fresh chat in this project, this is the map. Read the files relevant to the question being asked. You do **not** need to read all of them every time.

| File | Read it when |
|---|---|
| `00_README.md` | First time in the project, or to find the right doc |
| `01_Project_Identity.md` | Anything about *what* we're building and *why* the choices were made |
| `02_Working_Agreements.md` | Anything about *how* to work — Claude's behavior, founder constraints, response style |
| `03_Tech_Stack.md` | Tool choice questions, "should we use X" questions |
| `04_Repository_Structure.md` | File layout, environment setup, monorepo questions |
| `05_Database_Schema.md` | Anything about Supabase tables, RLS, migrations, data modeling |
| `06_AI_Agent_Contract.md` | Anything about how the app talks to the AI agent (which lives in another project) |
| `07_Sync_Architecture.md` | Anything about device-to-cloud-to-app data flow |
| `08_12_Week_Action_Plan.md` | What to build, in what order, in which week |
| `09_Risks_And_Mitigations.md` | Things likely to go wrong, watch list |
| `10_Out_Of_Scope.md` | "Should we add X?" — check here first |
| `workdiary.md` | Living log; read latest entry at session start, append at session end |

---

## Quick orientation

- **Who:** Caeorta. Two co-founders, both embedded engineers, both full-time on Caeorta. For this repo specifically, Muhammed Raslan (App founder) is the sole code author and is learning JS/TS and mobile dev; Sulaiman Shiyas Ali (Platform founder) owns Platform-area decisions and reviews PRs but does not author code in this repo.
- **What this project builds:** Mobile app (Expo/React Native) + admin web dashboard (Next.js) + marketing site (Framer) + the Supabase backend pieces the app touches.
- **What this project does NOT build:** Hardware/firmware, AI agent internal logic, Peaq blockchain integration, legal/regulatory work, pilot user logistics.
- **Timeline:** 12 weeks to a polished pilot launch (TestFlight + Play Internal Testing) for 10 friendly enthusiasts.
- **Quality bar:** Non-negotiable. Generic-feeling products are not acceptable.
- **Designer:** Already engaged. Figma in progress.
- **Stage:** Pre-week-1. Setup is happening; building has not started.

---

## When this project is the wrong place to ask

If a question is really about:
- **Hardware design, firmware, PCB, CAN bus, OBD-II protocols** → wrong project. Caeorta has a separate hardware/firmware project.
- **AI agent prompts, evals, model choice for the diagnostic agent itself** → wrong project. Caeorta has a separate AI agent project. This project only handles *integration* with that agent.
- **Legal, ToS, privacy policy drafting, regulatory compliance** → out of scope here. Will be addressed post-pilot.
- **Pilot user recruitment, customer support process, device shipping logistics** → out of scope here.
- **Peaq blockchain, DePIN tokenomics, smart contracts** → deferred / parallel backend track, not this project.
- **Caeorta-wide strategy, go/no-go decisions, funding** → that's the Caeorta Startup OS project.

If the question is ambiguous, ask the user which project context applies before answering.

---

## Update discipline

These files are the source of truth. When reality contradicts them, **update the files**, don't let the divergence sit.

- Schema changes → update `05_Database_Schema.md` in the same PR as the migration
- Tool changes → update `03_Tech_Stack.md`
- Scope changes → update `10_Out_Of_Scope.md`
- New risks observed → add to `09_Risks_And_Mitigations.md`
- Action plan deviations → update `08_12_Week_Action_Plan.md` honestly, don't pretend you're on track if you aren't

## Source of truth: the repo

Once the Caeorta repo exists (Week 1), the `docs/` folder in the repo is the
canonical home for these files. The Claude.ai project knowledge is a mirror
maintained for chat-based planning.

Two options for keeping them in sync:

1. **Manual re-upload** — when you update a doc in the repo, re-upload to the
   project knowledge. Simple but easy to forget.
2. **GitHub connector** (recommended once repo is on GitHub) — enable the
   GitHub connector on this project so claude.ai chats can read live from the
   repo. Eliminates the sync problem.

Either way: **edit in the repo first, not in the Claude.ai project knowledge.**
The repo is canonical.
