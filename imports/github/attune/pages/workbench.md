# Attune Workbench Page Specification

Status: draft implementation spec  
Target surface: `src/page/ruleWorkbench/`  
Visual language: dark editorial instrumentation  
Primary job: inspect, revise, and promote one candidate rule artifact

---

## 1. Product intent

The Workbench is the center of Attune.

It is not a scan dashboard, a lint configuration editor, a chat interface, or a raw ast-grep authoring screen. It is the page where a team studies one proposed codebase convention until it either becomes trustworthy enough to promote or specific enough to revise.

The Workbench should communicate this sequence without explanation:

```text
A pattern was noticed.
The pattern has a human-readable intent.
The intent is grounded in a good example and a bad example.
The examples are compiled into a deterministic rule.
The deterministic rule touched the repository and produced findings.
The user can revise the candidate with intent, inspect findings if needed, or promote the rule.
```

The user should feel like they are reviewing a prepared technical artifact, not filling out a form.

The most important sentence for the page:

> The user writes intent; Attune updates examples and the deterministic rule.

The second most important sentence:

> The YAML is for inspection first, direct editing later.

---

## 2. Page-level user story

As an engineer reviewing a proposed codebase practice, I want to compare what the rule means, what it forbids, and the deterministic artifact that encodes it, so I can revise or promote the candidate without hand-writing ast-grep YAML.

---

## 3. Workbench page role in the app

The Workbench answers these questions:

1. What candidate rule am I reviewing?
2. What is the intent?
3. What should pass?
4. What should be flagged?
5. What deterministic rule encodes the pattern?
6. What happened when it ran?
7. What needs to change before promotion?
8. Am I ready to promote this candidate?

The Workbench should not fully answer:

1. Which candidate patterns exist across the repo? That is Discover.
2. Which individual findings are true or false positives? That is Findings.
3. How did every event unfold over time? That is Lineage.
4. What exact files will enter the repo? That is Exports.
5. How are scan defaults and bot handoff configured? That is Settings.

---

## 4. Route contract

Recommended route:

```ts
type Route = { _tag: 'WorkbenchRoute'; candidateId?: CandidateId }
```

For the first product-shell implementation, `candidateId` may be implicit from the selected fixture candidate. The route should eventually support deep-linking a candidate.

Navigation into Workbench can originate from:

- Discover pattern dossier: `Open in Workbench`
- Sidebar potential pattern card
- Findings page: `Back to Workbench`
- Lineage page: `Back to Workbench`
- Exports page: `Back to Workbench`

---

## 5. Visual summary

The Workbench is a focused artifact review surface.

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ App shell sidebar                                                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Topbar: repo / branch                                                     │ │
│ │                                                                          │ │
│ │ Rule title + intent                         [Revise rule] [Promote rule] │ │
│ │ Candidate status strip                                                    │ │
│ │                                                                          │ │
│ │ ┌────────────────────────────┬─────────────────────────────────────────┐ │ │
│ │ │ Looks like                 │ Deterministic rule                      │ │ │
│ │ │ code pane                  │ tall ast-grep YAML pane                 │ │ │
│ │ ├────────────────────────────┤                                         │ │ │
│ │ │ Does not look like         │                                         │ │ │
│ │ │ code pane                  │                                         │ │ │
│ │ └────────────────────────────┴─────────────────────────────────────────┘ │ │
│ │                                                                          │ │
│ │ Revise with intent                                                        │ │
│ │ compact prompt input + revise action                                      │ │
│ │                                                                          │ │
│ │ Findings handoff strip                                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

The approved Workbench composition has these important constraints:

- Potential patterns live in the persistent sidebar, not as a second column in the Workbench content.
- The main page focuses on one selected candidate.
- There are three core artifact panes: `Looks like`, `Does not look like`, and `Deterministic rule`.
- The deterministic rule pane sits to the right and has the most vertical code space.
- Findings are represented as a compact handoff, not as a review queue.
- Measurement is shown once as candidate status and once only when needed as a findings summary.
- The Workbench has no full lineage timeline by default.
- The Workbench has no global ambiguous controls such as `New scan`, `Give feedback`, `Run agent`, or `Auto-fix`.
- The natural-language revision prompt is present, but it is scoped to revising the current candidate.

---

## 6. Visual direction

The Workbench should use the newer cleaner direction:

> dark editorial instrumentation

It should feel like:

- a serious review instrument,
- a technical dossier,
- a calm code policy workbench,
- a place where generated prose and deterministic artifacts are inspected together.

It should not feel like:

- a terminal cockpit,
- an observability dashboard,
- a security console,
- a generic SaaS admin panel,
- a markdown document with cards pasted around it,
- a chat app with code attached.

The page should preserve warmth through typography, spacing, and copy, not through decorative paper effects.

---

## 7. Information hierarchy

The order of visual priority should be:

1. Rule title and intent
2. The three artifact panes
3. Revision prompt
4. Candidate status / measurement strip
5. Findings handoff
6. Secondary route context and metadata

