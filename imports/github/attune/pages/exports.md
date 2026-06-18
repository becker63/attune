# Attune Exports Page Spec

## Page Name

`Exports`

## Route

`ExportsRoute`

## Purpose

The Exports page is the final review surface for a promoted Attune rule. It answers one question:

> What clean artifacts are about to enter the repository, and how will the Git bot deliver them?

The page is closely connected to the Git bot, but it should not feel like a CI dashboard or a GitHub clone. It should feel like a calm export packet: a small set of repo-native files, a proposed branch, a generated pull request description, and a clear boundary between **private Attune lineage** and **committed repository artifacts**.

The user should leave this page with confidence that:

```text
The rule was promoted.
The export contains only clean native artifacts.
The repo will not receive agent traces, rejected candidates, false-positive notes, prompts, or private lineage.
The Git bot is about to make a focused branch / commit / pull request.
The human still makes the final decision.
```

## Product Role in the Flow

The intended product flow is:

```text
Discover
→ choose a promising pattern dossier

Workbench
→ inspect examples, deterministic rule, measurement
→ revise with intent if needed
→ promote rule

Findings
→ optionally review what the rule touched
→ label matches if evidence is uncertain

Lineage
→ optionally inspect how the rule changed

Exports
→ review clean repo artifacts
→ review Git bot delivery plan
→ create pull request or copy/export bundle
```

The Exports page should not reopen the debate about whether the rule is good. That happened in Workbench, Findings, and Lineage. Exports is about **delivery**, **boundary**, and **traceability**.

## Visual Direction

The Exports page uses the same Attune visual language as the rest of the app:

```text
dark editorial instrumentation
quiet artifact-review UI
warm dark surfaces
precise code/file panes
semantic accents
minimal action hierarchy
```

It should feel cleaner and more operational than Discover, but less busy than a Git dashboard.

The page should not look like:

```text
GitHub pull request UI clone
CI/CD dashboard
deployment console
artifact registry
admin settings table
agent activity log
```

It should look like:

```text
a sealed packet of repo changes
a Git bot handoff brief
a final export review
a clean artifact boundary
```

## Primary User Decision

The primary decision is:

```text
Create pull request
```

The secondary decision is:

```text
Copy patch
```

Optional tertiary decision, if implemented:

```text
Download bundle
```

Do not introduce more primary actions than this.

The user should not see generic actions such as:

```text
Run agent
Generate more
Auto-fix
Sync now
Deploy
Publish policy
```

unless those actions are backed by explicit product commands and copy.

## Page Layout Summary

The Exports page should use the persistent Attune shell:

```text
┌───────────────────────────────────────────────────────────────┐
│ Sidebar                                                       │
│   Discover                                                    │
│   Workbench                                                   │
│   Findings                                                    │
│   Lineage                                                     │
│   Exports       selected                                      │
│   Settings                                                    │
│   Potential patterns                                          │
├───────────────────────────────────────────────────────────────┤
│ Main Exports Page                                             │
└───────────────────────────────────────────────────────────────┘
```

Inside the main page:

```text
┌───────────────────────────────────────────────────────────────┐
│ repo / branch / promoted rule                                 │
├───────────────────────────────────────────────────────────────┤
│ Exports                                                       │
│ Clean artifacts ready for bulletproof-react                   │
│ [Copy patch] [Create pull request]                            │
├───────────────────────────────────────────────────────────────┤
│ Export packet summary                                         │
│ 4 files · branch attune/style-inline-forbidden · PR draft      │
├───────────────────────┬───────────────────────┬───────────────┤
│ Files to commit        │ File preview           │ Git bot plan   │
│                       │                       │               │
│ ast-grep rule.yml      │ highlighted diff/code  │ branch         │
│ valid fixture.tsx      │                       │ commit         │
│ invalid fixture.tsx    │                       │ PR title       │
│ README note.md         │                       │ reviewers      │
├───────────────────────┴───────────────────────┴───────────────┤
│ Boundary note                                                  │
│ Private Attune history stays here. Repo receives clean files.   │
└───────────────────────────────────────────────────────────────┘
```

## Information Architecture

The page has six regions:

1. Top context bar
2. Export header
3. Export packet summary
4. File list
5. Selected file preview
6. Git bot plan
7. Clean boundary note

The page may have seven visual regions, but only one primary action.

## Region 1: Top Context Bar

The top context bar anchors the export to a repo and promoted candidate.

