## ADDED Requirements

### Requirement: ARS scope is the architecture substrate migration

ARS SHALL define and validate the narrowed architecture migration from legacy
substrate lanes to Recipe/ManagedRecipe, Effect Alchemy lifecycle, local
TimescaleDB/Postgres, Kanel/Kysely/SafeQL, and Tend/OpenCode token control.

#### Scenario: In-scope work is evaluated
- **WHEN** ARS work is planned or validated
- **THEN** it is limited to architecture substrate migration, local database
  lifecycle, SQL typing/validation route, Tend receipt consumption, package
  recipe declaration migration, and legacy substrate cleanup
- **AND** it does not require full product behavior behind every recipe.

#### Scenario: Completion is claimed
- **WHEN** an agent or task claims ARS completion
- **THEN** the claim is based on implemented substrate behavior and validation
  evidence
- **AND** active legacy substrate lanes have been removed, archived,
  quarantined, or explicitly historical with no compatibility adapter path
- **AND** planning text alone is not treated as completion.

### Requirement: Full product and platform outcomes are non-goals

ARS SHALL NOT claim that the full Attune product loop, full UI, full Canopy
deployment, full Joern proof catalog, or long fuzzer campaigns are complete.

#### Scenario: Product loop work is referenced
- **WHEN** discovery, Pi, FoldKit, Joern, Canopy, or report behavior is
  referenced by ARS
- **THEN** it is represented only as recipe declaration/substrate migration work
  unless a narrow substrate validation requires a small behavior slice
- **AND** full product behavior is deferred to a separate follow-up spec.

#### Scenario: Expensive proof or deploy work is requested
- **WHEN** live Kubernetes apply, production Canopy rollout, full proof catalog
  generation, or long fuzzer/container campaigns are needed
- **THEN** the work is tracked outside ARS in a follow-up spec or explicit
  future task
- **AND** ARS validation does not depend on those expensive workloads.

### Requirement: Recipe is the top-level framework ontology

The framework SHALL model durable derivation, validation, repair, proof,
report, and execution work as typed Recipes.

#### Scenario: Clean fork package migration is evaluated
- **WHEN** an active Nx or package project remains in the ARS tree
- **THEN** its domain, workflow, validation, lifecycle, or quarantine behavior
  is expressed maximally as Recipes or ManagedRecipes
- **AND** compatibility adapters to old substrate lanes are not accepted as a
  substitute for recipe-shaped declarations.

#### Scenario: Recipe is declared
- **WHEN** a framework-governed pipeline is specified
- **THEN** it is expressed as typed input to Effect execution to typed output
- **AND** it declares dependencies, receipts, diagnostics, repairs, and health.

#### Scenario: Program facts are represented
- **WHEN** projects, source files, symbols, schema descriptors, generated
  outputs, observations, proofs, traces, or events are needed
- **THEN** they are modeled as Recipe inputs, outputs, observations, receipts,
  diagnostics, repairs, health views, or projections
- **AND** the old program-index entity list is not treated as the top-level
  architecture.

#### Scenario: Code generation pipeline is represented
- **WHEN** CocoIndex adapters or tools, Joern bindings or proof templates, Nx
  generated project shapes, Kanel SQL types, policy rules, or package artifacts
  are generated
- **THEN** the pipeline is modeled as a Recipe or ManagedRecipe with typed
  inputs, generated outputs, dependencies, diagnostics, repair plans, receipts,
  and validation evidence
- **AND** raw generator metadata, artifact ownership shards, or package-local
  generated companions are not treated as a separate active ontology.

#### Scenario: Side effects are bounded
- **WHEN** Recipes and projections are specified
- **THEN** declarations are pure
- **AND** `fromRecipe` translations are pure where practical
- **AND** Planner services read the world
- **AND** Runner services change the world
- **AND** Health explains the world.

### Requirement: ManagedRecipe models lifecycle and stateful outputs

Lifecycle/stateful outputs SHALL be modeled as ManagedRecipes with Effect
Alchemy as the lifecycle/state substrate.

#### Scenario: Stateful output is declared
- **WHEN** the output has lifecycle or observed state
- **THEN** the spec uses ManagedRecipe
- **AND** includes plan, apply/run, check, destroy/prune, observed state, drift
  diagnostics, repair plans, and receipt semantics.

#### Scenario: Alchemy relationship is explained
- **WHEN** ManagedRecipe behavior is implemented
- **THEN** Alchemy provider/resource behavior supplies lifecycle and state
  semantics
- **AND** all Alchemy resources can be modeled as ManagedRecipe outputs
- **AND** not all Recipes are Alchemy resources.

### Requirement: Local TimescaleDB/Postgres is a ManagedRecipe route

Local TimescaleDB/Postgres SHALL be managed through the Recipe kernel lifecycle
before it is exposed through public workflow targets.

#### Scenario: Local database is started
- **WHEN** Attune needs local durable receipt, diagnostic, repair, health,
  migration, or Tend data
