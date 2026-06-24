## ADDED Requirements

### Requirement: Program index is the primary check substrate

Attune SHALL prefer program-index-backed diagnostics for `attune-check` once
the program index can materialize relevant workspace facts.

#### Scenario: Program index diagnostics are available
- **WHEN** `workspace:attune-check` or `<project>:attune-check` runs
- **AND** program-index materialization succeeds
- **THEN** check output SHALL use program-index-backed diagnostics as the
  primary diagnostic source
- **AND** compatibility diagnostics MAY be used only for parity or fallback

#### Scenario: Program index falls back to compatibility diagnostics
- **WHEN** program-index materialization fails or lacks a diagnostic domain
- **THEN** check output SHALL report the missing or failed program-index path
- **AND** any compatibility fallback diagnostics SHALL be clearly marked as
  compatibility fallback output

### Requirement: Program index is the primary repair planning substrate

Attune SHALL prefer program-index repair rows for `attune-repair`.

#### Scenario: Safe repair rows exist
- **WHEN** `workspace:attune-repair --dryRun` or
  `<project>:attune-repair --dryRun` runs
- **AND** safe repair rows exist
- **THEN** the repair output SHALL summarize those rows by project,
  diagnostic code, repair kind, public Nx target, and safety class

#### Scenario: Needs-review repair rows exist
- **WHEN** a repair row is marked `needs-review`
- **THEN** default safe repair SHALL NOT execute it
- **AND** dry-run output SHALL report why review is required

#### Scenario: Manual-only repair rows exist
- **WHEN** a repair row is marked `manual-only`
- **THEN** `attune-repair` SHALL NOT execute it automatically
- **AND** diagnostics SHALL explain the human action or follow-up required

### Requirement: Repair rows route to Nx public targets

Repair rows SHALL identify public Nx repair targets while hiding internal
generator and materializer selection from normal agent workflow.

#### Scenario: Generator-backed repair is needed
- **WHEN** a diagnostic requires an existing generator or materializer
- **THEN** the repair row SHALL identify the public `attune-repair` target and
  internal repair kind
- **AND** agents SHALL NOT need to choose the raw generator manually

#### Scenario: Repair executes
- **WHEN** `attune-repair` applies a safe repair row
- **THEN** it SHALL route to the relevant Nx generator, executor, or
  materializer internally
- **AND** it SHALL update generated artifact freshness and program-index repair
  state when available

### Requirement: Repair plans are safety classified

Every executable repair plan SHALL carry a safety classification.

#### Scenario: Repair touches generated cache
- **WHEN** a repair only creates, updates, deletes, or regenerates
  framework-owned generated/cache output
- **THEN** it MAY be classified as `safe`

#### Scenario: Repair touches authored or external behavior
- **WHEN** a repair changes stable ids, authored package declarations, target
  wiring, provider behavior, Kubernetes resources, destructive actions, or
  external runtime behavior
- **THEN** it SHALL be classified as `needs-review` or `manual-only`

#### Scenario: Repair safety is ambiguous
- **WHEN** Attune cannot determine whether a repair is safe
- **THEN** it SHALL NOT classify the repair as `safe`
- **AND** safe/default repair execution SHALL refuse the repair