Example:

```text
bulletproof-react / main
Promoted rule · Styling belongs in UI primitives and recipes
```

Required content:

```ts
type ExportContext = {
  readonly repoName: string
  readonly baseBranch: string
  readonly promotedRuleTitle: string
  readonly promotedCandidateLabel: string
}
```

Visual treatment:

- small
- muted
- one line
- no large metrics
- no duplicate status cards

## Region 2: Export Header

The export header introduces the page in plain language.

Example copy:

```text
Exports

Clean artifacts ready for bulletproof-react.

Attune will prepare a small Git bot branch with the promoted ast-grep rule, fixtures, and a short repo note. Private lineage stays inside Attune.
```

Header actions:

```text
Copy patch
Create pull request
```

`Create pull request` is the primary action.

`Copy patch` is secondary.

`Download bundle` may appear in an overflow menu later, not as a default primary action.

## Region 3: Export Packet Summary

The export packet summary is a compact strip, not a full dashboard.

Example:

```text
4 files
attune/style-inline-forbidden
base: main
Git bot ready
```

Possible summary cells:

```ts
type ExportSummary = {
  readonly fileCount: number
  readonly branchName: string
  readonly baseBranch: string
  readonly status: ExportStatus
  readonly validationCount: {
    readonly passed: number
    readonly blocked: number
  }
}
```

Valid statuses:

```ts
type ExportStatus =
  | 'not_ready'
  | 'preparing'
  | 'ready'
  | 'creating_branch'
  | 'opening_pr'
  | 'opened'
  | 'failed'
```

Status copy:

```text
Not ready
Preparing export
Ready
Creating branch
Opening PR
PR opened
Needs attention
```

Use `Ready` only when:

```text
a promoted candidate exists
native ast-grep rule is valid
export preview files exist
no private lineage files are included
Git bot target is configured or manual export is available
```

## Region 4: Files to Commit

The left column lists clean artifacts that would enter the repository.

Example files:

```text
.attune/rules/style-inline-forbidden.yml
.attune/fixtures/style-inline-valid.tsx
.attune/fixtures/style-inline-invalid.tsx
.attune/README.md
```

or, if the target repo convention is different:

```text
sgconfig.yml
rules/style-inline-forbidden.yml
rules/style-inline-valid.tsx
rules/style-inline-invalid.tsx
docs/code-style/style-boundary.md
```

The path style should be configurable later, but the first spike can use `.attune/` or `attune/`.

Each file row should include:

```ts
type ExportFileListItem = {
  readonly id: ExportFileId
  readonly path: string
  readonly kind: ExportFileKind
  readonly status: ExportFileStatus
  readonly summary: string
  readonly selected: boolean
}
```

Kinds:

```ts
type ExportFileKind =
  | 'ast_grep_rule'
  | 'positive_fixture'
  | 'negative_fixture'
  | 'readme_note'
  | 'ci_config'
```

Statuses:

```ts
type ExportFileStatus =
  | 'included'
  | 'generated'
  | 'validated'
  | 'needs_attention'
  | 'excluded'
```

Visual file row example:

```text
✓ rule
.attune/rules/style-inline-forbidden.yml
Native ast-grep rule · validated

✓ fixture
.attune/fixtures/style-inline-valid.tsx
Positive example · should pass

✓ fixture
.attune/fixtures/style-inline-invalid.tsx
Negative example · should be flagged

i note
.attune/README.md
Short explanation for maintainers
```

Default behavior:

- All generated clean artifacts are included by default.
- Selecting a file changes the preview pane.
- File inclusion toggles are not shown in the first version unless there is a clear export command model.
- If inclusion toggles are added later, they must update export validation state and be represented in FoldKit model state.

## Region 5: Selected File Preview

The center pane previews the selected file.

This pane is the largest region because Exports is an artifact review page.

For code files:

- show syntax-highlighted file content
- show path
- show kind
- show validation state
- preserve plain text fallback
- local scroll for long files

For Markdown files:

- either show rendered markdown preview
- or show markdown source with syntax highlighting
- the first spike can show source only for consistency

For generated diffs:

- use a simple unified diff view if available
- otherwise show full file content

The preview should not show agent reasoning, raw prompts, full lineage, or false-positive notes by default.

Example header:

```text
.attune/rules/style-inline-forbidden.yml
ast-grep rule · validated · generated from Candidate B
```

Example body:

