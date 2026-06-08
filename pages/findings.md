# Attune Findings Page Specification

Status: draft implementation spec  
Target surface: `src/page/findings/`  
Visual language: dark editorial instrumentation  
Primary job: review what one deterministic candidate rule matched and record human labels

---

## 1. Product intent

The Findings page is where Attune slows down and asks the user to judge the evidence.

It is not a generic alert table, lint output dump, or code search results page. It is a focused review queue for the matches produced by one candidate deterministic rule.

The Workbench answers:

```text
What does this candidate mean?
What examples define it?
What deterministic artifact encodes it?
```

The Findings page answers:

```text
What did the deterministic artifact actually touch?
Was each match valid?
Which false positives should teach the next revision?
Which findings should become examples?
Is there enough review evidence to promote or revise?
```

The user should feel like they are reviewing a carefully prepared packet of evidence, not triaging noisy machine output.

The most important sentence for the page:

> Findings are not accusations; they are places where the rule touched the repository.

The second most important sentence:

> Human labels teach Attune what the team actually means.

---

## 2. Page-level user story

As an engineer reviewing a candidate rule, I want to inspect each match, understand why it matched, and label it as true positive, false positive, ignored, or useful as an example, so Attune can update confidence, revision guidance, and promotion readiness.

---

## 3. Findings page role in the app

The Findings page should answer these questions:

1. Which candidate am I reviewing?
2. How many findings are unreviewed, reviewed, false positive, ignored, or remaining?
3. Which finding is currently selected?
4. What file and lines did it match?
5. What code did the rule actually match?
6. Why did this deterministic rule match this code?
7. Which deterministic selector or ast-grep pattern produced the match?
8. What human label should be recorded?
9. Did my label advance the queue?
10. Does this label imply a revision is needed?

The Findings page should not fully answer:

1. What other possible patterns exist? That is Discover.
2. What is the complete candidate artifact surface? That is Workbench.
3. How did the candidate evolve over time? That is Lineage.
4. What files will enter the repo? That is Exports.
5. How are scan defaults configured? That is Settings.

---

## 4. Route contract

Recommended route:

```ts
type Route = {
  _tag: 'FindingsRoute'
  candidateId?: CandidateId
  findingId?: FindingId
}
```

For the first product-shell implementation, `candidateId` and `findingId` may be implicit fixture state. The eventual route should support deep-linking to a candidate and optionally a specific finding.

Navigation into Findings can originate from:

- Workbench findings handoff: `Open findings`
- Lineage event detail: selected measurement or review event
- Discover dossier: only if a pattern has measured findings
- Exports readiness checklist: `Review findings before export`

Navigation out of Findings:

- `Back to Workbench`
- selected finding labels may auto-advance to the next unreviewed finding
- after all required findings are reviewed, a small handoff can route to Workbench or Exports

---

## 5. Visual summary

The Findings page is a two-pane review instrument.

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ App shell sidebar                                                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Topbar: repo / branch                                      toast region   │ │
│ │ Findings                                         [Back to Workbench]       │ │
│ │ Review what this candidate matched before promotion.                      │ │
│ │ Candidate context row: icon / title / candidate chip / score chip         │ │
│ │                                                                          │ │
│ │                           Review status strip                             │ │
│ │                                                                          │ │
│ │ ┌────────────────────────────┬─────────────────────────────────────────┐ │ │
│ │ │ Finding queue              │ Selected finding dossier                │ │ │
│ │ │ filters                    │ path / language / line range            │ │ │
│ │ │ search + sort              │ code excerpt with marked match          │ │ │
│ │ │ finding cards              │ why it matched                          │ │ │
│ │ │ pagination / remaining     │ deterministic selector                  │ │ │
│ │ │                            │ decision cards + notes                  │ │ │
│ │ └────────────────────────────┴─────────────────────────────────────────┘ │ │
│ │ Keyboard hint: Press j / k to navigate                                   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

The approved Findings composition has these constraints:

- Sidebar remains identical to the app shell used by Discover and Workbench.
- The selected nav item is `Findings`.
- The page is scoped to one candidate, not all repo findings.
- The finding list sits on the left.
- The selected finding detail sits on the right.
- The right pane is a dossier, not a raw JSON blob.
- Review actions are large, explicit, and semantically labeled.
- A label action should record state, show a small confirmation toast, and advance to the next useful finding.
- The page should fit inside the desktop viewport with local scrolling in the list and code regions.

---

## 6. Visual direction

Use the same direction as the current Attune page set:

```text
dark editorial instrumentation
quiet artifact-review UI
warm graphite surfaces
semantic status color
code as evidence
agent prose as dossier copy
human labels as product truth
```

Do not make Findings look like:

```text
GitHub code search
Sentry issue list
Datadog dashboard
security alert console
eslint terminal output
AI chat review
spreadsheet
```

The page should feel more operational than Discover and more evidence-focused than Workbench. Discover is editorial. Workbench is artifact review. Findings is tactile decision review.

---

## 7. Page anatomy

### 7.1 App shell sidebar

The sidebar should remain consistent with other Attune pages.

Required sidebar sections:

```text
Attune brand
Primary nav
Current candidate card
Repository context
User footer
```

Primary nav:

```text
Discover
Workbench
Findings
Lineage
Exports
Settings
```

For Findings, the `Findings` nav item is selected.

Current candidate card:

```text
Current candidate
Styling belongs in UI primitives and recipes
Candidate B (v2)
Scoring candidate
```

Repository context:

```text
Repository
bulletproof-react

Branch
main
```

The sidebar should not include the full potential pattern shelf on the Findings page by default. Findings is already a focused review mode. If the pattern shelf remains visible globally in implementation, keep it collapsed or visually subordinate.

### 7.2 Topbar

The topbar is compact and global.

Left:

```text
repo icon  bulletproof-react  |  branch icon  main
```

Right:

```text
optional toast region
Back to Workbench
```

The `Back to Workbench` button should be secondary and quiet.

### 7.3 Page header

Header content:

```text
Findings
Review what this candidate matched before promotion.
```

Candidate context row:

```text
[pattern icon]
Styling belongs in UI primitives and recipes
Candidate B (v2)
Scoring candidate
```

Use the same generated/curated icon token as Discover and Workbench for the candidate. Do not invent a new icon for the same candidate on Findings.

### 7.4 Review status strip

The status strip summarizes review progress for the selected candidate.

Example:

```text
34 matches
9 reviewed
2 false positives
1 ignored
23 remaining
180 ms scan time
```

This is the only full metric strip on Findings. Do not duplicate the same numbers in another large panel.

Recommended status order:

1. Total matches
2. Reviewed
3. False positives
4. Ignored
5. Remaining
6. Scan time

Visual treatment:

- one horizontal panel
- low-contrast dividers between metrics
- small line icons
- semantic colors only for meaningful states:
  - false positives: clay
  - ignored: amber/muted
  - remaining: violet/blue
  - reviewed/valid: sage

### 7.5 Left pane: finding queue

The left pane is a local review queue.

It contains:

1. Filter tabs
2. Search input
3. Sort dropdown
4. Finding count / index
5. List of finding cards
6. Previous / next pagination controls if useful

Filter tabs:

```text
Unreviewed 23
False positives 2
Ignored 1
All 34
```

Avoid too many filters. Do not add severity, owner, team, package, or confidence filters in the first version.

Search placeholder:

```text
Search findings…
```

Sort options:

```text
File path
Newest label
Match order
Confidence
```

First version can implement only visual sort selection.

Finding card content:

```text
src/components/Card.tsx
Rule: Uses raw style object for visual styling
<div style={{ background: "#121212", boxShadow: "0 4px 16px rgba(...)" }} />
Matched · line 58
```

A selected finding card should have:

- sage/green border if true positive or unreviewed selected
- clay/red status chip if false positive
- amber status chip if ignored
- subtle background lift
- left accent line or dot

The finding list should scroll locally. It must not push the right detail pane below the fold.

### 7.6 Right pane: selected finding dossier

The selected finding dossier is the heart of the page.

It contains:

1. Finding header
2. Code excerpt
3. Why it matched
4. Deterministic selector
5. Review decision cards
6. Optional note field
7. Keyboard hint

#### Finding header

Example:

```text
src/components/Card.tsx                       Lines 54–62   TSX
```

Use small metadata chips for line range and language.

#### Code excerpt

The code excerpt should be a Shiki-highlighted FoldKit code pane, not raw unhighlighted `<pre>`.

Show enough surrounding lines to understand the match:

```tsx
52  export function Card({ children, className }: CardProps) {
53    return (
54      <div
55        className={cx("card", className)}
56        style={{
57          background: "#121212",
58          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
59          borderRadius: 12,
60          padding: 16,
61        }}
62      >
```

Matched lines should have:

- subtle green/yellow row background when selected/unreviewed
- left gutter arrow or mark
- no harsh red unless already labeled false positive

The code pane should support local overflow and preserve raw copy text.

#### Why it matched

This is generated/explained prose, not a raw ast-grep result.

Example:

```text
The rule flags inline visual styles on UI components. This object sets visual properties directly on a DOM element instead of using a primitive variant or recipe.
```

The explanation should be short: 1–3 sentences.

Do not use:

```text
AI detected a violation
The user is wrong
This breaches policy
```

Use:

```text
The rule matched…
This appears to…
This may be valid if…
```

#### Deterministic selector

Show the exact deterministic selector that produced the match.

Example:

```yaml
pattern: $EL[style={$OBJ}]
pattern-not: $EL[style={$OBJ}] inside "**/(components|primitives|recipes)/**"
```

This selector panel should be compact. The full rule remains on Workbench.

#### Review decision cards

Decision cards are the primary actions on Findings.

Required actions:

```text
True positive
False positive
Ignore
```

Optional fourth action:

```text
Use as example
```

The mockup showed three large decision cards and can optionally include `Use as example` as a smaller secondary action below. If screen real estate is tight, keep the three primary labels visible and put `Use as example` in a quiet secondary row.

Decision semantics:

```text
True positive
This is a valid match.

False positive
Not a valid match.

Ignore
Ignore and move on.
```

