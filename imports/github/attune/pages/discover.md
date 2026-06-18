# Attune Discover Page — Visual and Implementation Spec

**Document purpose:** This spec gives an implementation agent enough detail to one-shot the Attune **Discover** page in the current dark editorial instrumentation style.

**Page:** `Discover`

**Route:** `DiscoverRoute`

**Primary implementation target:** FoldKit page module under `src/page/discover/`

**Visual direction:** dark editorial instrumentation; quiet artifact-review UI; generated editorial dossier inside a deterministic layout shell.

---

## 1. Product intent

The Discover page is not a scan-results table.

It is Attune’s **pattern shelf**: the place where the product says, “Here are the patterns I think I heard in this codebase. Some are ready to inspect. Some are noisy. Some need examples. Which one should we tune?”

The Workbench is for inspecting one candidate in detail. Discover is for choosing which pattern deserves that attention.

The page should feel like:

```text
field guide
editorial index
pattern shelf
codebase listening room
curated dossier browser
```

It should not feel like:

```text
security alert queue
lint violations table
observability dashboard
admin data grid
AI chat transcript
search results page
```

The page’s conceptual job:

```text
scan produces candidate pattern dossiers
→ user browses by readiness
→ user selects one pattern
→ right pane explains why it exists
→ user opens it in Workbench, defers it, or rejects it
```

---

## 2. Design thesis

The Discover page should combine a structured list with an editorial preview.

The list gives scan breadth. The dossier gives meaning.

```text
Left side:  pattern shelf
Right side: selected pattern dossier
Top:        repository / branch / scan context / readiness filters
```

The agent may generate prose, example snippets, icon choices, risk notes, and deterministic-shape descriptions. The agent must not generate the page skeleton.

FoldKit owns:

```text
layout
routing
state transitions
selection
filtering
sorting
action semantics
animation states
accessibility
```

The agent owns only typed content slots:

```text
title
intent
icon token
why noticed
supporting examples
possible deterministic shape
known risk
readiness explanation
suggested next step
```

The page should communicate that Attune is attentive and rigorous, not accusatory.

Use language like:

```text
Ready to inspect
Needs examples
Probably too broad
Promoted
Open in Workbench
Defer
Reject
```

Avoid language like:

```text
Violation
Threat
Failure
Detected by AI
Policy breach
Compliance object
```

---

## 3. Page-level information architecture

### 3.1 Required page regions

The Discover page renders inside the existing Attune shell.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ App shell                                                                    │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar       │ Discover page                                                │
│               │                                                             │
│ Brand         │ Topbar / repository context                                  │
│ Nav           │ Page title + scan summary + Start scan                       │
│ Candidate     │ Readiness filter tabs + search                               │
│ context       │                                                             │
│ Repo summary  │ ┌───────────────────────┬─────────────────────────────────┐ │
│ User          │ │ Pattern shelf          │ Editorial dossier               │ │
│               │ │ scrollable cards       │ selected pattern preview        │ │
│               │ └───────────────────────┴─────────────────────────────────┘ │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

### 3.2 Discover is a two-pane route

Inside `.attune-main`, Discover should be a viewport-contained page similar to the Workbench:

```text
.discover-page
  .discover-topbar
  .discover-header
  .discover-controls
  .discover-body
    .pattern-shelf
    .pattern-dossier
```

### 3.3 Main interaction loop

```text
1. Page loads repository scan state.
2. Readiness groups display counts.
3. Pattern shelf displays cards matching active filter and search.
4. First ready pattern is selected by default.
5. Right dossier renders generated editorial explanation for selected pattern.
6. User chooses:
   - Open in Workbench
   - Defer
   - Reject
   - Start scan / rescan repository
```

### 3.4 Relationship to the sidebar

The global sidebar may still include compact “Current candidate” and repository context. The Discover route itself should not duplicate the sidebar’s full navigation. The Discover route owns the larger, richer pattern shelf.

On the Workbench, potential patterns live compactly in the sidebar. On Discover, they expand into the main page.

---

## 4. Exact visual mood

Use the cleaner style from the Findings, Lineage, Exports, and simplified Settings mockups.

Call it:

```text
dark editorial instrumentation
```

Characteristics:

- dark graphite background, not pure black
- thin quiet borders
- editorial serif headings
- sans-serif controls and metadata
- code panes as evidence, not terminal logs
- warm green for accepted/readiness
- amber for needs examples or pending work
- blue/violet for selected/generated identity
- clay red only for reject/false-positive/negative state
- spacious cards with restrained density
- no neon glow
- no decorative parchment texture
- no generic dashboard charts
- no glassmorphism

The paper metaphor is philosophical, not literal. The UI behaves like a dossier, but it should not look like stationery.

---

## 5. Content model

### 5.1 TypeScript model sketch