```yaml
id: style-inline-forbidden
language: tsx
message: Use primitives or recipes for surface styling.
severity: error
rule:
  any:
    - pattern: <$$$ style={$$$} $$$ />
    - pattern: className={$VALUE}
```

Preview data shape:

```ts
type ExportFilePreview = {
  readonly id: ExportFileId
  readonly path: string
  readonly kind: ExportFileKind
  readonly language: CodeLanguage
  readonly rawContent: string
  readonly highlightedContent: HighlightedCode
  readonly validation: ExportFileValidation
  readonly sourceCandidateId: CandidateId
}
```

Validation shape:

```ts
type ExportFileValidation = {
  readonly status: 'passed' | 'warning' | 'failed'
  readonly summary: string
  readonly checks: ReadonlyArray<ExportValidationCheck>
}

type ExportValidationCheck = {
  readonly label: string
  readonly status: 'passed' | 'warning' | 'failed'
  readonly detail: string
}
```

Example checks for ast-grep file:

```text
✓ YAML parsed
✓ ast-grep accepted the rule
✓ positive fixture passes
✓ negative fixture is flagged
✓ no private Attune fields included
```

## Region 6: Git Bot Plan

The right column is the Git bot handoff brief.

It should be narrow and structured. It is not a chat interface.

The Git bot plan answers:

```text
What branch will be created?
What commit will be made?
What PR title/body will be used?
Who will review it?
What will happen after the user clicks Create pull request?
```

Suggested content:

```text
Git bot plan

Branch
attune/style-inline-forbidden

Commit
Add ast-grep rule for inline surface styling

Pull request
Promote styling boundary rule

Reviewers
@frontend-platform
@design-system

Checks
ast-grep rule parses
fixtures generated
private lineage excluded
```

Data shape:

```ts
type GitBotPlan = {
  readonly mode: 'github_app' | 'local_patch' | 'manual'
  readonly baseBranch: string
  readonly exportBranch: string
  readonly commitMessage: string
  readonly prTitle: string
  readonly prBody: string
  readonly reviewers: ReadonlyArray<string>
  readonly labels: ReadonlyArray<string>
  readonly checks: ReadonlyArray<GitBotCheck>
  readonly destination: GitDestination
}

type GitDestination = {
  readonly provider: 'github' | 'gitlab' | 'local'
  readonly owner: string
  readonly repo: string
  readonly installationStatus: 'configured' | 'missing' | 'expired' | 'unknown'
}

type GitBotCheck = {
  readonly label: string
  readonly status: 'passed' | 'warning' | 'failed'
  readonly detail: string
}
```

The agent may generate:

```text
PR title
PR body
commit message
reviewer suggestions
file summaries
risk note
```

The agent must not generate:

```text
layout
buttons
dangerous raw HTML
GitHub credentials
installation status
permission state
```

Those belong to deterministic product state.

## Git Bot Plan Copy

The right panel should use direct, calm copy.

Good:

```text
Attune will create a branch from main and open a pull request with these four files.
```

Good:

```text
Private review history will remain in Attune.
```

Good:

```text
The repository receives only the accepted ast-grep rule and fixtures.
```

Avoid:

```text
The agent will autonomously commit improvements.
```

Avoid:

```text
Deploy policy now.
```

Avoid:

```text
Push AI-generated governance to repo.
```

## Clean Boundary Note

The bottom boundary note is important. It enforces the core Attune principle:

```text
Private lineage, clean repo.
```

Recommended copy:

```text
Private Attune history stays here.

The export does not include prompts, rejected candidates, reviewer notes, false-positive labels, intermediate measurements, or raw provider responses. The repository receives only the promoted native artifacts shown above.
```

This can be a bottom strip or a card under the preview grid.

It should be visually quiet, but always visible before creating the PR.

## States

### State: No Promoted Rule

When no candidate has been promoted:

```text
No export is ready.

Promote a measured candidate from the Workbench before preparing repository artifacts.
```

Actions:

```text
Open Workbench
```

No Git bot panel is shown.

### State: Preparing Export

When export preview is being generated:

```text
Preparing clean artifact packet…
```

Motion:

- subtle spinner or progress line
- file rows appear as they are generated
- no fake activity if no work is happening

### State: Ready

When export is ready:

```text
Clean artifacts ready.
```

Show:

- file list
- selected file preview
- Git bot plan
- boundary note
- `Create pull request`

### State: Creating Pull Request