Decision card visual treatment:

- True positive: sage border/icon
- False positive: clay border/icon
- Ignore: amber/muted border/icon
- selected/recorded state: filled subtle background + check mark
- hover: border brightens, no heavy color fill
- disabled: lowered opacity + text explanation

#### Notes field

Notes are optional.

Placeholder:

```text
Add a note to explain your decision…
```

Counter:

```text
0 / 200
```

Notes should be stored as private Attune lineage. They should not enter exported repo artifacts by default.

---

## 8. Primary actions and command semantics

Findings is action-heavy compared with other pages, but the actions are narrow.

Primary finding label actions:

```text
True positive
False positive
Ignore
```

Secondary finding action:

```text
Use as example
```

Navigation actions:

```text
Back to Workbench
Prev finding
Next finding
```

Search/sort/filter actions:

```text
Select filter
Search findings
Sort findings
```

Do not include on Findings by default:

```text
Promote rule
Export rule
New scan
Run agent
Auto-fix
Edit YAML
Create PR
```

Those belong elsewhere. Findings should make review decisions, not promote or export.

### 8.1 Label command mapping

Recommended domain commands:

```ts
type LabelFindingCommand = {
  readonly _tag: 'LabelFinding'
  readonly candidateId: CandidateId
  readonly findingId: FindingId
  readonly label: 'true_positive' | 'false_positive' | 'ignored'
  readonly note?: string
  readonly actorId: ActorId
}

type UseFindingAsExampleCommand = {
  readonly _tag: 'UseFindingAsExample'
  readonly candidateId: CandidateId
  readonly findingId: FindingId
  readonly exampleKind: 'looks_like' | 'does_not_look_like'
  readonly actorId: ActorId
}
```

Recommended events:

```ts
type FindingLabeledEvent = {
  readonly _tag: 'finding.labeled'
  readonly candidateId: CandidateId
  readonly findingId: FindingId
  readonly label: 'true_positive' | 'false_positive' | 'ignored'
  readonly note?: string
  readonly actorId: ActorId
}

type FindingPromotedToExampleEvent = {
  readonly _tag: 'finding.promoted_to_example'
  readonly candidateId: CandidateId
  readonly findingId: FindingId
  readonly exampleKind: 'looks_like' | 'does_not_look_like'
  readonly actorId: ActorId
}
```

### 8.2 Post-label behavior

After labeling:

1. Append domain event.
2. Update projection-derived review counts.
3. Show small toast.
4. Advance to next unreviewed finding if available.
5. Keep current filter stable.
6. If no unreviewed findings remain, show completion handoff.

Toast examples:

```text
False positive recorded
Advanced to next finding
```

```text
True positive recorded
21 findings remaining
```

Completion handoff:

```text
All required findings reviewed.
Return to Workbench to revise or promote this candidate.
[Back to Workbench]
```

---

## 9. Agent-generated content boundaries

Findings may contain agent-assisted prose, but the agent must not own labels or page layout.

Agent may generate:

```text
why it matched explanation
short file/context summary
suggested example kind
suggested revision hint after false-positive clusters
human-readable selector explanation
```

Agent must not generate:

```text
review label as product truth
route/layout structure
raw arbitrary HTML
buttons/actions
promotion decision
export decision
```

The deterministic runner owns:

```text
finding id
file path
line range
byte range when available
matched code excerpt
rule id
selector/pattern metadata
severity
```

Human owns:

```text
true positive / false positive / ignored label
private note
use as example decision
promotion decision downstream
```

---

## 10. Typed model contract

Recommended page model:

```ts
type FindingsPageModel = {
  readonly candidate: FindingsCandidateHeader
  readonly summary: FindingsSummary
  readonly filters: FindingsFilters
  readonly queue: ReadonlyArray<FindingListItem>
  readonly selectedFindingId: FindingId
  readonly selectedFinding: FindingDetail
  readonly noteDraft: string
  readonly toast: Option<OptionToast>
  readonly motion: FindingsMotion
}

type FindingsCandidateHeader = {
  readonly candidateId: CandidateId
  readonly title: string
  readonly iconToken: CandidateIconToken
  readonly versionLabel: string // "Candidate B (v2)"
  readonly readinessLabel: string // "Scoring candidate"
  readonly repoName: string
  readonly branchName: string
}

type FindingsSummary = {
  readonly totalMatches: number
  readonly reviewedCount: number
  readonly truePositiveCount: number
  readonly falsePositiveCount: number
  readonly ignoredCount: number
  readonly remainingCount: number
  readonly scanDurationMs: number
}

type FindingsFilters = {
  readonly activeTab: FindingFilterTab
  readonly query: string
  readonly sort: FindingSort
}

type FindingFilterTab = 'unreviewed' | 'false_positive' | 'ignored' | 'all'

type FindingSort = 'file_path' | 'match_order' | 'newest_label' | 'confidence'

type FindingListItem = {
  readonly findingId: FindingId
  readonly filePath: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly title: string
  readonly shortReason: string
  readonly snippetPreview: string
  readonly label: FindingReviewLabel
  readonly isSelected: boolean
}

type FindingReviewLabel =
  | 'unreviewed'
  | 'true_positive'
  | 'false_positive'
  | 'ignored'

type FindingDetail = {
  readonly findingId: FindingId
  readonly filePath: string
  readonly language: 'ts' | 'tsx' | 'yaml' | 'text'
  readonly lineStart: number
  readonly lineEnd: number
  readonly highlightedCode: HighlightedCode
  readonly markedLineNumbers: ReadonlyArray<number>
  readonly whyMatched: string
  readonly deterministicSelector: HighlightedCode
  readonly label: FindingReviewLabel
  readonly canUseAsExample: boolean
  readonly suggestedExampleKind: Option<'looks_like' | 'does_not_look_like'>
}

type OptionToast = {
  readonly tone: 'success' | 'warning' | 'info'
  readonly title: string
  readonly detail: string
}

type FindingsMotion =
  | { readonly _tag: 'Idle' }
  | {
      readonly _tag: 'SelectingFinding'
      readonly from: FindingId
      readonly to: FindingId
    }
  | { readonly _tag: 'RecordingLabel'; readonly findingId: FindingId }
  | {
      readonly _tag: 'AdvancingQueue'
      readonly from: FindingId
      readonly to: FindingId
    }
  | { readonly _tag: 'ReviewComplete' }
```