The deterministic rule pane should be visually important, but it should not dominate the meaning. It is the executable approximation of the examples, not the whole product.

The revision prompt should feel integrated with the artifact loop, not like an unrelated chat box.

---

## 8. User actions

### 8.1 Primary actions

The Workbench has two primary lifecycle actions:

```text
Revise rule
Promote rule
```

`Revise rule` should connect to the revision prompt. If the prompt is empty, the action can either be disabled or open/focus the prompt.

`Promote rule` should be enabled only when promotion blockers are cleared.

### 8.2 Secondary actions

Allowed secondary actions:

```text
Open findings
Expand code pane
Collapse code pane
Copy rule
Back to Discover, if navigated from Discover
```

### 8.3 Avoided actions

Do not render these in the Workbench header by default:

```text
New scan
Give feedback
Run agent
Auto-fix
Generate PR
Export now
Edit settings
```

Those belong to other pages or future explicit command models.

### 8.4 Advanced actions

Eventually, advanced users may directly edit YAML. Do not make this the default first-slice interaction.

Recommended future UI:

```text
Advanced
  Edit YAML directly
  Validate rule
  Reset generated rule
```

This should be hidden behind a details disclosure or explicit advanced mode.

---

## 9. Required content model

The Workbench should render from a typed view model. Agent output should fill fields in this model, not generate arbitrary page layout.

```ts
export type CandidateStatusKind =
  | 'draft'
  | 'measuring'
  | 'ready_to_review'
  | 'needs_revision'
  | 'promoted'
  | 'export_ready'
  | 'blocked'

export type CodePaneId =
  | 'none'
  | 'looksLike'
  | 'doesNotLookLike'
  | 'deterministicRule'

export type ReviewReadiness =
  | 'ready_to_promote'
  | 'needs_findings_review'
  | 'needs_revision'
  | 'measurement_failed'
  | 'missing_examples'

export type WorkbenchViewModel = {
  readonly repo: {
    readonly name: string
    readonly branch: string
    readonly provider: 'github' | 'local' | 'fixture'
  }

  readonly candidate: {
    readonly id: string
    readonly versionLabel: string
    readonly title: string
    readonly intent: string
    readonly icon: IconToken
    readonly status: CandidateStatusKind
    readonly readiness: ReviewReadiness
    readonly statusLabel: string
  }

  readonly measurement: {
    readonly matchCount: number
    readonly reviewedCount: number
    readonly falsePositiveCount: number
    readonly ignoredCount?: number
    readonly fileCount: number
    readonly durationMs: number
    readonly lastMeasuredLabel: string
  }

  readonly examples: {
    readonly looksLike: CodeExamplePane
    readonly doesNotLookLike: CodeExamplePane
  }

  readonly deterministicRule: DeterministicRulePane

  readonly revision: {
    readonly promptText: string
    readonly placeholder: string
    readonly suggestedPrompts: ReadonlyArray<string>
    readonly isSubmitting: boolean
    readonly lastRevisionNote?: string
  }

  readonly findingsHandoff: {
    readonly summary: string
    readonly actionLabel: string
    readonly routeTarget: 'FindingsRoute'
  }

  readonly promotion: {
    readonly canPromote: boolean
    readonly blockers: ReadonlyArray<PromotionBlocker>
    readonly buttonLabel: string
  }

  readonly expandedCodePane: CodePaneId
}

export type CodeExamplePane = {
  readonly label: 'Looks like' | 'Does not look like'
  readonly description: string
  readonly sourcePath?: string
  readonly sourceKind: 'repo' | 'generated' | 'curated'
  readonly code: HighlightedCode
}

export type DeterministicRulePane = {
  readonly label: 'Deterministic rule'
  readonly engine: 'ast-grep'
  readonly language: 'yaml'
  readonly ruleId: string
  readonly code: HighlightedCode
  readonly note: string
}

export type PromotionBlocker = {
  readonly kind:
    | 'missing_positive_example'
    | 'missing_negative_example'
    | 'measurement_failed'
    | 'unreviewed_findings'
    | 'too_many_false_positives'
    | 'invalid_rule'
  readonly label: string
  readonly detail: string
}
```

---

## 10. Agent-generated content boundaries

The agent may generate:

- candidate title,
- candidate icon token,
- intent prose,
- looks-like example,
- does-not-look-like example,
- ast-grep YAML,
- explanation of why the rule exists,
- suggested revision prompts,
- known limits,
- measurement summary prose,
- promotion rationale.

The agent must not generate:

- the layout,
- the number of primary actions,
- arbitrary HTML,
- arbitrary CSS,
- arbitrary SVG paths in the first implementation,
- route structure,
- button semantics,
- promotion truth,
- raw provider payloads as UI state.

The agent output should be validated into domain/view types before it appears in the Workbench.

---

## 11. Layout specification

### 11.1 Shell relationship