After clicking `Create pull request`:

```text
Creating branch…
Committing files…
Opening pull request…
```

Motion:

- Git bot plan checks update sequentially
- primary button becomes disabled
- no route change until success/failure

### State: Pull Request Opened

Success state:

```text
Pull request opened.
```

Show:

```text
PR #42
Promote styling boundary rule
View pull request
```

Actions:

```text
View pull request
Back to Discover
```

The PR link can be external.

### State: Git Bot Not Configured

If Git bot is unavailable:

```text
Git bot is not configured for this repository.

You can still copy the patch or download the artifact bundle.
```

Actions:

```text
Copy patch
Open Settings
```

Do not hide the export preview just because the Git bot is unavailable.

### State: Validation Failed

Example:

```text
Export blocked.

The generated ast-grep rule parsed in Attune, but the exported fixture check failed.
```

Show:

- failing file row
- failing validation check
- repair route/action if modeled

Action:

```text
Return to Workbench
```

Optional later:

```text
Request revision
```

## Animation and Motion

Motion should explain the export lifecycle, not decorate it.

### Motion: Export Packet Materialization

When entering Exports after promotion:

```text
header appears
summary strip appears
file rows appear one by one
preview pane fades in
Git bot plan appears last
```

Feeling:

```text
a packet being assembled
```

### Motion: File Selection

When selecting a file:

- selected row outline shifts
- preview pane crossfades or slides 8px
- code scroll resets to top
- no large route transition

### Motion: Git Bot Progress

When creating PR:

```text
Branch check: pending → passed
Commit check: pending → passed
PR check: pending → passed
```

Each step gets a small check animation. No fireworks.

### Motion: Pull Request Opened

A restrained success stamp:

```text
PR opened
```

The export status chip turns sage. The branch and PR number become visible.

## FoldKit Model

Suggested page model:

```ts
export type ExportsModel = {
  readonly repoName: string
  readonly baseBranch: string
  readonly selectedCandidateId: CandidateId | null
  readonly promotedRuleTitle: string | null
  readonly promotedCandidateLabel: string | null
  readonly status: ExportStatus
  readonly summary: ExportSummary | null
  readonly files: ReadonlyArray<ExportFileListItem>
  readonly selectedFileId: ExportFileId | null
  readonly filePreviews: Readonly<Record<ExportFileId, ExportFilePreview>>
  readonly gitBotPlan: GitBotPlan | null
  readonly boundary: ExportBoundary
  readonly motion: ExportMotion
  readonly error: ExportError | null
}
```

Boundary model:

```ts
export type ExportBoundary = {
  readonly cleanArtifacts: ReadonlyArray<string>
  readonly privateHistoryExcluded: ReadonlyArray<string>
  readonly summary: string
}
```

Motion model:

```ts
export type ExportMotion =
  | { readonly _tag: 'Still' }
  | { readonly _tag: 'MaterializingPacket'; readonly visibleFileCount: number }
  | {
      readonly _tag: 'SwitchingFile'
      readonly fromId: ExportFileId
      readonly toId: ExportFileId
    }
  | { readonly _tag: 'CreatingPullRequest'; readonly currentStep: GitBotStep }
  | { readonly _tag: 'PullRequestOpened'; readonly pullRequestNumber: number }
  | { readonly _tag: 'Failed'; readonly reason: string }

export type GitBotStep =
  | 'validating_export'
  | 'creating_branch'
  | 'committing_files'
  | 'opening_pull_request'
```

Error model:

```ts
export type ExportError = {
  readonly title: string
  readonly detail: string
  readonly recoverable: boolean
}
```

## FoldKit Messages

Suggested messages:

```ts
export const SelectedExportFile = m('SelectedExportFile', {
  fileId: ExportFileId,
})

export const ClickedCreatePullRequest = m('ClickedCreatePullRequest')

export const ClickedCopyPatch = m('ClickedCopyPatch')

export const ClickedOpenWorkbench = m('ClickedOpenWorkbench')

export const ClickedOpenSettings = m('ClickedOpenSettings')

export const ExportPacketMaterialized = m('ExportPacketMaterialized', {
  visibleFileCount: S.Number,
})

export const GitBotStepCompleted = m('GitBotStepCompleted', {
  step: GitBotStep,
})

export const PullRequestOpened = m('PullRequestOpened', {
  url: S.String,
  number: S.Number,
})
```

The update function should be pure. Git bot work happens through commands/services.

