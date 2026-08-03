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

## Week 3 patterns

Extracted from the Week 3 vehicle-dashboard sessions (list, add-vehicle, detail, live mode). These are the load-bearing conventions future dashboard/data work inherits.

### Data-seam pattern

- `DATA_SOURCE: Record<DataCapability, 'mock' | 'live'>` in `apps/mobile/src/lib/data/source.ts` is the single per-capability flip-point. Every dashboard read (and the one write, and the live subscription) goes through a `fetch*` / `subscribe*` function that consults its capability's entry. Hooks and screens never branch on mock-vs-live.
- Default every capability to `'mock'`. The env var `EXPO_PUBLIC_DATA_SOURCE=live` flips the default for **all** capabilities at once; an individual capability can be promoted ahead of the others by hard-coding its entry to `'live'` in `source.ts` (incremental rollout).
- Live branches throw `notImplemented(capability)` and import **no** Supabase / React-Native code, so the whole seam module unit-tests in plain Node/vitest (no native graph). Wire the real query/adapter in the live branch only when promoting that capability.
- Before flipping any capability to `'live'`, resolve `TODO(metric-keys)` for that capability's jsonb fields (`peak_metrics` / `summary_metrics` / `latest_metrics`). Those columns are typed as opaque `Json`, so a key mismatch is **not** caught by the compiler — it must be reconciled against the hardware/AI-agent contract by hand.

### Connection-state derivation rule

- `deriveConnectionState` in `apps/mobile/src/lib/connectionState.ts` is the canonical rule. Never re-derive "what counts as live/synced/offline" inline. Priority (first match wins): `connecting` → `live` → `synced` → `offline`. `SYNCED_THRESHOLD_MS = 4 hours` (strict: exactly-threshold-old reads as `offline`; future timestamps read as `offline`).
- `channelStatus = null` means Realtime is not initialised (the surface is not in live mode). **Only the live screen passes a real `channelStatus`**; every other surface (list, detail) passes `null` and derives from the last-sync timestamp alone. This is correct, not a stub — do not "fix" the detail screen to open a channel.

### Never-throws orchestrator pattern

- `apps/mobile/src/lib/pairing.ts` and `apps/mobile/src/lib/vehicles.ts` are the canonical examples for a user-triggered action that can fail.
- The orchestrator **always returns a typed result union** (`{ ok: true, … }` | `{ ok: false, error: … }` with a typed error code) — it never throws to the caller.
- All unrecognised thrown errors map to `{ code: 'network' }` (the safe catch-all the UI can always render).
- Validate input at the boundary with Zod; no `any` without an inline comment justifying it.

### Derived-tier reuse — one severity rule, every consumer

Introduced Week 5 (session 36) when a second consumer of DTC severity appeared. The rule
generalises `deriveConnectionState` and `deriveDiagnosticCardState` to any *behavioural*
consumer, not just a visual one.

- **A derived tier gets ONE canonical function, and every consumer calls it — visual and
  behavioural alike.** `deriveDtcBadgeSeverity` (`lib/dtc.ts`) maps the free-text
  `severity_raw` to `'critical' | 'warning' | 'info' | 'unknown'`. It tints the S5/S6
  badge **and** gates the notification preference check (`shouldNotifyForDtc`,
  `lib/dtcNotifications.ts`). Never write a second map for the behavioural consumer, even
  when it looks like it wants different buckets — the bug that produces is a code
  displayed as one tier and acted on as another, and it is invisible in review.
- **Tie the consumer's own type to the tier union structurally, not by hand.** A
  preference record should be a *mapped type over the tier union*
  (`{ [T in DtcBadgeSeverity]: boolean }`), not a hand-written record that happens to
  list the same keys. Then extending the ladder is a compile error at the defaults
  instead of a silently unhandled tier. Same discipline as `DtcGroups` against
  `DtcGrouping`.
- **Encode "always" in the type, not in a convention.** Design §6's "Critical = Always"
  is carried by typing that key as the literal `true`, so no prefs object can be
  constructed that silences it and no future settings screen can bind a toggle to it.