---

## 11. FoldKit messages

Recommended page messages:

```ts
export const SelectedFinding = m('SelectedFinding', { findingId: FindingId })
export const SelectedFilterTab = m('SelectedFilterTab', {
  tab: FindingFilterTab,
})
export const ChangedSearchQuery = m('ChangedSearchQuery', { query: S.String })
export const ChangedSort = m('ChangedSort', { sort: FindingSort })
export const ClickedPreviousFinding = m('ClickedPreviousFinding')
export const ClickedNextFinding = m('ClickedNextFinding')
export const ChangedNoteDraft = m('ChangedNoteDraft', { note: S.String })
export const ClickedTruePositive = m('ClickedTruePositive')
export const ClickedFalsePositive = m('ClickedFalsePositive')
export const ClickedIgnore = m('ClickedIgnore')
export const ClickedUseAsExample = m('ClickedUseAsExample')
export const ClickedBackToWorkbench = m('ClickedBackToWorkbench')
export const DismissedToast = m('DismissedToast')
export const AnimationFinished = m('AnimationFinished')
```

Update rules:

- `SelectedFinding` changes selected id and enters `SelectingFinding` motion.
- `SelectedFilterTab` changes active tab and selects first finding in filtered list if current selection is no longer visible.
- `ChangedSearchQuery` updates query and filters list locally.
- `ClickedTruePositive`, `ClickedFalsePositive`, `ClickedIgnore` emit a domain command, do not directly mutate product truth except for optimistic motion state if desired.
- `ClickedUseAsExample` emits command or opens a small choice if example kind is ambiguous.
- `ClickedBackToWorkbench` emits an out-message or root route message.

---

## 12. Suggested module structure

```text
src/page/findings/
  index.ts
  init.ts
  model.ts
  message.ts
  update.ts
  view.ts
  command.ts
  projection.ts
  main.story.test.ts
  main.scene.test.ts
  view/
    candidateHeader.ts
    reviewStatusStrip.ts
    findingQueue.ts
    findingCard.ts
    findingDetail.ts
    decisionCards.ts
    noteEditor.ts
    toast.ts
    keyboardHint.ts
```

Shared modules:

```text
src/syntax/
  HighlightedCode.ts
  ShikiHighlighter.ts

src/icon.ts
src/route.ts
```

The Findings page should reuse:

- Attune visual tokens from `src/styles.css`
- FoldKit-native SVG icon helpers
- Shiki/FoldKit highlighted code renderer
- candidate icon tokens from Discover/Workbench

---

## 13. CSS implementation detail

The following CSS is intentionally detailed. An implementation agent should be able to reproduce the approved Findings visual direction by following these classes and tokens.

Assume root tokens already exist:

```css
:root {
  --attune-bg-root: #090d0e;
  --attune-bg-sidebar: #0c1113;
  --attune-bg-surface: #101617;
  --attune-bg-panel: #13191b;
  --attune-bg-panel-soft: #171d1f;
  --attune-bg-code: #0d1315;
  --attune-bg-code-line: #172023;

  --attune-border-subtle: rgba(220, 228, 214, 0.08);
  --attune-border-panel: rgba(220, 228, 214, 0.13);
  --attune-border-strong: rgba(220, 228, 214, 0.22);

  --attune-text-primary: #ece8dc;
  --attune-text-secondary: #c8c1b2;
  --attune-text-muted: #8f9087;
  --attune-text-faint: #686e68;

  --attune-accent-sage: #8dba6f;
  --attune-accent-moss: #4f8f5b;
  --attune-accent-clay: #c46a54;
  --attune-accent-amber: #c49a4a;
  --attune-accent-violet: #7c5ce5;
  --attune-accent-blue: #6e91b8;
}
```

### 13.1 Page shell

