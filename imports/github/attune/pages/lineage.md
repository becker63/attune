# Attune Lineage Page Specification

Status: draft implementation spec  
Target surface: `src/page/lineage/`  
Visual language: dark editorial instrumentation  
Primary job: explain how one candidate evolved from first proposal to promoted/export-ready artifact

---

## 1. Product intent

The Lineage page is where Attune explains why a candidate deserves trust.

It is not an event log. It is not an audit dashboard. It is not a trace viewer. It is not a dense history table. It is a readable provenance story for one candidate rule.

The Workbench answers:

```text
What does this candidate mean?
What examples define it?
What deterministic artifact encodes it?
Should I revise or promote it?
```

The Findings page answers:

```text
What did this deterministic rule touch?
Which matches are valid, false positive, ignored, or useful as examples?
```

The Exports page answers:

```text
What clean files will enter the repository?
How will the Git bot hand them off?
```

The Lineage page answers:

```text
Where did this candidate come from?
What changed over time?
Which evidence caused the revision?
Why was this candidate promoted?
What messy history stays private to Attune?
```

The most important sentence for the page:

> Lineage is the private story of how a rule became trustworthy.

The second most important sentence:

> The repo receives the clean artifact; Attune preserves the reasoning.

This page should make Attune feel responsible. The product is allowed to use an agent because the system can show how generated proposals were measured, corrected, and promoted by humans.

---

## 2. Page-level user story

As an engineer reviewing a promoted or near-promoted candidate rule, I want to see the human-readable history of how the candidate changed, what evidence drove the changes, and why the final version is trustworthy, so I can understand the decision without reading raw event payloads.

---

## 3. Lineage page role in the app

The Lineage page should answer these questions:

1. Which candidate history am I reading?
2. What version is current?
3. Is the candidate promoted, rejected, deferred, or still under review?
4. What were the major lifecycle events?
5. Which event is selected?
6. What changed in that event?
7. Why did it change?
8. What evidence was used?
9. What was the effect on measurement, confidence, or promotion readiness?
10. What private information remains in Attune rather than being exported to the repo?

The Lineage page should not primarily answer:

1. Which new patterns should I inspect? That is Discover.
2. What is the current rule artifact surface? That is Workbench.
3. Which exact finding should I label next? That is Findings.
4. Which files will be committed by the Git bot? That is Exports.
5. Which scan defaults or bot settings are configured? That is Settings.

---

## 4. Route contract

Recommended route:

```ts
type Route = {
  _tag: 'LineageRoute'
  candidateId?: CandidateId
  eventId?: LineageEventId
}
```

For the product-shell implementation, `candidateId` and `eventId` may be implicit fixture state. The eventual route should support deep-linking to a candidate and optionally a specific lineage event.

Navigation into Lineage can originate from:

- Workbench candidate context: `View lineage`
- Findings status or review completion handoff: `See what changed`
- Exports readiness checklist: `Review lineage`
- Discover dossier for a candidate with prior revisions
- Direct route from the app shell sidebar

Navigation out of Lineage:

- `Back to Workbench`
- `Open export preview` when candidate is promoted/export-ready
- selected event context links may route to Workbench, Findings, or Exports

Lineage is mostly read-only. It should not be where the user edits the rule, labels findings, or exports files. It may route to those surfaces.

---

## 5. Visual summary

The approved Lineage direction is a quiet two-column provenance page.

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ App shell sidebar                                                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Topbar: repo / branch                         [Back to Workbench]        │ │
│ │ Lineage                                                                  │ │
│ │ Understand how this candidate evolved from first proposal to artifact.    │ │
│ │ Candidate row: icon / title / Candidate B (v2) / Promoted                │ │
│ │                                                                          │ │
│ │ ┌───────────────────────────────┬──────────────────────────────────────┐ │ │
│ │ │ Timeline rail                 │ Selected event story                 │ │ │
│ │ │ 1 Agent proposed pattern      │ Candidate revised                    │ │ │
│ │ │ 2 Examples grounded           │ metadata                             │ │ │
│ │ │ 3 Measured against repo       │ What changed                         │ │ │
│ │ │ 4 Candidate revised  ◀        │ Rule comparison                      │ │ │
│ │ │ 5 Promoted                   │ Impact                               │ │ │
│ │ │                               │ Why it matters                       │ │ │
│ │ └───────────────────────────────┴──────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

The page must feel much less busy than an audit dashboard.

Approved constraints:

- One selected candidate only.
- Left column is a timeline rail, not a table.
- Right column is a selected event article, not a dense metrics dashboard.
- Default visible timeline should show major story beats only.
- Raw event names and payloads are hidden by default.
- The selected event can show a small comparison, but only when it helps explain causality.
- Metrics are allowed only as impact cards for the selected event.
- The page should look like a provenance note in a technical dossier.

---

## 6. Visual direction

Use the same direction as the approved Attune page set:

```text
dark editorial instrumentation
quiet artifact-review UI
warm graphite surfaces
semantic status color
code as evidence
agent prose as dossier copy
human decisions as product truth
```

Lineage is the most editorial page in the product after Discover. It should feel like reading a clear technical case history.

It should not look like:

```text
Kafka event browser
OpenTelemetry trace explorer
Git reflog UI
security audit console
admin activity feed
analytics dashboard
AI chain-of-thought viewer
```

Avoid the first, too-busy lineage attempt:

```text
Too many metric chips
Too many event cards with dense facts
Too much right-panel instrumentation
Too many boxes competing with the timeline
```

