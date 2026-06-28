## 1. Baseline And Guardrails

- [x] 1.1 Run and record the current focused baseline for `effect-oxlint-policy`, `framework-protocol`, `framework-runtime`, Tend DB/core, and workspace policy targets.
- [x] 1.2 Inventory current package-local scripts, generated artifacts, public Nx targets, ManagedRecipe declarations, raw DB access, and ledger-like Tend/store surfaces.
- [x] 1.3 Add guardrail tests or policy fixtures proving `framework_core`, `framework_event`, and `framework_view` are not renamed.
- [x] 1.4 Add guardrail tests or policy fixtures rejecting custom ManagedResource runtime names and ContextLens/ContextPacket-style context systems.
- [x] 1.5 Document the warning-to-error promotion plan for each new clean-fork policy rule in the design-facing policy config or package docs.

## 2. Effect-Oxlint Policy Pack

- [x] 2.1 Reorganize `packages/trellis/oxlint-policy` into a plugin entrypoint plus focused rule modules while preserving the existing public plugin export.
- [x] 2.2 Implement `attune/no-public-script-workflow` with tests for stage switches, child-process orchestration, DB lifecycle scripts, no-compat classification, and temporary migration debt.
- [x] 2.3 Implement `attune/recipe-owned-nx-target` with tests for orphan public targets, recipe-owned targets, projection-owned targets, internal repair targets, and unique-recipe autofix eligibility.
- [x] 2.4 Implement `attune/no-private-ledger` with tests for unlinked store-like declarations, legitimate shared-port stores, fixture-only stores, and Tend ledger-like code.
- [x] 2.5 Implement `attune/managed-recipe-requires-substrate` with tests for fake ManagedRecipes and valid ManagedRecipes using the current protocol fields.
- [x] 2.6 Implement `attune/generated-artifact-owned-by-recipe` with tests for unowned generated files, recipe `allowedFiles`, projection ownership, manifests, and generated headers.
- [x] 2.7 Implement `attune/no-raw-pg-outside-runtime` with tests for product-package Postgres access and allowlisted Trellis runtime DB boundary files.
- [x] 2.8 Update oxlint policy recipes, config, exports, and Nx targets so the policy pack is runnable through the stable workspace command surface.

## 3. Recipe Observation Spine

- [x] 3.1 Add `framework_event.recipe_observation` and observation indexes to `packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql`.
- [x] 3.2 Add `RecipeObservationSchema`, observation ID helpers, and observation fields to protocol snapshot or DB emission schemas where appropriate.
- [x] 3.3 Extend `RecipeReceiptStoreApi`, `RecipeReceiptStoreRecipeView`, in-memory store state, query methods, and snapshots to support observations.
- [x] 3.4 Extend `PostgresRecipeReceiptStore` with observation upsert/select SQL, row mapping, recipe views, filtered queries, and snapshot output.
- [x] 3.5 Update `SqlRoute` table lists, SafeQL validation statements, Kanel/Kysely declarations, and SQL validation helpers for `recipe_observation`.
- [x] 3.6 Add runtime/protocol tests for observation schema decode, in-memory observation semantics, Postgres observation SQL calls, snapshots, and SQL route validation.
- [x] 3.7 Add LocalTimescale observation payload helpers for service planned/ready, migration applied, SQL validated, Kanel generated, or SafeQL validated events.

## 4. ManagedRecipe And Alchemy Alignment

- [x] 4.1 Clarify the thin Alchemy bridge API in runtime code without introducing a new lifecycle runtime, planner, diff engine, scheduler, or observed-state store.
- [x] 4.2 Route ManagedRecipe lifecycle results through receipt and observation normalization, including diagnostics, repairs, health, and Alchemy provenance payloads.
- [x] 4.3 Update `LocalTimescaleManagedRecipe` to emit at least one observation connected to recipe, run, and/or receipt identity.
- [x] 4.4 Add tests proving ManagedRecipe lifecycle actions use the existing Alchemy provider shape and preserve human-review gates where required.
- [x] 4.5 Add tests proving pure Recipes are not forced through Alchemy and stateful lifecycle behavior remains ManagedRecipe-shaped.

## 5. ProjectionRegistry And Nx Conformance

- [x] 5.1 Add ProjectionRegistry protocol types, projection IDs, input/output schemas, and deterministic render helpers.
- [x] 5.2 Implement the initial projection catalog for Nx targets, recipe DB emission, recipe receipts, and oxlint diagnostics.
- [x] 5.3 Implement Nx target projection rendering from Recipe and ManagedRecipe facts, including recipe ID, projection ID, tier, surface, action, and evidence metadata.
- [x] 5.4 Add conformance checks that compare projected Nx target expectations to `project.json` targets and classify targets as recipe-owned, projection-owned, internal, or orphaned.
- [x] 5.5 Add tests for deterministic projection output, orphan public targets, valid public targets, internal repair targets with public parents, and diagnostic repair guidance.
- [x] 5.6 Wire the Nx projection conformance check into an appropriate workspace target or existing policy target.