```css
.findings-page {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.findings-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.findings-repo-context {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--attune-text-muted);
  font-size: 0.95rem;
}

.findings-repo-context strong {
  color: var(--attune-text-primary);
  font-weight: 650;
}

.findings-header {
  display: grid;
  gap: 0.7rem;
}

.findings-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
}

.findings-title-block h1 {
  margin: 0 0 0.45rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.1rem, 3vw, 3rem);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.findings-title-block p {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 1rem;
}

.findings-back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  height: 2.6rem;
  padding: 0 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-primary);
  cursor: pointer;
}

.findings-back-button:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.045);
}
```

### 13.2 Candidate context row

```css
.findings-candidate-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.findings-candidate-icon {
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  flex: none;
  place-items: center;
  border: 1px solid
    color-mix(in srgb, var(--attune-accent-sage) 35%, transparent);
  border-radius: 999px;
  background: rgba(141, 186, 111, 0.14);
  color: var(--attune-accent-sage);
}

.findings-candidate-title {
  min-width: 0;
  color: var(--attune-text-primary);
  font-size: 1.1rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.findings-candidate-chip-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.findings-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.6rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.findings-chip.is-good {
  border-color: rgba(141, 186, 111, 0.22);
  background: rgba(141, 186, 111, 0.1);
  color: color-mix(in srgb, var(--attune-accent-sage) 86%, white);
}

.findings-chip.is-scoring {
  border-color: rgba(124, 92, 229, 0.2);
  background: rgba(124, 92, 229, 0.12);
  color: #c9bdff;
}
```

### 13.3 Review status strip

```css
.findings-status-strip {
  display: grid;
  grid-template-columns:
    minmax(7.4rem, 1fr)
    minmax(7.4rem, 1fr)
    minmax(8.8rem, 1fr)
    minmax(7.4rem, 1fr)
    minmax(8.2rem, 1fr)
    minmax(8.2rem, 1fr);
  align-items: stretch;
  min-width: 0;
  border: 1px solid var(--attune-border-panel);
  border-radius: 9px;
  background: rgba(19, 25, 27, 0.84);
  overflow: hidden;
}

.findings-status-metric {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.15rem 0.55rem;
  align-items: center;
  padding: 0.75rem 0.9rem;
  border-left: 1px solid var(--attune-border-subtle);
}

.findings-status-metric:first-child {
  border-left: 0;
}

.findings-status-metric .metric-icon {
  grid-row: span 2;
  color: var(--attune-text-muted);
}

.findings-status-metric strong {
  color: var(--attune-text-primary);
  font-size: 1.05rem;
  font-weight: 650;
  line-height: 1;
}

.findings-status-metric span {
  color: var(--attune-text-muted);
  font-size: 0.77rem;
  line-height: 1.1;
}

.findings-status-metric.is-good strong,
.findings-status-metric.is-good .metric-icon {
  color: var(--attune-accent-sage);
}

.findings-status-metric.is-bad strong,
.findings-status-metric.is-bad .metric-icon {
  color: var(--attune-accent-clay);
}

.findings-status-metric.is-muted strong,
.findings-status-metric.is-muted .metric-icon {
  color: var(--attune-accent-amber);
}

.findings-status-metric.is-remaining strong,
.findings-status-metric.is-remaining .metric-icon {
  color: #a7b7ff;
}
```

### 13.4 Main review grid

```css
.findings-review-grid {
  display: grid;
  grid-template-columns: minmax(20rem, 0.8fr) minmax(34rem, 1.2fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.findings-panel {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--attune-border-panel);
  border-radius: 9px;
  background: rgba(19, 25, 27, 0.82);
  overflow: hidden;
}
```

### 13.5 Finding queue panel

```css
.findings-queue-panel {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
}

.findings-filter-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--attune-border-subtle);
  overflow-x: auto;
}

.findings-filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 2rem;
  padding: 0 0.65rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--attune-text-muted);
  white-space: nowrap;
  cursor: pointer;
}

.findings-filter-tab.is-selected {
  border-color: var(--attune-border-panel);
  background: rgba(255, 255, 255, 0.035);
  color: var(--attune-text-primary);
}

.findings-filter-tab-count {
  display: inline-flex;
  min-width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--attune-text-secondary);
  font-size: 0.74rem;
}

.findings-queue-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.findings-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  height: 2.25rem;
  padding: 0 0.7rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--attune-text-muted);
}

.findings-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--attune-text-primary);
  font: inherit;
}

.findings-sort-select {
  height: 2.25rem;
  min-width: 8.8rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--attune-text-secondary);
  padding: 0 0.65rem;
}

.findings-queue-count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  color: var(--attune-text-muted);
  font-size: 0.86rem;
}

.findings-queue-nav {
  display: inline-flex;
  gap: 0.35rem;
}

.findings-queue-list {
  display: grid;
  align-content: start;
  gap: 0.55rem;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem;
}
```

### 13.6 Finding card

