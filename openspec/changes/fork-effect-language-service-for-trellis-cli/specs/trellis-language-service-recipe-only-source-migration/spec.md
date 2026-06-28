## ADDED Requirements

### Requirement: Recipe package declarations replace authored ProjectFacts
The system SHALL provide a recipe-native package declaration such as `defineRecipePackage` that declares package identity, kind/title, exported recipes, and lightweight ownership groupings without recreating the old hand-authored symbol graph. Authored `src/attune.package.ts`, `defineAttuneProjectFacts`, `ProjectFacts`, and `ProjectRuntimeRoots` SHALL be treated as legacy source-truth scaffolding.

#### Scenario: Language-service dogfoods recipe package
- **WHEN** `packages/trellis/language-service` is inspected
- **THEN** package identity, CLI surfaces, diagnostics, repairs, projections, observations, and invocation ownership are declared from its recipe package declaration rather than an authored `src/attune.package.ts`

#### Scenario: Existing policy accepts migrated recipe package
- **GIVEN** a package has removed `src/attune.package.ts`
- **AND** `src/recipes.ts` declares equivalent package source truth through `defineRecipePackage`
- **THEN** the framework final-ratchet policy accepts that package as migrated instead of requiring authored ProjectFacts

#### Scenario: Authored attune package file diagnostic
- **WHEN** a package contains an authored `src/attune.package.ts`
- **THEN** `trellis-ls diagnostics --profile recipe-only-source --format json` includes `trellis/authored-attune-package-file`

### Requirement: Specialized Recipe-family builders
The system SHALL expose typed specialized builders over the existing Recipe substrate: `defineProjectionRecipe`, `defineDiagnosticRecipe`, `defineRepairRecipe`, `defineObservationRecipe`, and `defineInvocationRecipe`. These builders MUST NOT create a second runtime, ledger, or ontology.

#### Scenario: Generic recipe should be specialized
- **WHEN** a generic recipe clearly represents a projection, diagnostic, repair, observation, or invocation role
- **THEN** recipe-only diagnostics include the corresponding `trellis/generic-recipe-should-be-*-recipe` finding

### Requirement: Source files are owned by Recipe-family declarations
The system SHALL diagnose meaningful source files that are not owned by a Recipe-family declaration through fields such as `allowedFiles`, `entrypoints`, `outputs`, `observedFiles`, `affectedFiles`, lifecycle files, or projection source/output mappings.

#### Scenario: Source file lacks recipe ownership
- **WHEN** a meaningful source file is not covered by package recipe ownership
- **THEN** diagnostics JSON includes `trellis/source-file-unowned-by-recipe`

#### Scenario: Test file ownership
- **WHEN** a test or fixture file exists
- **THEN** it may be owned by a testing, fixture, or package-level test recipe rather than a production recipe

### Requirement: Recipe-only migration profile
The CLI SHALL support a strict migration profile named `recipe-only-source` that fails on authored ProjectFacts scaffolding, unowned source files, workflow code not owned by InvocationRecipe, generated outputs not owned by ProjectionRecipe, diagnostic logic not owned by DiagnosticRecipe, repair logic not owned by RepairRecipe, observation emission not owned by ObservationRecipe, stateful lifecycle not represented by ManagedRecipe, public Nx targets without recipe/projection/invocation ownership, and legacy `defineAttuneProjectFacts`, `ProjectFacts`, or `ProjectRuntimeRoots` usage as authored truth.

#### Scenario: Strict profile returns migration diagnostics
- **WHEN** an agent runs `trellis-ls diagnostics --workspace . --profile recipe-only-source --format json`
- **THEN** the output contains recipe-only migration diagnostics and exits according to the selected fail threshold

### Requirement: Recipe-only migration fixes
The system SHALL expose repair plans for recipe-only migration diagnostics. Safe automatic fixes MAY delete an `attune.package.ts` only after equivalent recipe package metadata exists. Preview-only fixes SHOULD scaffold specialized recipe declarations. Manual or review-required fixes SHALL cover ManagedRecipe lifecycle, DB observation behavior, Tend model changes, package topology changes, generated path moves, and other risky migrations.

#### Scenario: Delete migrated attune package file
- **WHEN** equivalent recipe package metadata exists for an authored `attune.package.ts`
- **THEN** `trellis-ls fixes` may offer a safe delete or quarantine fix for that file

#### Scenario: Risky migration is review-required
- **WHEN** a migration touches lifecycle, database, Tend data model, package topology, or generated path ownership
- **THEN** write-mode apply refuses by default unless an explicit future review gate is provided

### Requirement: CLI internals execute recipe pipelines
The CLI SHALL parse arguments, load scope, build a RecipeInvocation, execute DiagnosticRecipe/RepairRecipe/ProjectionRecipe/ObservationRecipe pipelines, render JSON, and map exit codes. Trellis diagnostic and repair ontology SHOULD live in recipe modules rather than hardcoded command helpers.

#### Scenario: Diagnostic logic is recipe-owned
- **WHEN** Trellis diagnostic logic is added for recipe-only migration
- **THEN** it is represented by a DiagnosticRecipe declaration and used by the CLI pipeline
