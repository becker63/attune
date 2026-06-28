## Context

Attune already has the ingredients for the clean fork but does not yet force
them into one shape. `packages/trellis/protocol/src/recipes/index.ts` defines
Recipe and ManagedRecipe schemas, stable IDs, receipts, diagnostics, repairs,
health, and a registry. `packages/trellis/runtime/src/RecipeKernel.ts` already
contains executable recipe runners, ManagedRecipe lifecycle helpers, and an
Effect Alchemy provider shape. `packages/trellis/runtime/src/RecipeReceiptStore.ts`
and `PostgresRecipeReceiptStore.ts` provide in-memory and Postgres receipt
stores, but they do not yet model observations. `SqlRoute.ts` and
`0001_framework_recipe_receipt_spine.sql` define the current `framework_core`,
`framework_event`, and `framework_view` SQL route. `LocalTimescaleRecipe.ts`
already models the local Timescale/Postgres receipt spine as a ManagedRecipe.

The enforcement surface exists but is too small for the new architecture.
`packages/trellis/oxlint-policy` currently exposes an `effect-oxlint` plugin
with rules for raw process env, raw Node APIs, and hand-authored architecture
shapes. It does not yet enforce the clean-fork invariants for scripts, Nx target
ownership, private ledgers, ManagedRecipe substrate, generated artifacts, or
raw Postgres boundaries.

Several current workflow surfaces are still script-shaped or target-shaped.
`packages/trellis/runtime/scripts/generationStage.ts` owns DB lifecycle,
Kanel/SafeQL generation and validation, live DB shelling, and string dispatch.
`packages/attune/cocoindex-effect/scripts/generationStage.ts`,
`packages/attune/nx/scripts/write-generator-cjs-wrappers.mjs`,
`packages/trellis/architecture/scripts/*.mjs`, and fuzzer scripts still expose
workflow behavior directly. Many `project.json` files expose public targets with
Attune metadata, but recipe ownership and projection conformance are not yet a
single typed contract. Tend already has recipe-linking columns in parts of its
SQL, but the clean fork must make that linkage normative rather than accidental.

This design completes the missing OpenSpec planning artifacts before any
implementation. It treats the user-supplied proposal as the intent source and
the live codebase as the constraint source.

## Goals / Non-Goals

**Goals:**

- Make `packages/trellis/oxlint-policy` a real Attune-specific policy pack
  authored with `effect-oxlint`.
- Add `framework_event.recipe_observation` to the existing generic
  `framework_*` spine and surface it through Effect Schema, in-memory store,
  Postgres store, snapshots, SQL validation, and LocalTimescale lifecycle
  observations.
- Align ManagedRecipe lifecycle execution with the existing Effect Alchemy
  provider shape instead of introducing a custom lifecycle runtime.
- Introduce typed recipe projections, with Nx target projection and conformance
  as the first implemented path.
- Introduce or formalize a Schema-backed `RecipeInvocation` envelope for Nx
  executors, typed CLI entrypoints, tests, LSP actions, Tend/OpenCode
  integration, and policy checks.
- Move workflow behavior out of package-local scripts and into typed modules,
  recipes, projections, Alchemy adapters, or Trellis policy rules.
- Require Tend ledger-like rows and stores to link back to recipe, run, receipt,
  or observation identity where relevant.
- Require generated artifacts to have visible recipe or projection ownership
  before path churn.
- Define migration phases, guardrails, and validation commands so
  implementation can proceed aggressively without reintroducing old surfaces.

**Non-Goals:**

- Do not rename `framework_core`, `framework_event`, or `framework_view`.
- Do not create `ResourceDiffEngine`, `LifecyclePlanner`,
  `ObservedStateStore`, `CustomManagedResourceRuntime`,
  `DistributedApplyEngine`, or a custom scheduler.
- Do not implement ContextLens, ContextPacket, vector context selection,
  semantic compression, or agent memory.
- Do not enable broad generic Effect style rules across the repo as part of
  this migration.
- Do not perform a massive package collapse before policy and projection
  checks can explain the desired shape.
- Do not move generated artifacts before ownership, receipts, and diagnostics
  make the move safe.
- Do not require long fuzzer campaigns, live Kubernetes apply, or production
  platform rollout for this change.

## Decisions

### Decision 1: Keep Trellis oxlint policy as the deterministic pressure layer

`packages/trellis/oxlint-policy` will own the new Attune-specific rules. The
package already has `effect-oxlint`, a plugin entrypoint, tests, recipe
declarations, config, and Nx targets. The implementation should reorganize into
`src/rules/*` if useful, but the key requirement is tested deterministic rules,
not a new policy runtime.

Alternatives considered:

- Keep architecture checks only in Trellis architecture scripts. Rejected
  because scripts remain hidden workflow surfaces and cannot provide the fast
  rule-level pressure requested by the clean fork.
