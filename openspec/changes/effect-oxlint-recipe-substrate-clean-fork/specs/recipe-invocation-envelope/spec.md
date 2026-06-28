## ADDED Requirements

### Requirement: RecipeInvocation schema
The system SHALL define an Effect Schema-backed `RecipeInvocation` envelope for
recipe and ManagedRecipe operations.

#### Scenario: Invocation is decoded
- **WHEN** an unknown invocation enters through Nx, CLI, tests, LSP, Tend,
  OpenCode, typed CLI entrypoints, or policy tooling
- **THEN** the system decodes recipe ID, action, input, parameters, optional run
  ID, requested-by metadata, and start/source metadata through Effect Schema.

#### Scenario: Invalid action is provided
- **WHEN** an invocation action is not in the supported vocabulary
- **THEN** schema decoding fails before ad hoc string dispatch can run.

### Requirement: Invocation action vocabulary covers current workflows
The RecipeInvocation action vocabulary SHALL cover current Attune workflow
verbs.

#### Scenario: Existing workflow action is invoked
- **WHEN** a caller requests `generate`, `check`, `repair`, `plan`, `apply`,
  `destroy`, `prune`, `fuzz`, `validate-sql`, `migrate`, or `generate-types`
- **THEN** the action is represented by the shared invocation schema.

#### Scenario: New action is proposed
- **WHEN** a new public workflow action is introduced
- **THEN** it must be added to the shared schema with tests and recipe/projection
  semantics rather than handled only by script-local string switches.

### Requirement: Nx executors use RecipeInvocation
Nx executors and target options SHALL route recipe-shaped public workflow
commands through RecipeInvocation where applicable.

#### Scenario: Public Nx target runs recipe work
- **WHEN** a public Nx target invokes recipe, ManagedRecipe, SQL, generation,
  fuzzing, or repair behavior
- **THEN** target options include recipe ID or projection ID and construct a
  RecipeInvocation envelope.

#### Scenario: Target invokes script path directly
- **WHEN** an Nx target invokes a script path for workflow behavior without
  recipe provenance
- **THEN** policy or conformance reports the target as invalid.

### Requirement: Typed entrypoints use RecipeInvocation without script shims
Typed source entrypoints SHALL use RecipeInvocation for workflow dispatch
without retaining package-local script compatibility shims.

#### Scenario: Typed CLI entrypoint is retained
- **WHEN** a command needs a direct executable entrypoint
- **THEN** the entrypoint lives under typed package source, decodes or receives
  a RecipeInvocation, and is invoked directly by Nx targets or tests.

#### Scenario: Script shim remains after migration
- **WHEN** a package-local script only imports a typed CLI or invocation module
  and passes through process arguments
- **THEN** the no-compat validation pass reports it as invalid final-state
  compatibility, even though the typed entrypoint is valid.

#### Scenario: Script parses workflow behavior
- **WHEN** a script owns stage dispatch, environment interpretation, filesystem
  generation, DB lifecycle, child process orchestration, or long functions
- **THEN** the script cleanup policy reports the behavior as needing migration
  into typed source modules.

### Requirement: Invocations produce receipts and observations
RecipeInvocation-backed work SHALL record receipts and observations where the
operation has meaningful execution or lifecycle output.

#### Scenario: Invocation completes
- **WHEN** invocation-backed work completes successfully or fails
- **THEN** the runtime records a recipe run and receipt where applicable
- **AND** records observations for lifecycle state, generated freshness,
  validation facts, policy findings, or Tend/OpenCode command facts when
  available.
