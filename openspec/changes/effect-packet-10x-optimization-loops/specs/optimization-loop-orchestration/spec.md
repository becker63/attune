## ADDED Requirements

### Requirement: Four optimization loop kinds exist
The system SHALL support four benchmark optimization loop kinds:
`quick-turn`, `pair-turn`, `full-ab`, and `audit`.

#### Scenario: Quick turn loop runs
- **WHEN** an agent starts a `quick-turn` loop
- **THEN** the system runs a focused packet, arm, prompt, or scoring change with
  a short budget and emits target status after completion

#### Scenario: Pair turn loop runs
- **WHEN** an agent starts a `pair-turn` loop
- **THEN** the system compares two comparable variants such as packet versus raw
  or prompt A versus prompt B and emits target status after completion

#### Scenario: Full ab loop runs
- **WHEN** an agent starts a `full-ab` loop
- **THEN** the system runs the comparable full benchmark matrix needed for a
  stronger token-efficiency claim and emits target status after completion

#### Scenario: Audit loop runs
- **WHEN** an agent starts an `audit` loop
- **THEN** the system checks scorer consistency, telemetry completeness, SQL
  validity, hidden judge projection, privacy constraints, and report inputs
  before emitting target status

### Requirement: Loop strategy remains agent-directed
The system SHALL let the agent choose loop ordering and tactics based on
observed target status while preserving loop evidence contracts.

#### Scenario: Agent chooses next loop
- **WHEN** a loop emits target status
- **THEN** it includes enough evidence for the agent to choose the next loop
  kind, packet set, arms, prompt variant, or validation depth without requiring
  a fixed OpenSpec runbook

#### Scenario: Loop evidence remains comparable
- **WHEN** an agent chooses a custom loop tactic
- **THEN** the loop still records loop kind, hypothesis, benchmark run ID,
  baseline, packet targets, arms, budgets, validations, registration status,
  paired source-state evidence, and target status

### Requirement: Reasoning-bearing Effect diagnostic loops are supported
The system SHALL support benchmark loops over harder Effect diagnostics that
require real agent reasoning rather than only mechanical safe-fix application.

#### Scenario: Hard diagnostic packet is selected
- **WHEN** an agent selects a reasoning-bearing packet set
- **THEN** the packet set can include diagnostics such as missing Effect
  context, missing Layer context, missing Effect error channels, floating
  effects, implicit `Effect.fn` `any`, running Effects inside Effect contexts,
  typed error cleanup, Effect-native API migrations, and strict boolean repairs
- **AND** the loop records the reasoning-burden classification for each target

#### Scenario: Reasoning work remains observable
- **WHEN** a reasoning-bearing loop completes
- **THEN** the loop observations include bounded evidence that the agent
  inspected context, chose a migration strategy, applied changes, and validated
  the result without storing raw prompts, conversations, full diffs, or full
  command output

### Requirement: Live loops require framework store health
The system SHALL require a healthy framework-managed observation store for live
optimization loops.

#### Scenario: Store health gates live loop
- **WHEN** a live loop starts
- **THEN** the system verifies the framework store is reachable, migrated,
  SQL-valid, and insert/query healthy through framework-runtime surfaces
- **AND** it fails unless the run is explicitly dry-run/export-only

#### Scenario: Tend does not administer DB lifecycle
- **WHEN** Tend/OpenCode benchmark loop commands run
- **THEN** they emit and query observations but do not start, stop, migrate,
  validate, prune, or administer the database lifecycle

### Requirement: Loop completion gate requires credible 10x-20x target evidence
The system SHALL keep the OpenSpec change incomplete until credible DB-backed
evidence reaches the 20x goal.

#### Scenario: Ten x checkpoint is reached
- **WHEN** corrected DB-backed scorecards show at least 10x token-efficiency
  improvement over the selected baseline on comparable predefined diagnostic
  migration work
- **THEN** target status marks the 10x checkpoint as reached only after an
  audit loop
  confirms scorer consistency and telemetry completeness
- **AND** the OpenSpec change remains incomplete until the 20x goal is reached

#### Scenario: Twenty x goal is reached
- **WHEN** corrected DB-backed scorecards show at least 20x token-efficiency
  improvement over the selected baseline
- **THEN** the target gate can be marked passed only when the run includes
  reasoning-bearing diagnostic migration work
- **AND** an audit loop confirms pre-registration, paired source state,
  holdout confirmation, negative-control cleanliness, all-in accounting,
  scorer consistency, source-scope correctness, telemetry completeness, SQL
  validity, privacy, and report projection

#### Scenario: Autofix-only run cannot complete the goal
- **WHEN** a run reaches 20x using only trivial autofix-only packet clears
- **THEN** target status records useful fast-path evidence
- **AND** it does not mark the 20x goal passed until reasoning-bearing packet
  evidence is included

#### Scenario: Visible-only result remains candidate
- **WHEN** visible packets reach the 20x threshold but hidden holdout packets
  have not confirmed comparable performance
- **THEN** target status records a candidate result
- **AND** the credible 20x goal remains unpassed
