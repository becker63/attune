## ADDED Requirements

### Requirement: Recipe substrate is the top-level framework ontology

The framework SHALL model durable derivation, validation, repair, proof, report, and execution work as typed Recipes.

#### Scenario: Recipe is declared
- **WHEN** a framework-governed pipeline is specified
- **THEN** it is expressed as typed input to Effect execution to typed output
- **AND** it declares dependencies, receipt, diagnostics, repair, and health.

#### Scenario: Program facts are represented
- **WHEN** program facts such as projects, source files, symbols, schema descriptors, generated outputs, observations, proofs, traces, or events are needed
- **THEN** they are modeled as Recipe inputs, outputs, observations, receipts, diagnostics, repairs, health views, or projections
- **AND** the old program-index entity list is not treated as the top-level architecture.

#### Scenario: Side effects are bounded
- **WHEN** Recipes and projections are specified
- **THEN** declarations are pure
- **AND** `fromRecipe` translations are pure where possible
- **AND** Planner reads the world
- **AND** Runner changes the world
- **AND** Health explains the world.

### Requirement: ManagedRecipe models lifecycle and stateful outputs

Lifecycle/stateful outputs SHALL be modeled as ManagedRecipes with Effect Alchemy as the lifecycle/state substrate.

#### Scenario: Stateful output is declared
- **WHEN** the output has lifecycle or observed state
- **THEN** the spec uses ManagedRecipe
- **AND** includes plan, apply/run, check, destroy/prune, observed state, drift diagnostics, and repair semantics.

#### Scenario: Alchemy relationship is explained
- **WHEN** ManagedRecipe is described
- **THEN** all Alchemy resources can be modeled as ManagedRecipe outputs
- **AND** not all Recipes are Alchemy resources
- **AND** Alchemy provides lifecycle/state semantics for ManagedRecipe.

### Requirement: Framework DB receipt spine is specified first

The first durable DB implementation SHALL start with a generic recipe receipt spine before domain-specific schemas.

#### Scenario: Core recipe tables are specified
- **WHEN** DB requirements are written
- **THEN** the spec includes `framework_core.recipe`, `framework_core.recipe_edge`, `framework_core.recipe_io`, `framework_event.recipe_run`, `framework_event.recipe_receipt`, `framework_event.recipe_diagnostic`, `framework_event.recipe_repair`, `framework_view.recipe_health`, and `framework_view.repair_plan`.

#### Scenario: Active DB families are bounded
- **WHEN** DB families are listed
- **THEN** only `framework_*`, `attune_*`, `tend_*`, and `canopy_*` are active DB families
- **AND** Linear is an external projection target
- **AND** generic `artifact_*` schema families are not active.

#### Scenario: SQL typing route is active
- **WHEN** SQL implementation work is planned
- **THEN** the route is SQL migrations to TimescaleDB/Postgres to Kanel schema type generation to Kysely typed query services to SafeQL raw SQL validation to Effect service exports
- **AND** SQLite, Drizzle, and PgTyped are treated only as historical or compatibility context.

### Requirement: Nx and Nix project Recipes into executable workflows

Nx SHALL schedule Recipes through public targets and Nix SHALL supply reproducible tools and runtime closures.

#### Scenario: Nx projection is generated
- **WHEN** a Recipe has an executable check, repair, typecheck, build, test, proof, or report action
- **THEN** `NxTarget.fromRecipe(recipe)` defines the public target shape
- **AND** receipts record command invocation, output summaries, and validation evidence.

#### Scenario: Nix runtime is needed
- **WHEN** a Recipe or ManagedRecipe needs reproducible tools, containers, services, Joern workers, TimescaleDB, or fuzzer runtimes
- **THEN** Nix/Arion supplies the closure or managed runtime substrate
- **AND** Nx remains the public command surface.

### Requirement: Trellis is recipe-aware LSP and agent companion

Trellis SHALL expose recipe legibility to editors, agents, and MCP-style clients.

#### Scenario: Editor asks for framework status
- **WHEN** a source file, generated output, or package declaration has recipe health
- **THEN** Trellis can surface ownership, stale state, failed receipts, affected downstream recipes, and code lenses.

#### Scenario: Agent needs repair guidance
- **WHEN** a recipe diagnostic has a repair
- **THEN** Trellis exposes a code action or agent hint with the exact Nx target and allowed edit boundary
- **AND** generated-file guards prevent manual edits to owned outputs.

### Requirement: Tend consumes recipe facts for execution discipline

Tend SHALL control agent execution and token discipline over recipe receipts, diagnostics, repairs, health, and Trellis hints.

#### Scenario: OpenCode event is recorded
- **WHEN** OpenCode emits session, tool, command, or validation events
- **THEN** Tend decodes them into typed observations and recipe receipts
- **AND** policy-heavy enforcement waits for the Tend DB v0 receipt model.

#### Scenario: Token metrics are reported
- **WHEN** Tend produces reports
- **THEN** reports include tokens per accepted repair, tokens per valid diff, search calls per repair, broad `rg` calls per session, validation commands per accepted diff, manual generated-file edit attempts, and long-job polling tokens.

