## Live Package Inventory

- `packages/trellis/language-service/package.json` currently names the package `@attune/framework-language-service`, has no `bin`, and depends on `@attune/framework-protocol`, `@attune/framework-runtime`, and `effect`.
- `packages/trellis/language-service/project.json` currently defines `typecheck`, `test`, `check`, and `repair` targets but no build target.
- `packages/trellis/language-service/src/recipes.ts` currently declares editor-first recipes: `program-diagnostic-view`, `recipe-health-view`, and `typescript-projection`.
- `packages/trellis/language-service/src/index.ts` currently projects runtime/program fact diagnostics into editor-shaped diagnostics, code actions, code lenses, quick info, and TypeScript diagnostic/codefix/refactor shapes.
- `packages/trellis/language-service/test/framework-language-service.test.ts` currently tests recipe records, runtime diagnostic projection, generated-file source-edit filtering, and the upstream Effect LS reference metadata.
- `packages/trellis/recipes.ts` includes `FrameworkLanguageServiceRecipes` in the workspace recipe catalog under project ID `framework-language-service`.

## Reusable Trellis Substrate

- `packages/trellis/protocol/src/diagnostics/index.ts` defines `ProgramDiagnostic`, `ProgramRepairAction`, `ProgramRepairFinding`, and `diagnosticFromRepairFinding`.
- `packages/trellis/protocol/src/recipes/index.ts` defines `Recipe`, `ManagedRecipe`, `RecipeInvocation`, `RecipeObservation`, `RecipeRepair`, `RecipeRepairPlan`, `RecipeReceiptStoreSnapshot`, `ProjectionRegistry`, and `NxTarget`.
- `packages/trellis/protocol/src/project-facts/**` defines project facts, diagnostic rules, and package declaration primitives.
- `packages/trellis/protocol/src/observations/index.ts` defines program observation and generated artifact records.
- `packages/trellis/runtime/src/ProgramDiagnostics.ts` wraps `ProgramFactQuery` diagnostics.
- `packages/trellis/runtime/src/ProgramFactProjection.ts` computes missing observation, stale generated artifact, replay, waiver, coverage, and weak-oracle findings.
- `packages/trellis/runtime/src/ProgramFactQuery.ts` exposes summaries, repair findings, diagnostics for file, diagnostic explanation, and repair plan lookup.
- `packages/trellis/runtime/src/RecipeReceiptStore.ts` provides the in-memory recipe receipt/observation store and the API shape for durable evidence.
- `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts` and SQL files own the durable `framework_*` receipt spine boundary.

## Oxlint Policy Inventory To Migrate

- `generated-artifact-ownership.ts`: generated artifact has no recipe/projection owner.
- `nx-target-ownership.ts`: public Nx target lacks recipe/projection ownership or RecipeInvocation routing.
- `script-workflow.ts`: package-local script workflows and temporary migration debt.
- `managed-recipe-substrate.ts`: ManagedRecipe lacks lifecycle substrate/provenance/observation/repair/review metadata.
- `postgres-boundary.ts`: raw Postgres access outside Trellis runtime DB adapter boundary.
- `ledger-boundary.ts`: private ledger-like store without linkage to recipe/run/receipt/observation identity.
- `node-boundary.ts` and `architecture-shapes.ts`: additional architecture pressure to evaluate after the initial CLI families are working.

## Upstream Effect Inventory

- Repository: `https://github.com/Effect-TS/language-service`
- Inspected main commit: `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`
- NPM package version: `@effect/language-service@0.86.2`
- License: MIT, copyright Effectful Technologies Inc.
- Useful source directories: `src/cli/**`, `src/core/**`, `src/diagnostics/**`, `src/refactors/**`, `src/quickinfo/**`, `src/codegens/**`, `src/completions/**`, `src/goto/**`, `src/inlays/**`, `src/renames/**`, `src/utils/**`, and `test/**`.
- Useful command files: `src/cli.ts`, `src/cli/diagnostics.ts`, `src/cli/quickfixes.ts`, `src/cli/check.ts`, and `src/cli/utils.ts`.
- Important runtime APIs: `LSP.getSemanticDiagnosticsWithCodeFixes`, `diagnostics` registry, `TypeScriptContext`, `getFileNamesInTsConfig`, TypeScript `ChangeTracker` quickfix rendering, and project-service file loading.

## Guardrails

- Agents call `trellis-ls`; they do not import a stable language-service TypeScript API.
- The language service projects existing Recipe, ManagedRecipe, ProjectionRegistry, RecipeInvocation, RecipeObservation, recipe receipt, Nx target, Tend linkage, and generated ownership facts; it does not create a new ontology.
- `effect-oxlint` remains transitional pressure and CI coverage, not the permanent repair protocol.
- The CLI must not create a language-service-specific ledger or DB schema.
- `apply --mode diff` never writes or runs commands.
- `apply --mode write` refuses unsafe or review-required fixes by default.
- Structural repairs should prefer public `nx run <project>:repair` or `nx run workspace:repair` surfaces.
- Generated/cache/descriptor direct edits are not the default repair path when a recipe/generator/Nx repair owns the artifact.
- Upstream vendored code should stay isolated; local deviations belong in wrappers and attribution notes.

## Migration Plan

1. Run preflight status, Nx project list, OpenSpec list, baseline package tests, workspace policy, and package-local script inventory.
2. Vendor/adapt upstream Effect source into `src/upstream-effect/**` with attribution and dependency updates.
3. Add `trellis-ls` package binary, build target, command parser, common context, and JSON/text formatters.
4. Add Effect Schema-backed JSON contracts and schema decode tests.
5. Wire upstream Effect diagnostics and quickfix previews into normalized Trellis JSON.
6. Add Trellis recipe diagnostics by reusing protocol/runtime/architecture/oxlint-policy fact logic.
7. Normalize repair plans and implement safe apply/refusal behavior.
8. Add optional receipt/observation recording through existing runtime stores.
9. Refocus language-service recipes and package facts around CLI diagnostics/fixes/apply/check.
10. Run required validation and record residual failures.

## Validation Plan

- `pnpm exec nx run framework-language-service:typecheck --output-style=static`
- `pnpm exec nx run framework-language-service:test --output-style=static`
- `pnpm exec nx run framework-language-service:build --output-style=static`
- `pnpm exec nx run framework-protocol:test --output-style=static`
- `pnpm exec nx run framework-runtime:test --output-style=static`
- `pnpm exec nx run workspace:policy-fast --output-style=static`
- `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`
- `trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json`
- `trellis-ls apply --project <fixture-tsconfig> --fix-id <safe-fixture-fix> --mode diff --format json`
- `trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json`
- `openspec validate fork-effect-language-service-for-trellis-cli --strict`