## Product Commands

Suggested domain commands:

```ts
type PrepareExportPreview = {
  readonly _tag: 'PrepareExportPreview'
  readonly candidateId: CandidateId
}

type CreateGitBotPullRequest = {
  readonly _tag: 'CreateGitBotPullRequest'
  readonly exportPreviewId: ExportPreviewId
  readonly baseBranch: string
  readonly branchName: string
}

type CopyExportPatch = {
  readonly _tag: 'CopyExportPatch'
  readonly exportPreviewId: ExportPreviewId
}
```

## Domain Events

Suggested events:

```ts
type ExportPreviewGenerated = {
  readonly _tag: 'export_preview.generated'
  readonly candidateId: CandidateId
  readonly exportPreviewId: ExportPreviewId
  readonly files: ReadonlyArray<ExportFile>
  readonly gitBotPlan: GitBotPlan
}

type ExportValidationCompleted = {
  readonly _tag: 'export_validation.completed'
  readonly exportPreviewId: ExportPreviewId
  readonly checks: ReadonlyArray<ExportValidationCheck>
}

type GitBotPullRequestRequested = {
  readonly _tag: 'gitbot_pull_request.requested'
  readonly exportPreviewId: ExportPreviewId
  readonly branchName: string
}

type GitBotPullRequestOpened = {
  readonly _tag: 'gitbot_pull_request.opened'
  readonly exportPreviewId: ExportPreviewId
  readonly pullRequestUrl: string
  readonly pullRequestNumber: number
}

type GitBotPullRequestFailed = {
  readonly _tag: 'gitbot_pull_request.failed'
  readonly exportPreviewId: ExportPreviewId
  readonly reason: string
}
```

## CSS Implementation Detail

The Exports page should reuse global tokens from `src/styles.css`.

Add page-specific classes under the same visual system.

