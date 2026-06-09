# Conventions

Working patterns and conventions that span multiple areas. Updated as new patterns emerge.

Most of these were extracted from how Week 1 sessions actually ran — they are documented here so future sessions inherit them without re-derivation.

## Spec deviations

When implementation surfaces an error or gap in a project doc spec (example: `app_versions.version` was listed as the sole PK in `docs/05_Database_Schema.md`, but the same release ships on both iOS and Android, requiring a composite `(version, platform)` PK):

1. Fix the implementation correctly in the same PR (don't ship knowingly-wrong code, don't pause and ask).
2. Update the spec doc in the same PR so the source of truth catches up.
3. Flag the deviation explicitly in the PR description under a **Spec deviations** heading, naming what changed in the doc and why.
4. Sulaiman reviews the doc change as part of PR review; if he disagrees, that's a follow-up PR to revert, not a blocker on the original work.

This pattern preserves forward progress without letting silent drift accumulate between docs and reality.

## PR stacking

Stacking PRs (branching a new feature branch off an unmerged feature branch) is acceptable for docs-only PRs (workdiary entries, retro updates) but should be avoided for code PRs once queue depth reaches ~3 open code PRs.

Reasoning: a stack of 5 code PRs that depends on the lowest one merging cleanly means one merge conflict cascades through all 5. A stack of workdiary PRs is safe because each touches one file.

Rule of thumb:

- 0–3 open code PRs: stack is fine
- 4+ open code PRs: pause new code prompts, push for merges first
- Always fine to stack docs-only PRs

The session-9 incident concretized this: a 7-PR stack with intermediate branch merges resulted in main being three stacks behind reality. Reconciliation required two catch-up PRs (see Reconciliation subsection below). The lesson is not just "don't stack too deep" — it's "when stacking, the merge target on every PR in the stack must be main, never an intermediate branch, unless you're prepared to do a catch-up reconciliation later."

### Reconciliation when stacks merge into base branches instead of main

This happened in session 9 (PRs #6, #8 stacked on `feat/enable-extensions`; that branch merged into `feat/enable-extensions` rather than main during review, leaving main three stacks behind). The fix:

1. Identify the gap: list commits in stacked branches that should be in main but aren't (use `git log main..<branch>` for each branch).
2. Branch a catch-up PR off main containing the reviewed-and-merged-elsewhere commits.
3. Open the PR; in the description, name it as a catch-up reconciliation and reference the original PR numbers that were already reviewed.
4. With explicit founder instruction, the catch-up PR can be self-merged (see the self-merge exception in CLAUDE.md). The content was already reviewed; the catch-up is purely a topology fix.
5. After main is reconciled, all new work branches off the up-to-date main, NOT off the old stack tips.

The deeper lesson: deep stacks (4+ code PRs deep) make you vulnerable to base-branch-merged-but-not-main drift. Sulaiman's GitHub web UI doesn't make the merge target obvious; "Squash and merge" defaults to the immediate base branch. When in doubt, branch off main and rebase often, even at the cost of more frequent rebase work.

## PR description template

Every PR description should include:

- **What this PR does** (1–3 sentences)
- **Why** (link to the relevant doc section, week's Action Plan item, or risk being addressed)
- **Spec deviations** (if any — see [Spec deviations](#spec-deviations))
- **Testing** (what was verified now, what's deferred and why)
- **Reviewer focus** (where to spend review time — e.g. "review the FK relationships, not the generated types verbatim")
- **Carries forward** (open items rolling into the next session/PR)

Workdiary-only PRs can be brief — just "Adds session N entry" is fine.

## PR queue management

Sulaiman is sole reviewer (per the execution model). When the open-PR queue reaches 5+ PRs without a recent merge, pause opening new code PRs and push for review before proceeding. Adding more PRs to a deep queue makes review harder, not easier — reviewers batch slower as cognitive load grows.

Docs-only PRs (workdiary, ADRs) are exempt from this; they're cheap to review and rarely block downstream work.

## Test coverage in early build

For any code change that needs verification:

1. Test what you can cheaply now with available infrastructure.
2. Defer tests that require infrastructure not yet built; name them explicitly.
3. In the PR description's **Testing** section, list both what was verified now AND what's deferred and why.

Example from Week 1: RLS policies (PR #8) tested user-isolation and service-role-bypass via Dashboard `SET request.jwt.claims`. Device-JWT path verification was deferred to Week 2 because `mint_device_token` doesn't exist yet.

This pattern prevents two failure modes: (a) shipping untested code while pretending it's tested, and (b) blocking a PR forever on tests that need infrastructure that hasn't been built. Honesty about coverage is the discipline.