- **Both failure directions on a gate must be the quiet one.** An unreadable input tier,
  a preference blob missing a key, and a non-boolean preference value all resolve to
  "don't act" (`prefs[tier] === true`, not a truthiness check). For anything that
  interrupts the user, being wrong should mean silence.
- **Share the ordering comparator too, don't re-sort.** The banner orders its selection
  with the same exported `compareDtcsForList` the S5 list uses, so "most urgent first"
  cannot drift between two surfaces showing the same codes.

### Client state: pure slices vs. slices that do native I/O

- `lib/store.ts` holds **pure in-memory** Zustand slices only. Anything that performs
  native I/O (`expo-secure-store`, filesystem, etc.) gets its **own module beside its
  feature** — e.g. `lib/dtcNotificationStore.ts`. Rationale is the same as the data seam's:
  every graph that touches auth imports `store.ts`, and a native import there drags a
  native module into the plain-Node vitest graph.
- **Split the pure logic out of the persisting store.** Parse / merge / serialize helpers
  live in the feature's pure module (`lib/dtcNotifications.ts`) and are unit-tested there;
  the store module is a thin I/O shell over them. The dependency arrow points one way —
  the store imports the pure helpers, never the reverse — which also means swapping the
  storage backend touches the shell only.
- **A persisted set read on mount needs a `hydrated` flag, and the UI must gate on it.**
  Rendering before hydration flashes the pre-hydration default (an already-dismissed
  banner reappearing for a frame). Hydration must also mark itself done on failure, or a
  broken keystore hides the surface permanently.
- **Write-through is optimistic and its failure is swallowed.** Update memory first so the
  interaction is instant; a failed persist means the action holds for the session and
  reverts next launch. Never block a tap on I/O and never surface a storage error for an
  acknowledgement.

### Realtime subscription pattern

- The **screen** manages subscribe/unsubscribe with `useEffect`, not TanStack Query. TanStack Query is for fetching; a one-shot query (`useCurrentState`) supplies the initial seed, and Realtime pushes overwrite it from there. Screen-local subscription state lives in `useState`/`useRef`, not Zustand.
- Always store the returned unsubscribe fn in a ref and call it on unmount **unconditionally** — the channel must never outlive the screen. Dependency array is `[id]` only, so a vehicle change tears down and re-subscribes.
- The mock emitter (`subscribeToCurrentStateMock`) and the real `subscribeToCurrentState` share the **same external interface** — `(vehicleId, onUpdate, onChannelStatus) => () => void` — so the swap is a per-capability flag flip in `source.ts`, not a screen change. Note the real `@caeorta/supabase` helper does **not** natively match that shape (it needs a client, returns a `RealtimeChannel`, has a separate async `unsubscribe`, and emits no channel status); the live branch owns a thin adapter that maps it onto the seam contract, keeping the adapter — and the shape mismatch — out of the screen.

## Week 5 patterns