- **THEN** the local database is modeled as `LocalTimescaleManagedRecipe`
- **AND** Nix, Arion, or nix2container service closure behavior stays behind
  the ManagedRecipe/Alchemy boundary
- **AND** readiness checks, migration application, type generation, SQL
  validation, and receipts are lifecycle steps.

#### Scenario: Real local database lifecycle is exercised
- **WHEN** ARS completion is evaluated
- **THEN** a real local TimescaleDB/Postgres service has been planned, applied,
  checked, destroyed, and pruned through `LocalTimescaleManagedRecipe`
- **AND** Arion service rendering and nix2container image or closure selection
  are implementation details behind the ManagedRecipe/Effect Alchemy boundary
- **AND** static migration files, generated config, or unit fakes alone are not
  sufficient completion evidence.

#### Scenario: Generic first tables are created
- **WHEN** the first TimescaleDB/Postgres migrations are applied
- **THEN** the first tables model generic recipe declarations, recipe edges,
  recipe IO descriptors, runs, receipts, diagnostics, repairs, health views,
  Tend event envelopes, token metrics, and outbox rows
- **AND** product-specific tables are added only after the generic receipt and
  observation spine exists.

#### Scenario: Every package emits into the database spine
- **WHEN** an active package exposes Recipes or ManagedRecipes
- **THEN** its recipe declarations, dependency edges, IO descriptors, runs,
  receipts, diagnostics, repairs, and health state are emit-ready for the
  generic TimescaleDB/Postgres spine
- **AND** package-local declarations remain source declarations rather than
  private durable truth
- **AND** package-specific durable tables are not introduced before the generic
  recipe and observation spine can represent the package facts.

#### Scenario: Public execution is exposed
- **WHEN** Nx exposes database lifecycle commands
- **THEN** the targets project ManagedRecipe lifecycle actions
- **AND** Nx does not become a parallel source of truth for long-lived service
  behavior.

### Requirement: SQL route uses Kanel, Kysely, SafeQL, and Effect services

The durable SQL implementation route SHALL be migrations to TimescaleDB/Postgres
to Kanel schema type generation to Kysely typed query services to SafeQL raw SQL
validation to Effect service exports.

#### Scenario: Database types are needed
- **WHEN** recipe receipt or Tend tables are represented in TypeScript
- **THEN** Kanel owns the generated schema/type route when available
- **AND** handwritten Kysely database types are temporary bootstrap scaffolding
  only when a blocker is recorded.

#### Scenario: Raw SQL is authored
- **WHEN** migrations, hypertables, views, or handwritten queries are added
- **THEN** SafeQL validates the raw SQL boundary
- **AND** Kysely services expose typed query behavior through Effect services.

#### Scenario: Legacy DB substrates are encountered
- **WHEN** SQLite, Drizzle, or PgTyped paths appear in active ARS work
- **THEN** they are treated as historical, archived, quarantined, or removal
  candidates
- **AND** no live compatibility adapter is maintained for them as an ARS
  substrate.

### Requirement: Tend consumes recipe receipts for OpenCode control

Tend SHALL build agent execution discipline and token/control behavior on top
of recipe receipts, TimescaleDB/Postgres facts, and OpenCode observations.

#### Scenario: OpenCode event is recorded
- **WHEN** OpenCode emits session, tool, command, validation, or token events
- **THEN** Tend decodes them into typed observations and event envelopes
- **AND** projects them into recipe receipts rather than a parallel ontology.

#### Scenario: Control packet is produced
- **WHEN** Tend evaluates execution control
- **THEN** it can produce long-job registry updates, Magic Context policy
  decisions, OpenRTK compression packets, resume/wakeup packets, and token audit
  reports
- **AND** those outputs reference recipe receipts or Tend event facts.

#### Scenario: OpenCode extension forces Tend tools
- **WHEN** OpenCode sessions, tool calls, command output, context selection,
  compression, long jobs, wakeups, or token reports are produced
- **THEN** the OpenCode extension routes those decisions through Tend, Magic
  Context, and OpenRTK contracts
- **AND** direct bypasses are represented as Tend policy violations.

#### Scenario: Codex adapter is designed later
- **WHEN** Codex integration is implemented after ARS
- **THEN** it uses the same Tend/OpenRTK/Magic Context forcing surface as
  OpenCode
- **AND** ARS does not need to implement the Codex transport adapter.

#### Scenario: Token metrics are reported
- **WHEN** Tend produces token-control reports
- **THEN** reports include tokens per accepted repair, tokens per valid diff,
  search calls per repair, broad `rg` calls per session, validation commands
  per accepted diff, manual generated-file edit attempts, long-job polling
  tokens, OpenRTK compression estimates, and Magic Context retained/dropped
  estimates.

### Requirement: Package migration is recipe-shaped, not product-complete

Packages SHALL expose domain declarations through Recipes or ManagedRecipes
without requiring full product behavior in ARS.

#### Scenario: Package owns domain logic
- **WHEN** an active framework or package module owns domain logic
- **THEN** it exposes or is migrated toward recipe declarations with typed
  inputs, outputs, dependencies, validation evidence, and receipt behavior