```ts
type PatternReadiness =
  | 'ready_to_inspect'
  | 'needs_examples'
  | 'too_broad'
  | 'promoted'
  | 'deferred'
  | 'rejected'

type PatternIconToken =
  | 'leaf'
  | 'boundary'
  | 'layers'
  | 'key'
  | 'spark'
  | 'compass'
  | 'archive'
  | 'flask'
  | 'branch'
  | 'shield'
  | 'palette'
  | 'box'
  | 'database'
  | 'route'
  | 'imports'
  | 'code'

type PatternDossier = {
  readonly id: PatternId
  readonly title: string
  readonly icon: PatternIconToken
  readonly readiness: PatternReadiness
  readonly readinessLabel: string
  readonly intent: string
  readonly whyNoticed: string
  readonly evidenceSummary: EvidenceSummary
  readonly supportingExamples: ReadonlyArray<SupportingExamplePreview>
  readonly deterministicShape: DeterministicShapePreview
  readonly knownRisk: string
  readonly nextAction:
    | 'open_workbench'
    | 'needs_examples'
    | 'defer'
    | 'reject'
    | 'view_export'
  readonly generatedAt: string
  readonly scanId: ScanId
}

type EvidenceSummary = {
  readonly matchCount: number
  readonly fileCount: number
  readonly confidence: 'low' | 'medium' | 'high'
  readonly determinism: 'heuristic' | 'likely' | 'strong'
  readonly lastScannedLabel: string
  readonly tags: ReadonlyArray<string>
}

type SupportingExamplePreview = {
  readonly filePath: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly language: 'ts' | 'tsx' | 'yaml' | 'text'
  readonly highlightedCode: HighlightedCode
  readonly caption: string
  readonly source: 'repo' | 'synthetic' | 'review_comment' | 'agent_generated'
}

type DeterministicShapePreview = {
  readonly engine: 'ast-grep'
  readonly description: string
  readonly code: HighlightedCode
  readonly scopeLabel: string
}

type DiscoverModel = {
  readonly repoName: string
  readonly branchName: string
  readonly scanState: ScanState
  readonly activeFilter: DiscoverFilter
  readonly searchQuery: string
  readonly sortMode: DiscoverSortMode
  readonly selectedPatternId: PatternId
  readonly patterns: ReadonlyArray<PatternDossier>
  readonly motion: DiscoverMotion
}

type ScanState =
  | { readonly _tag: 'NotScanned' }
  | { readonly _tag: 'Scanning'; readonly startedAt: string }
  | { readonly _tag: 'Materializing'; readonly visibleGroupCount: number }
  | {
      readonly _tag: 'Complete'
      readonly completedAt: string
      readonly patternCount: number
    }
  | { readonly _tag: 'Failed'; readonly reason: string }

type DiscoverFilter =
  | 'all'
  | 'ready_to_inspect'
  | 'needs_examples'
  | 'too_broad'
  | 'promoted'
  | 'deferred'
  | 'rejected'

type DiscoverSortMode =
  | 'most_evidence'
  | 'highest_confidence'
  | 'recently_found'
  | 'readiness'

type DiscoverMotion =
  | { readonly _tag: 'Still' }
  | { readonly _tag: 'Scanning' }
  | { readonly _tag: 'MaterializingPatterns'; readonly group: PatternReadiness }
  | {
      readonly _tag: 'SwitchingPattern'
      readonly from: PatternId
      readonly to: PatternId
    }
  | { readonly _tag: 'OpeningWorkbench'; readonly patternId: PatternId }
```

### 5.2 Message sketch

```ts
type DiscoverMessage =
  | { readonly _tag: 'ClickedStartScan' }
  | { readonly _tag: 'ClickedPattern'; readonly patternId: PatternId }
  | { readonly _tag: 'ChangedFilter'; readonly filter: DiscoverFilter }
  | { readonly _tag: 'ChangedSearchQuery'; readonly query: string }
  | { readonly _tag: 'ChangedSortMode'; readonly sortMode: DiscoverSortMode }
  | { readonly _tag: 'ClickedOpenWorkbench'; readonly patternId: PatternId }
  | { readonly _tag: 'ClickedDeferPattern'; readonly patternId: PatternId }
  | { readonly _tag: 'ClickedRejectPattern'; readonly patternId: PatternId }
  | { readonly _tag: 'DismissedToast' }
```

### 5.3 Agent-generated content contract

The agent may produce:

```text
pattern title
pattern icon token
one-line intent
why Attune noticed this
supporting example selection
supporting example captions
possible deterministic shape description
known risk
readiness label
metadata tags
```

The agent must not produce:

```text
arbitrary HTML
arbitrary CSS
arbitrary SVG markup
layout decisions
new button labels outside the allowed action vocabulary
unbounded markdown blocks
raw provider responses
```

Agent content should be validated before entering the page model.

All generated prose should be short and editorial. The dossier is a compact field note, not a blog post.

---

## 6. Mock data for first implementation

Use this fixture content for the first Discover screen.

### 6.1 Page summary

```text
Repository: bulletproof-react
Branch: main
Page title: Discover
Page subtitle: Attune found 12 possible patterns in bulletproof-react.
Scan state: Scan completed · 2 min ago
```

### 6.2 Readiness counts

```text
Ready to inspect: 5
Needs examples: 3
Too broad: 2
Promoted: 2
```

### 6.3 Pattern cards

#### Card 1 — selected

```text
Title: Styling belongs in UI primitives and recipes
Intent: Keep visual styling centralized so app components stay structural.
Evidence: 34 matches · 12 files
Tags: JSX style / className
Readiness: Ready to inspect
Icon: palette or leaf
```

#### Card 2

```text
Title: Effects stay at the boundary
Intent: Side effects should live in loaders, actions, or infrastructure adapters.
Evidence: 14 matches · 5 files
Tags: imports / fetch / IO
Readiness: Ready to inspect
Icon: boundary
```

#### Card 3