The approved second direction is calmer:

```text
large editorial title
candidate row
left timeline with five major events
right article for selected event
small rule comparison
three impact cards
short explanation
```

The product should feel serious, not ceremonial. Promotion may be important, but the page should not look like a trophy case.

---

## 7. Page anatomy

### 7.1 App shell sidebar

The sidebar remains consistent with all other Attune pages.

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

For this page, `Lineage` is selected.

Current candidate card:

```text
Current candidate
Styling belongs in UI primitives and recipes
Candidate B (v2)
Promoted
```

Repository context:

```text
Repository
bulletproof-react

Branch
main
```

Implementation notes:

- The sidebar should not duplicate the full timeline.
- The current candidate card should be compact.
- The selected route state must not be color-only.
- The sidebar should remain stable across Discover, Workbench, Findings, Lineage, Exports, and Settings.

---

### 7.2 Topbar

Topbar content:

```text
bulletproof-react  |  main
[Back to Workbench]
```

Topbar rules:

- Keep it compact.
- Do not add global `New scan`, `Give feedback`, `Run agent`, or `Auto-fix` here.
- The page is explanation-oriented, not action-heavy.
- `Back to Workbench` is the main navigation action.
- If the candidate is promoted/export-ready, `Open export preview` may appear as a secondary action in the detail footer, not as a competing header button.

---

### 7.3 Page header

Header copy:

```text
Lineage
Understand how this candidate evolved from first proposal to promoted artifact.
```

Candidate row:

```text
[icon] Styling belongs in UI primitives and recipes   Candidate B (v2)   Promoted
```

Candidate row rules:

- Use one icon token for the pattern family.
- Use small chips for candidate version and state.
- Avoid extra measurement metrics in the header.
- The header should establish scope, not summarize the whole history.

Example HTML structure:

```ts
h.header(
  [h.Class('lineage-header')],
  [
    h.div([h.Class('lineage-topbar')], [repoBranchView(model.repo)]),
    h.h1([], ['Lineage']),
    h.p(
      [h.Class('lineage-subtitle')],
      [
        'Understand how this candidate evolved from first proposal to promoted artifact.',
      ],
    ),
    h.div(
      [h.Class('lineage-candidate-row')],
      [
        patternIconView(model.candidate.icon),
        h.strong([], [model.candidate.title]),
        chipView('Candidate B (v2)', 'candidate'),
        chipView('Promoted', 'good'),
      ],
    ),
  ],
)
```

---

### 7.4 Main lineage layout

Desktop grid:

```text
left:  330px to 390px timeline rail
right: minmax(0, 1fr) selected event article
```

CSS target:

```css
.lineage-layout {
  display: grid;
  grid-template-columns: minmax(20rem, 0.42fr) minmax(32rem, 1fr);
  gap: 1rem;
  min-height: 0;
}
```

Main layout rules:

- The timeline list scrolls locally if needed.
- The detail article scrolls locally only when content is unusually long.
- Default fixture content should fit inside the desktop viewport.
- Do not render a top global metric strip.
- Do not render the raw event feed as the default page.

---

## 8. Timeline rail

### 8.1 Timeline purpose

The left timeline is the table of contents for the candidate's story.

It should show the major beats:

```text
1 Agent proposed pattern
2 Examples grounded
3 Measured against repo
4 Candidate revised
5 Promoted
```

Optional sixth item when export is ready:

```text
6 Export preview prepared
```

But the default first viewport should not become crowded. If there are more than five or six events, group minor events under expandable clusters:

```text
Reviewed findings
  6 false positives labeled
  2 ignored
  1 example promoted
```

### 8.2 Timeline card anatomy

Each timeline item:

```text
[event icon] [event number]
Event title
One-sentence summary
Date · time · actor
```

Selected item:

```text
Candidate revised
Refined rule to exclude non-UI wrappers and contextual components.
Apr 28, 2025 · 11:18 AM · attune@local
```

Visual rules:

- Selected item gets a sage outline and low-opacity sage background.
- Timeline rail line runs vertically through icons.
- Event number is a small pill or dot, not a large badge.
- Event titles should be human-readable.
- Raw event names such as `rule_candidate.revised` must not be primary labels.

### 8.3 Timeline event categories

Recommended icon/tone mapping:

```ts
type LineageEventKind =
  | 'agent_proposed'
  | 'examples_grounded'
  | 'measured'
  | 'findings_labeled'
  | 'candidate_revised'
  | 'promoted'
  | 'export_prepared'
  | 'rejected'
  | 'deferred'
```

Visual tones:

```text
agent_proposed      sage/spark
examples_grounded   blue/book
measured            violet/flask
findings_labeled    amber/tag
candidate_revised   sage/pencil
promoted            sage/check
export_prepared     amber/package
rejected            clay/x
 deferred           muted/clock
```

Color is never the only signal; titles and icons carry the meaning.

### 8.4 Timeline empty state

If no candidate lineage exists:

```text
No lineage yet.

This candidate has not been generated, measured, or revised. Once Attune creates a candidate, its private history will appear here.
```

Actions:

```text
Back to Discover
Open Workbench
```

---

## 9. Selected event article

The right panel is an article, not a control surface.

For the approved mockup, selected event is `Candidate revised`.

Structure:

```text
[icon] Candidate revised
Apr 28, 2025 · 11:18 AM · attune@local

What changed
Excluded non-UI wrappers and utility components that caused false positives.
Narrowed the rule to target true UI primitives and recipe files only.

Rule comparison
Before (Candidate B v1)      After (Candidate B v2)
code                         code

Impact
Matches          34 → 23
False positives  6 → 0
Precision        84% → 100%

Why it matters
This revision removes noise from non-UI wrappers, improving signal and developer trust while ensuring the rule targets the intended UI surface area.
```

### 9.1 Article header

Article header content:

```text
Candidate revised
Apr 28, 2025 · 11:18 AM · attune@local
```

Optional small event number:

```text
Event 4
```

Avoid:

- Long UUIDs
- raw stream ids
- raw event type names
- JSON payload preview in the primary view

### 9.2 What changed

This is agent-generated or projection-generated prose, but it must be typed and validated.

Good copy:

```text
Excluded non-UI wrappers and utility components that caused false positives.
Narrowed the rule to target true UI primitives and recipe files only.
```

Bad copy:

```text
The agent used its reasoning to decide that Candidate B was better based on analysis.
```

Rules:

- Explain the artifact change, not hidden reasoning.
- Be specific about what changed.
- Tie change to evidence when possible.
- Keep this section short: 1–3 sentences.

### 9.3 Rule comparison

For revision events, show a small before/after comparison.

Desktop layout:

```text
Before (Candidate B v1)   →   After (Candidate B v2)
code block                    code block
```

The comparison should be compact. It is not a full diff editor.

Code examples:

```yaml
# before
pattern: $EL[style={$OBJ}]
inside: **/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg)/
```

```yaml
# after
pattern: $EL[style={$OBJ}]
inside: **/(ui|primitives|recipes)/**/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg|Avatar)/
```

Rules:

- Use Shiki-highlighted code rendered through FoldKit Html nodes.
- Preserve raw code for copy and tests.
- Highlight changed lines if available.
- Keep comparison height bounded.
- Provide `Open in Workbench` or `View full rule` only as a secondary link if necessary.

### 9.4 Impact cards

Impact cards explain causality.

Use three cards maximum by default:

```text
Matches          34 → 23
False positives  6 → 0
Precision        84% → 100%
```

Optional fourth card if important:

```text
Scan time        210 ms → 180 ms
```

But the approved simplified page should default to three. More metrics make the page feel like an analytics dashboard.

Visual rules:

- Use large enough numbers to read.
- Use arrows to show before/after.
- Use sage only for positive direction.
- Do not overdo red/green comparisons.
- If direction is ambiguous, keep neutral.

### 9.5 Why it matters

This is the human-readable product conclusion for the selected event.

Good copy:

```text
This revision removes noise from non-UI wrappers, improving signal and developer trust while ensuring the rule targets the intended UI surface area.
```

Rules:

- One paragraph.
- No more than 2 lines on desktop if possible.
- Mention trust, specificity, signal, scope, or readiness when applicable.
- Do not overclaim correctness.

### 9.6 Optional private details drawer

Lineage may include a collapsed developer drawer:

```text
Developer details
raw event type: rule_candidate.revised
stream sequence: 14
event id: evt_...
```

Default state: collapsed.

Do not show this drawer in the first viewport unless explicitly opened.

The drawer is for debugging, not product comprehension.

---

## 10. Content contract

The agent may generate editorial content for lineage, but the layout is owned by FoldKit.

Agent may generate:

- event title suggestions
- short summaries
- `whatChanged`
- `whyChanged`
- `whyItMatters`
- selected examples or comparisons
- promotion rationale
- export notes

Agent may not generate:

- arbitrary HTML
- arbitrary CSS
- page layout
- raw SVG markup
- unvalidated navigation actions
- hidden chain-of-thought
- unbounded event summaries

### 10.1 Domain/view data schema

Recommended view model:

```ts
type LineagePageModel = {
  readonly repo: RepoContext
  readonly candidate: LineageCandidateSummary
  readonly events: ReadonlyArray<LineageTimelineItem>
  readonly selectedEventId: LineageEventId
  readonly selectedEvent: LineageEventDetail
  readonly rawDetailsOpen: boolean
  readonly motion: LineageMotionState
}

type RepoContext = {
  readonly repoName: string
  readonly branchName: string
}

type LineageCandidateSummary = {
  readonly candidateId: CandidateId
  readonly title: string
  readonly icon: IconToken
  readonly versionLabel: string
  readonly status:
    | 'proposed'
    | 'measured'
    | 'revised'
    | 'promoted'
    | 'export_ready'
    | 'rejected'
    | 'deferred'
}

type LineageTimelineItem = {
  readonly id: LineageEventId
  readonly number: number
  readonly kind: LineageEventKind
  readonly title: string
  readonly summary: string
  readonly actorLabel: string
  readonly occurredAtLabel: string
  readonly isSelected: boolean
  readonly isMajor: boolean
}

type LineageEventDetail = {
  readonly id: LineageEventId
  readonly number: number
  readonly kind: LineageEventKind
  readonly title: string
  readonly actorLabel: string
  readonly occurredAtLabel: string
  readonly whatChanged: ReadonlyArray<string>
  readonly comparison: Option.Option<RuleComparison>
  readonly impact: ReadonlyArray<ImpactMetric>
  readonly whyItMatters: string
  readonly relatedLinks: ReadonlyArray<LineageRelatedLink>
  readonly rawEventSummary: Option.Option<RawEventSummary>
}

type RuleComparison = {
  readonly beforeLabel: string
  readonly afterLabel: string
  readonly beforeCode: HighlightedCode
  readonly afterCode: HighlightedCode
}

type ImpactMetric = {
  readonly label: string
  readonly before: string
  readonly after: string
  readonly tone: 'good' | 'bad' | 'neutral'
}

type LineageRelatedLink = {
  readonly label: string
  readonly target:
    | { readonly _tag: 'Workbench'; readonly candidateId: CandidateId }
    | { readonly _tag: 'Findings'; readonly candidateId: CandidateId }
    | { readonly _tag: 'Exports'; readonly candidateId: CandidateId }
}

type RawEventSummary = {
  readonly eventType: string
  readonly streamSequence: number
  readonly eventId: string
}
```

