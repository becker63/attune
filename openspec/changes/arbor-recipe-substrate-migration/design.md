# Design

## Context

ARS is the active OpenSpec change for the narrowed overnight architecture
migration. It is not a product-completion plan. Git remains source truth, this
OpenSpec change remains planning truth, and future recipe receipts in
TimescaleDB/Postgres become runtime/control evidence after implementation.

The current repository already has a useful but incomplete recipe kernel slice
around protocol declarations, runtime kernel/receipt store, Alchemy bridging,
SQL migration text, Nx/language-service projections, package recipe examples,
and Tend recipe examples. This design sharpens that work into one substrate
route instead of preserving several parallel ontologies.

## Agent Compaction Anchor

If this implementation thread compacts, preserve this instruction as active
scope: ARS is an aggressive clean-fork migration. Do not maintain compatibility
lanes for the old Pi/Tend experiment, program-index-first public ontology,
SQLite/Drizzle/PgTyped substrate route, package-local generated companions, or
artifact-ownership shards. Every active Nx/package project must be expressed
maximally in terms of the framework Recipe or ManagedRecipe abstraction, with
stateful work modeled as ManagedRecipe plus Effect Alchemy lifecycle. Legacy
surfaces may remain only as deleted, archived, quarantined, or explicitly
historical context with no live adapter path.

Legacy cleanup is part of the migration, not a follow-up nicety. ARS cannot be
called complete while active policy targets, tests, imports, generated
companions, SQLite/Drizzle/PgTyped routes, program-index materializers, or
artifact-ownership shards still function as compatibility substrates. Any
remaining legacy reference must be removed, moved behind a named quarantine
recipe, or documented as historical/deferred with no public runtime or agent
workflow depending on it.

Code generation is not an exception. CocoIndex adapter/tool generation, Joern
generated bindings and proof-template generation, Nx generators, SQL/Kanel type
generation, policy-rule generation, and package artifact generation all belong
as Recipes or ManagedRecipes with typed inputs, outputs, dependencies, receipts,
diagnostics, repairs, and validation evidence.

The database route is the migration pressure test, not an optional artifact
exercise. Static migration text, generated config, or unit fakes are not enough
to declare ARS complete. A real local TimescaleDB/Postgres service must be
planned, applied, checked, destroyed, and pruned through
`LocalTimescaleManagedRecipe`, with Arion and nix2container supplied by Nix
behind the ManagedRecipe/Effect Alchemy boundary. The first durable tables must
stay deliberately generic: recipe declarations, edges, IO descriptors, runs,
receipts, diagnostics, repairs, health, Tend event envelopes, token metrics,
and outbox rows before any product-specific schema expansion.

Every active package participates in that pressure. A package recipe declaration
is incomplete until the package can emit its recipe facts, dependency edges,
expected IO, runs, receipts, diagnostics, repairs, and health state into the
generic TimescaleDB/Postgres spine. Package-local `recipes.ts` files are source
declarations; the DB is the shared runtime/control projection. Packages must
not invent private durable tables or keep package-local generated companions as
the observable truth when the generic recipe spine can carry the fact.

## Goals / Non-Goals

**Goals:**

- Make Recipe/ManagedRecipe the architecture substrate.
- Make Effect Alchemy the lifecycle/state substrate for ManagedRecipe.
- Manage local TimescaleDB/Postgres through that lifecycle.
- Wire the durable SQL route through migrations, Kanel, Kysely, SafeQL, and
  Effect service exports.
- Make Tend/OpenCode consume recipe receipts and observations for execution
  discipline and token control.
- Migrate package-facing domain declarations to recipes without requiring full
  product behavior.
- Express code generation and generated artifact pipelines as recipes rather
  than side-channel generator metadata.
- Complete legacy cleanup as required migration work: remove, archive, or
  quarantine legacy substrate lanes rather than maintaining compatibility
  adapters.

**Non-Goals:**

- Full Attune Discovery product loop implementation.
- Full FoldKit workbench product or UI.
- Full Canopy production deployment or live Kubernetes apply.
- Full Joern proof catalog.
- Long fuzzer, container, or proof campaigns.
- Production SaaS, public reporting polish, or marketing surface.
- Package moves unrelated to the substrate migration.

## Overnight Migration Architecture

The canonical ARS architecture path is:

```text
Recipe declaration
  -> RecipeRegistry
  -> Planner
  -> Runner
  -> ReceiptStore
  -> TimescaleDB/Postgres
  -> Health/Diagnostics/Repairs
  -> Nx/Trellis/Tend/FoldKit projections
```

