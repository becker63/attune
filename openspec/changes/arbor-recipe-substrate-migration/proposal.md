# Arbor Recipe Substrate Migration

## Why

Attune has too many active OpenSpec planning surfaces describing overlapping parts of the same migration: program-index substrate work, package check/repair, TimescaleDB/Postgres migration, Tend/OpenCode control, Trellis agent guidance, Effect Alchemy lifecycle, Joern/fuzzer proof work, Dispatch/FoldKit product surfaces, and Linear work-ledger planning.

The durable architecture has compressed around one smaller primitive:

```text
Framework is a typed recipe graph over Effect and Alchemy, projected into Nx/Nix for execution and into TimescaleDB/Postgres for receipts, diagnostics, repair, health, and agent/editor legibility.
```

This change replaces the old program-index-first planning ontology with a Recipe/ManagedRecipe substrate. Program facts still exist, but they are recipe inputs, outputs, observations, receipts, diagnostics, repairs, health views, and projections rather than the top-level architecture.

## What Changes

This change creates the single active migration plan for the workstream:

```text
openspec/changes/arbor-recipe-substrate-migration/
```

The migration defines:

- `Recipe`: typed input -> Effect execution -> typed output, with dependencies, receipt, diagnostics, repair, and health.
- `ManagedRecipe`: a Recipe with lifecycle/state semantics: plan, apply/run, check, destroy/prune, observed state, and drift repair.
- `Receipt`: durable evidence that a recipe ran, what it saw, what it produced, and how it ended.
- `Diagnostic`: typed health or validation finding derived from recipe facts and receipts.
- `Repair`: a typed action proposal derived from diagnostics and planner state.
- `Health`: the read-side explanation of clean, stale, failed, blocked, drifted, or superseded state.
- `Planner`: effectful service that reads the world.
- `Runner`: effectful service that changes the world.
- `Trellis`: a recipe-aware LSP/MCP/editor-agent companion.

Effect runs recipes. Alchemy manages lifecycle recipes. Nx schedules recipes. Nix supplies tools and runtime closures. TimescaleDB/Postgres records receipts and history. Trellis exposes recipe legibility to agents/editors. Tend controls agent execution and token discipline.

## Scope

In scope:

- Consolidate all active migration OpenSpec changes into this one normal change.
- Rewrite old program-index, package-surface, Tend, Trellis, Alchemy, Joern/fuzzer, Dispatch/FoldKit, Canopy, TimescaleDB, and Linear planning through Recipe/ManagedRecipe language.
- Preserve old task and issue intent in this change's `tasks.md`.
- Migrate existing Linear references into final ARS task references without treating Linear as runtime truth.
- Delete superseded active OpenSpec change folders after their content is represented here.
- Remove compatibility-maintenance lanes for old program-index/generated-companion/artifact-ownership surfaces; old surfaces may be deleted, quarantined, archived, or replaced, but not adapted as live inputs.

Out of scope:

- Package implementation source changes.
- Compatibility adapters for superseded program-index-first, SQLite/Drizzle/PgTyped, generated companion, or artifact ownership surfaces.
- Physical package moves.
- DB migration SQL implementation.
- Tend runtime implementation.
- Trellis LSP implementation.
- Alchemy provider implementation.
- Expensive fuzzer/container/proof workloads.
- Generated artifact mutation.

## Simplicity For A Single Developer

The new substrate reduces the mental model from many bespoke ontologies to one reusable loop:

```text
declare Recipe
project with fromRecipe
plan against current world
run through Effect/Nx/Nix
write receipts
derive diagnostics, repairs, and health
surface through Trellis, Tend, reports, and Linear
```

The language service becomes feasible because it only needs to understand declaration, input/output, ownership, receipt, diagnostic, repair, and health semantics. Domain packages can stay small and source-facing while framework services own cache, receipt, and projection materialization.

## Supersession Intent

All old active OpenSpec changes feeding this migration are superseded by this change once validation passes. Their durable intent is preserved in this proposal, `design.md`, `tasks.md`, and the single delta spec. Their folders are deleted so the repository does not keep parallel active plans.

Linear remains an external human projection target. It may mirror tasks, comments, PR links, and validation evidence, but it is not a DB domain and it is not implementation truth.

## Success Criteria

- `arbor-recipe-substrate-migration` is the only active migration OpenSpec change for this workstream.
- The final change defines Recipe, ManagedRecipe, Receipt, Diagnostic, Repair, Health, Planner, Runner, and Trellis/LSP integration.
- Effect Alchemy is defined as the lifecycle/state substrate for ManagedRecipe.
- Nx, Nix/Arion, TimescaleDB/Postgres, Kanel, Kysely, SafeQL, and Effect services are placed around Recipe.
- The old program-index-first ontology is replaced by recipe-backed program facts and recipe projections.
- No compatibility row/materializer/adapter lane is maintained for superseded generated companions, artifact ownership shards, SQLite/Drizzle/PgTyped paths, or program-index-first ontology.
- Existing Linear issue references are represented in final ARS task blocks and projected externally where connector access permits.
- No package implementation source is changed by the bootstrap consolidation.
- Superseded old OpenSpec change folders and the bootstrap artifact are deleted after validation.