### 10.2 Event-to-lineage projection

Raw events should project into human-readable timeline items.

Example projection mapping:

```ts
const lineageTitleForEvent = (event: DomainEvent): string => {
  switch (event._tag) {
    case 'RuleCandidateGenerated':
      return 'Agent proposed pattern'
    case 'RuleExamplesGrounded':
      return 'Examples grounded'
    case 'AstGrepRunCompleted':
      return 'Measured against repo'
    case 'FindingLabeled':
      return 'False positives labeled'
    case 'RuleCandidateRevised':
      return 'Candidate revised'
    case 'RuleCandidatePromoted':
      return 'Promoted'
    case 'ExportPreviewGenerated':
      return 'Export preview prepared'
  }
}
```

Projection rules:

- Several low-level finding-label events may be grouped into one `False positives labeled` timeline item.
- Several ast-grep attempts may be grouped unless each attempt changed candidate trust meaningfully.
- Event details may retain raw event references in `RawEventSummary`, but primary display uses human labels.
- Do not store or reveal raw provider responses as lineage truth.
- Do not reveal hidden agent reasoning. Store user-facing rationale only.

---

## 11. Actions and messages

Lineage is mostly navigational and explanatory.

Recommended FoldKit messages:

```ts
export const ClickedTimelineEvent = m('ClickedTimelineEvent', {
  eventId: LineageEventId,
})

export const ClickedBackToWorkbench = m('ClickedBackToWorkbench')

export const ClickedOpenExportPreview = m('ClickedOpenExportPreview')

export const ClickedOpenRelatedFindingReview = m(
  'ClickedOpenRelatedFindingReview',
  { candidateId: CandidateId },
)

export const ToggledRawEventDetails = m('ToggledRawEventDetails')

export const CompletedLineageTransition = m('CompletedLineageTransition')
```

Recommended update behavior:

```ts
const update = (model: Model, message: Message): UpdateReturn =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      ClickedTimelineEvent: ({ eventId }) => [
        selectLineageEvent(model, eventId),
        [startLineageEventTransition(eventId)],
      ],
      ClickedBackToWorkbench: () => [
        model,
        [
          navigateTo(
            WorkbenchRoute({ candidateId: model.candidate.candidateId }),
          ),
        ],
      ],
      ClickedOpenExportPreview: () => [
        model,
        [
          navigateTo(
            ExportsRoute({ candidateId: model.candidate.candidateId }),
          ),
        ],
      ],
      ClickedOpenRelatedFindingReview: ({ candidateId }) => [
        model,
        [navigateTo(FindingsRoute({ candidateId }))],
      ],
      ToggledRawEventDetails: () => [
        { ...model, rawDetailsOpen: !model.rawDetailsOpen },
        [],
      ],
      CompletedLineageTransition: () => [
        { ...model, motion: { _tag: 'Still' } },
        [],
      ],
    }),
  )
```

Lineage should not emit domain-changing commands in the default route. It should not promote, reject, revise, or label findings.

---

## 12. Motion design

Motion should make provenance feel like a story, not a slideshow.

### 12.1 Timeline selection

When the user selects a timeline item:

```text
selected card outline moves
right article softly crossfades
comparison/impact values settle in
```

Duration:

```text
selection highlight: 120–180ms
article transition: 180–260ms
metric settle:      180–240ms
```

### 12.2 Revision comparison reveal

For revision events:

```text
Before pane appears
After pane appears
arrow fades in
changed lines receive subtle glow
impact cards reveal after comparison
```

Do not use typewriter effects. The page should feel typeset, not simulated.

### 12.3 Promotion event

For promotion event:

```text
Promoted chip becomes sage
trust summary checks appear sequentially
export preview link becomes available
```

Keep it restrained. Promotion is important, but not confetti-worthy.

### 12.4 Motion state model

Recommended model:

```ts
type LineageMotionState =
  | { readonly _tag: 'Still' }
  | {
      readonly _tag: 'SwitchingEvent'
      readonly from: LineageEventId
      readonly to: LineageEventId
    }
  | { readonly _tag: 'RevealingComparison'; readonly eventId: LineageEventId }
  | { readonly _tag: 'ShowingPromotion'; readonly eventId: LineageEventId }
```

CSS can do most animation, but the motion state should be explicit enough for Scene/Story tests and reduced-motion behavior.

### 12.5 Reduced motion

If `prefers-reduced-motion: reduce`:

- Disable crossfades.
- Disable staggered reveals.
- Keep selected states immediate.
- Preserve all information.

CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .lineage-event-card,
  .lineage-detail,
  .lineage-impact-card,
  .lineage-comparison-pane {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 13. Detailed CSS specification

This page should use the global Attune tokens. Include page-specific classes in `src/styles.css` or a page-local stylesheet imported by the route if the project later supports CSS splitting.

### 13.1 Global tokens expected

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

### 13.2 Lineage page shell

```css
.lineage-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1.25rem;
  height: 100%;
  min-height: 0;
  color: var(--attune-text-primary);
}

.lineage-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  color: var(--attune-text-muted);
}

.lineage-repo-context {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.lineage-repo-context strong {
  color: var(--attune-text-primary);
  font-weight: 650;
}

.lineage-header {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

.lineage-header h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.1rem, 3vw, 3.2rem);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.lineage-subtitle {
  margin: 0;
  max-width: 54rem;
  color: var(--attune-text-muted);
  font-size: 0.98rem;
  line-height: 1.55;
}

.lineage-candidate-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  min-width: 0;
}

.lineage-candidate-icon {
  display: inline-grid;
  width: 2.6rem;
  height: 2.6rem;
  place-items: center;
  border: 1px solid rgba(141, 186, 111, 0.28);
  border-radius: 999px;
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.13);
}

.lineage-candidate-title {
  min-width: min(100%, 22rem);
  color: var(--attune-text-primary);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.25rem, 1.7vw, 1.7rem);
  font-weight: 500;
  line-height: 1.2;
}
```

### 13.3 Chips

```css
.attune-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.8rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.82rem;
  line-height: 1;
  white-space: nowrap;
}

.attune-chip.is-good {
  border-color: rgba(141, 186, 111, 0.28);
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.1);
}

.attune-chip.is-candidate {
  border-color: rgba(124, 92, 229, 0.28);
  color: #b8a7ff;
  background: rgba(124, 92, 229, 0.11);
}

.attune-chip.is-muted {
  color: var(--attune-text-muted);
}
```

### 13.4 Layout grid

```css
.lineage-layout {
  display: grid;
  grid-template-columns: minmax(20rem, 0.42fr) minmax(32rem, 1fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.lineage-panel {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 28%),
    rgba(19, 25, 27, 0.74);
}
```

### 13.5 Timeline rail CSS

```css
.lineage-timeline {
  position: relative;
  display: grid;
  gap: 0;
  overflow: auto;
  padding: 1rem;
}

.lineage-timeline::before {
  content: '';
  position: absolute;
  top: 2rem;
  bottom: 2rem;
  left: 2.65rem;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(220, 228, 214, 0.18) 8%,
    rgba(220, 228, 214, 0.18) 92%,
    transparent
  );
}

.lineage-event-card {
  position: relative;
  display: grid;
  grid-template-columns: 3.6rem minmax(0, 1fr);
  gap: 0.8rem;
  padding: 0.95rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--attune-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.lineage-event-card:hover {
  border-color: var(--attune-border-panel);
  background: rgba(255, 255, 255, 0.025);
}

.lineage-event-card.is-selected {
  border-color: rgba(141, 186, 111, 0.45);
  background: rgba(141, 186, 111, 0.08);
  box-shadow: inset 3px 0 0 rgba(141, 186, 111, 0.65);
}

.lineage-event-marker {
  position: relative;
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-muted);
  background: var(--attune-bg-panel-soft);
  z-index: 1;
}

.lineage-event-card.is-selected .lineage-event-marker {
  border-color: rgba(141, 186, 111, 0.45);
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.13);
}

.lineage-event-number {
  position: absolute;
  right: -0.25rem;
  bottom: -0.25rem;
  display: grid;
  width: 1.2rem;
  height: 1.2rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-muted);
  background: var(--attune-bg-root);
  font-size: 0.72rem;
}

.lineage-event-body {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.lineage-event-title {
  margin: 0;
  color: var(--attune-text-primary);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.15rem;
  font-weight: 500;
  line-height: 1.25;
}

.lineage-event-summary {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.lineage-event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: var(--attune-text-faint);
  font-size: 0.78rem;
}
```

### 13.6 Detail article CSS

```css
.lineage-detail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.lineage-detail-inner {
  display: grid;
  gap: 1.25rem;
  min-height: 0;
  overflow: auto;
  padding: 1.6rem;
}

.lineage-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding-bottom: 1.15rem;
  border-bottom: 1px solid var(--attune-border-panel);
}

.lineage-detail-icon {
  display: inline-grid;
  width: 3rem;
  height: 3rem;
  flex: none;
  place-items: center;
  border: 1px solid rgba(141, 186, 111, 0.25);
  border-radius: 999px;
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.13);
}

.lineage-detail-title-group {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.lineage-detail-kicker {
  color: var(--attune-text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.055em;
}

.lineage-detail-title {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.6rem, 2vw, 2.25rem);
  font-weight: 500;
  line-height: 1.1;
}

.lineage-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--attune-text-muted);
  font-size: 0.88rem;
}

.lineage-section {
  display: grid;
  gap: 0.65rem;
}

.lineage-section h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--attune-text-primary);
}

.lineage-section p {
  margin: 0;
  color: var(--attune-text-secondary);
  line-height: 1.55;
}

.lineage-bullet-copy {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lineage-bullet-copy li {
  color: var(--attune-text-secondary);
  line-height: 1.5;
}
```

### 13.7 Rule comparison CSS

```css
.lineage-rule-comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
  min-width: 0;
}

.lineage-comparison-arrow {
  display: grid;
  place-items: center;
  color: var(--attune-text-muted);
}

.lineage-comparison-pane {
  display: grid;
  grid-template-rows: auto minmax(0, auto);
  min-width: 0;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(13, 19, 21, 0.82);
}

.lineage-comparison-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid var(--attune-border-subtle);
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.lineage-comparison-pane .code-pane {
  max-height: 10.5rem;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.lineage-comparison-pane.is-after .lineage-comparison-title {
  color: var(--attune-accent-sage);
}
```

### 13.8 Impact CSS

```css
.lineage-impact-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.lineage-impact-card {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
}

.lineage-impact-label {
  color: var(--attune-text-muted);
  font-size: 0.84rem;
}

.lineage-impact-values {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.6rem;
  color: var(--attune-text-secondary);
  font-size: 1.3rem;
  line-height: 1;
}

.lineage-impact-before {
  color: var(--attune-text-muted);
}

.lineage-impact-after.is-good {
  color: var(--attune-accent-sage);
}

.lineage-impact-after.is-bad {
  color: var(--attune-accent-clay);
}

.lineage-impact-arrow {
  color: var(--attune-text-faint);
  font-size: 1rem;
}
```

### 13.9 Footer/action CSS

```css
.lineage-detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--attune-border-panel);
}

.lineage-detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.lineage-muted-note {
  color: var(--attune-text-muted);
  font-size: 0.86rem;
}

.lineage-raw-details {
  border: 1px solid var(--attune-border-subtle);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.lineage-raw-details summary {
  cursor: pointer;
  padding: 0.75rem 0.9rem;
  color: var(--attune-text-muted);
}

.lineage-raw-details pre {
  margin: 0;
  padding: 0 0.9rem 0.9rem;
  overflow: auto;
  color: var(--attune-text-secondary);
  font-size: 0.8rem;
}
```

### 13.10 Responsive CSS

```css
@media (max-width: 1100px) {
  .lineage-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .lineage-page {
    height: auto;
    min-height: 100dvh;
  }

  .lineage-timeline,
  .lineage-detail-inner {
    overflow: visible;
  }
}

@media (max-width: 760px) {
  .lineage-topbar,
  .lineage-detail-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .lineage-rule-comparison {
    grid-template-columns: 1fr;
  }

  .lineage-comparison-arrow {
    transform: rotate(90deg);
  }

  .lineage-impact-grid {
    grid-template-columns: 1fr;
  }

  .lineage-event-card {
    grid-template-columns: 3rem minmax(0, 1fr);
  }
}
```

---

## 14. Fixture content for the first implementation

Use this fixture to make the page feel real.

### 14.1 Candidate

```ts
const candidate = {
  title: 'Styling belongs in UI primitives and recipes',
  versionLabel: 'Candidate B (v2)',
  status: 'promoted',
  icon: 'leaf',
}
```

### 14.2 Timeline items

```ts
const timeline = [
  {
    number: 1,
    kind: 'agent_proposed',
    title: 'Agent proposed pattern',
    summary:
      'Generated an initial rule from repository structure and prior design knowledge.',
    occurredAtLabel: 'Apr 28, 2025 · 10:33 AM',
    actorLabel: 'attune@local',
  },
  {
    number: 2,
    kind: 'examples_grounded',
    title: 'Examples grounded',
    summary:
      'Curated positive and negative examples from UI primitives and recipes.',
    occurredAtLabel: 'Apr 28, 2025 · 10:45 AM',
    actorLabel: 'attune@local',
  },
  {
    number: 3,
    kind: 'measured',
    title: 'Measured against repo',
    summary: 'Ran deterministic scan to measure coverage and precision.',
    occurredAtLabel: 'Apr 28, 2025 · 11:02 AM',
    actorLabel: 'attune@local',
  },
  {
    number: 4,
    kind: 'candidate_revised',
    title: 'Candidate revised',
    summary:
      'Refined rule to exclude non-UI wrappers and contextual components.',
    occurredAtLabel: 'Apr 28, 2025 · 11:18 AM',
    actorLabel: 'attune@local',
  },
  {
    number: 5,
    kind: 'promoted',
    title: 'Promoted',
    summary: 'Meets quality and determinism thresholds for promotion.',
    occurredAtLabel: 'May 12, 2025 · 9:42 AM',
    actorLabel: 'Alex',
  },
]
```

### 14.3 Selected detail fixture

```ts
const selectedEvent = {
  number: 4,
  kind: 'candidate_revised',
  title: 'Candidate revised',
  occurredAtLabel: 'Apr 28, 2025 · 11:18 AM',
  actorLabel: 'attune@local',
  whatChanged: [
    'Excluded non-UI wrappers and utility components that caused false positives.',
    'Narrowed the rule to target true UI primitives and recipe files only.',
  ],
  comparison: {
    beforeLabel: 'Before (Candidate B v1)',
    afterLabel: 'After (Candidate B v2)',
    beforeCode: `pattern: $EL[style={$OBJ}]
inside: **/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg)/`,
    afterCode: `pattern: $EL[style={$OBJ}]
