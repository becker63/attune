## ADDED Requirements

### Requirement: Benchmark producers emit through framework observation sink
Benchmark producers SHALL emit observations through the shared framework
runtime observation boundary.

#### Scenario: Benchmark runner emits observations
- **WHEN** benchmark setup, arm execution, final judging, telemetry ingest, or
  report projection runs
- **THEN** the producer emits `RecipeObservation` records through
  `RecipeReceiptStore`, `PostgresRecipeReceiptStore`, a typed runtime store
  service, or an equivalent framework runtime DB boundary
- **AND** producer code MUST NOT import raw `pg` or write ad hoc SQL outside
  the framework runtime boundary

#### Scenario: Store emission failure fails live run
- **WHEN** store emission fails during a live benchmark run
- **THEN** the run records the failure when possible and fails the affected
  phase instead of silently falling back to cache as source truth

### Requirement: Benchmark observation kinds are generic
The system SHALL use generic benchmark and agent measurement observation kinds
that are not Tend-only.

#### Scenario: Required benchmark kinds exist
- **WHEN** benchmark support is implemented
- **THEN** the observation model supports kinds for benchmark run started and
  completed, benchmark arm started and completed, benchmark plan summary,
  benchmark final judge summary, Codex thread summary, Codex cluster summary,
  agent tool-usage summary, benchmark scorecard summary, and benchmark report
  projection

#### Scenario: Existing measurement kinds remain usable
- **WHEN** benchmark commands are observed
- **THEN** existing `measurement.command.observed`,
  `measurement.agent.metrics.summary`, `measurement.trace.inventory.summary`,
  `measurement.micro-experiment.summary`, and `measurement.report.projected`
  observations remain valid inputs to benchmark projections

### Requirement: Observation identity is stable
Benchmark observations SHALL include stable identity fields that allow report
projection without raw trace scans.

#### Scenario: Benchmark identity fields are present
- **WHEN** benchmark observations are emitted
- **THEN** payloads include benchmark run ID, arm ID when applicable,
  measurement session ID, worktree identity when applicable, observation
  source, captured timestamp, schema version, and privacy summary

#### Scenario: Agent identity is non-sensitive
- **WHEN** agent telemetry observations are emitted
- **THEN** they may include non-sensitive thread IDs, session IDs, model IDs,
  and stable file IDs
- **AND** they MUST NOT include raw prompt text, full conversation text, raw
  trace rows, secrets, or full command output