The page sits inside the persistent `attune-shell`:

```text
attune-shell
  attune-sidebar
  attune-main
    ruleWorkbench
```

The sidebar contains primary nav, potential pattern cards, repo context, and user footer. The Workbench should not recreate any of those structures.

### 11.2 Workbench grid

The Workbench itself uses a viewport-contained grid:

```css
.workbench {
  display: grid;
  grid-template-rows:
    auto /* topbar */
    auto /* header */
    auto /* status */
    minmax(0, 1fr) /* artifact grid */
    auto /* revision prompt */
    auto; /* findings handoff */
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
```

The page should fit inside the desktop viewport. Dense content scrolls locally inside code panes, sidebar lists, or secondary content regions.

### 11.3 Artifact grid

Normal desktop mode:

```css
.workbench-artifact-grid {
  display: grid;
  grid-template-areas:
    'looks rule'
    'bad   rule';
  grid-template-columns: minmax(20rem, 0.88fr) minmax(26rem, 1.12fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.workbench-pane--looks {
  grid-area: looks;
}

.workbench-pane--bad {
  grid-area: bad;
}

.workbench-pane--rule {
  grid-area: rule;
}
```

Expanded code mode:

```css
.workbench.has-expanded-code .workbench-artifact-grid {
  grid-template-areas: 'expanded';
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr);
}

.workbench.has-expanded-code .workbench-pane.is-expanded {
  grid-area: expanded;
}

.workbench.has-expanded-code .workbench-pane:not(.is-expanded) {
  display: none;
}
```

Narrow viewports:

```css
@media (max-width: 920px) {
  .workbench {
    height: auto;
    overflow: visible;
  }

  .workbench-artifact-grid {
    display: grid;
    grid-template-areas:
      'looks'
      'bad'
      'rule';
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    overflow: visible;
  }
}
```

---

## 12. Exact page composition

### 12.1 Topbar

Purpose: show repository and branch context.

```text
bulletproof-react  /  main
```

Do not add global scan buttons here.

Implementation shape:

```ts
const topbarView = (model: WorkbenchViewModel): Html =>
  h.div(
    [h.Class('workbench-topbar')],
    [
      h.span([h.Class('topbar-repo')], [Icon.github(), model.repo.name]),
      h.span([h.Class('topbar-branch')], [Icon.gitBranch(), model.repo.branch]),
    ],
  )
```

### 12.2 Header

Purpose: establish the current candidate and its intent.

Required:

- icon,
- title,
- intent,
- version/status chips,
- primary actions.

Suggested copy:

```text
Styling belongs in UI primitives and recipes
Keep visual styling centralized in UI primitives and recipes so app components remain structural and token-driven.
```

Implementation structure:

```html
<header class="workbench-header">
  <div class="workbench-title-row">
    <div class="candidate-icon">...</div>
    <div>
      <h1>Styling belongs in UI primitives and recipes</h1>
      <p class="intent">Keep visual styling centralized...</p>
      <div class="candidate-chips">Candidate B (v2) · Ready to inspect</div>
    </div>
  </div>

  <div class="workbench-actions">
    <button class="button secondary">Revise rule</button>
    <button class="button primary">Promote rule</button>
  </div>
</header>
```

### 12.3 Status strip

Purpose: compact, non-dashboard measurement readout.

Values:

```text
Candidate B (v2)
34 matches
8 reviewed
2 false positives
180 ms
```

Do not create a standalone measurement panel.

Implementation structure:

```html
<section
  class="candidate-status-strip"
  aria-label="Candidate measurement summary"
>
  <div class="metric metric--good">Candidate B (v2)</div>
  <div class="metric">34 <span>matches</span></div>
  <div class="metric">8 <span>reviewed</span></div>
  <div class="metric metric--bad">2 <span>false positives</span></div>
  <div class="metric">180 <span>ms</span></div>
</section>
```

### 12.4 Artifact panes

The core of the page.

#### Looks like

Purpose: show the positive example that should pass.

Required content:

- label: `Looks like`,
- semantic icon,
- short description,
- source path if available,
- code pane,
- expand control.

Tone: sage/green, quiet.

#### Does not look like

Purpose: show the negative example that the rule should flag.

Required content:

- label: `Does not look like`,
- semantic icon,
- short description,
- source path if available,
- code pane,
- expand control.

Tone: clay/red, quiet.

#### Deterministic rule

Purpose: show the exact native artifact candidate.

Required content:

- label: `Deterministic rule`,
- engine label: `ast-grep`,
- rule id,
- highlighted YAML,
- copy action,
- expand control,
- short note.

Tone: precise, neutral, with sage artifact identity.

The rule pane should communicate:

```text
This is not a prompt. This is the artifact being considered.
```

### 12.5 Revision prompt

Purpose: allow the user to revise the examples and deterministic rule through intent, not by hand-editing YAML.

Recommended label:

```text
Revise with intent
```

Description:

```text
Tell Attune what should change. The agent will update the examples and deterministic rule, then re-measure the candidate.
```

Placeholder examples:

```text
Allow inline width and height for layout-only geometry, but keep raw colors and shadows flagged.
```

```text
This should only apply outside ui/primitives and recipes paths.
```

```text
Treat animation transforms as allowed, but flag raw visual surface styling.
```

Implementation structure:

```html
<section class="revision-panel panel">
  <div class="revision-heading">
    <div>
      <h2>Revise with intent</h2>
      <p>
        Tell Attune what should change. It will update examples and the rule.
      </p>
    </div>
    <span class="revision-chip">updates examples + ast-grep</span>
  </div>

  <div class="revision-input-row">
    <textarea
      placeholder="Allow inline width/height for layout-only geometry..."
    />
    <button class="button primary">Revise candidate</button>
  </div>

  <div class="revision-suggestions">
    <button>Only apply outside ui/primitives</button>
    <button>Allow layout geometry</button>
    <button>Keep raw colors flagged</button>
  </div>
</section>
```

The revision prompt should be compact. It should not become a chat thread.

### 12.6 Findings handoff

Purpose: route the user into detailed finding review without crowding the Workbench.

Required content:

- label: `Findings`,
- match count,
- file count,
- false-positive count,
- `Open findings` action.

Implementation structure:

```html
<aside class="findings-handoff panel" aria-label="Findings summary">
  <div class="findings-title">Findings</div>
  <div class="findings-metrics">
    <span>34 matches</span>
    <span>12 files</span>
    <span>2 false positives</span>
  </div>
  <button class="button secondary">Open findings →</button>
</aside>
```

No finding queue, label buttons, note field, or selected finding excerpt on the Workbench page.

---

## 13. CSS implementation detail

This section intentionally includes concrete CSS so an implementation agent can one-shot the style.

### 13.1 Tokens

Use these tokens or map existing tokens to them.

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

  --attune-radius-sm: 8px;
  --attune-radius-md: 12px;
  --attune-radius-lg: 16px;

  --attune-shadow-panel:
    0 1px 0 rgba(255, 255, 255, 0.02), 0 18px 50px rgba(0, 0, 0, 0.25);

  --attune-font-ui:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
  --attune-font-editorial: Georgia, 'Times New Roman', serif;
  --attune-font-code: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}
```

### 13.2 Workbench base

```css
.workbench {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--attune-text-primary);
}

.workbench-topbar,
.workbench-header,
.candidate-status-strip,
.workbench-artifact-grid,
.revision-panel,
.findings-handoff {
  min-width: 0;
}

.workbench-topbar {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  color: var(--attune-text-muted);
  font-size: 0.95rem;
}

.topbar-repo,
.topbar-branch {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.topbar-repo {
  color: var(--attune-text-primary);
  font-weight: 650;
}
```

### 13.3 Header

```css
.workbench-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
}

.workbench-title-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 0.95rem;
  min-width: 0;
}

.candidate-icon {
  display: grid;
  width: 2.7rem;
  height: 2.7rem;
  place-items: center;
  border: 1px solid rgba(141, 186, 111, 0.22);
  border-radius: 999px;
  background: rgba(141, 186, 111, 0.14);
  color: var(--attune-accent-sage);
}

.workbench h1 {
  margin: 0 0 0.55rem;
  color: var(--attune-text-primary);
  font-family: var(--attune-font-editorial);
  font-size: clamp(2rem, 2.7vw, 3rem);
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.025em;
}

.intent {
  max-width: 64rem;
  margin: 0;
  color: var(--attune-text-secondary);
  font-size: 1rem;
  line-height: 1.55;
}

.candidate-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  min-height: 1.8rem;
  padding: 0.22rem 0.65rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.84rem;
}

.status-chip.is-good {
  border-color: rgba(141, 186, 111, 0.22);
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.09);
}

.status-chip.is-bad {
  border-color: rgba(196, 106, 84, 0.26);
  color: var(--attune-accent-clay);
  background: rgba(196, 106, 84, 0.09);
}

.workbench-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}
```

### 13.4 Buttons

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.65rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: rgba(255, 255, 255, 0.03);
  font: inherit;
  cursor: pointer;
}

.button:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.055);
}

.button:focus-visible {
  outline: 2px solid rgba(141, 186, 111, 0.75);
  outline-offset: 2px;
}

.button.primary {
  border-color: rgba(141, 186, 111, 0.4);
  background: rgba(141, 186, 111, 0.18);
  color: #d8f0c8;
}

.button.primary:hover {
  background: rgba(141, 186, 111, 0.25);
}

.button.secondary {
  background: rgba(255, 255, 255, 0.025);
}

.button[disabled],
.button.is-disabled {
  cursor: not-allowed;
  opacity: 0.48;
}
```

### 13.5 Candidate status strip

