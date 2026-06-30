## ADDED Requirements

### Requirement: Packet benchmark observations are DB-backed
The system SHALL store packet benchmark lifecycle and outcome telemetry as
`RecipeObservation` records in the framework runtime observation store.

#### Scenario: Packet observation kinds are emitted
- **WHEN** a live packet benchmark runs
- **THEN** it emits observations for run started/completed, arm
  started/completed, packet queue selected, packet started/completed, packet
  fix preview, packet apply result, packet validation result, hidden judge
  summary, telemetry summary, scorecard summary, and report projection

#### Scenario: Framework store remains canonical
- **WHEN** packet benchmark observations are stored
- **THEN** they use `framework_event.recipe_observation` through
  `RecipeReceiptStore`, `PostgresRecipeReceiptStore`, or an equivalent
  framework runtime boundary
- **AND** they do not add product-specific benchmark tables before using the
  existing observation spine

### Requirement: SQL validation covers packet paths
The system SHALL validate SQL routes for inserting and querying packet
benchmark observations through the existing framework SQL pipeline.

#### Scenario: Packet SQL statements validate
- **WHEN** `framework-runtime:db:validate-sql` runs
- **THEN** it validates inserting packet queue, packet outcome, packet
  validation, hidden judge, and scorecard observations
- **AND** it validates querying by benchmark run ID, arm ID, measurement
  session ID, packet ID, rule name, profile, observation kind, and final judge
  status

### Requirement: Reports are typed DB projections
The system SHALL generate packet benchmark markdown and JSON reports from typed
DB projections rather than report files or local cache as source truth.

#### Scenario: Packet report is projected
- **WHEN** the benchmark report is generated under
  `reports/tend-opencode-codex-measurement/`
- **THEN** it reads typed packet benchmark observations from the framework
  store and emits a report projection observation with report paths,
  benchmark run ID, measurement session ID, input observation IDs, generated
  timestamp, and privacy summary

#### Scenario: Report explains packet metrics
- **WHEN** packet reports render scorecards
- **THEN** they define packet clears, validated packet clears, clears per
  million tokens, tokens per clear, validation commands per clear, safe fixes
  applied, packet stale/refusal counts, affected files per clear, and hidden
  full-evaluator deltas

### Requirement: Telemetry joins packet outcomes
The system SHALL join command and agent telemetry to packet outcomes without
rescanning raw traces during report projection.

#### Scenario: Token and tool metrics join arms
- **WHEN** packet benchmark reports are projected
- **THEN** token totals, cached/input/output/reasoning token breakdowns when
  available, tool-call counts, command-family counts, validation counts, and
  patch classifications join to the correct arm and packet phase

#### Scenario: Missing telemetry is explicit
- **WHEN** a token, tool, command, or packet metric cannot be derived safely
- **THEN** the projection records it as not measured with a reason rather than
  inferring zero

### Requirement: Tend/OpenCode does not own DB lifecycle
The packet benchmark SHALL require a healthy framework-managed store for live
runs while keeping lifecycle ownership in framework-runtime.

#### Scenario: Live benchmark preflight checks store health
- **WHEN** a live packet benchmark starts
- **THEN** it verifies the framework-managed local recipe store is reachable,
  migrated, SQL route valid, and insert/query smoke healthy
- **AND** it fails setup unless the store is healthy or the run is explicitly
  dry-run/export-only

#### Scenario: Tend does not administer store
- **WHEN** Tend/OpenCode benchmark commands run
- **THEN** they emit/query observations but do not start, stop, migrate,
  validate, prune, or administer the database lifecycle
