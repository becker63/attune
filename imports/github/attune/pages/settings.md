# Attune Settings Page Spec

## Page intent

The Settings page is where a team defines the boundaries Attune must respect.

It is not a generic account/preferences page. It is not a dense admin console. It is a quiet control surface for the few things that materially affect how Attune listens, proposes, measures, reviews, and exports.

Settings should answer:

```text
Which repository is Attune allowed to inspect?
Which deterministic tools may it use?
What can the agent propose?
What requires human review?
How does the Git bot export accepted artifacts?
What local/demo mode is active?
```

The page should feel like part of the same dark editorial instrumentation system as Discover, Workbench, Findings, Lineage, and Exports. It should be clean, restrained, and clearly operational.

## Product role in the flow

Settings sits outside the main candidate lifecycle, but it controls the lifecycle boundaries.

```text
Discover -> Workbench -> Findings -> Lineage -> Exports
                          ^
                          |
                      Settings defines limits
```

Settings should never become the main product surface. It should support the product by keeping repo scope, agent authority, rule engines, and export behavior explicit.

## Visual target

The approved Settings direction is the simpler, cleaner dark layout: fewer panels, more breathing room, no dashboard sprawl, no big metrics grid.

Describe the style as:

```text
dark editorial instrumentation
quiet configuration dossier
warm operational control surface
```

Avoid:

```text
generic SaaS settings page
enterprise admin sprawl
large billing/security dashboard
busy grid of toggles
terminal config editor
AI cockpit controls
```

## High-level layout

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Attune shell                                                        │
├──────────────┬──────────────────────────────────────────────────────┤
│ Sidebar      │ Settings                                             │
│              │ Configure how Attune listens, measures, and exports. │
│ nav          │                                                      │
│ patterns     │ ┌───────────────┬──────────────────────────────────┐ │
│ user         │ │ Settings rail │ Selected settings section        │ │
│              │ │               │                                  │ │
│              │ │ Repository    │ Repository scope                 │ │
│              │ │ Agent         │ Rule engines                     │ │
│              │ │ Review        │ Human decision policy            │ │
│              │ │ Git bot       │ Export behavior                  │ │
│              │ │ Local mode    │                                  │ │
│              │ └───────────────┴──────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────┘
```

The page uses the global Attune sidebar. Inside the page content, use a compact secondary rail on the left and a single primary settings document on the right.

Do not show all settings at once. A visible secondary rail with one selected section keeps the page calm.

## Information architecture

Settings sections:

1. **Repository**
   - repo connection
   - branch / default scope
   - included paths
   - ignored paths
   - fixture/demo repository state

2. **Agent**
   - what the agent may generate
   - whether live model calls are enabled
   - structured output validation state
   - prompt/prose/example generation boundaries

3. **Rule engines**
   - enabled deterministic engines
   - ast-grep status
   - supported languages
   - measurement timeout
   - parse failure behavior

4. **Review policy**
   - required human promotion
   - false-positive threshold warning
   - findings review expectations
   - auto-promotion disabled by default

5. **Git bot**
   - export branch naming
   - PR title/body style
   - commit author/bot identity
   - clean artifact boundary
   - dry-run mode

6. **Local mode**
   - fixture mode
   - demo data
   - local-only event store
   - dev shell/toolchain hints

The first implementation may render only the first three sections fully and stub the rest, but the skeleton should already communicate the final model.

## Primary page copy

Page title:

```text
Settings
```

Subtitle:

```text
Configure the boundaries Attune uses when it listens to a repository, proposes rules, measures candidates, and exports accepted artifacts.
```

Tone:

- calm
- direct
- not chatty
- not enterprise-compliance language
- no hype

Avoid words like:

```text
Autonomous enforcement
AI governance
Policy authority
Compliance mode
Violation engine
```

Prefer:

```text
Scope
Agent boundary
Rule engines
Review policy
Git bot handoff
Local mode
```

## Page structure

```html
<main class="settings-page">
  <header class="settings-header">
    <p class="settings-kicker">Workspace settings</p>
    <h1>Settings</h1>
    <p>
      Configure the boundaries Attune uses when it listens to a repository,
      proposes rules, measures candidates, and exports accepted artifacts.
    </p>
  </header>

  <section class="settings-layout">
    <nav class="settings-rail" aria-label="Settings sections">
      <!-- section buttons -->
    </nav>

    <article class="settings-document panel">
      <!-- selected section -->
    </article>
  </section>