```text
Title: Domain logic in domain layer
Intent: Complex business logic appears in UI routes and should be moved inward.
Evidence: 9 matches · 7 files
Tags: business logic heuristics
Readiness: Needs examples
Icon: layers
```

#### Card 4

```text
Title: No raw secrets in source
Intent: Secrets, keys, and tokens should not appear in committed code.
Evidence: 6 matches · 4 files
Tags: strings / env / secrets
Readiness: Too broad
Icon: key
```

#### Card 5

```text
Title: Consistent error handling strategy
Intent: Error handling should use the project’s shared result shape.
Evidence: 4 matches · 3 files
Tags: try/catch / Result / Either
Readiness: Needs examples
Icon: shield
```

### 6.4 Selected dossier content

```text
Title: Styling belongs in UI primitives and recipes
Status chip: Ready to inspect
Intent: Keep visual styling centralized so app components stay structural and token-driven.

Why Attune noticed this:
We found repeated inline styling and className usage outside UI primitive paths. The pattern appears in app components that otherwise read as structural React code.

Supporting examples:
1. src/features/dashboard/StatsCard.tsx
2. src/components/UserAvatar.tsx

Possible deterministic shape:
ast-grep can approximate this pattern with JSX style/className selectors scoped outside UI primitive, recipe, and token definition paths.

Known risk:
May catch layout-only or animation styles that are intentionally local to a component. The Workbench should inspect examples before promotion.

Footer metrics:
Evidence: 34 matches
Files: 12
Confidence: High
Determinism: Likely
Last scanned: 2 min ago
```

### 6.5 Example snippets

Use two small code previews, not full files.

```tsx
// src/features/dashboard/StatsCard.tsx
return (
  <div
    style={{
      padding: '16px',
      borderRadius: 8,
      background: '#1f2937',
      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    }}
  >
    <h3>{title}</h3>
    {children}
  </div>
)
```

```tsx
// src/components/UserAvatar.tsx
return (
  <img
    src={src}
    style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      objectFit: 'cover',
    }}
    alt={name}
  />
)
```

### 6.6 Deterministic-shape preview

```yaml
pattern: $EL[style={$OBJ}]
pattern-not: $EL[style={$OBJ}] inside **/(ui|components|primitives|recipes)/**
```

---

## 7. Exact layout specification

### 7.1 Desktop geometry

Target viewport: 1440×900 and 1536×864.

The page should fit inside the shell without document-level body scrolling. Local scroll is allowed in the pattern shelf and dossier content.

```css
.discover-page {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
```

Rows:

1. `.discover-topbar` — repo / branch / scan state
2. `.discover-header` — title, subtitle, start scan action
3. `.discover-controls` — readiness tabs, search, sort
4. `.discover-body` — shelf + dossier

Main body:

```css
.discover-body {
  display: grid;
  grid-template-columns: minmax(26rem, 0.82fr) minmax(34rem, 1.18fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}
```

At desktop width, the shelf is left and dossier is right.

At narrow width, collapse into one-column document flow:

```css
@media (max-width: 960px) {
  .discover-page {
    height: auto;
    overflow: visible;
  }

  .discover-body {
    grid-template-columns: 1fr;
    overflow: visible;
  }
}
```

### 7.2 Spacing

Use the same shell padding as current app:

```css
.attune-main {
  padding: 1.6rem 1.85rem;
}
```

Inside Discover:

```text
gap between major rows: 1rem
card padding: 1rem
large card padding: 1.2rem
filter tab height: 2.75rem
pattern card min-height: 8.8rem
preview code card min-height: 12rem
```

### 7.3 Header composition

```text
Topbar:
  left: repo chip, branch chip
  right: scan state chip

Header:
  left: title + subtitle
  right: Start scan button
```

Header should not include many buttons.

Only one primary page-level action:

```text
Start scan
```

If a scan is already running, replace with:

```text
Scanning…
```

The scan action should not be oversized; it is important but not louder than the selected dossier.

---

## 8. Component-level specification

## 8.1 Readiness filter tabs

Render as segmented pills under the header.

Required tabs:

```text
Ready to inspect 5
Needs examples 3
Too broad 2
Promoted 2
All 12
```

`All` may appear at the end or beginning. Preferred order:

```text
Ready to inspect | Needs examples | Too broad | Promoted | All
```

Each tab includes:

- status dot
- label
- count badge

Visual states:

```text
selected: subtle panel fill + stronger border + text primary
hover: slightly stronger border
focus: accessible outline
inactive: muted text + subtle border
```

Do not use saturated backgrounds. Let the dot carry semantic color.

## 8.2 Search and sort

Search appears right-aligned in `.discover-controls`.

```text
Search patterns…
```

Keyboard shortcut hint may show `/` at the right edge.

Sort control should be quiet:

```text
Sort: Most evidence
```

Sorting modes:

```text
Most evidence
Highest confidence
Recently found
Readiness
```

If horizontal space is tight, search and sort wrap below the tabs.

## 8.3 Pattern shelf

The shelf panel is a scrollable list with a small title row.

```text
Patterns                           Sort: Most evidence
```

Pattern shelf styling:

```css
.pattern-shelf {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.pattern-list {
  display: grid;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  padding: 0.7rem;
}
```

### 8.3.1 Pattern card anatomy

Each card should look like a compact dossier index card.