inside: **/(ui|primitives|recipes)/**/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg|Avatar)/`,
  },
  impact: [
    { label: 'Matches', before: '34', after: '23', tone: 'neutral' },
    { label: 'False positives', before: '6', after: '0', tone: 'good' },
    { label: 'Precision', before: '84%', after: '100%', tone: 'good' },
  ],
  whyItMatters:
    'This revision removes noise from non-UI wrappers, improving signal and developer trust while ensuring the rule targets the intended UI surface area.',
}
```

---

## 15. FoldKit view decomposition

Recommended file layout:

```text
src/page/lineage/
  index.ts
  init.ts
  model.ts
  message.ts
  update.ts
  view.ts
  command.ts
  main.story.test.ts
  main.scene.test.ts
  view/
    candidateHeader.ts
    timelineRail.ts
    timelineCard.ts
    eventDetail.ts
    ruleComparison.ts
    impactGrid.ts
    rawDetailsDrawer.ts
```

View components:

```ts
lineageView(model)
  -> pageHeaderView(model.repo, model.candidate)
  -> lineageLayoutView(model.events, model.selectedEvent)
     -> timelineRailView(events, selectedEventId)
        -> timelineCardView(event)
     -> eventDetailView(selectedEvent)
        -> eventHeaderView(selectedEvent)
        -> whatChangedView(selectedEvent.whatChanged)
        -> ruleComparisonView(selectedEvent.comparison)
        -> impactGridView(selectedEvent.impact)
        -> whyItMattersView(selectedEvent.whyItMatters)
        -> relatedLinksView(selectedEvent.relatedLinks)
        -> rawDetailsDrawerView(selectedEvent.rawEventSummary)
```