```css
.finding-card {
  display: grid;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-secondary);
  text-align: left;
  cursor: pointer;
}

.finding-card:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.04);
}

.finding-card.is-selected {
  border-color: rgba(141, 186, 111, 0.44);
  background: rgba(141, 186, 111, 0.08);
  box-shadow: inset 3px 0 0 rgba(141, 186, 111, 0.78);
}

.finding-card.is-false-positive {
  border-color: rgba(196, 106, 84, 0.28);
}

.finding-card.is-ignored {
  border-color: rgba(196, 154, 74, 0.24);
}

.finding-card-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.55rem;
  align-items: center;
}

.finding-card-file {
  min-width: 0;
  color: var(--attune-text-primary);
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finding-card-line {
  color: var(--attune-text-faint);
  font-size: 0.78rem;
}

.finding-card-label {
  display: inline-flex;
  align-items: center;
  min-height: 1.4rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
}

.finding-card-label.is-matched {
  background: rgba(141, 186, 111, 0.12);
  color: var(--attune-accent-sage);
}

.finding-card-label.is-false-positive {
  background: rgba(196, 106, 84, 0.12);
  color: var(--attune-accent-clay);
}

.finding-card-label.is-ignored {
  background: rgba(196, 154, 74, 0.12);
  color: var(--attune-accent-amber);
}

.finding-card-reason {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.86rem;
  line-height: 1.35;
}

.finding-card-snippet {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--attune-border-subtle);
  border-radius: 6px;
  background: var(--attune-bg-code);
  color: var(--attune-text-secondary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### 13.7 Finding detail panel

```css
.finding-detail-panel {
  display: grid;
  grid-template-rows: auto minmax(12rem, 1fr) auto auto auto;
  min-height: 0;
}

.finding-detail-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.finding-detail-path {
  min-width: 0;
  color: var(--attune-text-primary);
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.finding-detail-meta {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-muted);
  font-size: 0.75rem;
}

.finding-code-wrap {
  min-height: 0;
  padding: 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
  overflow: hidden;
}

.finding-code-wrap .code-pane {
  height: 100%;
  max-height: 100%;
  margin: 0;
}

.code-line.is-match {
  background: rgba(141, 186, 111, 0.11);
}

.code-line.is-match .code-line-number {
  color: var(--attune-accent-sage);
}

.code-line.is-false-positive-match {
  background: rgba(196, 106, 84, 0.1);
}

.finding-explanation {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.finding-explanation h2,
.finding-selector h2,
.finding-decision h2,
.finding-note h2 {
  margin: 0;
  color: var(--attune-text-primary);
  font-size: 0.95rem;
  font-weight: 650;
}

.finding-explanation p {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.finding-selector {
  display: grid;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.finding-selector .code-pane {
  max-height: 5.5rem;
  min-height: 0;
  font-size: 0.78rem;
}
```

### 13.8 Decision cards and notes

```css
.finding-decision {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.finding-decision-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.finding-decision-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.2rem 0.65rem;
  align-items: center;
  min-height: 4rem;
  padding: 0.85rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--attune-text-primary);
  text-align: left;
  cursor: pointer;
}

.finding-decision-card:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.045);
}

.finding-decision-card .decision-icon {
  grid-row: span 2;
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
}

.finding-decision-card strong {
  font-weight: 650;
}

.finding-decision-card span:last-child {
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.finding-decision-card.is-true {
  border-color: rgba(141, 186, 111, 0.28);
}

.finding-decision-card.is-true .decision-icon,
.finding-decision-card.is-true strong {
  color: var(--attune-accent-sage);
}

.finding-decision-card.is-false {
  border-color: rgba(196, 106, 84, 0.28);
}

.finding-decision-card.is-false .decision-icon,
.finding-decision-card.is-false strong {
  color: var(--attune-accent-clay);
}

.finding-decision-card.is-ignore {
  border-color: rgba(196, 154, 74, 0.28);
}

.finding-decision-card.is-ignore .decision-icon,
.finding-decision-card.is-ignore strong {
  color: var(--attune-accent-amber);
}

.finding-decision-card.is-selected {
  background: rgba(141, 186, 111, 0.1);
}

.finding-note {
  display: grid;
  gap: 0.55rem;
  padding: 0.85rem 1rem 1rem;
}

.finding-note textarea {
  min-height: 3rem;
  max-height: 6rem;
  resize: vertical;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--attune-text-primary);
  padding: 0.7rem 0.8rem;
  font: inherit;
  line-height: 1.4;
}

.finding-note textarea::placeholder {
  color: var(--attune-text-faint);
}

.finding-note-footer {
  display: flex;
  justify-content: flex-end;
  color: var(--attune-text-faint);
  font-size: 0.78rem;
}
```

### 13.9 Toast and keyboard hint

```css
.findings-toast {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 30;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.4rem 0.7rem;
  min-width: min(22rem, calc(100vw - 2rem));
  max-width: 28rem;
  padding: 0.85rem;
  border: 1px solid rgba(141, 186, 111, 0.28);
  border-radius: 9px;
  background: color-mix(
    in srgb,
    var(--attune-bg-panel) 92%,
    var(--attune-accent-sage)
  );
  color: var(--attune-text-primary);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.04) inset;
}

.findings-toast-icon {
  grid-row: span 2;
  color: var(--attune-accent-sage);
}

.findings-toast strong {
  font-weight: 650;
}