## 6. RecipeInvocation And Script Cleanup

- [x] 6.1 Define the Effect Schema-backed `RecipeInvocation` envelope and action vocabulary for generate, check, repair, plan, apply, destroy, prune, fuzz, validate-sql, migrate, and generate-types.
- [x] 6.2 Add invocation decode tests for valid actions, invalid actions, source metadata, requested-by metadata, input, parameters, and optional run IDs.
- [x] 6.3 Update relevant Nx executor or toolchain entrypoints to construct RecipeInvocation envelopes for recipe-shaped public workflow targets.
- [x] 6.4 Move Trellis runtime DB lifecycle and toolchain behavior out of `packages/trellis/runtime/scripts/generationStage.ts` into typed runtime source modules.
- [x] 6.5 Remove `packages/trellis/runtime/scripts/generationStage.ts` after public targets route through typed runtime modules.
- [x] 6.6 Move CocoIndex generation-stage behavior into `packages/attune/cocoindex-effect/src/internal/generation` or an equivalent typed source boundary.
- [x] 6.7 Internalize, replace, or remove `packages/attune/nx/scripts/write-generator-cjs-wrappers.mjs` with recipe/projection-owned build behavior.
- [x] 6.8 Move Trellis architecture script behavior into source modules and/or effect-oxlint rules, removing live package-local script entrypoints.
- [x] 6.9 Route fuzzer runner behavior through recipe-backed actions, typed modules, and receipts while removing live package-local runner scripts.
- [x] 6.10 Add tests proving legacy script behavior remains reachable through RecipeInvocation-backed typed modules and policy/no-compat validation rejects live script shims.

## 7. Tend And Generated Ownership Alignment

- [x] 7.1 Inspect Tend SQL and source surfaces for session, command, long-job, token, tool, and reporting rows that should link to recipe spine identity.
- [x] 7.2 Add or validate Tend links to recipe ID, run ID, receipt ID, or observation ID where relevant, using recipe observations as a bridge when table widening is not the smallest safe step.
- [x] 7.3 Add Tend tests proving linked operational rows or emitted recipe observations do not form a second ledger.
- [x] 7.4 Add generated artifact ownership metadata using recipe `allowedFiles`, output descriptors, projection metadata, manifests, or generated headers that resolve to known recipes.
- [x] 7.5 Add generation/freshness receipt or observation tests for the highest-priority generated artifacts before moving any generated paths.
- [x] 7.6 Update policy phase config so Tend linkage and generated ownership debt are warnings or errors according to the migration state.

## 8. Workspace Enforcement And Documentation

- [x] 8.1 Promote completed clean-fork policy rules from warning to error where migration debt has been removed.
- [x] 8.2 Add or update the workspace recipe-substrate/policy check target so agents have one stable Nx-owned validation surface for this migration.
- [x] 8.3 Update package or platform docs only where they clarify recipe-owned workflows, script removal, observation storage, or policy enforcement.
- [x] 8.4 Ensure docs and diagnostics do not teach raw scripts, raw package-manager wrappers, custom lifecycle runtimes, or legacy DB substrate lanes as normal agent entrypoints.
- [x] 8.5 Add a workspace no-compat script validation pass that fails live package-local script compatibility shims after typed module entrypoints exist.
- [x] 8.6 Broaden the workspace no-compat script validation pass so any active package-local `scripts/` file fails, including extensionless shell tools and invocation-only shims.

## 9. Validation

- [x] 9.1 Run `nx run effect-oxlint-policy:test`.
- [x] 9.2 Run the focused framework protocol tests or typecheck covering RecipeObservation, RecipeInvocation, and ProjectionRegistry schemas.
- [x] 9.3 Run `nx run framework-runtime:test`.
- [x] 9.4 Run `nx run framework-runtime:db:validate-sql`.
- [x] 9.5 Run the focused Nx projection/conformance tests or workspace recipe-substrate check.
- [x] 9.6 Run focused Tend tests for any Tend linkage or observation emission changes.
- [x] 9.7 Run `nx run workspace:policy-fast`.
- [x] 9.8 Record any validation that cannot run, including exact command, failure reason, and residual risk.
- [x] 9.9 Run the no-compat script validation pass added by this change.
- [x] 9.10 Run the broadened no-compat script validation pass after removing all active package-local `scripts/` files.