Rules:

- `view.ts` composes sections; detail rendering lives under `view/`.
- No Shiki calls inside view. Highlighted code is already in model/projection state.
- No event grouping logic inside view. Projection prepares the timeline list.
- No raw provider response objects in model.
- `update` only changes selected event, raw details open state, and navigation commands.

---

## 16. Accessibility requirements

### 16.1 Timeline

- Timeline should be a list or nav region with clear label.
- Each timeline card is keyboard selectable.
- Selected event uses `aria-current="true"` or equivalent.
- Event numbers are not the only way to identify events.
- The selected event title appears in the detail article heading.

Example:

```ts
h.nav([h.Class("lineage-timeline"), h.AriaLabel("Candidate lineage")], [
  h.button([
    h.AriaCurrent(isSelected ? "true" : "false"),
    h.OnClick(ClickedTimelineEvent({ eventId: event.id })),
  ], [...])
])
```

### 16.2 Detail article

- Right detail panel should use `article` or `section` with accessible heading.
- Rule comparison panes need labels.
- Impact metrics need text labels, not just color.
- Raw details drawer must be keyboard accessible.

### 16.3 Color and contrast

- Selected timeline state uses border, background, and text/icon changes.
- Promotion state uses chip text plus color.
- Good/bad impact changes use text arrows plus color.
- Code panes maintain readable contrast.

### 16.4 Motion

- Respect `prefers-reduced-motion`.
- Do not rely on animation to communicate state.
- Focus should move predictably when selecting events via keyboard.

---

## 17. Scene tests

Add Scene tests for the Lineage page.

### 17.1 Renders page shell

```text
WHEN the Lineage route renders
THEN the sidebar selected nav item is Lineage
AND the page title is Lineage
AND the candidate title is visible
AND the candidate version chip is visible
AND the promoted chip is visible
```

### 17.2 Renders simplified timeline

```text
WHEN lineage has major candidate events
THEN the timeline shows Agent proposed pattern, Examples grounded, Measured against repo, Candidate revised, and Promoted
AND it does not render raw event names as primary labels
AND it does not render a dense event table
```

### 17.3 Selects timeline event

```text
WHEN the user selects Candidate revised
THEN the event card becomes selected
AND the right detail article title is Candidate revised
AND the detail article explains What changed
```

### 17.4 Renders rule comparison for revision

```text
WHEN the selected event is a revision event
THEN the detail article shows Before and After rule comparison panes
AND both panes expose raw code text for assertions
AND both panes render tokenized highlighted code spans or lines
```

### 17.5 Renders impact without dashboard overload

```text
WHEN the selected event has impact metrics
THEN the detail article renders no more than three default impact cards
AND it does not render a page-level metrics strip
```

### 17.6 Keeps raw payload hidden

```text
WHEN the Lineage page first renders
THEN raw event ids, stream ids, raw provider responses, and raw JSON payloads are not visible
```

### 17.7 Raw details drawer

```text
WHEN the user opens developer details
THEN raw event type, event id, and stream sequence may be shown
AND raw provider responses are still not shown as product truth
```

### 17.8 Navigation actions

```text
WHEN the user clicks Back to Workbench
THEN the page emits navigation to Workbench scoped to the selected candidate
```

### 17.9 No product mutation actions

```text
WHEN the Lineage page renders
THEN it does not show Promote rule, Revise rule, finding label buttons, or Create draft PR as primary actions
```

---

## 18. Story tests

### 18.1 Timeline selection state

```text
GIVEN a Lineage model with selected event 1
WHEN ClickedTimelineEvent(event 4) is handled
THEN selectedEventId becomes event 4
AND selectedEvent detail becomes Candidate revised
AND motion state becomes SwitchingEvent
```

### 18.2 Toggle raw details

```text
GIVEN rawDetailsOpen is false
WHEN ToggledRawEventDetails is handled
THEN rawDetailsOpen is true
```

### 18.3 Navigation to Workbench

```text
GIVEN a candidate id
WHEN ClickedBackToWorkbench is handled
THEN the page emits a navigation command to WorkbenchRoute(candidateId)
```

### 18.4 Navigation to Exports

```text
GIVEN a promoted candidate with export preview ready
WHEN ClickedOpenExportPreview is handled
THEN the page emits a navigation command to ExportsRoute(candidateId)
```

---

## 19. Empty, loading, and error states

### 19.1 Loading state

```text
Preparing lineage…
Attune is projecting this candidate's private history.
```

Visual:

- Keep the shell stable.
- Show a subtle skeleton for timeline and detail article.
- No fake spinner unless projection is actually pending.

