## ADDED Requirements

### Requirement: ManagedRecipe lifecycle uses Effect Alchemy substrate
ManagedRecipe lifecycle execution SHALL route through Effect Alchemy or an
explicit existing substrate instead of a new custom ManagedResource runtime.

#### Scenario: Stateful lifecycle is implemented
- **WHEN** a ManagedRecipe needs plan, apply, check, destroy, prune, observed
  state, drift diagnostics, or resource provenance
- **THEN** the implementation uses Effect Alchemy or documented existing
  substrate behavior
- **AND** it does not introduce a custom lifecycle planner, diff engine,
  scheduler, observed-state store, or distributed apply engine.

#### Scenario: New runtime abstraction is proposed
- **WHEN** code introduces a `ResourceDiffEngine`, `LifecyclePlanner`,
  `ObservedStateStore`, `CustomManagedResourceRuntime`,
  `DistributedApplyEngine`, or custom scheduler
- **THEN** the change is rejected unless it is removed or explicitly scoped
  outside this clean fork.

### Requirement: AlchemyResourceBridge is thin
The system SHALL provide or clarify a thin Alchemy bridge that maps
ManagedRecipes to Alchemy resource descriptors and lifecycle results to recipe
facts.

#### Scenario: ManagedRecipe action is requested
- **WHEN** a RecipeInvocation requests a ManagedRecipe lifecycle action
- **THEN** the bridge locates the ManagedRecipe by recipe ID, determines the
  lifecycle action, invokes the Alchemy-backed implementation or adapter, and
  normalizes the result.

#### Scenario: Lifecycle result is normalized
- **WHEN** an Alchemy-backed lifecycle action completes
- **THEN** the bridge emits a RecipeReceipt, RecipeObservation records where
  available, diagnostics or health for failure/drift, and repairs where
  applicable.

#### Scenario: Human review is required
- **WHEN** a ManagedRecipe action is destructive, external, or stateful and its
  declaration requires human review
- **THEN** the bridge preserves the review gate and does not silently apply the
  lifecycle action.

### Requirement: ManagedRecipe declarations carry lifecycle provenance
ManagedRecipe declarations SHALL include enough metadata for policy, planning,
repair, and observation.

#### Scenario: ManagedRecipe is declared
- **WHEN** `defineManagedRecipe`, `defineManagedExecutableRecipe`, or an
  external ManagedRecipe declaration is authored
- **THEN** it includes id, project ID, title, input schema, output schema,
  lifecycle actions, resource kind, validation evidence, lifecycle substrates
  or Alchemy bridge metadata, observed state or observation metadata, drift
  repair or explicit no-repair rationale, and human-review semantics where
  applicable.

#### Scenario: Decorative ManagedRecipe is encountered
- **WHEN** a ManagedRecipe claims lifecycle but lacks substrate, evidence,
  observation, repair, or review metadata
- **THEN** policy emits a diagnostic and implementation does not treat it as a
  valid stateful resource declaration.

### Requirement: LocalTimescale remains the pressure-test ManagedRecipe
`LocalTimescaleManagedRecipe` SHALL be used as the first concrete lifecycle
pressure test for Alchemy alignment, SQL route validation, receipt storage, and
observation emission.

#### Scenario: LocalTimescale output is produced
- **WHEN** LocalTimescale lifecycle output is generated
- **THEN** it includes lifecycle action, service readiness, migration status,
  SQL route config, service closure evidence, receipt store implementation, and
  observation/provenance payloads.

#### Scenario: Integration is unavailable
- **WHEN** live Timescale/Postgres integration is not enabled
- **THEN** static validation and unit tests still prove schema, receipt, and
  observation semantics
- **AND** live apply/check behavior remains guarded by explicit integration
  configuration.

### Requirement: Not all recipes are resources
The system SHALL preserve a distinction between pure Recipes and stateful
ManagedRecipes.

#### Scenario: Pure projection is declared
- **WHEN** a recipe only renders a projection, validates source, or reports
  policy facts without lifecycle state
- **THEN** it remains a Recipe and is not forced through Alchemy.

#### Scenario: Stateful resource is declared
- **WHEN** a recipe owns lifecycle state or external resource mutation
- **THEN** it uses ManagedRecipe semantics and lifecycle receipts.
