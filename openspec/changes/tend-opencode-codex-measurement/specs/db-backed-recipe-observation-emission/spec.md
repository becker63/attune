## ADDED Requirements

### Requirement: Producers emit through framework observation sink
The system SHALL provide a shared framework/runtime observation sink that can
be used by Tend/OpenCode, Trellis LS, Nx/toolchain validation, and future
Attune app workflows.

#### Scenario: Shared sink uses runtime DB boundary
- **WHEN** a producer emits an observation
- **THEN** it uses `RecipeReceiptStore`, `PostgresRecipeReceiptStore`, a typed
  runtime store service, or an equivalent framework/runtime DB boundary
- **AND** producer code does not import raw `pg`
- **AND** producer code does not write ad hoc SQL
- **AND** the durable row is stored in `framework_event.recipe_observation`
  by default

#### Scenario: In-memory fallback supports tests
- **WHEN** tests run without a live framework store
- **THEN** producers can use an in-memory framework observation sink
- **AND** the fallback preserves the same observation identity, payload schema,
  and privacy guardrails expected by the Postgres-backed sink

### Requirement: Measurement session identity is generic
Measurement session identity SHALL be generic framework measurement identity,
not Tend-only identity.

#### Scenario: Generic measurement observation kinds are emitted
- **WHEN** a measurement session runs
- **THEN** the system may emit `measurement.session.started`
- **AND** it may emit `measurement.session.completed`
- **AND** it may emit `measurement.harness.proof`
- **AND** it may emit `measurement.command.observed`
- **AND** it may emit `measurement.trace.inventory.summary`
- **AND** it may emit `measurement.micro-experiment.summary`
- **AND** it may emit `measurement.report.projected`
- **AND** these kinds are usable by Tend/OpenCode, Trellis LS, Nx/toolchain
  validation, and future Attune app workflows

#### Scenario: Session linkage is available to reports
- **WHEN** observations are emitted during a measurement workflow
- **THEN** they include a measurement session ID when available
- **AND** reports can query all relevant observations for that session without
  relying on cache file discovery as durable truth

### Requirement: Framework store records lifecycle and producer observations
The shared receipt/observation store SHALL record framework lifecycle state and
producer measurement events without a Tend-specific ledger.

#### Scenario: Lifecycle observation payload is bounded
- **WHEN** framework-runtime local store lifecycle actions emit observations
- **THEN** observed state payloads include data directory, port, database URL,
  readiness, migration state, schema state, SQL validation state, last
  lifecycle action, timestamp, and failure summary when applicable
- **AND** the source identifies framework-runtime

#### Scenario: Producer observation payload is bounded
- **WHEN** Tend/OpenCode, Trellis LS, Nx/toolchain validation, or future app
  workflows emit observations
- **THEN** payloads use typed measurement schemas
- **AND** payloads do not store raw prompts, full conversations, secrets, raw
  trace dumps, full command output, or ambiguous private text payloads
- **AND** no product-specific DB tables are added before using
  `framework_event.recipe_observation`