.findings-toast span {
  color: var(--attune-text-muted);
  font-size: 0.86rem;
}

.findings-toast button {
  grid-row: span 2;
  border: 0;
  background: transparent;
  color: var(--attune-text-muted);
  cursor: pointer;
}

.findings-keyboard-hint {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.findings-keyboard-hint kbd {
  display: inline-flex;
  min-width: 1.45rem;
  height: 1.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.035);
  color: var(--attune-text-secondary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.75rem;
}
```

### 13.10 Responsive layout

```css
@media (max-width: 1100px) {
  .findings-review-grid {
    grid-template-columns: minmax(18rem, 0.9fr) minmax(28rem, 1.1fr);
  }

  .findings-status-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .finding-decision-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  body {
    overflow: auto;
  }

  .findings-page {
    height: auto;
    overflow: visible;
  }

  .findings-header-row {
    display: grid;
  }

  .findings-review-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .findings-panel {
    overflow: visible;
  }

  .findings-queue-list {
    max-height: 24rem;
  }

  .finding-detail-panel {
    display: grid;
  }

  .finding-code-wrap .code-pane {
    max-height: 24rem;
  }

  .findings-status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

---

## 14. Animation and motion

Motion should communicate causality, not decorate the page.

Use subtle transitions:

```css
.finding-card,
.finding-decision-card,
.findings-filter-tab,
.findings-back-button {
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease,
    transform 140ms ease;
}

.finding-card.is-selecting {
  transform: translateX(2px);
}

.finding-detail-panel.is-switching {
  animation: finding-detail-settle 180ms ease both;
}

@keyframes finding-detail-settle {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.findings-toast {
  animation: findings-toast-in 180ms ease both;
}

@keyframes findings-toast-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Recommended motion states:

```ts
type FindingsMotion =
  | { _tag: 'Idle' }
  | { _tag: 'SelectingFinding'; from: FindingId; to: FindingId }
  | { _tag: 'RecordingLabel'; findingId: FindingId }
  | { _tag: 'AdvancingQueue'; from: FindingId; to: FindingId }
  | { _tag: 'ReviewComplete' }
```

Animation examples:

### Labeling a false positive

```text
User clicks False positive
→ decision card presses subtly
→ command emitted
→ toast appears: "False positive recorded"
→ false-positive count increments
→ current list card receives false-positive chip
→ selected detail advances to next unreviewed finding
```

### Selecting a finding

```text
User clicks list card
→ card accent moves to selected item
→ right dossier crossfades/settles
→ code match line highlights
```

### Completing review

```text
Remaining reaches 0
→ status strip remaining count softly pulses
→ completion handoff appears
→ Back to Workbench is emphasized slightly
```

---

## 15. Keyboard interaction

Findings should be keyboard-friendly because review can become repetitive.

Recommended shortcuts:

```text
j           next finding
k           previous finding
1           true positive
2           false positive
3           ignore
/           focus search
esc         clear search or dismiss toast
cmd/ctrl+b  back to Workbench, optional later
```

Keyboard shortcuts should be disabled while typing in the note field or search input.

All shortcuts must have accessible button equivalents.

The footer hint can show:

```text
Press j / k to navigate
```

Do not show the full shortcut legend in the main view. Put extended shortcuts in a help popover later.

---

## 16. Accessibility requirements

- The page must have one `h1`: `Findings`.
- The finding queue should be labeled: `aria-label="Finding queue"`.
- The selected finding detail should be labeled: `aria-label="Selected finding detail"`.
- Filter tabs should expose selected state with `aria-pressed` or tab semantics.
- Finding cards should be keyboard focusable.
- The selected finding card must use more than color: border, `aria-current`, and/or selected text.
- Decision cards must be real buttons.
- Decision cards must include visible text, not only icons.
- Toasts should use a polite live region.
- Code panes should preserve raw plain text for screen-reader/copy fallback.
- Match highlighting must not rely only on color; include a line marker or `aria-label` for matched lines.
- Notes field should have a label and character count.
- Reduced-motion preference must be respected.

---

## 17. Empty states

### No findings

```text
No findings were produced.

This candidate did not match the selected repository scope. You can return to the Workbench to revise the rule or inspect the candidate examples.

[Back to Workbench]
```

### No findings match filter/search

```text
No findings match this view.

Try a different filter or clear the search query.
```

### All required findings reviewed

```text
All required findings are reviewed.

Return to the Workbench to revise or promote this candidate.

[Back to Workbench]
```

### Measurement failed

```text
Findings are unavailable.

The deterministic rule did not produce a valid measurement result. Return to the Workbench to revise the candidate.

[Back to Workbench]
```

---

## 18. Error states

Errors should be specific and repair-oriented.

### Label failed

```text
Could not record label.

The finding review event was not saved. Your selection has not been applied.

[Retry]
```

### Finding not found

```text
Finding not found.

This finding may belong to an older candidate version. Open the current findings queue instead.

[Open current findings]
```

### Stale candidate

```text
This candidate has been revised.

You are viewing findings for Candidate B. Candidate C has newer measurement results.

[Open latest findings]
```

---

## 19. Fixture data for first implementation

Use a fixture set with at least 8 findings so the page feels real.

Recommended distribution:

```text
34 total matches
9 reviewed
6 true positives
2 false positives
1 ignored
23 remaining
12 files
180 ms scan time
```

Include at least these list items:

```ts
const findingFixtures = [
  {
    filePath: 'src/components/Button.tsx',
    lineStart: 42,
    lineEnd: 42,
    label: 'unreviewed',
    title: 'Uses raw style object for visual styling',
    snippetPreview:
      '<button style={{ padding: "12px 16px", borderRadius: 8 }} />',
  },
  {
    filePath: 'src/components/Card.tsx',
    lineStart: 58,
    lineEnd: 58,
    label: 'unreviewed',
    title: 'Uses raw style object for visual styling',
    snippetPreview:
      '<div style={{ background: "#121212", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }} />',
  },
  {
    filePath: 'src/components/UserAvatar.tsx',
    lineStart: 21,
    lineEnd: 21,
    label: 'false_positive',
    title: 'Style object used for image geometry',
    snippetPreview:
      '<img style={{ width: 40, height: 40, borderRadius: "50%" }} />',
  },
  {
    filePath: 'src/features/dashboard/StatsCard.tsx',
    lineStart: 77,
    lineEnd: 77,
    label: 'ignored',
    title: 'Temporary fixture layout style',
    snippetPreview: '<div style={{ display: "flex", alignItems: "center" }} />',
  },
]
```

The selected fixture should be `src/components/Card.tsx` because it makes a clear good Findings demo:

- It is obviously visual styling.
- It includes multiple visual properties.
- It supports a strong `Why it matched` explanation.
- It can later be used to motivate a revision prompt around allowing layout geometry but not colors/shadows.

---

## 20. Scene tests

Required FoldKit Scene tests:

1. Renders Findings route with app shell and `Findings` nav selected.
2. Renders candidate context row with title, candidate version, and scoring chip.
3. Renders review status strip with total, reviewed, false positives, ignored, remaining, and scan time.
4. Renders finding queue with filter tabs.
5. Renders search input and sort control.
6. Renders at least four finding cards with file path, reason, snippet, label, and line number.
7. Renders selected finding detail with file path, line range, language chip, highlighted code, `Why it matched`, deterministic selector, decision cards, and notes field.
8. Does not render Workbench-only actions: `Promote rule`, `Revise rule`, `Create draft PR`, `New scan`.
9. Shows `Back to Workbench` as navigation action.
10. Uses inline SVG icons for status and actions.
11. Preserves raw code text in code panes.
12. Labels are represented with visible text, not color-only.
13. Selected finding state is visible and accessible.

Example Scene assertion language:

```ts
expect(screen.getByRole('heading', { name: 'Findings' })).toBeVisible()
expect(screen.getByRole('button', { name: /False positive/i })).toBeVisible()
expect(screen.queryByRole('button', { name: /Promote rule/i })).toBeNull()
expect(screen.getByLabelText('Finding queue')).toBeVisible()
expect(screen.getByLabelText('Selected finding detail')).toBeVisible()
```

---

## 21. Story tests

Required FoldKit Story tests:

1. Selecting a finding updates `selectedFindingId`.
2. Clicking `False positive` emits `LabelFinding(false_positive)` command.
3. Clicking `True positive` emits `LabelFinding(true_positive)` command.
4. Clicking `Ignore` emits `LabelFinding(ignored)` command.
5. Labeling a finding shows a toast state.
6. Labeling a finding advances to the next unreviewed finding.
7. Filter tab selection updates visible queue.
8. Search query filters finding list.
9. Note draft is included in label command when present.
10. Keyboard `j` / `k` navigation moves selection when focus is not inside an input.
11. `Back to Workbench` emits route/out-message.

---

## 22. Implementation checklist

- [ ] Create `src/page/findings/` page module.
- [ ] Add Findings page model, messages, update, command types, and view.
- [ ] Add fixture findings scoped to current candidate.
- [ ] Render candidate context row.
- [ ] Render review status strip.
- [ ] Render filter tabs, search input, sort control, and finding queue.
- [ ] Render selected finding detail with highlighted code and selector.
- [ ] Render decision cards: true positive, false positive, ignore.
- [ ] Add optional notes field.
- [ ] Add toast state and view.
- [ ] Add keyboard navigation support.
- [ ] Add local overflow behavior for queue and code panes.
- [ ] Wire `Back to Workbench` route action.
- [ ] Ensure no Workbench/Export actions appear on Findings.
- [ ] Add Scene tests.
- [ ] Add Story tests.
- [ ] Validate accessibility and reduced motion.

---

## 23. Final product test

A user should be able to look at the Findings page and immediately understand:

```text
I am reviewing matches for one candidate rule.
The left side is the queue.
The right side explains the selected match.
The code line is evidence.
The rule matched for a specific deterministic reason.
My job is to label this finding.
My labels will update the candidate's trust and revision path.
```

The page succeeds if it makes repeated review feel calm, fast, and meaningful.

It fails if it feels like a noisy lint table, a generic alert dashboard, or a place where the AI has already decided the answer.