```css
.candidate-status-strip {
  display: grid;
  grid-template-columns: minmax(12rem, 1.4fr) repeat(4, minmax(5.8rem, 0.75fr));
  gap: 0.75rem;
  align-items: center;
  padding: 0.82rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background: rgba(19, 25, 27, 0.78);
}

.metric {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.1rem 0.45rem;
  min-width: 0;
}

.metric-icon {
  grid-row: span 2;
  color: var(--attune-text-muted);
}

.metric strong {
  color: var(--attune-text-primary);
  font-size: 1rem;
  font-weight: 650;
}

.metric span {
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.metric.is-good strong,
.metric.is-good .metric-icon {
  color: var(--attune-accent-sage);
}

.metric.is-bad strong,
.metric.is-bad .metric-icon {
  color: var(--attune-accent-clay);
}
```

### 13.6 Panels and artifact panes

```css
.panel,
.workbench-pane {
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0)),
    rgba(19, 25, 27, 0.82);
  box-shadow: var(--attune-shadow-panel);
}

.workbench-artifact-grid {
  display: grid;
  grid-template-areas:
    'looks rule'
    'bad   rule';
  grid-template-columns: minmax(20rem, 0.88fr) minmax(26rem, 1.12fr);
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.workbench-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  resize: both;
}

.workbench-pane--looks {
  grid-area: looks;
}

.workbench-pane--bad {
  grid-area: bad;
}

.workbench-pane--rule {
  grid-area: rule;
}

.workbench-pane__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.2rem;
  padding: 0.82rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.workbench-pane__title {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--attune-text-primary);
  font-size: 0.98rem;
  font-weight: 620;
}

.workbench-pane__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.workbench-pane__body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.85rem;
}

.workbench-pane__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid var(--attune-border-subtle);
  color: var(--attune-text-muted);
  font-size: 0.82rem;
}

.workbench-pane--looks .semantic-icon {
  color: var(--attune-accent-sage);
}

.workbench-pane--bad .semantic-icon {
  color: var(--attune-accent-clay);
}

.workbench-pane--rule .semantic-icon {
  color: var(--attune-accent-sage);
}
```

### 13.7 Code panes

```css
.code-pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  margin: 0;
  padding: 0.8rem 0;
  overflow: auto;
  resize: both;
  border: 1px solid var(--attune-border-subtle);
  border-radius: var(--attune-radius-sm);
  background: var(--attune-bg-code);
  color: var(--attune-text-secondary);
  font-family: var(--attune-font-code);
  font-size: 0.86rem;
  line-height: 1.55;
}

.code-pane code {
  display: block;
  min-width: max-content;
}

.code-line {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  min-width: max-content;
  padding: 0 0.8rem;
}

.code-line:hover {
  background: rgba(255, 255, 255, 0.025);
}

.code-line.is-marked {
  background: rgba(141, 186, 111, 0.09);
}

.code-line-number {
  color: var(--attune-text-faint);
  user-select: none;
}

.code-line-content {
  white-space: pre;
}

.rule-note {
  margin: 0;
  color: var(--attune-accent-sage);
  font-family: var(--attune-font-code);
  font-size: 0.82rem;
}
```

### 13.8 Icon buttons

```css
.icon-button {
  display: inline-grid;
  width: 1.8rem;
  height: 1.8rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-muted);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
}

.icon-button:hover {
  color: var(--attune-text-primary);
  border-color: var(--attune-border-strong);
}

.icon-button:focus-visible {
  outline: 2px solid rgba(141, 186, 111, 0.75);
  outline-offset: 2px;
}
```

### 13.9 Revision prompt

```css
.revision-panel {
  padding: 0.95rem 1rem;
}

.revision-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.revision-heading h2 {
  margin: 0 0 0.25rem;
  font-family: var(--attune-font-editorial);
  font-size: 1.25rem;
  font-weight: 500;
}

.revision-heading p {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.revision-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.18rem 0.55rem;
  border: 1px solid rgba(110, 145, 184, 0.24);
  border-radius: 999px;
  color: var(--attune-accent-blue);
  background: rgba(110, 145, 184, 0.08);
  font-size: 0.78rem;
  white-space: nowrap;
}

.revision-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
}

.revision-textarea {
  width: 100%;
  min-height: 4.4rem;
  max-height: 9rem;
  resize: vertical;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: var(--attune-radius-sm);
  color: var(--attune-text-primary);
  background: rgba(13, 19, 21, 0.78);
  font: inherit;
  line-height: 1.45;
}

.revision-textarea::placeholder {
  color: var(--attune-text-faint);
}

.revision-textarea:focus-visible {
  outline: 2px solid rgba(110, 145, 184, 0.65);
  outline-offset: 2px;
  border-color: rgba(110, 145, 184, 0.45);
}

.revision-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.revision-suggestion {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0.22rem 0.62rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.82rem;
  cursor: pointer;
}

.revision-suggestion:hover {
  border-color: var(--attune-border-strong);
  color: var(--attune-text-primary);
}
```