- Adopt broad generic Effect lint packs first. Rejected because this change is
  about Attune architecture invariants, not generic style.

### Decision 2: Extend the existing receipt spine with one generic observation table

The SQL route will add `framework_event.recipe_observation` and indexes for
recipe/time, run/time, and kind/time lookup. The table belongs beside receipts,
diagnostics, repairs, and metrics. It stores Alchemy observed state,
provenance, policy findings, generated freshness, Tend command observations,
SQL validation observations, and toolchain events as payloads.

Alternatives considered:

- Add product-specific observation tables first. Rejected because the clean fork
  must try generic receipts, metrics, diagnostics, repairs, health, and
  observations before product schema sprawl.
- Add many Alchemy-specific columns immediately. Rejected until query pressure
  proves those columns are needed.
- Rename schemas to match new branding. Rejected by guardrail.

### Decision 3: Treat ManagedRecipe as a semantic wrapper over Effect Alchemy

`RecipeKernel.ts` already defines `ManagedRecipeAlchemy`, bindings, and an
Alchemy provider shape. The implementation should clarify and strengthen this
bridge, normalize lifecycle results into receipts and observations, and preserve
review gates. It must not implement a second lifecycle substrate.

Alternatives considered:

- Build a custom lifecycle planner/diff engine. Rejected by the proposal and by
  the existing Alchemy substrate.
- Make every Recipe an Alchemy resource. Rejected because only stateful
  lifecycle outputs need ManagedRecipe semantics.

### Decision 4: Introduce ProjectionRegistry as view rendering, not scheduling

ProjectionRegistry will be a typed protocol/runtime surface that renders
recipes into subsystem views. This change implements Nx target projection and
conformance first. It also names initial projection types for recipe DB
emission, recipe receipts, and oxlint diagnostics. Later LSP, FoldKit, Tend,
and docs projections can reuse the shape.

Alternatives considered:

- Continue putting workflow facts directly in `project.json`. Rejected because
  Nx targets become a parallel ontology.
- Make ProjectionRegistry execute work. Rejected because projection rendering is
  not scheduling or lifecycle execution.

### Decision 5: Introduce RecipeInvocation as the stable operation envelope

RecipeInvocation will be Schema-backed and cover `recipeId`, `action`, `input`,
`parameters`, `runId`, `requestedBy`, and source/start metadata. The action
vocabulary will include the existing workflow verbs: `generate`, `check`,
`repair`, `plan`, `apply`, `destroy`, `prune`, `fuzz`, `validate-sql`,
`migrate`, and `generate-types`. Nx executors and typed source entrypoints
should route through this envelope instead of ad hoc package-local script
switches.

Alternatives considered:

- Keep per-script `process.argv` parsing and target-specific string dispatch.
  Rejected because it makes workflow behavior invisible to recipes and
  receipts.

### Decision 6: Remove package-local scripts after moving behavior

The migration will move behavior from script files into typed modules such as
runtime DB CLI/toolchain modules, CocoIndex generation modules, Trellis
architecture policy modules, and recipe invocation adapters. Scripts may remain
only during the same implementation slice that introduces the typed source
entrypoint and retargets public Nx targets/tests. The final state keeps no
package-local compatibility shim, no invocation-only pass-through script, and no
recipe-owned file under `packages/**/scripts`.

Alternatives considered:

- Delete all scripts before typed source entrypoints exist. Rejected because
  public targets must be retargeted in the same slice that removes the script.
- Leave scripts as allowlisted policy exceptions. Rejected for active packages;
  the no-compat validation pass scans package-local `scripts/` files directly
  and fails them regardless of whether they contain workflow logic or only
  forward to typed modules. Historical references must live outside active
  package workflow paths and have no Nx, recipe, projection, or test adapter.

### Decision 7: Align Tend as projection, not ledger

Tend SQL and stores may remain specialized, but relevant session, command,
long-job, token, and tool records must link to recipe, run, receipt, or
observation IDs. Where widening Tend tables is not the smallest safe move,
Tend can emit recipe observations through the shared store.

Alternatives considered:

- Delete Tend DB immediately. Rejected because Tend tables are useful
  operational projections.
- Let Tend continue as an independent event ledger. Rejected by clean-fork
  guardrails.

### Decision 8: Enforce generated ownership before moving generated paths

Generated artifacts will first gain visible recipe or projection ownership via
allowed files, output descriptors, projection metadata, generated ownership
manifests, or `@generated by <recipeId>` headers that resolve to known recipes.
Only after ownership and freshness receipts exist should generated paths move.

Alternatives considered:

- Move generated artifacts first. Rejected because path churn without
  ownership does not improve agent-legibility.

## Risks / Trade-offs

- Large policy pack increases initial migration work -> implement rules with
  focused tests and phase warning/error promotion.
- Oxlint may not parse every needed non-TypeScript surface directly -> combine
  rule helpers, JSON source checks, and workspace conformance checks where
  effect-oxlint AST alone is insufficient.
