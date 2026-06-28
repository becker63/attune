## Why

Attune is far enough through the ARS cleanup to reintroduce a stronger
deterministic pressure layer without preserving the old overgrown surfaces.
The repo already has Recipes, ManagedRecipes, an Effect Alchemy bridge shape,
generic `framework_*` receipt schemas, SQL tooling declarations, and a small
Trellis oxlint policy package; this change makes those pieces executable as one
architecture instead of letting scripts, `project.json`, private ledgers, and
unowned generated files drift back into being source truth.

The goal is not a stylistic lint pass. The goal is an aggressive clean fork
where Recipes and ManagedRecipes declare meaning, Effect Alchemy owns lifecycle
execution, `framework_core`, `framework_event`, and `framework_view` store
durable receipts and projections, and effect-oxlint-backed Trellis policy keeps
agents on that substrate.

## What Changes

- `packages/trellis/oxlint-policy` becomes a real Attune/Trellis policy pack
  authored with `effect-oxlint`, with deterministic rules and tests for:
  `attune/no-public-script-workflow`,
  `attune/recipe-owned-nx-target`, `attune/no-private-ledger`,
  `attune/managed-recipe-requires-substrate`,
  `attune/generated-artifact-owned-by-recipe`, and
  `attune/no-raw-pg-outside-runtime`.
- ManagedRecipe lifecycle behavior is aligned around the existing Effect
  Alchemy substrate. The implementation must strengthen or thinly adapt the
  current `ManagedRecipeAlchemy` and lifecycle provider surfaces rather than
  inventing a new ManagedResource runtime, scheduler, diff engine, or observed
  state store.
- The generic receipt spine is extended with
  `framework_event.recipe_observation` while preserving the settled
  `framework_core`, `framework_event`, and `framework_view` schema names.
  Effect Schema, in-memory storage, Postgres storage, snapshots, SQL
  validation, and Kanel/Kysely/SafeQL route declarations must all understand
  observations.
- LocalTimescale/Postgres lifecycle work emits recipe observations connected to
  recipe runs and receipts, with Alchemy provenance carried in receipt or
  observation payloads before adding any Alchemy-specific DB columns.
- A typed ProjectionRegistry is introduced as the place recipes declare how
  they render into subsystem views. This change must implement the Nx target
  projection/conformance path and design for later LSP, FoldKit, Tend, and docs
  projections without turning projections into a runtime scheduler.
- RecipeInvocation is introduced or formalized as the stable operation envelope
  for Nx executors, typed CLI entrypoints, tests, LSP actions, Tend/OpenCode
  integration, and policy checks. Its action vocabulary must be Effect
  Schema-backed rather than loose string dispatch.
- Package-local scripts are removed from live workflow surfaces after behavior
  moves into typed source modules. Behavior currently hiding in scripts such as
  Trellis runtime DB
  generation stages, CocoIndex generation stages, architecture audits, wrapper
  generation, and fuzzer runners must move into typed source modules,
  recipes, projections, or Alchemy-backed lifecycle adapters.
- Public Nx targets stop acting as an independent workflow ontology. They must
  be recipe-owned, projection-owned, or explicitly internal with a public parent
  surface.
- Tend tables and stores remain only as specialized projections or operational
  views linked back to recipe, run, receipt, or observation identity where
  relevant; Tend must not become a second ledger.
- Generated artifact ownership is enforced before path churn. Generated files
  and directories must have visible recipe/projection ownership and generation
  or freshness receipts before any broad relocation.
- **BREAKING**: unowned workflow scripts, orphan public Nx targets, private
  ledgers without recipe-spine linkage, decorative ManagedRecipes, ambiguous
  generated artifacts, and raw Postgres access outside runtime DB boundaries
  become diagnostics and then errors according to the migration plan.
- **BREAKING**: the clean fork does not preserve historical program-index-first
  ontology, SQLite/Drizzle/PgTyped substrate routes, package-local generated
  companions, artifact ownership shards, or custom lifecycle machinery as live
  compatibility lanes. Existing commands and tests must be retargeted to typed
  source modules rather than preserved through package-local shim files.

## Guardrails

- Do not rename `framework_core`, `framework_event`, or `framework_view`.
- Do not create a custom ManagedResource runtime. Route stateful lifecycle
  through Effect Alchemy or an explicit existing substrate.
- Do not build ContextLens, ContextPacket, vector context selection, semantic
  compression, or agent memory in this change.
- Do not adopt broad generic Effect lint rules across the repo as part of this
  migration unless the design gives a narrow, explicit justification. Use
  `effect-oxlint` first for Attune-specific architecture rules.
- Do not add private ledgers, product-specific DB sprawl, large new script
  workflows, or unowned generated artifacts.
- Prefer deleting, internalizing, or quarantining obsolete surfaces over
  maintaining compatibility layers. Preserve command semantics by retargeting
  public Nx targets and tests to typed modules, not by keeping shim files.

## Capabilities

### New Capabilities

- `effect-oxlint-recipe-policy`: Defines the Attune/Trellis
  effect-oxlint policy pack that enforces recipe-owned workflows, no-compat
  script boundaries, ledger linkage, ManagedRecipe substrate requirements,
  generated artifact ownership, and raw DB access boundaries.
- `recipe-observation-spine`: Extends the generic `framework_*` recipe receipt
  spine with durable recipe observations and aligned Effect Schema, in-memory,
  Postgres, SQL validation, Kanel/Kysely/SafeQL, snapshot, and LocalTimescale
  emission behavior.
- `managed-recipe-alchemy-alignment`: Specifies ManagedRecipe lifecycle
  semantics as a semantic wrapper over Effect Alchemy, including lifecycle
  result normalization into receipts, observations, diagnostics, repairs,
  health, and human-review gates.
- `recipe-projection-registry`: Introduces typed recipe projections and
  implements the Nx target projection/conformance path while reserving space
  for later LSP, FoldKit, Tend, and docs projections.
- `recipe-invocation-envelope`: Defines the Effect Schema-backed invocation
  envelope and action vocabulary used by Nx executors, typed CLI entrypoints,
  tests, LSP actions, Tend/OpenCode integration, and policy checks.
- `workflow-surface-clean-fork`: Covers aggressive migration of package-local
  scripts, public Nx targets, Tend ledger-like surfaces, raw Postgres access,
  and generated artifact ownership into recipe/projection/receipt-backed
  surfaces.

### Modified Capabilities

- None. This repository currently has no archived `openspec/specs/` catalog to
  modify; the live ARS change remains the contextual predecessor rather than an
  archived capability spec.

## Impact

Affected surfaces include `packages/trellis/oxlint-policy`, Trellis protocol
recipe schemas, Trellis runtime recipe execution, `RecipeReceiptStore`,
`PostgresRecipeReceiptStore`, `SqlRoute`, LocalTimescale lifecycle code, the
`framework_*` SQL migration, Kanel/Kysely/SafeQL route declarations,
package-local `recipes.ts` declarations, public and internal `project.json`
targets, Nx executor/config wiring, package-local `scripts/` directories,
Tend DB/session/long-job/token-control surfaces, generated artifact ownership
metadata, and workspace policy/check targets.

The implementation plan must inspect the live codebase before authoring
`design.md`, delta specs, `tasks.md`, guardrails, and the migration plan. The
proposal is the intent source, not a substitute for code inspection. The
resulting design should be aggressive and concrete, but it must keep the
substrate small: Recipe/ManagedRecipe facts, Effect Alchemy lifecycle,
ProjectionRegistry views, `RecipeReceiptStore`/ReceiptSink durability, and
effect-oxlint diagnostics.