### 13.10 Findings handoff

```css
.findings-handoff {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.8rem 1rem;
}

.findings-handoff__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--attune-text-primary);
  font-weight: 620;
}

.findings-handoff__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  color: var(--attune-text-muted);
  font-size: 0.9rem;
}

.findings-handoff__metrics strong {
  color: var(--attune-text-primary);
  font-weight: 650;
}
```

### 13.11 Compact height mode

```css
@media (max-height: 820px) and (min-width: 921px) {
  .workbench {
    gap: 0.72rem;
  }

  .workbench h1 {
    margin-bottom: 0.35rem;
    font-size: clamp(1.65rem, 2.1vw, 2.25rem);
  }

  .intent {
    font-size: 0.94rem;
  }

  .candidate-status-strip,
  .revision-panel,
  .findings-handoff {
    padding: 0.72rem;
  }

  .workbench-pane__heading {
    min-height: 2.75rem;
    padding: 0.65rem 0.8rem;
  }

  .revision-heading {
    margin-bottom: 0.55rem;
  }

  .revision-textarea {
    min-height: 3.5rem;
  }
}
```

---

## 14. Motion design

Motion should be causal, not decorative.

Recommended durations:

```css
:root {
  --motion-fast: 140ms;
  --motion-medium: 220ms;
  --motion-slow: 360ms;
  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### 14.1 Enter Workbench

When opening a candidate from Discover:

- page title fades in,
- candidate status slides up slightly,
- examples and rule panes appear in order,
- no typewriter effect.

Suggested CSS:

```css
@keyframes attune-rise-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.workbench.is-entering .workbench-header,
.workbench.is-entering .candidate-status-strip,
.workbench.is-entering .workbench-pane,
.workbench.is-entering .revision-panel,
.workbench.is-entering .findings-handoff {
  animation: attune-rise-in var(--motion-medium) var(--motion-ease) both;
}

.workbench.is-entering .candidate-status-strip {
  animation-delay: 40ms;
}
.workbench.is-entering .workbench-pane--looks {
  animation-delay: 80ms;
}
.workbench.is-entering .workbench-pane--bad {
  animation-delay: 120ms;
}
.workbench.is-entering .workbench-pane--rule {
  animation-delay: 140ms;
}
.workbench.is-entering .revision-panel {
  animation-delay: 180ms;
}
.workbench.is-entering .findings-handoff {
  animation-delay: 220ms;
}
```

### 14.2 Revise candidate

State machine:

```ts
type RevisionMotion =
  | { _tag: 'Idle' }
  | { _tag: 'Submitting' }
  | { _tag: 'MaterializingRevision'; nextCandidateVersion: string }
  | { _tag: 'Measuring' }
  | { _tag: 'Complete' }
  | { _tag: 'Failed'; reason: string }
```

Visual behavior:

1. Prompt locks.
2. Button changes to `Revising...`.
3. Examples and rule panes receive a subtle blue/violet outline.
4. New candidate version replaces the old content.
5. Measurement values pulse once.

### 14.3 Promote rule

State machine:

```ts
type PromotionMotion =
  | { _tag: 'Idle' }
  | { _tag: 'Promoting' }
  | { _tag: 'Promoted' }
  | { _tag: 'Blocked'; blockers: ReadonlyArray<PromotionBlocker> }
```

Visual behavior:

- `Promote rule` button enters loading state.
- Candidate chip becomes sage.
- A small toast says `Rule promoted`.
- Export route becomes visually available in sidebar / next action.

### 14.4 Expand code pane

Expanding should feel instant and spatial, not modal.

- Code pane grows into the artifact area.
- Other panes hide.
- Header/status/revision/findings remain visible.
- `Collapse code pane` returns to normal layout.

Use CSS transitions on opacity and transform only; avoid animating grid dimensions heavily if it causes layout jank.

---

## 15. FoldKit implementation guidance

### 15.1 Suggested files

```text
src/page/ruleWorkbench/
  index.ts
  init.ts
  model.ts
  message.ts
  update.ts
  view.ts
  command.ts
  view/
    topbar.ts
    header.ts
    statusStrip.ts
    artifactPane.ts
    revisionPrompt.ts
    findingsHandoff.ts
    highlightedCode.ts