Recipe declarations stay pure. `fromRecipe` projections stay pure where
possible. Planner services read the world. Runner services change the world.
ReceiptStore records evidence. Health, diagnostics, and repairs explain state
to Nx, Trellis, Tend, FoldKit, and agents.

## ManagedRecipe Lifecycle

Stateful or lifecycle-bearing outputs use ManagedRecipe:

```text
ManagedRecipe
  -> Effect Alchemy provider/resource
  -> plan
  -> apply/run
  -> check
  -> destroy/prune
  -> observed state
  -> drift diagnostic
  -> repair plan
  -> receipt
```

ManagedRecipe is the bridge between pure recipe declaration and lifecycle
resources. All Alchemy resources can be modeled as ManagedRecipe outputs, but
not every Recipe is an Alchemy resource.

## Local Database Route

Local TimescaleDB/Postgres is kernel-owned lifecycle work, not an ad hoc
developer service:

```text
LocalTimescaleManagedRecipe
  -> Nix/Arion/nix2container service closure
  -> readiness check
  -> migration apply
  -> Kanel generation
  -> Kysely service compile
  -> SafeQL validation
  -> receipt
```

Nix, Arion, and nix2container may implement the service substrate, but they sit
behind the ManagedRecipe/Alchemy boundary. Nx targets expose lifecycle actions
as public workflow projections; they do not become a separate long-lived service
ontology.

This route is the concrete pressure on the migration. The first live spin-up
must exercise the actual service closure:

```text
LocalTimescaleManagedRecipe.plan
  -> build or select nix2container Timescale/Postgres image closure
  -> render Arion service definition
  -> apply service lifecycle through Effect Alchemy
  -> wait for readiness with bounded diagnostics
  -> apply generic migrations
  -> verify generic tables and Timescale hypertables
  -> run Kanel generation
  -> compile Kysely query services
  -> run SafeQL raw SQL validation
  -> write lifecycle and validation receipts
  -> destroy/prune through the same ManagedRecipe boundary
```

Static SQL validation remains useful, but it is not a substitute for this live
managed lifecycle check. If the local environment cannot run the service, the
blocker must be recorded as an environment blocker with the exact Nx target and
ManagedRecipe action attempted.

The first durable DB spine is generic:

```text
framework_core.recipe
framework_core.recipe_edge
framework_core.recipe_io
framework_event.recipe_run
framework_event.recipe_receipt
framework_event.recipe_diagnostic
framework_event.recipe_repair
framework_view.recipe_health
framework_view.repair_plan
```

Every package emits into that spine. The minimum package emission path is:

```text
package src/recipes.ts
  -> WorkspaceRecipeRegistry
  -> register recipe rows and dependency edges
  -> register expected input/output descriptors
  -> record plan/run/receipt rows for package checks and repairs
  -> record diagnostics, repairs, and health views
  -> Tend/OpenCode/reporting reads the shared receipt spine
```

Domain tables may follow after the recipe receipt spine exists. Active DB
families are bounded to `framework_*`, `attune_*`, `tend_*`, and `canopy_*`.
Linear remains an external human projection. Generic `artifact_*` schema
families are not an ARS database domain.

## Tend Route

Tend is the first real consumer of the recipe receipt substrate:

```text
OpenCode session/tool/command observations
  -> Tend event envelope
  -> Tend recipe receipt projection
  -> long-job registry
  -> Magic Context policy decision
  -> OpenRTK compression packet
  -> resume/wakeup packet
  -> token audit report
```

Tend records session, tool, command, validation, token, long-job, policy,
compression, resume, and wakeup facts as typed observations and receipts. It
must not invent a parallel execution ontology when RecipeReceipt and the local
TimescaleDB/Postgres route can carry the evidence.

Tend lives under the first-class `tend/packages/*` workspace root in ARS. The
old Pi-agent Tend experiment is deleted rather than preserved as a
compatibility lane. OpenCode is the first forcing harness: its extension must
route session observation, tool choice, command output compression, Magic
Context selection/compaction, OpenRTK packets, long-job registration, wakeups,
and token reporting through Tend tools. Future Codex integration is not
implemented by ARS, but the OpenCode extension contracts must be shaped so a
Codex adapter can be forced through the same Tend/OpenRTK/Magic Context policy
surface instead of creating a bypass.

Required metrics include:

- tokens per accepted repair,
- tokens per valid diff,
- search calls per repair,
- broad `rg` calls per session,
- validation commands per accepted diff,
- manual generated-file edit attempts,
- long-job polling tokens,
- OpenRTK compression estimates,
- Magic Context retained/dropped context estimates.

