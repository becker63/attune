## ADDED Requirements

### Requirement: Framework owns local TimescaleDB store lifecycle
The system SHALL extend the existing framework-runtime TimescaleDB/Postgres
ManagedRecipe as the persistent local recipe store lifecycle surface and SHALL
keep database lifecycle ownership out of Tend/OpenCode.

#### Scenario: Existing TimescaleDB ManagedRecipe is refined
- **WHEN** the framework-runtime local store capability is implemented
- **THEN** it extends `packages/trellis/runtime/src/LocalTimescaleRecipe.ts`
  and the existing `framework-runtime.local-timescaledb` ManagedRecipe identity
  as the framework-owned store lifecycle surface
- **AND** the declaration includes project ID, title, input schema, output
  schema, lifecycle actions, resource kind, lifecycle substrate, validation
  evidence, observed state, drift repair or no-repair rationale, and review
  semantics for destructive prune/destroy behavior
- **AND** the implementation does not introduce a parallel
  `framework-runtime.local-recipe-store` ManagedRecipe, wrapper, alias, or
  Tend-owned lifecycle surface

#### Scenario: Lifecycle actions are framework-runtime owned
- **WHEN** an agent plans, starts, checks, migrates, validates SQL, stops,
  prunes, or destroys the local recipe store
- **THEN** it uses framework-runtime Nx targets or a RecipeInvocation-backed
  framework-runtime target
- **AND** lifecycle actions include plan, apply/start, check, migrate,
  validate-sql, stop, prune, and destroy as supported by the runtime substrate
- **AND** `tend-opencode` does not expose database lifecycle commands

#### Scenario: Existing runtime substrate is reused
- **WHEN** lifecycle behavior is implemented
- **THEN** it routes through existing framework/runtime lifecycle substrate or
  the Effect Alchemy bridge shape
- **AND** it uses existing recipe receipt and SQL route surfaces where
  applicable
- **AND** it does not invent a new lifecycle runtime or a second local store
  lifecycle identity

### Requirement: Lifecycle commands use the existing framework-runtime DB target family
The system SHALL expose local store operations through the existing
framework-runtime-owned TimescaleDB/Postgres Nx target family instead of adding
a Tend-owned lifecycle surface or a second local-store command family.

#### Scenario: Existing DB targets are extended
- **WHEN** the implementation exposes framework local store lifecycle commands
- **THEN** the public commands use
  `pnpm exec nx run framework-runtime:db:plan --output-style=static`
- **AND** they use `framework-runtime:db:apply`, `framework-runtime:db:check`,
  `framework-runtime:db:migrate`, `framework-runtime:db:validate-sql`, and
  `framework-runtime:db:stop`
- **AND** destructive `framework-runtime:db:prune` and
  `framework-runtime:db:destroy` behavior is separately gated by review
  semantics
- **AND** no `framework-runtime.local-recipe-store` ManagedRecipe or
  `tend-opencode db *` lifecycle command is introduced

### Requirement: Store lifecycle emits receipts and observations
The framework-runtime local store lifecycle SHALL emit or prepare
`RecipeReceipt` and `RecipeObservation` records for lifecycle actions.

#### Scenario: Lifecycle observed state is recorded
- **WHEN** a framework-runtime local store lifecycle action runs
- **THEN** the observed state payload includes data directory, port, database
  URL, readiness, migration state, schema state, SQL validation state, last
  lifecycle action, timestamp, and failure summary when applicable
- **AND** the observation source identifies framework-runtime as the lifecycle
  owner
- **AND** the observation does not make Tend/OpenCode the lifecycle owner

#### Scenario: Destructive behavior requires review semantics
- **WHEN** a prune or destroy action is planned or run
- **THEN** the ManagedRecipe declaration exposes the review semantics required
  before destructive behavior
- **AND** receipts/observations record the destructive action result or blocked
  status without bypassing human review expectations