```text
┌──────────────────────────────────────────────┐
│ [icon]  Pattern title                  >     │
│         One-line intent                      │
│         34 matches · 12 files · JSX style    │
│         ● Ready to inspect                   │
└──────────────────────────────────────────────┘
```

Required elements:

- generated icon circle
- title
- one-line intent
- evidence row
- readiness chip / dot
- chevron
- selected state

Card action:

```text
Click / Enter selects the pattern and updates the dossier.
```

Do not put “Open in Workbench” on every card. It belongs in the selected dossier.

### 8.3.2 Pattern card states

```text
normal
hover
focus-visible
selected
materializing
rejected/deferred
promoted
```

Selected state:

- stronger sage border if ready
- subtle left inset stripe
- card background slightly warmer/brighter
- `aria-selected="true"`

Rejected/deferred cards should remain visible when the filter includes them, but subdued.

Promoted card should show a quiet `Promoted` chip.

## 8.4 Editorial dossier

The right pane is the selected pattern’s generated field note.

It should read like a small markdown document, but be rendered as structured components.

Dossier structure:

```text
┌──────────────────────────────────────────────────────────┐
│ [large icon] Title                         [Open button] │
│              status chip                                │
│                                                          │
│ Why Attune noticed this                                  │
│ paragraph                                                │
│                                                          │
│ Supporting examples                                      │
│ ┌ code preview ┐ ┌ code preview ┐                       │
│                                                          │
│ Possible deterministic shape                             │
│ description                                             │
│ code preview                                             │
│                                                          │
│ Known risk                                               │
│ paragraph                                                │
│                                                          │
│ Evidence | Files | Confidence | Determinism | Last scan  │
└──────────────────────────────────────────────────────────┘
```

The dossier should be scrollable locally if content overflows, but at normal desktop size it should fit.

### 8.4.1 Dossier header

```text
left: generated icon in large circle
middle: title, readiness chip
right: Open in Workbench button
```

The title may use the editorial serif.

The readiness chip is small and semantic.

Primary action: `Open in Workbench`.

Secondary actions appear below or in a quiet decision row:

```text
Defer
Reject
```

Do not show `Promote` in the default Discover dossier. Promotion belongs in Workbench/Export after inspection.

### 8.4.2 Why Attune noticed this

This is generated prose.

Constraints:

```text
1–3 sentences
maximum 280 characters preferred
must describe evidence, not certainty
must not say “violation”
```

Good:

```text
We found repeated inline styling and className usage outside UI primitive paths. The pattern appears in app components that otherwise read as structural React code.
```

Bad:

```text
The AI detected multiple violations of the styling compliance rule.
```

### 8.4.3 Supporting examples

Render two examples side-by-side on desktop.

Each example card includes:

```text
file path
line range
source badge if synthetic/repo
highlighted code preview
caption
```

Keep previews short, around 8–12 lines. Use Shiki HighlightedCode model, rendered as FoldKit Html spans.

If only one supporting example exists, render one wide card and show “Needs examples” status.

If no examples exist, render a quiet empty state:

```text
Needs examples
Attune has a possible deterministic shape, but not enough grounded examples yet.
```

### 8.4.4 Possible deterministic shape

This is a compact code preview, not the full rule.

It should show enough to explain what the deterministic artifact might become.

Label:

```text
Possible deterministic shape
ast-grep · approximate selector
```

This panel should visually signal “not final.” Use muted blue/violet, not green.

### 8.4.5 Known risk

One short paragraph.

This makes the agent feel honest. It prevents the page from overclaiming.

Good:

```text
May catch layout-only or animation styles that are intentionally local to a component.
```

### 8.4.6 Evidence footer

A thin footer row with five values:

```text
Evidence        34 matches
Files           12
Confidence      High
Determinism     Likely
Last scanned    2 min ago
```

This should feel like metadata, not analytics.

No charts.

No large dashboard numbers.

---

## 9. Actions and semantics

### 9.1 Page-level action

```text
Start scan
```

Meaning: ask Attune to discover/update possible patterns for the current repository and branch.

State transitions:

```text
Complete / NotScanned -> Scanning -> Materializing -> Complete
Failed -> Scanning
```

### 9.2 Selected-candidate actions

Primary:

```text
Open in Workbench
```

Meaning: route to Workbench with this candidate selected.

Secondary:

```text
Defer
Reject
```

Defer means “not now.”

Reject means “this pattern is not useful / not real.”

Reject should require a confirmation if the candidate has high confidence or was previously reviewed.

### 9.3 What not to include

Do not include:

```text
Promote directly from Discover
Auto-fix
Generate PR
Ask AI
Open chat
Edit YAML
Show all logs
```

Those actions belong downstream or behind explicit product commands.

Discover is for choosing what deserves inspection.

---

## 10. Animation spec

Motion must be causal, not decorative.

Use FoldKit model state for meaningful state transitions.

### 10.1 Scan materialization

When user starts scan:

```text
Start scan clicked
→ button becomes Scanning…
→ scan chip pulses quietly
→ when complete, filter counts update
→ cards appear in readiness groups with a slight stagger
```

Card materialization:

```css
@keyframes attune-card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Duration: 220–320ms.

Stagger: 35–60ms per card.

Do not typewriter text.

### 10.2 Pattern selection

When user selects a pattern:

```text
selected card border brightens
old dossier fades out by 8px left
new dossier fades in by 8px right
icon changes with a subtle scale-in
```

Duration: 160–240ms.

### 10.3 Open in Workbench

When user opens a pattern:

```text
selected card/dossier gets subtle pressed state
route changes
Workbench header receives selected pattern
```

If a transition animation is implemented later, the card title may visually connect to Workbench title. Do not implement complicated morphing in the first pass unless FoldKit animation support makes it simple.

### 10.4 Defer / Reject

When defer or reject completes:

```text
card status chip changes
card moves to appropriate filter only after a short acknowledgement
small toast: “Pattern deferred” or “Pattern rejected”
```

Do not remove immediately without feedback.

---

## 11. Accessibility

### 11.1 Keyboard

Required keyboard support:

```text
Tab to filter tabs
Arrow keys may move between filter tabs
Tab to search
Tab to pattern shelf
ArrowUp / ArrowDown moves selected pattern card
Enter opens selected dossier focus or selects card
Cmd/Ctrl+Enter opens selected pattern in Workbench when focus is in dossier
Esc clears search or closes confirmation
```

### 11.2 Semantics

Pattern shelf can be modeled as:

```html
<section aria-label="Pattern shelf">
  <div role="listbox" aria-label="Possible patterns">
    <button role="option" aria-selected="true">...</button>
  </div>
</section>
```

Or simpler semantic buttons inside a list are acceptable.

### 11.3 Color

Do not rely on color alone.

Every status must include text:

```text
Ready to inspect
Needs examples
Too broad
Promoted
Deferred
Rejected
```

### 11.4 Reduced motion

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .discover-page *,
  .discover-page *::before,
  .discover-page *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 12. Detailed CSS reference

This CSS is intentionally close to implementation-ready. Adapt class names only if the FoldKit view chooses a different structure.

```css
/* -------------------------------------------------------------------------- */
/* Discover page root                                                         */
/* -------------------------------------------------------------------------- */

.discover-page {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--attune-text-primary);
}

.discover-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  color: var(--attune-text-muted);
}

.discover-repo-context,
.discover-scan-state {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.discover-repo-chip,
.discover-branch-chip,
.discover-scan-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.35rem;
  padding: 0.45rem 0.72rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-secondary);
}

.discover-repo-chip strong {
  color: var(--attune-text-primary);
  font-weight: 650;
}

.discover-scan-chip.is-complete {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-sage) 28%,
    var(--attune-border-panel)
  );
  color: var(--attune-text-secondary);
}

.discover-scan-chip.is-scanning {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-blue) 36%,
    var(--attune-border-panel)
  );
}

.discover-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 0;
}

.discover-title-group {
  min-width: 0;
}

.discover-title {
  margin: 0 0 0.4rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.025em;
  color: var(--attune-text-primary);
}

.discover-subtitle {
  margin: 0;
  max-width: 56rem;
  color: var(--attune-text-muted);
  font-size: 0.98rem;
  line-height: 1.5;
}

.discover-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  flex: none;
}

.discover-start-scan {
  min-width: 8.5rem;
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

.discover-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 28rem);
  gap: 1rem;
  align-items: center;
  min-width: 0;
}

.discover-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
}

.discover-filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.6rem;
  padding: 0.52rem 0.78rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.018);
  color: var(--attune-text-muted);
  cursor: pointer;
}

.discover-filter-tab:hover {
  border-color: var(--attune-border-strong);
  color: var(--attune-text-secondary);
}

.discover-filter-tab.is-selected {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-sage) 45%,
    var(--attune-border-panel)
  );
  background: rgba(141, 186, 111, 0.08);
  color: var(--attune-text-primary);
}

.discover-filter-dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: var(--attune-text-faint);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.025);
}

.discover-filter-tab.is-ready .discover-filter-dot {
  background: var(--attune-accent-sage);
}

.discover-filter-tab.is-needs-examples .discover-filter-dot {
  background: var(--attune-accent-amber);
}

.discover-filter-tab.is-too-broad .discover-filter-dot {
  background: var(--attune-accent-blue);
}

.discover-filter-tab.is-promoted .discover-filter-dot {
  background: var(--attune-accent-violet);
}

.discover-filter-count {
  display: inline-grid;
  min-width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--attune-text-secondary);
  font-size: 0.78rem;
}

.discover-search-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  min-width: 0;
}

.discover-search {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}

.discover-search input {
  width: 100%;
  min-height: 2.6rem;
  padding: 0.55rem 2.2rem 0.55rem 2.3rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  outline: none;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-primary);
  font: inherit;
}

.discover-search input::placeholder {
  color: var(--attune-text-faint);
}

.discover-search input:focus {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-blue) 45%,
    var(--attune-border-strong)
  );
  box-shadow: 0 0 0 3px rgba(110, 145, 184, 0.12);
}

.discover-search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--attune-text-muted);
}

.discover-search-shortcut {
  position: absolute;
  right: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-grid;
  min-width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 5px;
  color: var(--attune-text-faint);
  font-size: 0.75rem;
}

/* -------------------------------------------------------------------------- */
/* Body                                                                       */
/* -------------------------------------------------------------------------- */

.discover-body {
  display: grid;
  grid-template-columns: minmax(26rem, 0.82fr) minmax(34rem, 1.18fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.discover-panel {
  min-height: 0;
  border: 1px solid var(--attune-border-panel);
  border-radius: 10px;
  background: rgba(19, 25, 27, 0.78);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.18),
    0 12px 32px rgba(0, 0, 0, 0.16);
}

.pattern-shelf {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pattern-shelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.35rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--attune-border-panel);
}