```

### 15.2 Messages

```ts
export const ClickedOpenFindings = m('ClickedOpenFindings')
export const ClickedPromoteRule = m('ClickedPromoteRule')
export const ClickedReviseRule = m('ClickedReviseRule')
export const ChangedRevisionPrompt = m('ChangedRevisionPrompt', {
  value: S.String,
})
export const ClickedRevisionSuggestion = m('ClickedRevisionSuggestion', {
  value: S.String,
})
export const ToggledCodePaneExpansion = m('ToggledCodePaneExpansion', {
  paneId: CodePaneId,
})
export const ClickedCopyRule = m('ClickedCopyRule')
```

### 15.3 Update rules

- `ChangedRevisionPrompt` updates only prompt text.
- `ClickedRevisionSuggestion` inserts or replaces prompt text.
- `ClickedReviseRule` emits a command if prompt is non-empty.
- `ClickedPromoteRule` emits a promotion command if no blockers exist.
- `ClickedOpenFindings` emits a route/navigation message.
- `ToggledCodePaneExpansion` changes only UI state.
- `ClickedCopyRule` emits a clipboard command or no-op in fixture mode.

The view never performs highlighting, measurement, network calls, ast-grep calls, or clipboard operations directly.

---

## 16. Example fixture data

Use this content for the first fixture-backed Workbench while backend wiring is still fake.

```ts
const workbenchFixture = {
  repo: {
    name: 'bulletproof-react',
    branch: 'main',
    provider: 'github',
  },
  candidate: {
    id: 'candidate-style-inline-v2',
    versionLabel: 'Candidate B (v2)',
    title: 'Styling belongs in UI primitives and recipes',
    intent:
      'Keep visual styling centralized in UI primitives and recipes so app components remain structural and token-driven.',
    icon: 'leaf',
    status: 'ready_to_review',
    readiness: 'needs_findings_review',
    statusLabel: 'Scoring candidate',
  },
  measurement: {
    matchCount: 34,
    reviewedCount: 8,
    falsePositiveCount: 2,
    ignoredCount: 1,
    fileCount: 12,
    durationMs: 180,
    lastMeasuredLabel: '2 min ago',
  },
  examples: {
    looksLike: {
      label: 'Looks like',
      description:
        'Use shared UI primitives and recipe variants for surface styling.',
      sourcePath: 'src/components/Toolbar.tsx',
      sourceKind: 'curated',
      code: `import { Button } from "@/components/ui/button"

export function Toolbar() {
  return <Button variant="surface" size="sm">Save</Button>
}`,
    },
    doesNotLookLike: {
      label: 'Does not look like',
      description: 'Raw surface styling lives directly on a component.',
      sourcePath: 'src/components/Card.tsx',
      sourceKind: 'repo',
      code: `export function Card() {
  return (
    <div
      style={{
        background: "#121212",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        borderRadius: 12,
      }}
    />
  )
}`,
    },
  },
  deterministicRule: {
    label: 'Deterministic rule',
    engine: 'ast-grep',
    language: 'yaml',
    ruleId: 'style-inline-forbidden',
    code: `id: style-inline-forbidden
language: tsx
message: Use primitives or recipes for surface styling.
severity: error
rule:
  any:
    - pattern: <$$$ style={$$$} $$$ />
    - pattern: className={$VALUE}`,
    note: 'Flags raw inline surface styling outside approved primitive paths.',
  },
  revision: {
    promptText: '',
    placeholder:
      'Allow inline width/height for layout-only geometry, but keep raw colors and shadows flagged.',
    suggestedPrompts: [
      'Only apply outside ui/primitives and recipes paths.',
      'Allow layout-only geometry like width and height.',
      'Keep raw colors, shadows, and border radii flagged.',
    ],
    isSubmitting: false,
  },
  findingsHandoff: {
    summary: '34 matches across 12 files. 2 false positives have been labeled.',
    actionLabel: 'Open findings',
    routeTarget: 'FindingsRoute',
  },
  promotion: {
    canPromote: false,
    blockers: [
      {
        kind: 'unreviewed_findings',
        label: 'Findings need review',
        detail: '23 findings remain unreviewed.',
      },
    ],
    buttonLabel: 'Promote rule',
  },
  expandedCodePane: 'none',
}
```

---

## 17. Accessibility requirements

- All buttons must be keyboard reachable.
- `Revise rule`, `Promote rule`, `Open findings`, and code pane expand/collapse must have visible focus states.
- `Looks like` and `Does not look like` must use text labels, not color alone.
- Semantic status must pair icons/color with text.
- Code pane must preserve raw text in `data-raw-code`, accessible fallback, or equivalent testable representation.
- Expand/collapse buttons must use `aria-pressed` or an accurate label.
- The revision textarea must have a visible label, not placeholder-only labeling.
- Promotion blockers must be communicated as text.
- When promotion is blocked, `Promote rule` should expose the reason via adjacent text or accessible description.

---

## 18. Scene tests

Required FoldKit Scene tests for Workbench visual information architecture:

1. Renders selected rule title and intent.
2. Renders only primary actions `Revise rule` and `Promote rule` in the Workbench header.
3. Does not render ambiguous global actions: `New scan`, `Give feedback`, `Run agent`, `Auto-fix`.
4. Renders compact candidate status strip.
5. Does not render a standalone measurement panel.
6. Renders three artifact panes: `Looks like`, `Does not look like`, `Deterministic rule`.
7. Renders deterministic rule pane with engine label `ast-grep`.
8. Renders code through tokenized highlighted-code nodes, preserving plain text.
9. Renders a `Revise with intent` prompt.
10. Renders suggested revision prompts.
11. Renders compact findings handoff with `Open findings`.
12. Does not render finding label controls on the Workbench page.
13. Does not render the full lineage timeline on the Workbench page.
14. Expanding a code pane updates FoldKit model state.
15. Collapsing a code pane returns to the three-pane layout.
16. Promotion blocker state is visible when promotion is blocked.
17. The desktop layout is viewport-contained and code panes have local overflow.
18. Semantic statuses are not color-only.

---

## 19. Story tests

Recommended FoldKit Story tests:

### Story: user revises with intent

Initial state:

- Candidate B (v2),
- prompt empty,
- promotion blocked by false positives or unreviewed findings.

Steps:

1. User types: `Allow layout-only width and height but keep colors and shadows flagged.`
2. User clicks `Revise candidate`.
3. Workbench emits revision command.
4. Model enters `revision.isSubmitting = true` or command-only state.

Assertions:

- Revision command carries candidate id and prompt.
- View does not mutate deterministic rule directly.
- Button state reflects submission.

### Story: user expands deterministic rule

Steps:

1. User clicks expand on deterministic rule pane.
2. `expandedCodePane` becomes `deterministicRule`.
3. User clicks collapse.
4. `expandedCodePane` becomes `none`.

Assertions:

- Expanded state is model-backed.
- Other panes are hidden only visually; product truth remains unchanged.

### Story: promotion blocked

Steps:

1. Render candidate with blockers.
2. User clicks `Promote rule`.

Assertions:

- No promote command is emitted.
- Blocker reason is visible.

### Story: promotion allowed

Steps:

1. Render candidate with `canPromote = true`.
2. User clicks `Promote rule`.

Assertions:

- Promote command is emitted with candidate id.
- Motion state may enter `Promoting`.

---

## 20. Exact copy guidelines

Prefer:

```text
Revise with intent
Revise candidate
Promote rule
Open findings
Deterministic rule
Looks like
Does not look like
Candidate B (v2)
Scoring candidate
Ready to promote
Promotion blocked
```

Avoid:

```text
Prompt
Chat with agent
Generate lint
AI fix
Violation engine
Compliance rule
Auto-remediate
Run magic
```

The page should describe the human decision before the technical mechanism.

---

## 21. Responsive behavior

### Desktop

- Sidebar persistent.
- Workbench viewport-contained.
- Examples stacked left.
- Deterministic rule spans right.
- Revision prompt and findings handoff visible below.
- Code panes scroll locally.

### Short desktop

- Title shrinks.
- Gaps reduce.
- Revision prompt compresses.
- Code panes retain priority.

### Tablet / narrow

- Page may document-scroll.
- Artifacts stack: title, status, looks-like, does-not-look-like, deterministic rule, revision, findings.
- Sidebar may become top nav or collapsible rail.

### Mobile

Mobile is not first-slice priority, but the content should remain readable in a single-column flow.

---

## 22. Implementation checklist

- [ ] Add/confirm Workbench model includes candidate title, intent, status, examples, deterministic rule, revision state, findings summary, promotion blockers, and expanded code pane state.
- [ ] Add revision prompt model and messages.
- [ ] Add `ChangedRevisionPrompt` message.
- [ ] Add `ClickedRevisionSuggestion` message.
- [ ] Add `ClickedReviseRule` behavior that emits a command only when prompt text is non-empty.
- [ ] Keep deterministic YAML read-only by default.
- [ ] Keep `Revise rule` and `Promote rule` as the only header primary actions.
- [ ] Render examples and deterministic rule as three peer artifact panes.
- [ ] Ensure deterministic rule pane spans right side on desktop.
- [ ] Ensure code panes use local overflow.
- [ ] Ensure code panes can expand/collapse through FoldKit model state.
- [ ] Add compact candidate status strip.
- [ ] Remove standalone measurement panel.
- [ ] Add compact findings handoff.
- [ ] Keep finding review controls off Workbench.
- [ ] Keep full lineage timeline off Workbench.
- [ ] Add promotion blocker UI.
- [ ] Add Scene tests for layout and action constraints.
- [ ] Add Story tests for revision prompt, promotion blockers, and code expansion.

---

## 23. Non-goals for this page

The Workbench should not implement:

- full finding review,
- full lineage history,
- export PR creation,
- scan configuration,
- settings editing,
- generic agent chat,
- arbitrary markdown rendering,
- raw ast-grep editing as the default path,
- dashboard charts,
- pagination.

---

## 24. Final visual target

A good screenshot of the Workbench should read like this:

> A dark editorial review surface shows one candidate rule. The title and intent are clear. A compact status strip shows measured evidence. The main body has three code artifacts: the good example, the bad example, and the tall deterministic ast-grep rule. Below them, a small intent prompt lets the user revise the candidate without editing YAML. A findings handoff routes deeper review away from the page. The only primary decisions are to revise or promote.

That is the page.
