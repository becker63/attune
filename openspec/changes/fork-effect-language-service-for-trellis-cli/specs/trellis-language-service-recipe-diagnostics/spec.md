## ADDED Requirements

### Requirement: Recipe pipeline organization
Every CLI command SHALL be implemented as a recipe pipeline over workspace inventory, TypeScript program facts, upstream Effect diagnostics or fixes, Attune recipe facts, repair planning, JSON projection, and optional observation recording.

#### Scenario: Diagnostics recipe roles are declared
- **WHEN** the language-service recipe catalog is inspected
- **THEN** it includes CLI-first recipes for workspace diagnostics, Effect diagnostics, recipe fact diagnostics, diagnostic JSON projection, fixes JSON projection, apply result projection, and check summary projection

### Requirement: Diagnostic source families
The system SHALL normalize diagnostics into source families that include `effect`, `typescript`, and `trellis`.

#### Scenario: Mixed diagnostic output
- **WHEN** a project contains TypeScript, Effect, and Trellis findings
- **THEN** diagnostics JSON distinguishes them by `source` without creating separate output protocols

### Requirement: Recipe ownership diagnostics
The system SHALL derive Trellis diagnostics for missing recipe ownership, generated artifact ownership, generated artifact freshness, and public symbol ownership using recipe/projection facts.

#### Scenario: Generated artifact missing owner
- **WHEN** a generated artifact has no recipe or projection owner
- **THEN** diagnostics JSON includes a `trellis/generated-artifact-missing-owner` finding with generated and recipe-ownership tags

### Requirement: Nx projection diagnostics
The system SHALL derive Trellis diagnostics for orphan public Nx targets, projection mismatches, internal targets without public parents, and targets missing RecipeInvocation routing.

#### Scenario: Public target lacks owner
- **WHEN** a public Nx target has no recipe or projection owner
- **THEN** diagnostics JSON includes a Trellis Nx projection diagnostic and a repair suggestion that prefers a public project repair target

### Requirement: No-compat script diagnostics
The system SHALL detect reintroduced package-local script workflows and workflow logic outside typed source entrypoints.

#### Scenario: Package-local script reintroduced
- **WHEN** a file appears under `packages/**/scripts/**`
- **THEN** diagnostics JSON includes a `trellis/package-local-script-reintroduced` or equivalent no-compat diagnostic

### Requirement: ManagedRecipe and Alchemy diagnostics
The system SHALL derive diagnostics for ManagedRecipe declarations missing lifecycle substrate, observation metadata, drift repair rationale, Alchemy provenance, or required human review gates.

#### Scenario: Destructive lifecycle lacks review gate
- **WHEN** a ManagedRecipe declares destructive lifecycle behavior without a review gate
- **THEN** diagnostics JSON includes a Trellis diagnostic that is marked unsafe for automatic apply

### Requirement: DB and receipt-spine diagnostics
The system SHALL derive diagnostics for raw Postgres access outside the runtime boundary, private ledgers without recipe linkage, operations missing receipts, and operations missing observations.

#### Scenario: Raw Postgres outside runtime
- **WHEN** source code imports raw Postgres outside the approved runtime adapter boundary
- **THEN** diagnostics JSON includes a `trellis/raw-pg-outside-runtime` diagnostic

### Requirement: Tend linkage diagnostics
The system SHALL derive feasible Tend diagnostics for private ledger risk, missing recipe IDs, missing observation IDs, and reports not derived from receipt/token facts.

#### Scenario: Tend command missing observation linkage
- **WHEN** a Tend command record lacks observation linkage where the schema supports it
- **THEN** diagnostics JSON includes a Trellis Tend linkage diagnostic

### Requirement: Oxlint is transitional
The system SHALL treat `effect-oxlint` policy rules as transitional pressure and re-express durable invariants as Trellis diagnostic recipes.

#### Scenario: Oxlint invariant migrates to Trellis diagnostic
- **WHEN** a current oxlint rule encodes a durable architecture invariant
- **THEN** the language-service implementation provides or tracks an equivalent Trellis diagnostic recipe rather than documenting oxlint as the agent repair protocol