## Decisions

### Recipe is the top-level ontology

Program facts, generated outputs, observations, traces, proofs, events,
diagnostics, repairs, and health all attach to recipes as inputs, outputs,
receipts, or projections. The old program-index-first entity list is historical
context, not the active architecture.

Alternative considered: keep program-index-first and adapt recipes into it.
Rejected because it preserves two public models and keeps package agents
reasoning about generated companions and compatibility rows instead of the
recipe graph.

### Code generation is recipe work

Generated bindings, generated adapters, generated SQL types, generated policy
rules, generated proof templates, and generated package artifacts are specified
as Recipes or ManagedRecipes. Generators may still be the implementation
mechanism behind an Nx target, but the public semantic unit is the recipe: typed
input, generated output, dependencies, diagnostics, repair plan, receipt, and
validation evidence.

Alternative considered: keep code generation as raw generator metadata plus
artifact ownership shards. Rejected because the original point of Recipe is to
make derivation pipelines agent-legible without a parallel generated-artifact
ontology.

### ManagedRecipe owns lifecycle

Stateful resources such as local TimescaleDB, service runtimes, platform
resources, worker pools, and Tend/OpenCode control surfaces use ManagedRecipe
plus Effect Alchemy lifecycle semantics.

Alternative considered: expose long-lived local services directly as Nx/Arion
commands. Rejected because service state, drift, destroy/prune, and repair need
typed receipts and lifecycle health, not command-only convention.

### SQL route is migrations to Kanel to Kysely to SafeQL

The durable SQL route is migration-first and Postgres/TimescaleDB-first. Kanel
owns generated TypeScript schema types, Kysely owns typed query services,
SafeQL validates raw SQL, and Effect services export the runtime API.

Alternative considered: continue SQLite/Drizzle/PgTyped compatibility. Rejected
for ARS because it would keep the old substrate alive and split receipt truth.

### Package migration is declaration-first

Packages should expose domain logic as recipe declarations with typed inputs,
outputs, dependencies, and validation evidence. They do not need to implement
the complete product behavior behind those declarations in this ARS change.

Alternative considered: finish every product domain while migrating package
declarations. Rejected because it couples the overnight substrate migration to
unbounded product work.

### Product and platform completion moves to follow-up specs

Discovery product behavior, FoldKit UI, Canopy live deploy, full Joern proof
catalog, and long fuzzer campaigns are deferred unless a narrow substrate test
requires a tiny slice.

Alternative considered: keep those as ARS completion criteria. Rejected because
it made the task ladder impossible to validate honestly.

## Migration Plan

1. Rewrite and validate ARS planning artifacts with the narrowed scope.
2. Harden Recipe/ManagedRecipe protocol and runtime kernel APIs.
3. Implement local TimescaleDB/Postgres as a ManagedRecipe lifecycle resource.
4. Wire migrations, Kanel, Kysely, SafeQL, and Effect service exports.
5. Project recipes and ManagedRecipes into Nx/Nix/Arion public targets.
6. Migrate packages to recipe declarations without finishing deferred products.
7. Build Tend/OpenCode on recipe receipts and local DB facts.
8. Remove, archive, or quarantine active legacy substrate lanes as mandatory
   ARS completion work.
9. Run the orchestrated validation and repair loop.

Rollback for the spec rewrite is reverting only these OpenSpec artifacts. Source
implementation phases must keep their own validation and rollback notes in the
phase that changes them.

## Risks / Trade-offs

- Scope drift into product completion -> keep hard non-goals in proposal, spec,
  and tasks.
- Partial existing recipe code is mistaken for completion -> tasks use Complete,
  Partial, Pending, and Deferred labels and only check boxes after validation.
- Local DB tooling is environment-sensitive -> provide unit contracts and gate
  DB integration tests with explicit environment flags.
- Generated SQL types tempt hand-authored permanent table shapes -> Kanel is
  the intended durable route; handwritten Kysely types are temporary scaffolding
  only when a blocker is recorded.
- Legacy code may still reference old substrate names -> quarantine or archive
  with justification rather than silently preserving compatibility.

## Open Questions

- Exact Nx target names for DB migrate, type generation, and SafeQL validation
  should follow repo conventions during implementation.
- The future Codex adapter transport is deferred, but its policy contract is
  not: it must route through the same Tend/OpenRTK/Magic Context forcing
  surface as OpenCode.
- Which legacy SQLite/program-index surfaces are deleted versus quarantined
  depends on what targeted validation and import-boundary checks reveal.