.pattern-shelf-title {
  margin: 0;
  color: var(--attune-text-primary);
  font-size: 0.95rem;
  font-weight: 650;
}

.pattern-sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.55rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--attune-text-muted);
  cursor: pointer;
}

.pattern-sort-button:hover {
  border-color: var(--attune-border-panel);
  color: var(--attune-text-secondary);
}

.pattern-list {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem;
}

/* -------------------------------------------------------------------------- */
/* Pattern cards                                                              */
/* -------------------------------------------------------------------------- */

.discover-pattern-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  width: 100%;
  min-height: 8.7rem;
  padding: 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
}

.discover-pattern-card:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.04);
}

.discover-pattern-card:focus-visible {
  outline: 3px solid rgba(110, 145, 184, 0.25);
  outline-offset: 2px;
}

.discover-pattern-card.is-selected {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-sage) 58%,
    var(--attune-border-panel)
  );
  background: rgba(141, 186, 111, 0.07);
  box-shadow: inset 3px 0 0 var(--attune-accent-sage);
}

.discover-pattern-card.is-deferred,
.discover-pattern-card.is-rejected {
  opacity: 0.62;
}

.discover-pattern-icon {
  display: grid;
  width: 3.2rem;
  height: 3.2rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  background: rgba(141, 186, 111, 0.1);
  color: var(--attune-accent-sage);
}

.discover-pattern-card.is-needs-examples .discover-pattern-icon {
  background: rgba(196, 154, 74, 0.1);
  color: var(--attune-accent-amber);
}

.discover-pattern-card.is-too-broad .discover-pattern-icon {
  background: rgba(110, 145, 184, 0.1);
  color: var(--attune-accent-blue);
}

.discover-pattern-card.is-promoted .discover-pattern-icon {
  background: rgba(124, 92, 229, 0.12);
  color: var(--attune-accent-violet);
}

.discover-pattern-content {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.discover-pattern-title {
  margin: 0;
  color: var(--attune-text-primary);
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.3;
}

.discover-pattern-intent {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.9rem;
  line-height: 1.42;
}

.discover-pattern-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.8rem;
  color: var(--attune-text-secondary);
  font-size: 0.84rem;
}

.discover-pattern-meta span {
  white-space: nowrap;
}

.discover-readiness-line {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--attune-accent-sage);
  font-size: 0.86rem;
}

.discover-readiness-line.is-needs-examples {
  color: var(--attune-accent-amber);
}

.discover-readiness-line.is-too-broad {
  color: var(--attune-accent-blue);
}

.discover-readiness-line.is-promoted {
  color: var(--attune-accent-violet);
}

.discover-card-chevron {
  align-self: center;
  color: var(--attune-text-muted);
}

/* -------------------------------------------------------------------------- */
/* Dossier                                                                    */
/* -------------------------------------------------------------------------- */

.pattern-dossier {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.pattern-dossier-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
  padding: 1.25rem 1.35rem 1rem;
  border-bottom: 1px solid var(--attune-border-panel);
}

.pattern-dossier-icon {
  display: grid;
  width: 4.15rem;
  height: 4.15rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  background: rgba(141, 186, 111, 0.11);
  color: var(--attune-accent-sage);
}

.pattern-dossier-heading {
  min-width: 0;
}

.pattern-dossier-title {
  margin: 0 0 0.45rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.65rem, 2.2vw, 2.25rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: var(--attune-text-primary);
}

.pattern-dossier-intent {
  margin: 0;
  max-width: 48rem;
  color: var(--attune-text-muted);
  font-size: 0.94rem;
  line-height: 1.5;
}

.pattern-dossier-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex: none;
}

.pattern-dossier-scroll {
  min-height: 0;
  overflow: auto;
  padding: 1.2rem 1.35rem;
}

.dossier-section {
  margin-bottom: 1.35rem;
}

.dossier-section:last-child {
  margin-bottom: 0;
}

.dossier-section-title {
  margin: 0 0 0.52rem;
  color: var(--attune-text-primary);
  font-size: 1rem;
  font-weight: 650;
}

.dossier-section p {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.94rem;
  line-height: 1.52;
}

.supporting-examples-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.supporting-example-card {
  overflow: hidden;
  border: 1px solid var(--attune-border-panel);
  border-radius: 9px;
  background: rgba(13, 19, 21, 0.72);
}

.supporting-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.6rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--attune-border-panel);
  color: var(--attune-text-secondary);
  font-size: 0.82rem;
}

.supporting-example-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.supporting-example-badge {
  flex: none;
  color: var(--attune-text-muted);
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.supporting-example-card .code-pane {
  min-height: 10rem;
  max-height: 14rem;
  border: 0;
  border-radius: 0;
  background: var(--attune-bg-code);
}

.shape-preview {
  display: grid;
  gap: 0.65rem;
}

.shape-preview-description {
  color: var(--attune-text-muted);
  font-size: 0.93rem;
  line-height: 1.5;
}

.shape-code-card {
  overflow: hidden;
  border: 1px solid var(--attune-border-panel);
  border-radius: 9px;
  background: rgba(13, 19, 21, 0.72);
}

.shape-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--attune-border-panel);
  color: var(--attune-text-secondary);
  font-size: 0.82rem;
}

