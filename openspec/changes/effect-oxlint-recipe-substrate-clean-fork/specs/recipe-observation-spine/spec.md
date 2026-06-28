## ADDED Requirements

### Requirement: Generic recipe observation table
The system SHALL extend the existing `framework_*` database spine with a
generic `framework_event.recipe_observation` table without renaming
`framework_core`, `framework_event`, or `framework_view`.

#### Scenario: Migration is inspected
- **WHEN** the framework recipe receipt migration is read
- **THEN** it creates `framework_event.recipe_observation`
- **AND** it preserves the existing `framework_core`, `framework_event`, and
  `framework_view` schema names.

#### Scenario: Observation row is stored
- **WHEN** an observation is inserted
- **THEN** it records observation ID, recipe ID, optional run ID, optional
  receipt ID, observation kind, observed timestamp, optional source, and JSON
  payload.

#### Scenario: Observation lookup is needed
- **WHEN** observations are queried by recipe, run, or kind over time
- **THEN** the migration provides indexes that support recipe/time, run/time,
  and kind/time access.

### Requirement: RecipeObservation Effect Schema
The system SHALL define a `RecipeObservation` Effect Schema in the protocol
layer and use it consistently in runtime stores and snapshots.

#### Scenario: Observation payload is decoded
- **WHEN** unknown observation data enters the protocol/runtime boundary
- **THEN** `RecipeObservationSchema` decodes observation ID, recipe ID, optional
  run ID, optional receipt ID, observation kind, observed timestamp, optional
  source, and payload.

#### Scenario: Store snapshot is decoded
- **WHEN** a `RecipeReceiptStoreSnapshot` is decoded
- **THEN** the snapshot includes recipe observations in addition to recipes,
  edges, IO, runs, receipts, diagnostics, repairs, and health.

#### Scenario: DB emission includes observations
- **WHEN** recipe DB emission records need to materialize generic recipe facts
- **THEN** observation rows are represented where appropriate without replacing
  receipts or diagnostics.

### Requirement: Store APIs expose observations
`RecipeReceiptStore` SHALL expose observation write and read behavior through
both in-memory and Postgres implementations.

#### Scenario: In-memory observation is recorded
- **WHEN** runtime code records a recipe observation in the in-memory store
- **THEN** the observation is visible in recipe views, observation queries, and
  snapshots.

#### Scenario: Postgres observation is recorded
- **WHEN** runtime code records a recipe observation in the Postgres store
- **THEN** the store inserts or upserts into `framework_event.recipe_observation`
- **AND** can select observations by recipe, run, receipt, or observation kind.

#### Scenario: Implementations are compared
- **WHEN** equivalent observations are written to in-memory and Postgres-backed
  stores
- **THEN** their observable API semantics match.

### Requirement: SQL toolchain includes observations
The SQL route SHALL include `recipe_observation` in table declarations,
validation statements, and generated type/tooling paths.

#### Scenario: Static SQL route is validated
- **WHEN** `validateFrameworkRecipeReceiptSql` and statement validation run
- **THEN** they require and recognize `framework_event.recipe_observation`
- **AND** they reject legacy SQLite, Drizzle, or PgTyped substrate mentions as
  active route dependencies.

#### Scenario: SafeQL statements are generated
- **WHEN** SafeQL validation statements are listed
- **THEN** at least one statement validates common recipe observation lookup.

#### Scenario: Kanel or Kysely route is inspected
- **WHEN** Kanel/Kysely declarations are inspected
- **THEN** the declared schemas and generated type paths include the observation
  table as part of the framework recipe receipt database.

### Requirement: LocalTimescale emits observations
LocalTimescale ManagedRecipe lifecycle behavior SHALL emit at least one recipe
observation through the shared store.

#### Scenario: LocalTimescale lifecycle runs
- **WHEN** LocalTimescale plan, apply, check, migration, SQL validation, Kanel
  generation, or SafeQL validation behavior completes
- **THEN** the lifecycle path emits one or more observations connected to the
  recipe ID and, where available, run or receipt identity.

#### Scenario: Alchemy provenance is available
- **WHEN** LocalTimescale observations include Alchemy or service lifecycle
  provenance
- **THEN** the provenance is stored in receipt or observation payload JSON
- **AND** no new Alchemy-specific database columns are required until query
  pressure proves they are needed.

### Requirement: Observation payloads cover shared projection uses
Recipe observations SHALL be generic enough for Alchemy state, toolchain
events, policy findings, generated freshness, fuzzer summaries, Tend commands,
OpenCode session events, and SQL validation results.

#### Scenario: Product-specific observation is proposed
- **WHEN** a package wants to add a specialized observation table before using
  generic recipe observations
- **THEN** the design requires the package to first model the data as a recipe
  observation or explain why generic observations cannot satisfy the query.