```css
.exports-page {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.exports-context {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  color: var(--attune-text-muted);
  font-size: 0.88rem;
}

.exports-context strong {
  color: var(--attune-text-primary);
  font-weight: 650;
}

.exports-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 0;
}

.exports-header-copy {
  max-width: 46rem;
}

.exports-header h1 {
  margin: 0 0 0.55rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.9rem, 2.5vw, 2.7rem);
  font-weight: 500;
  line-height: 1.08;
  color: var(--attune-text-primary);
}

.exports-header p {
  margin: 0;
  color: var(--attune-text-muted);
  line-height: 1.55;
}

.exports-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.exports-summary-strip {
  display: grid;
  grid-template-columns:
    minmax(8rem, 0.65fr)
    minmax(12rem, 1fr)
    minmax(8rem, 0.7fr)
    minmax(9rem, 0.8fr);
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 10px;
  background: rgba(19, 25, 27, 0.82);
}

.exports-summary-item {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.exports-summary-item span {
  color: var(--attune-text-muted);
  font-size: 0.78rem;
}

.exports-summary-item strong {
  overflow: hidden;
  color: var(--attune-text-primary);
  font-size: 0.96rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exports-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  gap: 0.45rem;
  padding: 0.32rem 0.55rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.82rem;
}

.exports-status.is-ready {
  border-color: color-mix(in srgb, var(--attune-accent-sage) 45%, white);
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.08);
}

.exports-status.is-warning {
  border-color: color-mix(in srgb, var(--attune-accent-amber) 48%, white);
  color: var(--attune-accent-amber);
  background: rgba(196, 154, 74, 0.08);
}

.exports-status.is-failed {
  border-color: color-mix(in srgb, var(--attune-accent-clay) 48%, white);
  color: var(--attune-accent-clay);
  background: rgba(196, 106, 84, 0.08);
}

.exports-grid {
  display: grid;
  grid-template-columns: minmax(16rem, 0.75fr) minmax(26rem, 1.35fr) minmax(
      18rem,
      0.9fr
    );
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.exports-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--attune-border-panel);
  border-radius: 10px;
  background: rgba(19, 25, 27, 0.82);
}

.exports-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--attune-border-subtle);
}

.exports-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--attune-text-primary);
  font-weight: 650;
}

.exports-panel-header small {
  color: var(--attune-text-muted);
}

.exports-file-list {
  display: grid;
  gap: 0.55rem;
  max-height: 100%;
  overflow: auto;
  padding: 0.75rem;
}

.exports-file-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--attune-border-subtle);
  border-radius: 9px;
  color: var(--attune-text-secondary);
  background: rgba(255, 255, 255, 0.025);
  text-align: left;
  cursor: pointer;
}

.exports-file-row:hover {
  border-color: var(--attune-border-strong);
  background: rgba(255, 255, 255, 0.045);
}

.exports-file-row.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 55%, white);
  background: rgba(124, 92, 229, 0.13);
  box-shadow: inset 3px 0 0 var(--attune-accent-violet);
}

.exports-file-kind {
  display: grid;
  width: 1.7rem;
  height: 1.7rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  color: var(--attune-accent-sage);
  background: rgba(141, 186, 111, 0.07);
}

.exports-file-copy {
  display: grid;
  gap: 0.22rem;
  min-width: 0;
}

.exports-file-path {
  overflow: hidden;
  color: var(--attune-text-primary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exports-file-summary {
  color: var(--attune-text-muted);
  font-size: 0.82rem;
  line-height: 1.35;
}

.exports-preview {
  display: flex;
  flex-direction: column;
}

.exports-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0 1rem 0.8rem;
}

.exports-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-muted);
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.78rem;
}

.exports-chip.is-valid {
  color: var(--attune-accent-sage);
  border-color: color-mix(in srgb, var(--attune-accent-sage) 36%, white);
}

.exports-preview .code-pane {
  flex: 1 1 auto;
  margin: 0 1rem 1rem;
  min-height: 0;
}

.gitbot-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.gitbot-body {
  display: grid;
  gap: 1rem;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
}

.gitbot-section {
  display: grid;
  gap: 0.35rem;
}

.gitbot-section-label {
  color: var(--attune-text-muted);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.gitbot-section-value {
  color: var(--attune-text-primary);
  line-height: 1.4;
}

.gitbot-code-value {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
}

.gitbot-check-list {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gitbot-check {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.55rem;
  align-items: start;
  color: var(--attune-text-secondary);
  font-size: 0.86rem;
}

.gitbot-check-icon {
  color: var(--attune-accent-sage);
}

.exports-boundary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding: 0.9rem 1rem;
  border: 1px solid
    color-mix(
      in srgb,
      var(--attune-accent-blue) 24%,
      var(--attune-border-panel)
    );
  border-radius: 10px;
  color: var(--attune-text-muted);
  background: rgba(110, 145, 184, 0.06);
}

.exports-boundary strong {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--attune-text-primary);
}

.exports-boundary p {
  margin: 0;
  line-height: 1.5;
}

@media (max-height: 780px) and (min-width: 921px) {
  .exports-page {
    gap: 0.7rem;
  }

  .exports-header h1 {
    font-size: clamp(1.6rem, 2.1vw, 2.1rem);
  }

  .exports-summary-strip,
  .exports-panel-header,
  .exports-boundary {
    padding: 0.75rem;
  }

  .gitbot-body {
    gap: 0.75rem;
    padding: 0.75rem;
  }
}

@media (max-width: 1120px) {
  .exports-grid {
    grid-template-columns: minmax(16rem, 0.8fr) minmax(24rem, 1.2fr);
    grid-template-areas:
      'files preview'
      'gitbot gitbot';
  }

  .exports-files-panel {
    grid-area: files;
  }

  .exports-preview {
    grid-area: preview;
  }

  .gitbot-panel {
    grid-area: gitbot;
  }
}

@media (max-width: 920px) {
  .exports-page {
    height: auto;
    overflow: visible;
  }

  .exports-header,
  .exports-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .exports-summary-strip,
  .exports-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .exports-panel,
  .gitbot-body,
  .exports-file-list {
    overflow: visible;
  }
}
```

## View Composition

Suggested view helpers:

```text
src/page/exports/
  index.ts
  init.ts
  model.ts
  message.ts
  update.ts
  view.ts
  command.ts
  view/
    contextBar.ts
    exportHeader.ts
    exportSummaryStrip.ts
    exportFileList.ts
    exportFilePreview.ts
    gitBotPlan.ts
    exportBoundary.ts
```

Root `view.ts` should render the shell and delegate to `Exports.view` when route is `ExportsRoute`.

## Generated Content Boundaries

The agent may generate content for these typed fields:

```text
file summaries
PR title
PR body
commit message
boundary explanation draft
risk note
reviewer suggestion rationale
README note
```

The agent may not generate:

```text
untyped layout
arbitrary CSS
raw HTML
button definitions
provider credentials
GitHub installation status
permission checks
private lineage inclusion/exclusion decision
```

The export boundary is deterministic product logic, not agent discretion.

## Example Fixture Content

Use this as the first fixture state:

```ts
const exportFixture = {
  repoName: 'bulletproof-react',
  baseBranch: 'main',
  promotedRuleTitle: 'Styling belongs in UI primitives and recipes',
  promotedCandidateLabel: 'Candidate B (v2)',
  status: 'ready',
  summary: {
    fileCount: 4,
    branchName: 'attune/style-inline-forbidden',
    baseBranch: 'main',
    status: 'ready',
    validationCount: {
      passed: 5,
      blocked: 0,
    },
  },
  files: [
    {
      path: '.attune/rules/style-inline-forbidden.yml',
      kind: 'ast_grep_rule',
      status: 'validated',
      summary: 'Native ast-grep rule generated from the promoted candidate.',
    },
    {
      path: '.attune/fixtures/style-inline-valid.tsx',
      kind: 'positive_fixture',
      status: 'validated',
      summary: 'Looks-like fixture that should pass.',
    },
    {
      path: '.attune/fixtures/style-inline-invalid.tsx',
      kind: 'negative_fixture',
      status: 'validated',
      summary: 'Does-not-look-like fixture that should be flagged.',
    },
    {
      path: '.attune/README.md',
      kind: 'readme_note',
      status: 'generated',
      summary: 'Short maintainer note explaining the rule.',
    },
  ],
  gitBotPlan: {
    mode: 'github_app',
    baseBranch: 'main',
    exportBranch: 'attune/style-inline-forbidden',
    commitMessage: 'Add ast-grep rule for inline surface styling',
    prTitle: 'Promote styling boundary rule',
    reviewers: ['frontend-platform', 'design-system'],
    labels: ['attune', 'codebase-policy'],
  },
}
```

## Accessibility Requirements

- `Create pull request` must be reachable by keyboard.
- File rows must be keyboard selectable.
- Selected file state must not rely on color alone.
- Export status must use text plus color/icon.
- Validation checks must expose text state.
- Code previews must preserve raw text for copy and screen reader fallback.
- Git bot progress should use polite live-region announcements when steps complete.
- Error states must explain how to recover.

## Keyboard Behavior

Suggested shortcuts:

```text
ArrowUp / ArrowDown     move through file list
Enter                   select focused file
C                       copy patch
P                       create pull request when ready
Esc                     return focus to page header or close focused state
```

Shortcuts must not interfere with text selection inside code panes.

## Scene Test Expectations

Add Scene tests proving:

1. Exports route renders the selected repo and promoted candidate context.
2. Exports route renders header copy explaining clean artifacts.
3. Exports route renders only `Copy patch` and `Create pull request` as default header actions.
4. Exports route renders compact packet summary.
5. Exports route renders files to commit as clean artifacts.
6. Selecting a file updates the preview pane.
7. File preview renders highlighted code through FoldKit HTML nodes and preserves raw code.
8. Git bot plan renders branch, commit, PR title, reviewers, and checks.
9. Boundary note states that private lineage stays in Attune.
10. No prompts, rejected candidates, false-positive labels, raw provider responses, or intermediate measurements render as export files.
11. Git bot unavailable state still allows manual patch export.
12. PR creation success state renders PR number/link.

## Story Test Expectations

Add Story tests proving:

1. `SelectedExportFile` changes selected file id.
2. `ClickedCopyPatch` emits a copy/export command.
3. `ClickedCreatePullRequest` emits a Git bot PR command only when export status is ready.
4. `ClickedCreatePullRequest` is blocked when validation failed.
5. Git bot progress messages update motion state.
6. `PullRequestOpened` updates export status to opened.
7. Error events render recoverable failure copy.

## Acceptance Checklist

The first implementation is acceptable when:

- The Exports page visually matches the dark editorial instrumentation style.
- The page feels like a clean repo packet, not a GitHub clone.
- The primary action is `Create pull request`.
- The secondary action is `Copy patch`.
- The file list contains only clean native artifacts.
- The selected file preview is prominent and readable.
- The Git bot plan is clear but not chat-like.
- The boundary note is visible.
- The page has ready, no-export, git-bot-missing, creating, opened, and failed states.
- The page can be driven entirely from typed fixture state before backend wiring.
- Scene and Story tests lock the page information architecture.
