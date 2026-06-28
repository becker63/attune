## ADDED Requirements

### Requirement: Attune-specific effect-oxlint policy pack
The system SHALL expose a Trellis-owned `effect-oxlint` plugin that enforces
Attune Recipe/ManagedRecipe architecture invariants rather than generic Effect
style preferences.

#### Scenario: Policy package is inspected
- **WHEN** an agent inspects `packages/trellis/oxlint-policy`
- **THEN** the package exposes an oxlint plugin assembled with `effect-oxlint`
- **AND** the plugin includes Attune-specific rules for scripts, Nx target
  ownership, private ledgers, ManagedRecipe substrate, generated artifact
  ownership, and raw Postgres boundaries.

#### Scenario: Generic Effect lint adoption is proposed
- **WHEN** a change attempts to enable broad generic Effect lint rules as part
  of this clean fork
- **THEN** the policy design rejects the adoption unless a narrow Attune
  architecture invariant is named
- **AND** Attune-specific rules remain the first enforcement surface.

### Requirement: Script workflow rule
The system SHALL provide an `attune/no-public-script-workflow` rule that flags
package-local script files containing substantive workflow behavior.

#### Scenario: Stage switch script is linted
- **WHEN** a file under `packages/**/scripts/**/*.{ts,js,mjs,cjs}` contains a
  stage switch, direct child process execution, manual `process.argv` dispatch,
  DB lifecycle behavior, filesystem generation, or toolchain orchestration
- **THEN** the rule emits a diagnostic telling the author to move behavior under
  typed source modules and expose it through a Recipe or ManagedRecipe
  projection.

#### Scenario: Invocation-only script is linted
- **WHEN** a script only imports a typed CLI or recipe invocation module and
  passes through `process.argv`
- **THEN** the rule may classify it separately from substantive workflow logic
- **AND** the no-compat validation pass still reports the live script surface
  as invalid final-state compatibility after the typed module can be invoked
  directly.

#### Scenario: Migration debt is allowed temporarily
- **WHEN** a non-shim script is temporarily allowlisted
- **THEN** the file or policy configuration MUST reference an owning recipe or
  repair and a removal TODO
- **AND** the rule reports the debt according to the configured warning/error
  phase.

### Requirement: Recipe-owned Nx target rule
The system SHALL provide an `attune/recipe-owned-nx-target` rule that flags
public Nx workflow targets not owned by Recipe or projection metadata.

#### Scenario: Orphan public target is linted
- **WHEN** a `project.json` target named `check`, `repair`, `generate`,
  `check-generated`, `fuzz`, `proof`, `plan`, `apply`, `destroy`, `migrate`,
  `validate-sql`, or `generate-types` lacks recipe/projection ownership
- **THEN** the rule emits a diagnostic requiring recipe metadata, projection
  metadata, or a recipe invocation executor parameter.

#### Scenario: Internal target is linted
- **WHEN** a target is marked `metadata.attune.tier = "internal"` and has a
  documented public parent surface
- **THEN** the rule accepts the target as internal implementation detail.

#### Scenario: Unique recipe owner is inferred
- **WHEN** exactly one recipe declaration has an `nxTarget` matching the target
- **THEN** the rule MAY offer a safe fix that adds the corresponding recipe
  metadata
- **AND** otherwise emits a diagnostic without an autofix.

### Requirement: Private ledger rule
The system SHALL provide an `attune/no-private-ledger` rule that flags
ledger-like stores and tables without linkage to the shared recipe receipt
spine.

#### Scenario: Store-like declaration is linted
- **WHEN** code declares an EventLog, ReceiptStore, Ledger, Journal, RunStore,
  SessionStore, ObservationStore, MetricStore, or Outbox without a reference to
  `RecipeReceiptStore`, recipe IDs, run IDs, receipt IDs, observation IDs, or
  `framework_*` schemas
- **THEN** the rule emits a diagnostic requiring the behavior to be expressed as
  a recipe receipt, metric, diagnostic, repair, health row, or observation.

#### Scenario: Tend ledger-like code is linted
- **WHEN** Tend session, command, long-job, token, or tool state lacks linkage to
  recipe, run, receipt, or observation identity where relevant
- **THEN** the rule reports that Tend is drifting into a second source of truth.

#### Scenario: Fixture store is linted
- **WHEN** an in-memory store is fixture-only or implements the shared port
- **THEN** the rule accepts it or reports only migration guidance, not a blocking
  private-ledger diagnostic.

### Requirement: ManagedRecipe substrate rule
The system SHALL provide an `attune/managed-recipe-requires-substrate` rule
that rejects decorative ManagedRecipe declarations.

#### Scenario: ManagedRecipe declaration lacks lifecycle substrate
- **WHEN** a `defineManagedRecipe` or external ManagedRecipe declaration lacks
  required lifecycle substrate, validation evidence, observed state or
  observation metadata, drift repair or no-repair rationale, and review
  semantics
- **THEN** the rule emits a diagnostic requiring Alchemy routing or explicit
  lifecycle substrate provenance.

#### Scenario: Valid ManagedRecipe declaration is linted
- **WHEN** a ManagedRecipe includes id, project, title, schemas, lifecycle,
  resource kind, lifecycle substrates or Alchemy bridge metadata, validation
  evidence, observed state or observation metadata, drift repair or rationale,
  and destructive/external review gates
- **THEN** the rule accepts the declaration.

### Requirement: Generated artifact ownership rule
The system SHALL provide an `attune/generated-artifact-owned-by-recipe` rule
that reports generated-looking artifacts without visible recipe or projection
ownership.

#### Scenario: Unowned generated artifact is linted
- **WHEN** a file or directory such as `*.generated.ts`, `*.generated.js`,
  `generated/**`, `ResourceRegistry.generated.ts`, or
  `ToolRegistry.generated.ts` lacks known recipe/projection ownership
- **THEN** the rule emits a diagnostic requiring recipe metadata and
  generation/freshness receipts.

#### Scenario: Owned generated artifact is linted
- **WHEN** ownership is visible through recipe `allowedFiles`, output
  descriptors, projection metadata, an ownership manifest, or an
  `@generated by <recipeId>` header resolving to a known recipe
- **THEN** the rule accepts the artifact.

### Requirement: Raw Postgres boundary rule
The system SHALL provide an `attune/no-raw-pg-outside-runtime` rule that keeps
raw Postgres clients and unsafe SQL execution inside the Trellis runtime DB
boundary.

#### Scenario: Product package imports raw Postgres
- **WHEN** a package outside the allowlisted runtime DB adapter imports `pg`,
  constructs `Pool` or `Client`, uses manual connection strings, or performs
  raw SQL execution
- **THEN** the rule emits a diagnostic requiring `RecipeReceiptStore`, read-model
  services, or a typed runtime adapter.

#### Scenario: Runtime adapter imports raw Postgres
- **WHEN** `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts`,
  `packages/trellis/runtime/src/SqlRoute.ts`, or runtime DB tests use the
  allowed raw DB boundary
- **THEN** the rule accepts the usage.

### Requirement: Policy rules are tested and phaseable
Each new policy rule SHALL include focused tests and an explicit warning/error
promotion path.

#### Scenario: Rule test suite runs
- **WHEN** `effect-oxlint-policy` tests run
- **THEN** every new rule has invalid examples, valid examples, no-compat or
  allowlist examples where relevant, and diagnostics matching the clean-fork
  message.

#### Scenario: Existing debt remains
- **WHEN** a rule would fail current migration debt that cannot be fixed in the
  same phase
- **THEN** the policy config records whether the rule is warning or error
- **AND** the migration plan names the condition for promoting it to error.