### Requirement: Attune product loop is a recipe graph

The Attune product discovery loop SHALL be represented as executable, observable, repairable Recipes.

#### Scenario: Discovery pipeline is specified
- **WHEN** product discovery is planned
- **THEN** it is modeled as repo snapshot recipe to anchor retrieval recipe to motif family recipe to hypothesis recipe to Joern proof recipe to evidence scoring recipe to rule candidate recipe to deterministic rule recipe to report/review recipe.

#### Scenario: Pi and workbench artifacts are produced
- **WHEN** Pi, optimizer, workbench, scribe, or FoldKit outputs are planned
- **THEN** they are typed Recipe outputs with receipts and report projections.

### Requirement: Canopy platform work is ManagedRecipe-first

Canopy and platform lifecycle work SHALL use ManagedRecipe for stateful infrastructure and provider resources.

#### Scenario: Platform desired state is declared
- **WHEN** Canopy, Kubernetes, home compute, ThinkCentre, or provider lifecycle work is planned
- **THEN** it follows desired state to rendered resources to policy check to deploy plan to observed status to drift diagnostic to repair plan.

#### Scenario: Human review gate applies
- **WHEN** Rego, Nix, Kubernetes, scheduler/admission, worker safety, budget/lease, or app-server exposure work is planned
- **THEN** the ManagedRecipe includes a human review gate unless explicitly downgraded.

### Requirement: Joern, fuzzer, and proof work produce recipe evidence

Joern proof routing, corpus fuzzing, semantic mutation, and query reuse SHALL be bounded recipe evidence pipelines.

#### Scenario: Agent requests proof
- **WHEN** an agent needs proof evidence
- **THEN** it selects a bounded proof Recipe/template instead of authoring arbitrary Joern queries
- **AND** Joern output is normalized into observation packets and receipts.

#### Scenario: Fuzzer run needs resources
- **WHEN** a fuzzer run needs workers, containers, or Joern runtime state
- **THEN** it is modeled as a ManagedRecipe
- **AND** corpus seeds, mutation plans, admission checks, counterexamples, telemetry, and replay fixtures are recipe inputs/outputs.

### Requirement: FoldKit and report surfaces derive from recipes

Dispatch, FoldKit, MDX fixtures, workbench snapshots, and review surfaces SHALL be derived report/explanation Recipes.

#### Scenario: Workbench state is rendered
- **WHEN** event, atom, projection, proof, or report state is rendered
- **THEN** the render is derived from recipe receipts and typed outputs
- **AND** durable discovery truth is not hidden inside UI interaction state.

#### Scenario: Linear summary is posted
- **WHEN** a report needs a human-facing work update
- **THEN** it is projected to Linear as a comment or issue update
- **AND** OpenSpec/Git/receipt evidence remains canonical.

### Requirement: Linear is an external ARS task projection

The final `tasks.md` SHALL be canonical and Linear SHALL mirror it only as a human-facing projection.

#### Scenario: Existing Linear issue maps to active work
- **WHEN** a preexisting Linear issue describes still-active work
- **THEN** the final task ledger records its ATT reference under an ARS task
- **AND** the issue is updated or commented where connector access permits.

#### Scenario: Existing Linear issue is superseded
- **WHEN** a preexisting Linear issue describes superseded planning work
- **THEN** it receives or is assigned a replacement ARS reference
- **AND** no duplicate issue is created for the same work.

#### Scenario: Linear connector is unavailable
- **WHEN** Linear MCP/API access is unavailable
- **THEN** final tasks use `Linear: pending-mcp-unavailable`
- **AND** a remaining task records the required external migration
- **AND** the agent does not invent Linear evidence.

### Requirement: Superseded active changes are removed after migration

Old active OpenSpec change folders SHALL be deleted only after their content is represented in this final change.

#### Scenario: Old content is represented
- **WHEN** an old change's proposal, design, specs, tasks, custom ledgers, and Linear references have been represented in the final change
- **THEN** the old change folder may be deleted.

#### Scenario: Old content is not represented
- **WHEN** an old change has unmigrated or contradictory content
- **THEN** the old change folder must remain until the conflict is resolved.

#### Scenario: Final active surface is checked
- **WHEN** deletion completes
- **THEN** `find openspec/changes -mindepth 1 -maxdepth 1 -type d -not -name archive -not -name arbor-recipe-substrate-migration -print` prints nothing.

### Requirement: Bootstrap performs no implementation work

This consolidation SHALL not modify package implementation source, generated artifacts, DB migration implementation, or runtime code.

#### Scenario: Source files would be edited
- **WHEN** an edit is proposed under package source directories, runtime implementation directories, generated artifacts, or DB migration implementation
- **THEN** the edit is rejected unless it is only deleting superseded OpenSpec planning files.

#### Scenario: Validation runs
- **WHEN** validation is run
- **THEN** it uses OpenSpec status/validate, grep/status evidence, and cheap planning checks
- **AND** it does not run expensive container, fuzzer, proof, or platform workloads.