</main>
```

## Secondary settings rail

The secondary rail is a calm list, not tabs across the top.

Each item contains:

```text
icon
title
one-line explanation
status chip or small state mark
```

Example rail items:

```text
Repository
Scope and fixture repository
Connected

Agent
What generated content may change
Fixture mode

Rule engines
ast-grep and language support
Enabled

Review policy
Human promotion requirements
Required

Git bot
Clean export branch and PR behavior
Dry run

Local mode
Fixture data and local event store
Active
```

Selected rail item:

- violet left inset line
- slightly brighter panel background
- stronger text
- accessible `aria-current="page"`

Do not animate rail selection dramatically. Use a subtle crossfade in the document body.

## Selected section document

The selected section appears as one editorial configuration document, not a scatter of unrelated cards.

Recommended structure:

```text
Section title
Plain-language explanation
Status row
Primary controls
Boundary note
Advanced details disclosure
```

### Repository section

Purpose: define what Attune is looking at.

Content:

```text
Repository scope
Attune is currently using bulletproof-react as the fixture repository for local measurement.

Connected repository
bulletproof-react
repos/bulletproof-react

Default branch
main

Included paths
apps/react-vite/src/**

Ignored paths
node_modules/**
dist/**
coverage/**
```

Primary controls:

```text
Change scope
Rescan repository
```

In the first UI-only phase, these may be disabled or marked `Reserved`.

### Agent section

Purpose: define what the agent may generate.

Content:

```text
Agent boundary
The agent may propose pattern dossiers, examples, revision notes, and ast-grep candidates. It may not promote rules or write to the repository.
```

Controls:

```text
[x] Generate pattern prose
[x] Generate looks-like / does-not-look-like examples
[x] Generate ast-grep candidate YAML
[x] Generate revision candidates
[ ] Promote rules automatically
[ ] Export directly to repo without review
```

The last two should be disabled/off by default.

Boundary note:

```text
The agent prepares candidates. Humans decide what becomes practice.
```

### Rule engines section

Purpose: define deterministic tools.

Content:

```text
Rule engines
ast-grep is enabled as the first deterministic measurement engine.

Engine
ast-grep

Languages
TypeScript, TSX, YAML

Measurement mode
Local fixture repository

Timeout
10 seconds
```

Controls:

```text
Enable ast-grep
Measurement timeout
Parse failure behavior
```

Parse failure behavior:

```text
Show as failed measurement and block promotion
```

### Review policy section

Purpose: define human decision thresholds.

Content:

```text
Review policy
Candidates must be inspected before promotion. Findings review is optional unless confidence is low or false positives exceed the warning threshold.
```

Controls:

```text
[x] Require human promotion
[x] Block promotion when native rule is invalid
[x] Block promotion when examples are missing
[x] Warn when false positives exceed threshold
False-positive warning threshold: 10%
```

Auto-promotion should remain absent or explicitly off.

### Git bot section

Purpose: define export handoff.

Content:

```text
Git bot handoff
Promoted rules are exported as clean repository artifacts. Private Attune lineage, prompts, labels, and rejected candidates stay inside Attune.
```

Controls:

```text
Export mode: Dry run
Branch prefix: attune/rules/
PR title template: Add Attune rule: {ruleTitle}
Commit author: Attune Bot
```

Primary controls:

```text
Preview export settings
Test Git bot handoff
```

Both can be disabled in fixture mode.

### Local mode section

Purpose: make development/demo state visible.

Content:

```text
Local mode
This workspace is running from fixture data and a local event store. No live model provider, GitHub App, or production database is required.
```

Status:

```text
Fixture mode active
Local event store
No live model calls
Nix toolchain pinned
```

## Action hierarchy

Settings should have few actions.

Primary per selected section:

```text
Save changes
```

Secondary:

```text
Reset section
```

Reserved/disabled actions can appear only when helpful:

```text
Connect repository
Test Git bot
Rescan repository
```

Do not put `Start scan`, `Promote`, or `Export` as global Settings actions. Those belong to Discover/Workbench/Exports.

## State model

Settings has three levels of state:

1. selected section
2. editable draft values
3. persisted workspace settings snapshot

Suggested types:

```ts
type SettingsSectionId =
  | 'repository'
  | 'agent'
  | 'ruleEngines'
  | 'reviewPolicy'
  | 'gitBot'
  | 'localMode'

type SettingsModel = {
  readonly selectedSection: SettingsSectionId
  readonly workspace: WorkspaceSettings
  readonly draft: WorkspaceSettingsDraft
  readonly saveState: SaveState
  readonly validationMessages: ReadonlyArray<SettingsValidationMessage>
}

type SaveState =
  | { readonly _tag: 'Clean' }
  | { readonly _tag: 'Dirty' }
  | { readonly _tag: 'Saving' }
  | { readonly _tag: 'Saved'; readonly at: string }
  | { readonly _tag: 'Failed'; readonly reason: string }
```

Workspace settings:

```ts
type WorkspaceSettings = {
  readonly repository: RepositorySettings
  readonly agent: AgentSettings
  readonly ruleEngines: RuleEngineSettings
  readonly reviewPolicy: ReviewPolicySettings
  readonly gitBot: GitBotSettings
  readonly localMode: LocalModeSettings
}

type RepositorySettings = {
  readonly repoName: string
  readonly repoPath: string
  readonly defaultBranch: string
  readonly includedPaths: ReadonlyArray<string>
  readonly ignoredPaths: ReadonlyArray<string>
  readonly fixtureMode: boolean
}

type AgentSettings = {
  readonly liveModelCallsEnabled: boolean
  readonly mayGenerateDossiers: boolean
  readonly mayGenerateExamples: boolean
  readonly mayGenerateRules: boolean
  readonly mayGenerateRevisions: boolean
  readonly mayPromoteRules: false
  readonly mayExportDirectly: false
}

type RuleEngineSettings = {
  readonly astGrepEnabled: boolean
  readonly supportedLanguages: ReadonlyArray<'ts' | 'tsx' | 'yaml'>
  readonly measurementTimeoutMs: number
  readonly parseFailureBehavior: 'show_failed_measurement_and_block_promotion'
}

type ReviewPolicySettings = {
  readonly requireHumanPromotion: true
  readonly blockPromotionWithoutExamples: true
  readonly blockPromotionWithoutValidRule: true
  readonly warnFalsePositivePercent: number
}

type GitBotSettings = {
  readonly mode: 'dry_run' | 'create_branch' | 'open_pr'
  readonly branchPrefix: string
  readonly prTitleTemplate: string
  readonly commitAuthorName: string
}

type LocalModeSettings = {
  readonly fixtureModeActive: boolean
  readonly localEventStore: boolean
  readonly liveModelCalls: false
  readonly nixToolchainPinned: boolean
}
```

## FoldKit messages

```ts
export const SelectedSettingsSection = m('SelectedSettingsSection', {
  sectionId: SettingsSectionId,
})

export const ChangedRepositoryScope = m('ChangedRepositoryScope', {
  includedPaths: S.Array(S.String),
  ignoredPaths: S.Array(S.String),
})

export const ToggledAgentPermission = m('ToggledAgentPermission', {
  permission: AgentPermission,
  enabled: S.Boolean,
})

export const ChangedMeasurementTimeout = m('ChangedMeasurementTimeout', {
  timeoutMs: S.Number,
})

export const ChangedGitBotMode = m('ChangedGitBotMode', {
  mode: GitBotMode,
})

export const ClickedSaveSettings = m('ClickedSaveSettings')
export const ClickedResetSettingsSection = m('ClickedResetSettingsSection')
```

Settings messages should update draft state. Persisting settings is a command later; in the UI-first phase it can update fixture state or show a saved toast.

## Domain commands/events later

Settings should eventually emit commands such as:

```ts
type SettingsCommand =
  | { readonly _tag: 'UpdateRepositoryScope'; readonly scope: RepositoryScope }
  | {
      readonly _tag: 'UpdateAgentBoundary'
      readonly boundary: AgentBoundarySettings
    }
  | {
      readonly _tag: 'UpdateRuleEngineSettings'
      readonly engines: RuleEngineSettings
    }
  | {
      readonly _tag: 'UpdateReviewPolicy'
      readonly policy: ReviewPolicySettings
    }
  | { readonly _tag: 'UpdateGitBotSettings'; readonly settings: GitBotSettings }
```

Events:

```ts
type SettingsEvent =
  | {
      readonly _tag: 'repository_scope.updated'
      readonly scope: RepositoryScope
    }
  | {
      readonly _tag: 'agent_boundary.updated'
      readonly boundary: AgentBoundarySettings
    }
  | {
      readonly _tag: 'rule_engine_settings.updated'
      readonly engines: RuleEngineSettings
    }
  | {
      readonly _tag: 'review_policy.updated'
      readonly policy: ReviewPolicySettings
    }
  | {
      readonly _tag: 'git_bot_settings.updated'
      readonly settings: GitBotSettings
    }
```

These are workspace-level settings events, not candidate events.

## CSS contract

Use the shared Attune dark tokens from `src/styles.css`. Add page-specific classes only where needed.

```css
.settings-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1.2rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.settings-header {
  display: grid;
  gap: 0.45rem;
  max-width: 56rem;
}

.settings-kicker {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.76rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.settings-header h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 500;
  line-height: 1.05;
}

.settings-header p:last-child {
  max-width: 44rem;
  margin: 0;
  color: var(--attune-text-muted);
  line-height: 1.55;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(14rem, 0.34fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.settings-rail {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  overflow: auto;
  padding: 0.8rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 12px;
  background: rgba(19, 25, 27, 0.68);
}

.settings-rail-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: start;
  width: 100%;
  padding: 0.78rem;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--attune-text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.settings-rail-item:hover {
  border-color: var(--attune-border-panel);
  background: rgba(255, 255, 255, 0.025);
}

.settings-rail-item.is-selected {
  border-color: color-mix(in srgb, var(--attune-accent-violet) 48%, white);
  background: rgba(124, 92, 229, 0.15);
  box-shadow: inset 3px 0 0 var(--attune-accent-violet);
  color: var(--attune-text-primary);
}

.settings-rail-icon {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  place-items: center;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  color: var(--attune-text-muted);
  background: rgba(255, 255, 255, 0.03);
}

.settings-rail-item.is-selected .settings-rail-icon {
  color: var(--attune-accent-violet);
  border-color: color-mix(in srgb, var(--attune-accent-violet) 55%, white);
}

.settings-rail-copy {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.settings-rail-title {
  color: inherit;
  font-weight: 650;
  line-height: 1.25;
}

.settings-rail-detail {
  color: var(--attune-text-muted);
  font-size: 0.83rem;
  line-height: 1.35;
}

.settings-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.2rem;
  padding: 0.18rem 0.45rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 999px;
  color: var(--attune-text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.settings-chip.is-good {
  color: var(--attune-accent-sage);
  border-color: color-mix(in srgb, var(--attune-accent-sage) 48%, transparent);
  background: rgba(141, 186, 111, 0.08);
}

.settings-chip.is-warn {
  color: var(--attune-accent-amber);
  border-color: color-mix(in srgb, var(--attune-accent-amber) 46%, transparent);
  background: rgba(196, 154, 74, 0.08);
}

.settings-document {
  min-height: 0;
  overflow: auto;
  padding: 1.15rem;
  border: 1px solid var(--attune-border-panel);
  border-radius: 12px;
  background: rgba(19, 25, 27, 0.82);
}

.settings-document-inner {
  display: grid;
  gap: 1.05rem;
  max-width: 58rem;
}

.settings-section-header {
  display: grid;
  gap: 0.45rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--attune-border-panel);
}

.settings-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings-section-header h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.65rem;
  font-weight: 500;
}

.settings-section-header p {
  max-width: 42rem;
  margin: 0;
  color: var(--attune-text-muted);
  line-height: 1.55;
}

.settings-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.settings-group {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--attune-border-subtle);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}

.settings-group h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
}

.settings-group-description {
  margin: 0;
  color: var(--attune-text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
}

.settings-field-grid {
  display: grid;
  grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr);
  gap: 0.7rem 1rem;
  align-items: center;
}

.settings-label {
  color: var(--attune-text-muted);
  font-size: 0.86rem;
}

.settings-value,
.settings-input,
.settings-textarea {
  min-width: 0;
  color: var(--attune-text-primary);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.86rem;
}

.settings-input,
.settings-textarea {
  width: 100%;
  border: 1px solid var(--attune-border-panel);
  border-radius: 8px;
  background: var(--attune-bg-code);
  color: var(--attune-text-primary);
}

.settings-input {
  padding: 0.55rem 0.65rem;
}

.settings-textarea {
  min-height: 5rem;
  padding: 0.65rem;
  line-height: 1.5;
  resize: vertical;
}

.settings-toggle-row {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--attune-border-subtle);
}

.settings-toggle-copy {
  display: grid;
  gap: 0.18rem;
}

.settings-toggle-copy strong {
  color: var(--attune-text-primary);
}

.settings-toggle-copy span {
  color: var(--attune-text-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

.settings-toggle {
  position: relative;
  width: 2.65rem;
  height: 1.45rem;
  flex: none;
  border: 1px solid var(--attune-border-strong);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.settings-toggle::after {
  content: '';
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  background: var(--attune-text-muted);
  transition:
    transform 160ms ease,
    background 160ms ease;
}

.settings-toggle[aria-checked='true'] {
  border-color: color-mix(in srgb, var(--attune-accent-sage) 55%, white);
  background: rgba(141, 186, 111, 0.16);
}

.settings-toggle[aria-checked='true']::after {
  transform: translateX(1.2rem);
  background: var(--attune-accent-sage);
}

.settings-boundary-note {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem;
  border: 1px solid
    color-mix(in srgb, var(--attune-accent-blue) 38%, transparent);
  border-radius: 10px;
  color: var(--attune-text-secondary);
  background: rgba(110, 145, 184, 0.08);
}

.settings-boundary-note p {
  margin: 0;
  color: var(--attune-text-muted);
  line-height: 1.5;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--attune-border-panel);
}

.settings-save-state {
  margin-right: auto;
  color: var(--attune-text-muted);
  font-size: 0.86rem;
}
```

Responsive behavior:

```css
@media (max-width: 920px) {
  .settings-page {
    height: auto;
    overflow: visible;
  }

  .settings-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .settings-rail {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(13rem, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .settings-document {
    overflow: visible;
  }

  .settings-field-grid {
    grid-template-columns: 1fr;
  }

  .settings-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
```

## Motion

Motion should be sparse and causal.

### Section switch

When the user selects a settings rail item:

```text
selected rail item highlight updates
section document crossfades 120-180ms
first heading slides up 4px and settles
```

### Save

When saving settings:

```text
Save changes clicked
-> button enters Saving state
-> section remains editable but controls can be disabled briefly
-> Saved state appears in footer/status text
```

### Toggle

Toggle motion should be native-feeling and quick:

```text
120-160ms
no bounce
no decorative glow
```

### Validation warning

If a setting violates a boundary:

```text
field border warms to amber
short repair note appears below field
Save remains disabled until repaired
```

## Accessibility

- Secondary rail buttons must be keyboard reachable.
- Selected rail item must use `aria-current="page"` or equivalent.
- Toggles must use `role="switch"` and `aria-checked`.
- Disabled dangerous options must explain why they are unavailable.
- Settings save state must be announced with a polite live region.
- Semantic color must always be paired with text.
- Path fields must remain copyable as text.
- The page must remain usable with document zoom.

## Empty / fixture states

Settings should make fixture mode obvious without making the product feel fake.

Example fixture notice:

```text
Fixture mode is active.
Attune is using repos/bulletproof-react and local event data. Live model calls, GitHub export, and production persistence are disabled in this workspace.
```

Use a calm info note, not a warning banner.

## Error states

Examples:

```text
Repository path is unavailable.
Attune could not read repos/bulletproof-react. Re-enter the dev shell or restore the fixture subtree.
```

```text
ast-grep is unavailable.
The Nix shell should provide ast-grep. Enter nix develop and try again.
```

```text
Git bot dry run failed.
The export preview is still available, but Attune could not prepare a branch handoff.
```

Errors should be repair-oriented and specific.

## Scene tests

Required Scene tests:

1. Settings page renders the dark editorial shell.
2. Settings page renders the page title, subtitle, secondary rail, and selected document.
3. Repository section shows repo name, path, branch, included paths, and ignored paths.
4. Agent section shows agent permissions and disabled auto-promotion/direct-export controls.
5. Rule engines section shows ast-grep enabled, supported languages, measurement mode, timeout, and parse failure behavior.
6. Git bot section shows dry-run mode and clean artifact boundary copy.
7. Local mode section shows fixture mode, local event store, no live model calls, and Nix-pinned toolchain state.
8. Selecting a rail item changes the selected document.
9. Selected rail item has accessible selected/current state beyond color.
10. Settings page does not render scan results, finding queues, candidate promotion actions, or export packet file previews.

## Story tests

Required Story tests:

1. Selecting a section updates `selectedSection`.
2. Editing a setting marks the draft dirty.
3. Clicking `Save changes` emits or schedules the settings-save command.
4. Clicking `Reset section` restores the selected section draft.
5. Toggling an agent permission updates draft state.
6. Attempting to enable auto-promotion remains blocked or disabled.
7. Save success moves `saveState` to `Saved`.
8. Save failure moves `saveState` to `Failed` with repair copy.

## Fixture data

Initial fixture state:

```ts
const settingsFixture: SettingsModel = {
  selectedSection: "repository",
  workspace: {
    repository: {
      repoName: "bulletproof-react",
      repoPath: "repos/bulletproof-react",
      defaultBranch: "main",
      includedPaths: ["apps/react-vite/src/**"],
      ignoredPaths: ["node_modules/**", "dist/**", "coverage/**"],
      fixtureMode: true,
    },
    agent: {
      liveModelCallsEnabled: false,
      mayGenerateDossiers: true,
      mayGenerateExamples: true,
      mayGenerateRules: true,
      mayGenerateRevisions: true,
      mayPromoteRules: false,
      mayExportDirectly: false,
    },
    ruleEngines: {
      astGrepEnabled: true,
      supportedLanguages: ["ts", "tsx", "yaml"],
      measurementTimeoutMs: 10000,
      parseFailureBehavior: "show_failed_measurement_and_block_promotion",
    },
    reviewPolicy: {
      requireHumanPromotion: true,
      blockPromotionWithoutExamples: true,
      blockPromotionWithoutValidRule: true,
      warnFalsePositivePercent: 10,
    },
    gitBot: {
      mode: "dry_run",
      branchPrefix: "attune/rules/",
      prTitleTemplate: "Add Attune rule: {ruleTitle}",
      commitAuthorName: "Attune Bot",
    },
    localMode: {
      fixtureModeActive: true,
      localEventStore: true,
      liveModelCalls: false,
      nixToolchainPinned: true,
    },
  },
  draft: /* same as workspace initially */,
  saveState: { _tag: "Clean" },
  validationMessages: [],
}
```

## Non-goals for first pass

Do not implement:

- billing
- organization users/roles
- OAuth provider flows
- GitHub App installation UI
- live model key management
- production database settings
- full repository connection wizard
- arbitrary theme editor
- direct ast-grep YAML authoring

Those may exist later, but the first Settings page should remain focused on Attune’s product boundaries.

## Implementation notes

- Use the same `attune-shell` and global sidebar as other pages.
- Add `page/settings/` as a FoldKit page submodel rather than rendering a stub from root `view.ts`.
- Settings should own its own `Model`, `Message`, `update`, `view`, Story tests, and Scene tests.
- Keep actual persistence behind a command/service boundary.
- In fixture mode, `Save changes` may only update in-memory state and show `Saved`.
- Do not call external services from view.
- Do not let the agent generate Settings layout. The agent may generate explanatory copy later, but Settings controls must remain product-owned.

## Final screenshot description

A dark Attune shell fills the viewport. The global sidebar remains on the left with Attune navigation and potential patterns. The main area shows a restrained Settings page. At the top, a small uppercase label says `Workspace settings`, followed by a large serif `Settings` title and a single sentence about boundaries.

Below, a two-column settings area appears. The left rail contains six compact settings sections: Repository, Agent, Rule engines, Review policy, Git bot, and Local mode. Repository is selected with a quiet violet inset line.

The right document panel shows `Repository scope`, a calm explanation, three small chips (`Fixture mode`, `Connected`, `Local measurement`), and a few grouped fields: repository name, path, branch, included paths, and ignored paths. At the bottom is a blue-tinted boundary note explaining that fixture mode uses `repos/bulletproof-react` and no live services. The footer has a muted `No unsaved changes` state, a secondary `Reset section` button, and a primary `Save changes` button.

The page feels quiet, serious, and operational. It explains what Attune is allowed to do without turning into an admin dashboard.