.shape-code-card .code-pane {
  max-height: 8.5rem;
  border: 0;
  border-radius: 0;
}

.known-risk-card {
  padding: 0.85rem 0.95rem;
  border: 1px solid
    color-mix(
      in srgb,
      var(--attune-accent-amber) 24%,
      var(--attune-border-panel)
    );
  border-radius: 9px;
  background: rgba(196, 154, 74, 0.055);
}

.known-risk-card p {
  color: var(--attune-text-secondary);
}

.dossier-footer {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-top: 1px solid var(--attune-border-panel);
}

.dossier-footer-metric {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.85rem 1rem;
  border-right: 1px solid var(--attune-border-panel);
}

.dossier-footer-metric:last-child {
  border-right: 0;
}

.dossier-footer-metric span {
  color: var(--attune-text-muted);
  font-size: 0.78rem;
}

.dossier-footer-metric strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--attune-text-secondary);
  font-size: 0.95rem;
  font-weight: 550;
}

/* -------------------------------------------------------------------------- */
/* Decision row / buttons                                                     */
/* -------------------------------------------------------------------------- */

.dossier-decision-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--attune-border-panel);
}

.dossier-decision-copy {
  color: var(--attune-text-muted);
  font-size: 0.88rem;
}

.dossier-secondary-actions {
  display: inline-flex;
  gap: 0.55rem;
}

.button.danger-subtle {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-clay) 30%,
    var(--attune-border-panel)
  );
  color: color-mix(
    in srgb,
    var(--attune-accent-clay) 88%,
    var(--attune-text-primary)
  );
  background: rgba(196, 106, 84, 0.045);
}

.button.warning-subtle {
  border-color: color-mix(
    in srgb,
    var(--attune-accent-amber) 30%,
    var(--attune-border-panel)
  );
  color: color-mix(
    in srgb,
    var(--attune-accent-amber) 82%,
    var(--attune-text-primary)
  );
  background: rgba(196, 154, 74, 0.045);
}

/* -------------------------------------------------------------------------- */
/* Empty / loading / error                                                    */
/* -------------------------------------------------------------------------- */

.discover-empty-state,
.discover-error-state,
.discover-loading-state {
  display: grid;
  place-items: center;
  min-height: 22rem;
  padding: 2rem;
  text-align: center;
}

.discover-empty-card,
.discover-error-card,
.discover-loading-card {
  max-width: 34rem;
  padding: 1.6rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 12px;
  background: rgba(19, 25, 27, 0.78);
}

.discover-empty-card h2,
.discover-error-card h2,
.discover-loading-card h2 {
  margin: 0 0 0.5rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 500;
}

.discover-empty-card p,
.discover-error-card p,
.discover-loading-card p {
  margin: 0 0 1.1rem;
  color: var(--attune-text-muted);
  line-height: 1.55;
}

/* -------------------------------------------------------------------------- */
/* Motion                                                                     */
/* -------------------------------------------------------------------------- */

.discover-pattern-card.is-entering {
  animation: attune-card-enter 260ms ease both;
}

.pattern-dossier.is-switching {
  animation: attune-dossier-switch 220ms ease both;
}

@keyframes attune-card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes attune-dossier-switch {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .discover-page *,
  .discover-page *::before,
  .discover-page *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* -------------------------------------------------------------------------- */
/* Responsive                                                                 */
/* -------------------------------------------------------------------------- */

@media (max-height: 780px) and (min-width: 961px) {
  .discover-page {
    gap: 0.7rem;
  }

  .discover-title {
    font-size: clamp(1.7rem, 2.2vw, 2.25rem);
  }

  .discover-pattern-card {
    min-height: 7.6rem;
    padding: 0.78rem;
  }

  .pattern-dossier-header,
  .pattern-dossier-scroll {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .supporting-example-card .code-pane {
    max-height: 11rem;
  }
}

@media (max-width: 960px) {
  .discover-page {
    height: auto;
    overflow: visible;
  }

  .discover-controls,
  .discover-body {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .discover-search-row {
    justify-content: stretch;
  }

  .pattern-list,
  .pattern-dossier-scroll {
    overflow: visible;
  }

  .supporting-examples-grid {
    grid-template-columns: 1fr;
  }

  .dossier-footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dossier-footer-metric:nth-child(2n) {
    border-right: 0;
  }

  .pattern-dossier-header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .pattern-dossier-actions {
    grid-column: 1 / -1;
    justify-content: stretch;
  }

  .pattern-dossier-actions .button {
    flex: 1 1 auto;
  }
}
```

---

## 13. FoldKit view structure

Suggested files:

```text
src/page/discover/
  index.ts
  init.ts
  model.ts
  message.ts
  update.ts
  view.ts
  command.ts
  view/
    filterTabs.ts
    patternCard.ts
    patternDossier.ts
    supportingExample.ts
    shapePreview.ts
    emptyStates.ts
```

### 13.1 Suggested view tree

```ts
export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('discover-page'), h.AriaLabel('Discover patterns')],
    [
      discoverTopbarView(model),
      discoverHeaderView(model),
      discoverControlsView(model),
      h.div(
        [h.Class('discover-body')],
        [patternShelfView(model), selectedPatternDossierView(model)],
      ),
    ],
  )
})
```

### 13.2 Empty state view

When no scan has run:

```text
No patterns have been proposed yet.