From the DTC arc (PRs #40–#44). The *reuse* rule for derived tiers lives above under
**Derived-tier reuse**; these four are the constraints that pair with it.

### Two derivations that look identical are allowed to differ — say why in the code

`deriveDtcBadgeSeverity` and `deriveDiagnosticCardState` both map an unrecognised severity
to a fallback, and they **deliberately pick different ones**. Copying either rule to the
other is a real bug, so the difference is documented at both sites rather than left to look
like an inconsistency.

- **Fall back ON the ladder when the value came from a system with a known vocabulary.** A
  diagnostic's `severity` is authored by the AI agent, so an unrecognised value is
  vocabulary *drift within a known set* — rendering it as the quietest on-ladder tier
  (`info`) is honest.
- **Fall back OFF the ladder when the value is unconstrained.** A DTC's `severity_raw` is
  plain `text` with no CHECK — whatever the ECU happened to write. Mapping it to `info`
  would **assert a tier the app does not have**, so it renders an off-ladder `unknown`
  instead (design §4.3 + §8: show that we don't know).
- **The test is the source of the value, not its type.** Before choosing a fallback, ask
  whether a closed vocabulary exists upstream. If one does, degrade inside it; if none
  does, degrade outside it.
- **Both directions must fail toward understatement, never overstatement**, and never throw.
  Once a derivation gains a *behavioural* consumer, note what the fallback now costs — an
  `unknown` badge is cosmetic, but `unknown` also meaning "never notifies" is not.

### A component that satisfies §11 only in context must say so in its own header

Design §11 ("never colour alone") is satisfied **across the S5 row**, not inside the badge:
`DtcCodeBadge` carries colour + a per-tier glyph + the raw code, and the severity's **text
label** sits on the row's meta line. Putting the severity word inside the badge would
displace the code — the thing a user cross-references against a scanner or a forum.

- **The consequence is a reuse constraint, and it belongs in the component's own doc
  comment:** `DtcCodeBadge` is **not §11-compliant standalone** and must not be dropped onto
  a new surface without a severity label beside it. A reviewer of a *future* screen will not
  re-read the §11 reasoning in some week's PR description; they will read the component.
- Generalise: **when an accessibility rule is satisfied by a composition rather than by a
  component, the component is a trap.** Write the constraint at the definition, and collapse
  the signals into one `accessibilityLabel` so screen readers get them together.

### Render a set from its ORDER constant, so changing the set changes the screen

`DTC_GROUPINGS` (the union) and `DTC_GROUPING_ORDER` (the render order) live in
`@caeorta/types`; S5 builds its sections by mapping the order constant, and `groupDtcs` is
typed `Record<DtcGrouping, Dtc[]>`. A test asserts the order covers every member exactly
once.

- **The payoff is that resolving CF-29 costs two edits and no screen change.** Narrowing the
  union turns `groupDtcs`' `pending: []` line into a **compile error** (not a silently dead
  branch), and the screen renders two sections on its own because it never hard-coded three.
- **Type the containment in both directions.** A narrowed *return* type (`deriveDtcGrouping`
  → `'active' | 'history'`) makes **widening** a compile event; a `Record<Union, T>` makes
  **narrowing** one. Use both when a provisional set is expected to change.
- Never hand-write a list of section headers that duplicates a union's members. The
  duplicate is where the drift happens.

### "New" means unacknowledged, not recent

For any surface that interrupts the user about a set of items:

- **Prefer acknowledgement state over a recency window.** A time window needs no storage,
  which is its whole appeal — but it **re-notifies on every app open** until it lapses, and
  the timestamp usually records when the *upstream system* saw the thing, not when the
  *user* did. `dtcs.first_seen_at` is when the ECU reported the code; a code that set three
  weeks ago and was never opened is still news to its owner.
- **The cost is state, so keep the pure half storage-agnostic.** Parse / merge / serialize
  helpers live in the feature's pure module and are unit-tested there; the persisting store
  is a thin I/O shell. Swapping to a server column later then touches the shell only.
- **Cap any locally-persisted set and document what eviction means.** SecureStore warns
  above ~2048 bytes per value, so the acknowledged-set is capped at 40 ids, oldest first —
  and the fact that eviction *can* re-notify is written down rather than hidden, because it
  is the one way the surface can nag.
- **Two actions, not a gauntlet:** dismiss acknowledges everything surfaced in one tap;
  tapping through to look at an item acknowledges **nothing**. Going to look at something is
  not being done with it.
- **Test the property, not just the cases:** the assertion that matters is *dismiss → same
  input rows → empty selection* (no re-notify), which no per-case test gives you.

## Design system

The mobile design system foundation (Week 4, session 26). Source of truth for the
values is `docs/design/00_design_system.md` (the delivered Figma build report, §4);
the values are translated once into code in **`apps/mobile/design/tokens.js`** — a
plain-CommonJS single source required by BOTH `tailwind.config.js` (which generates
the className scales) and the typed app layer (`src/design/`, via the sibling
`tokens.d.ts`). Never edit token values in two places; edit `tokens.js`.

### Dark-default / light-re-skin policy

- **Dark is the only live theme.** Its values are `colorsDark` in `tokens.js` and are
  wired straight into `theme.extend.colors` — a **static** theme, not CSS variables.
  (NativeWind's `:root` CSS-variable theming was considered and rejected for now given
  the react-native-css-interop fragility logged in earlier sessions; static values
  carry no runtime-resolution risk.)
- **Light is captured but not wired.** `colorsLight` mirrors `colorsDark` key-for-key
  (a test enforces structural parity) so turning light on is a Week-8 mechanism task,
  not a token re-authoring pass. Screens bind to semantic token **names**, so light
  needs **zero screen edits** — only a config/theme swap.

### Semantic token → className mapping

Colour groups map to Tailwind class prefixes. The text group is aliased **`fg`** (to
avoid the `text-text-*` stutter and to match shadcn's `foreground` on the web side);
every other group keeps its Figma name.

| Group (Figma) | className prefix | Example |
|---|---|---|
| `surface/*` | `bg-surface-*` | `bg-surface-canvas`, `bg-surface-elevated` |
| `text/*` → **`fg`** | `text-fg-*` | `text-fg-primary`, `text-fg-secondary` |
| `border/*` | `border-border-*` | `border-border-default`, `border-border-subtle` |
| `brand/*` | `bg-brand-*` / `text-brand-*` | `bg-brand-default`, `text-brand-text` |
| `severity/*` | `bg-severity-*` / `text-severity-*` | `text-severity-warning`, `bg-severity-critical-tint` |
| `status/*` | `bg-status-*` | `bg-status-live`, `bg-status-offline` |
| `interactive/*` | `bg-interactive-*` | `bg-interactive-disabled` |

Spacing is the 4dp scale (`p-1`=4 … `p-6`=24, half-step `p-0.5`=2). Radius is
**additive and design-namespaced**: `rounded-ds-sm`=8 (chips/controls),
`rounded-ds-md`=12 (buttons/inputs), `rounded-ds-lg`=16 (cards), `rounded-ds-xl`=20
(modals/takeover). These collide with nothing in stock Tailwind, so stock
`rounded-sm/md/lg/xl/full` keep their Tailwind defaults and are used only by the
un-migrated Week 1–3 screens until Week 8. There is no design `rounded-ds-full`: the
design pill radius (999) renders identically to stock `rounded-full` (9999), so new
screens use plain `rounded-full`. Elevation is surface-step + border, exposed as the
`ELEVATION` recipe strings (`ELEVATION[1]`, `ELEVATION[2]`) so surfaces don't re-type
the combo.

### Forward-only migration policy

This foundation is **strictly forward-only** with **zero render change to existing
screens**. Both colours and radius are additive under new class names (`bg-surface-*`,
`text-fg-*`, … and `rounded-ds-*`); no stock Tailwind class is redefined. New screens
(Day 2 of Week 4 onward) build against these tokens. The Week 1–3 screens keep their
current stock-palette classes — including stock `rounded-*` — and are **not** migrated
here; that is the Week 8 polish pass. Do not restyle old screens in token PRs.

The Week 8 pass reconciles the radius namespace: once no old screen depends on stock
`rounded-*` radii, strip the `ds-` prefix from the design keys and flip `borderRadius`
to override stock, so migrated screens read plain `rounded-lg` etc. at design values.

### Typography — reference a style by name

Use the **`<Text variant>`** primitive (`@/components/ui/Text`), never ad-hoc
size/weight/tracking. The 12 named styles (§4.4) live in `tokens.textStyles`:
`display`, `h1`–`h3`, `body-lg`/`body`/`body-sm`, `caption`, `label`, and the tabular
Geist Mono `data-xl`/`data-lg`/`data`. The variant sets family + size + line-height +
tracking; **colour stays a className** so the two compose (`<Text variant="h1"
className="text-fg-primary">`). Line-heights are generous on purpose (§4.4) — don't
pixel-lock text in fixed-height containers; they must tolerate ~30% dynamic scaling.
Fonts are Geist / Geist Mono (OFL, vendored in `assets/fonts/`), loaded in the root
layout's boot sequence with the splash gated on them (no unstyled-text flash).

### Icons

Use **lucide-react-native** via the **`Icon`** wrapper (`@/components/ui/Icon`):
`<Icon icon={Activity} />` defaults to 18dp / ~2px stroke / round caps / `fg/secondary`
colour, the common 18-in-36-container pairing (§4.6). Pass colour **from a token**
(`color={colorsDark.severity.warning}`), never a raw hex. This supersedes the earlier
`expo-symbols` direction (SF Symbols are iOS-flavoured; this build is Android-only).

### Interaction constants

- **Pressed, not hover.** Touch has no hover; every interactive element needs a pressed
  state at **`PRESSED_OPACITY`** (0.72). Import the constant from `@/design`; don't
  retype `0.72`.
- **48dp minimum tap target** (`MIN_TOUCH_TARGET`), including icon-only buttons, even
  where the drawn control is smaller — pad the tap area.

### No raw hex / stock palette in NEW code

New components bind to tokens — no raw hex, no stock Tailwind palette (`bg-amber-100`,
`text-neutral-500`, …). This is a convention, **not** an enforced lint rule: a repo-wide
rule would flag the un-migrated Week 1–3 screens, which is a Week 8 concern. Reviewers
watch for it in new files.

## State coverage patterns

Extracted from the Week-3 dashboard screens and the Week-4 drive-detail polish pass. The
loading/error/empty bar every data-backed screen holds to.

### Skeleton-first loading, per-shape empty, blocking-vs-soft error

- **Loading is a skeleton, not a spinner** — a placeholder shaped like the content that's
  coming (see `DriveDetailSkeleton`, `DrivesListSkeleton`, `LastDriveCardSkeleton`). Mark
  skeletons `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`.
- **Distinguish first-load from load-more.** A paginated list shows the full skeleton on
  first page (`isPending`) and a small **footer** skeleton while fetching the next page
  (`isFetchingNextPage`) — never a blank screen on page 2 (see `drives/index.tsx`).
- **Primary query blocks; secondary queries fail soft.** The one query the screen can't
  exist without (e.g. `useDrive`, `useVehicle`) renders a full error + retry. Every
  *secondary* query (diagnostics, telemetry, current-state) degrades **just its own section**
  and never crashes the screen — an error there reads as its section's empty/quiet-error
  state. This is deliberate, not a stub.

### One query backing many cards → hoist the error to the section

When a **single** query feeds several sibling cards (e.g. the ONE `get_drive_telemetry`
read behind the Speed/Boost/Coolant trio), an error is a **whole-section event** — render it
**once** (one message + one retry) at the section level, not as N identical per-card error
boxes. Keep **loading** (skeletons) and **empty** *per-card*, because emptiness is genuinely
per-card (boost can be absent while speed has data). See `[driveId].tsx` `TelemetrySectionError`
+ the charts section. This recurs anywhere one fetch fans out into repeated cards.

### Victory Native charts auto-scale x-domain per instance

`CartesianChart` (Victory Native) auto-scales its x-domain to whatever data **that one
instance** is handed — there is no shared or absolute time axis across sibling charts, even
when they're fed from the same source. So when several cards are built from one read (the
Speed/Boost/Coolant trio off a single `get_drive_telemetry`), a point one card correctly drops
(an early boost-less sample excluded by `splitTelemetryChannels`' missing-≠-zero rule) produces
**no visible gap** — that card's axis simply starts later. Don't reason about what a chart
*should* visually show — especially missing-data or gap-based checks — as if the cards shared
one absolute axis; they don't. Verify per-point / missing-data logic with **unit tests on the
data transform** (`splitTelemetryChannels`), not by eyeballing the chart. (Learned verifying
PR #34's charts on-device; see workdiary session 30. Applies to any future multi-chart screen —
e.g. the Week-5 Diagnostic Card.)

### Honest placeholder for an un-plumbed capability

A designed slot whose data isn't wired yet gets an **honest empty state**, never "coming
soon." State the current reality in the product's calibrated-honesty voice (design §8) —
e.g. the drive-detail route-map slot reads "No route to show — this drive has no GPS location
data," gated behind a `TODO(…)` that names the missing key + missing library, with **no
dependency added**. Distinct from a provisional guess (`TODO(metric-keys)`): this is a
*missing* capability, not a *guessed* one.