- **AND** full product execution remains out of scope unless needed for a
  narrow substrate validation.

#### Scenario: Package recipe facts are materialized
- **WHEN** package recipe declarations are validated or executed
- **THEN** the package emits recipe rows, dependency edges, expected IO rows,
  run rows, receipt rows, diagnostics, repair plans, and health projections into
  the shared database route
- **AND** downstream tools consume those shared recipe facts instead of
  package-local generated companions, artifact ownership shards, or private
  package-specific status ledgers.

#### Scenario: Package owns generated artifacts
- **WHEN** a package owns generators, generated bindings, generated proof
  templates, generated tools, generated SQL/schema types, or generated policy
  artifacts
- **THEN** those derivation pipelines are exposed as Recipes or ManagedRecipes
- **AND** the recipe abstraction is the agent-facing contract for rerun,
  validate, repair, health, and receipts.

#### Scenario: Stateful package behavior is represented
- **WHEN** a package models lifecycle, platform resources, workers, fuzzer
  runtimes, local DB, or OpenCode/Tend control state
- **THEN** it uses ManagedRecipe declarations and lifecycle receipts
- **AND** live infrastructure mutation or expensive execution is not required
  for ARS completion.

### Requirement: Legacy substrate lanes have no active compatibility path

ARS SHALL remove, archive, quarantine, or replace superseded substrate lanes
instead of maintaining them as live compatibility inputs.

#### Scenario: Legacy cleanup underpins the migration
- **WHEN** ARS is implemented as a clean fork
- **THEN** legacy cleanup is one of the migration deliverables that proves the
  new substrate owns the workflow
- **AND** old public targets, adapters, generated ledgers, package-local
  companions, source metadata, tests, and import paths are not maintained as a
  parallel compatibility substrate.

#### Scenario: Legacy cleanup is evaluated
- **WHEN** ARS migration status is evaluated
- **THEN** legacy cleanup is treated as required migration work, not deferred
  polish
- **AND** active SQLite/Drizzle/PgTyped routes, program-index-first public
  targets, package-local generated companions, artifact-ownership shards,
  compatibility re-exports, and tests that require old substrate truth block
  ARS completion unless they are removed or moved behind explicit quarantine
  recipes.

#### Scenario: Old generated or ontology surface is encountered
- **WHEN** package-local generated companions, artifact ownership shards,
  program-index-first labels, old source metadata labels, or old DB substrate
  paths are encountered
- **THEN** they are handled as deletion, quarantine, archive, or
  framework-owned recipe/projection replacement work
- **AND** no runtime materializer, diagnostic path, policy allowance, or test
  treats them as live compatibility rows, metadata, or adapter inputs.

#### Scenario: Historical context remains useful
- **WHEN** an old document or module is kept for reference
- **THEN** it is clearly marked historical, quarantine, or follow-up context
- **AND** active agents are directed to the Recipe/ManagedRecipe substrate as
  the public model.

### Requirement: Nx and Nix project recipes into public workflows

Nx SHALL remain the public workflow surface and Nix SHALL supply reproducible
toolchains and runtime closures behind recipe projections.

#### Scenario: Recipe has executable work
- **WHEN** a Recipe has check, repair, typecheck, test, build, proof, report,
  or DB lifecycle work
- **THEN** public Nx targets are projected from the Recipe or ManagedRecipe
- **AND** receipts record command invocation, output summaries, hashes where
  useful, and validation evidence.

#### Scenario: Runtime closure is required
- **WHEN** a Recipe or ManagedRecipe needs tools, containers, services, Joern
  workers, TimescaleDB, or fuzzer runtimes
- **THEN** Nix, Arion, or nix2container supplies the closure or service
  substrate
- **AND** lifecycle state remains modeled by ManagedRecipe and Effect Alchemy.

#### Scenario: Local database closure is projected
- **WHEN** the local TimescaleDB/Postgres recipe is exposed to agents or Nx
  targets
- **THEN** the public command projects ManagedRecipe lifecycle actions such as
  plan, apply, check, destroy, prune, migrate, generate types, and validate SQL
- **AND** Arion and nix2container details are recorded as recipe evidence
  rather than becoming a second public lifecycle abstraction.

### Requirement: ARS validation is bounded and explicit

ARS validation SHALL use OpenSpec validation, targeted unit/type/export checks,
small behavior checks, and Nx-owned policy targets that prove the substrate
slice.

#### Scenario: Expensive validation is available
- **WHEN** long fuzzer, container, proof, or live platform validation could be
  run
- **THEN** ARS treats it as future explicit recipe/Nx target work with receipts
- **AND** does not require it for architecture migration completion.

#### Scenario: Validation cannot run
- **WHEN** a required validation command cannot run in the current environment
- **THEN** the attempted command, failure reason, and remaining blocker are
  recorded
- **AND** the related task remains unchecked unless the blocker is explicitly
  environmental and the implementation evidence is otherwise complete.