### 19.2 Empty state

```text
No lineage yet.

This candidate has not gone through proposal, measurement, revision, or promotion. Once Attune starts working with it, the private history will appear here.
```

Actions:

```text
Open Workbench
Back to Discover
```

### 19.3 Missing selected event

```text
This lineage event could not be found.

The candidate history may have changed. Select another event or return to the Workbench.
```

Actions:

```text
Select first event
Back to Workbench
```

### 19.4 Projection error

```text
Lineage could not be projected.

Attune could not turn the event stream into a readable history. The raw event stream was preserved, but this view needs repair.
```

Actions:

```text
Retry projection
Open developer details
Back to Workbench
```

---

## 20. Copy guidelines

Prefer:

```text
Agent proposed pattern
Examples grounded
Measured against repo
False positives labeled
Candidate revised
Promoted
Export preview prepared
What changed
Why it matters
Impact
Rule comparison
Private history
Clean artifact
```

Avoid:

```text
Event stream
Domain event payload
LLM trace
Agent reasoning
Compliance log
Violation lifecycle
Policy authority
Mutation log
Canonical truth chain
```

Lineage should sound like a careful engineering note, not a legal record or an AI explanation.

Good summary:

```text
Refined rule to exclude non-UI wrappers and contextual components.
```

Too vague:

```text
The agent improved the rule.
```

Too technical for primary label:

```text
rule_candidate.revised emitted by RuleAgentFixture
```

---

## 21. Data privacy and trust boundaries

Lineage is private to Attune by default.

Show:

- event titles
- human-readable summaries
- user-facing rationale
- measurement impact
- selected snippets and comparisons
- actor labels
- timestamps
- private-history indicators

Do not show by default:

- raw provider responses
- prompts
- hidden agent reasoning
- rejected alternatives unless selected or expanded
- noisy intermediate measurements
- private reviewer notes intended to stay out of repo
- raw JSON payloads

The export boundary must remain clear:

```text
Lineage explains why the artifact exists.
Exports decides what enters the repo.
```

---

## 22. Relationship to Exports

Lineage and Exports are closely related but must stay distinct.

Lineage:

```text
How did we get here?
Why is this candidate trustworthy?
What evidence changed it?
```

Exports:

```text
Which clean files will enter the repo?
How will the Git bot open the PR?
What stays private in Attune?
```

Lineage may include a secondary link:

```text
Open export preview
```

But it should not show the Git bot handoff form, PR title, branch name, destination path, or export readiness checklist as its primary UI. Those belong on Exports.

---

## 23. Acceptance checklist

The Lineage page is complete for the first product-shell pass when:

- [ ] It renders in the shared Attune shell.
- [ ] `Lineage` is selected in nav.
- [ ] It shows repo/branch topbar.
- [ ] It shows page title and subtitle.
- [ ] It shows selected candidate title, version, and state chips.
- [ ] It renders a simplified major-event timeline on the left.
- [ ] It renders a selected event article on the right.
- [ ] The selected `Candidate revised` event shows `What changed`.
- [ ] The selected revision event shows a compact before/after rule comparison.
- [ ] Impact shows three default cards: matches, false positives, precision.
- [ ] `Why it matters` appears as a short paragraph.
- [ ] Raw event names and payloads are hidden by default.
- [ ] It does not include promote/revise/finding-label/export-PR actions as primary controls.
- [ ] `Back to Workbench` routes back to the selected candidate.
- [ ] Motion respects reduced-motion settings.
- [ ] Scene tests lock the simplified visual architecture.

---

## 24. One-shot implementation prompt

Use this prompt for an implementation agent:

```text
Implement the Attune Lineage page as a dark editorial provenance view.

Use the existing Attune shell, tokens, FoldKit route structure, icon helper, and highlighted-code renderer. Create `src/page/lineage/` with Model, Message, update, init, view, and local view helpers.

The page should explain how one candidate evolved from first proposal to promoted artifact. It must not look like an event log, audit dashboard, or dense metrics page.

Layout:
- Shared Attune sidebar with Lineage selected.
- Topbar with repo `bulletproof-react`, branch `main`, and a `Back to Workbench` button.
- Header title `Lineage` and subtitle `Understand how this candidate evolved from first proposal to promoted artifact.`
- Candidate row: icon, `Styling belongs in UI primitives and recipes`, `Candidate B (v2)`, `Promoted`.
- Main layout has two columns: left timeline rail and right selected event article.
- Timeline shows five major cards: Agent proposed pattern, Examples grounded, Measured against repo, Candidate revised, Promoted.
- Selected card is Candidate revised.
- Right article shows Candidate revised, metadata, What changed, Rule comparison, Impact, and Why it matters.
- Rule comparison has Before and After compact code panes using the existing highlighted-code renderer.
- Impact has three cards only: Matches 34 -> 23, False positives 6 -> 0, Precision 84% -> 100%.
- Do not render raw event names, raw JSON payloads, full audit feeds, page-level metrics strips, promotion buttons, revise buttons, finding label controls, or Git bot export controls.
- Include a collapsed developer details drawer only if easy; it must be closed by default.

Use dark editorial instrumentation styling: warm graphite surfaces, low-contrast borders, serif page titles, clean sans metadata, quiet sage selected state, semantic chips, local scrolling, and viewport-contained desktop layout.

Add Story tests for timeline selection and raw details toggle. Add Scene tests proving the simplified timeline, selected event article, rule comparison, impact cards, hidden raw payloads, and absence of mutation actions.
```