- Current generated ownership may be incomplete -> start as diagnostics with an
  explicit promotion path rather than blocking all work immediately.
- LocalTimescale live DB validation may not run in every environment -> keep
  static SQL validation and unit store tests required, with live integration
  guarded by the existing `ATTUNE_RUN_DB_INTEGRATION=1` convention.
- RecipeInvocation may overlap existing Nx executor parameters -> introduce it
  as a typed envelope and migrate target parameters incrementally.
- Tend table widening may be noisy -> allow observation emission as a bridge
  while still requiring linkage semantics.
- Script cleanup can break public commands -> retarget public commands and
  tests to typed modules in the same slice that deletes package-local scripts.

## Migration Plan

### Phase 1: Establish Trellis policy package

- Expand `packages/trellis/oxlint-policy` into rule modules for the six
  Attune-specific rules.
- Add tests for valid, invalid, no-compat, allowlist, and migration-debt cases.
- Update policy recipes and config so the workspace can run the policy
  deterministically.
- Keep existing generic rules only if they do not obscure the new Attune rules.

### Phase 2: Add the recipe observation spine

- Add `framework_event.recipe_observation` to the existing migration without
  renaming `framework_*` schemas.
- Add `RecipeObservationSchema`, stable observation IDs, store APIs, snapshots,
  Postgres row mapping, in-memory storage, and SQL validation statements.
- Update `SqlRoute` table lists, Kanel/SafeQL/Kysely declarations, and tests.

### Phase 3: Align LocalTimescale and ManagedRecipe with Alchemy observations

- Clarify the thin Alchemy bridge in runtime code.
- Route LocalTimescale lifecycle outputs through receipt and observation
  emission.
- Put Alchemy provenance in receipt or observation payloads.
- Preserve human-review semantics for destructive or external lifecycle actions.

### Phase 4: Add ProjectionRegistry and Nx conformance

- Add projection schemas and registry helpers for Nx targets.
- Render/check Nx target metadata from recipe facts.
- Add conformance tests for public targets, internal repair targets, and
  deterministic output.
- Connect effect-oxlint target ownership diagnostics to the projection metadata
  where practical.

### Phase 5: Introduce RecipeInvocation and clean scripts

- Add the Schema-backed invocation envelope and action vocabulary.
- Move Trellis runtime generation-stage behavior into typed runtime modules.
- Move CocoIndex generation behavior into `src/internal/generation`.
- Internalize or remove the Nx CJS wrapper script.
- Move Trellis architecture scripts into source modules and/or oxlint policy
  rules.
- Remove package-local script entrypoints from active package roots after their
  targets execute typed modules directly.
- Broaden `workspace:no-compat-script-check` so any file under an active
  package-local `scripts/` path fails, including extensionless shell tools and
  invocation-only shims.

### Phase 6: Align Tend and generated artifact ownership

- Link Tend session, command, long-job, token, and tool observations to recipe
  spine IDs where relevant.
- Emit recipe observations for Tend events where direct table widening is not
  the smallest safe step.
- Add generated ownership metadata and tests.
- Promote generated ownership diagnostics according to debt remaining.

### Phase 7: Final enforcement

- Promote completed policy rules to errors.
- Add or update workspace policy/check targets around recipe substrate
  conformance.
- Run the smallest Nx-owned validation set that proves policy, protocol,
  runtime, SQL route, projection, Tend alignment, and no-compat script
  enforcement.
- Run `workspace:no-compat-script-check` as the literal no-shim pass; completion
  requires zero live files under active package-local `scripts/` paths.
- Update docs only where they clarify the new operating model.

## Validation Plan

- Run `nx run effect-oxlint-policy:test` for oxlint rule tests.
- Run `nx run framework-protocol:test` or the current protocol test target for
  Schema and projection contracts.
- Run `nx run framework-runtime:test` for store, SQL route, LocalTimescale, and
  Alchemy bridge behavior.
- Run `nx run framework-runtime:db:validate-sql` for SQL route validation.
- Run the relevant Trellis architecture or workspace conformance target for Nx
  projection and public target ownership.
- Run Tend package tests after Tend linkage changes.
- Run `nx run workspace:policy-fast` as the normal policy coverage gate.
- If available and explicitly requested, run guarded integration with
  `ATTUNE_RUN_DB_INTEGRATION=1`; otherwise report it as not run.

## Open Questions

- Which existing workspace target should become the stable public name for the
  final recipe substrate check: `workspace:recipe-substrate-check`,
  `workspace:policy-fast`, or a new target projected from recipes?
- Should generated artifact ownership start as warning for all generated paths
  or error for newly touched paths only?
- Should Tend linkage be implemented first by table columns, recipe
  observations, or both for the highest-risk Tend surfaces?
- Should `packages/attune/nx` physically move under Trellis in this change, or
  remain in place while projection rules declare it Trellis-owned generic
  workspace machinery?