Attune can start from a recent scan, a few examples, or review comments.

[Start scan]
```

### 13.3 Loading state view

While scanning:

```text
Listening for codebase patterns…

Attune is reading repository structure and preparing candidate pattern dossiers.
```

Do not show a fake chat transcript.

### 13.4 Error state view

If scan fails:

```text
The scan could not finish.

Attune could not prepare pattern dossiers for this repository. The existing candidates are unchanged.

[Retry scan]
```

---

## 14. Route integration

The existing root route list already includes Discover, Workbench, Findings, Lineage, Exports, and Settings. Discover should replace the current stub for `DiscoverRoute`.

Root model should gain:

```ts
readonly discover: Discover.Model
```

Root message should gain:

```ts
GotDiscoverMessage
```

Root view should render:

```ts
DiscoverRoute: () =>
  h.submodel({
    slotId: 'discover',
    model: model.discover,
    view: Discover.view,
    toParentMessage: (message) => GotDiscoverMessage({ message }),
  })
```

When Discover emits `ClickedOpenWorkbench`, root or Discover command handling should select the candidate and navigate to Workbench.

---

## 15. Scene tests

Add FoldKit Scene tests that verify the visual architecture.

Required tests:

```text
1. Renders Discover page title and subtitle.
2. Renders readiness filter tabs with counts.
3. Renders pattern shelf with at least five pattern cards.
4. Renders selected pattern card with aria-selected or equivalent selected state.
5. Renders selected dossier title, status, why-noticed section, examples, deterministic-shape preview, known risk, and evidence footer.
6. Renders one primary page-level Start scan action.
7. Renders Open in Workbench in the selected dossier.
8. Does not render Promote as a Discover primary action.
9. Does not render raw agent markdown or arbitrary HTML.
10. Uses semantic status text in addition to color.
11. Search input is present and labeled.
12. Empty state is quiet and includes Start scan.
13. Loading state does not look like chat.
```

Suggested test names:

```text
main.scene.test.ts
- renders pattern shelf and selected dossier
- filters patterns by readiness
- opens selected pattern in Workbench
- defers a selected pattern
- rejects a selected pattern with confirmation
- renders scan empty state
```

---

## 16. Story tests

Required story tests:

```text
1. Selecting a pattern changes selectedPatternId.
2. Changing readiness filter updates visible pattern list.
3. Search query filters by title, intent, and tags.
4. Start scan transitions to Scanning state and emits scan command.
5. Scan completion materializes patterns and selects first ready pattern.
6. Open in Workbench emits route/selection command.
7. Defer updates candidate readiness to deferred.
8. Reject updates candidate readiness to rejected after confirmation path.
```

---

## 17. Agent prompt constraints for generated dossiers

If the Discover page uses an agent to generate dossier content, use a prompt shape like this:

```text
You are preparing an Attune pattern dossier for a codebase.

Return only structured JSON matching PatternDossierDraft.
Do not produce Markdown.
Do not produce HTML.
Do not invent actions.
Do not claim certainty.
Use calm editorial language.
Focus on evidence, examples, deterministic shape, and known risk.

The user will see this inside a fixed Discover page layout.
```

Generated text constraints:

```text
title: 4–10 words
intent: 1 sentence, <= 140 characters
whyNoticed: 1–3 sentences, <= 280 characters
knownRisk: 1 sentence, <= 180 characters
deterministicShape.description: 1 sentence, <= 180 characters
supportingExample.caption: <= 120 characters
```

---

## 18. Copy rules

Use:

```text
Discover
Attune found 12 possible patterns in bulletproof-react.
Ready to inspect
Needs examples
Too broad
Promoted
Open in Workbench
Defer
Reject
Start scan
Why Attune noticed this
Supporting examples
Possible deterministic shape
Known risk
Evidence
Files
Confidence
Determinism
Last scanned
```

Avoid:

```text
Violations
Compliance
AI detected
Policy enforcement
Hallucination
Autofix
Chat
Generate everything
```

---

## 19. Acceptance checklist

The Discover page is acceptable when:

- It reads as an editorial pattern shelf, not a dashboard.
- It has a left pattern list and right selected dossier.
- The right dossier feels like a generated field note rendered inside a fixed deterministic layout.
- There is exactly one page-level primary action: `Start scan`.
- There is exactly one selected-candidate primary action: `Open in Workbench`.
- `Defer` and `Reject` are quiet secondary decisions.
- There is no direct `Promote` action on Discover.
- It uses the dark editorial instrumentation style.
- It uses semantic color sparingly.
- It uses actual text labels for all status.
- It fits inside the desktop app shell with local scrolling.
- It does not render arbitrary generated HTML.
- It does not look like a table, dashboard, alert queue, or chat interface.

---

## 20. One-shot implementation instruction

Build `src/page/discover/` as a FoldKit page submodel using fixture-backed typed data. Do not wire real scanning yet. Use the mock pattern dossiers in this spec. Replace the current Discover route stub with the page. Preserve the existing Attune shell and visual tokens. Add the CSS classes from this spec to `src/styles.css`, adapting only where existing global button/icon classes already cover the behavior.

The first implementation should optimize for visual fidelity and product clarity over backend completeness.

The user should open the app, click Discover, and immediately understand:

```text
Attune found possible patterns.
These are not verdicts.
They are dossiers.
Pick one, inspect it, then decide whether it deserves the Workbench.
```
