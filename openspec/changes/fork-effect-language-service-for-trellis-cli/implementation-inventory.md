## Live Package Inventory

- `packages/trellis/language-service/package.json` keeps the package name `@attune/framework-language-service`, exposes the `trellis-ls` binary, and depends on `@attune/framework-protocol`, `@attune/framework-runtime`, `effect`, and TypeScript.
- `packages/trellis/language-service/project.json` defines `typecheck`, `test`, `build`, `check`, and `repair` targets with CLI/recipe repair metadata.
- `packages/trellis/language-service/src/recipes.ts` is now the package's single authored Attune declaration. It declares `FrameworkLanguageServiceRecipePackage` with CLI invocation, workspace inventory, TypeScript program, upstream Effect diagnostic/fix, Trellis diagnostic, repair, JSON projection, check summary, and observation recipes.
- `packages/trellis/language-service/src/attune.package.ts` has been removed for the dogfood package after equivalent recipe package metadata landed in `src/recipes.ts`.
- `packages/trellis/language-service/src/index.ts` currently projects runtime/program fact diagnostics into editor-shaped diagnostics, code actions, code lenses, quick info, and TypeScript diagnostic/codefix/refactor shapes.
- `packages/trellis/language-service/src/diagnostic-recipes.ts` owns Trellis migration diagnostics for package-local scripts, raw Postgres boundary usage, authored `attune.package.ts`, recipe-only ownership, role ownership, and legacy ProjectFacts authored truth.
- `packages/trellis/language-service/src/diagnostic-recipes.ts` also exposes oxlint-era invariants as Trellis diagnostic families for generated artifact ownership/freshness, public Nx target ownership, ManagedRecipe/Alchemy metadata, private ledger/receipt-spine linkage, and Tend recipe/receipt/observation linkage.
- `packages/trellis/language-service/src/diagnostic-recipes.ts` now accepts query-backed `ProgramDiagnostics`, direct `ProgramFactProjection` inputs, and `NxTargetProjection` facts so CLI diagnostics can normalize existing ProgramFact and ProjectionRegistry findings instead of reimplementing those substrates.
- `packages/trellis/language-service/src/repair-recipes.ts` owns Trellis repair plan normalization, safe public Nx repair serialization, generated direct-edit filtering, recipe-only migration fix plans, and review-required manual repair plans for lifecycle, DB, generated, and Tend risks.
- `packages/trellis/language-service/test/framework-language-service.test.ts` currently tests recipe records, recipe package metadata, runtime diagnostic projection, generated-file source-edit filtering, and the upstream Effect LS reference metadata.
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

## Preflight Evidence

- `git status --short` was clean after checkpoint commit `32fbb06`.
- `pnpm exec nx show projects` listed `framework-language-service`, `framework-protocol`, `framework-runtime`, and `workspace`.
- `openspec list --json` showed this change in progress and predecessor changes `effect-oxlint-recipe-substrate-clean-fork` and `arbor-recipe-substrate-migration` complete.
- `find packages -path '*/scripts/*' -type f | sort` returned no package-local script files.
- `pnpm exec nx run framework-language-service:test --output-style=static` passed: 1 test file, 10 tests.
- `pnpm exec nx run framework-protocol:test --output-style=static` passed: 8 test files, 47 tests.
- `pnpm exec nx run framework-runtime:test --output-style=static` passed: 2 test files, 17 passed and 1 skipped.
- `pnpm exec nx run workspace:policy-fast --output-style=static` passed. The local PR completion subcheck printed a `curl 422` and skipped because no PR context was available, but the Nx target exited successfully.

## Implementation Progress Evidence

- Added `trellis-ls` binary metadata to `@attune/framework-language-service` and linked the package from the root workspace so `pnpm exec trellis-ls ...` resolves locally.
- Added `build`, CLI-oriented `check`, and CLI-oriented `repair` target metadata for `framework-language-service`.
- Added Effect Schema-backed contracts for diagnostics, fixes, apply, check, command metadata, evidence mode, fix kinds, spans, summaries, edits, and refusal metadata.
- Added a headless CLI parser for canonical `diagnostics`, `fixes`, `apply`, and `check` commands plus the optional aliases `diags`, `codefixes`, and `apply-codefix`.
- Added deterministic diagnostic/fix ID generation, TypeScript project/file/workspace loading, JSON/text output, TypeScript diagnostic normalization, and text edit diff/write helpers.
- Added an attributed `src/upstream-effect/**` adapter boundary for upstream Effect language-service commit `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`. This first slice implements a focused local `effect/floatingEffect` fixture adapter and keeps the full upstream `LSP.getSemanticDiagnosticsWithCodeFixes` fork open.
- Added Trellis diagnostic coverage for package-local `scripts/` regressions and raw Postgres imports outside the runtime DB boundary.
- Added Trellis repair planning for package-local script diagnostics through public `nx run workspace:repair` and review-required manual guidance for raw Postgres boundary diagnostics.
- Implemented `apply --mode diff` no-write previews, `apply --mode write` for safe local edits and public safe Nx repairs, stale fix refusal, manual/unsafe/review-required refusal, and optional recheck output.
- Refocused `packages/trellis/language-service/src/recipes.ts` from editor-first recipes to CLI-first diagnostics/fixes/apply/check projection recipes, added `defineRecipePackage`, and deleted `packages/trellis/language-service/src/attune.package.ts` for the dogfood package.
- Added protocol-level specialized recipe builders: `defineProjectionRecipe`, `defineDiagnosticRecipe`, `defineRepairRecipe`, `defineObservationRecipe`, and `defineInvocationRecipe` as typed wrappers over the existing `RecipeDefinition` substrate.
- Added `--profile recipe-only-source` to diagnostics/check command context and JSON metadata.
- Split Trellis diagnostic and repair logic out of `cli-core.ts` into DiagnosticRecipe-owned and RepairRecipe-owned modules. The CLI now parses args, loads scope, invokes diagnostic/fix pipelines, renders JSON, maps exit codes, and records optional observations.
- Added recipe-only diagnostics and fixes for authored `attune.package.ts`, source ownership, workflow InvocationRecipe ownership, generated ProjectionRecipe ownership, DiagnosticRecipe/RepairRecipe/ObservationRecipe ownership, and legacy ProjectFacts authored truth.
- Added an architecture policy successor path that accepts `src/recipes.ts` with `defineRecipePackage` when `src/attune.package.ts` has been removed.
- Added generated artifact ownership/freshness diagnostics, public Nx target ownership diagnostics from project JSON, ManagedRecipe/Alchemy substrate/review diagnostics, private-ledger/operation receipt diagnostics, and Tend recipe/observation/receipt linkage diagnostics.
- Added ProgramFact runtime/projection diagnostic normalization through `ProgramDiagnostics`, `ProgramFactQuery`, `ProgramFactProjection`, and `diagnosticsForProgramFacts`; added Nx target ownership/projection diagnostics through `NxTargetConformance` using `NxTargetProjection` facts.
- Added product import-boundary coverage for public-package imports of language-service deep internals; agents/products must use the CLI contract rather than importing the package as an API.
- Added `packages/trellis/language-service/README.md` documenting the CLI, JSON stdout, exit codes, no-DB default, and oxlint-as-transitional guardrail.
- Added package tests for schema decoding, CLI help, upstream attribution, effect diagnostic/fix fixture, targeted and project-wide fixes, diff no-write, safe write, stale refusal, manual refusal, Nx repair serialization, receipt/observation recording, ProgramFact runtime diagnostics, Nx ProjectionRegistry facts, recipe-only profile diagnostics/fixes/apply diff, JSON snapshots, no upstream deep imports, and no language-service-specific ledger/schema.

## Final Validation Evidence For This Slice

- `pnpm exec nx run framework-language-service:typecheck --output-style=static` passed.
- `pnpm exec nx run framework-language-service:test --output-style=static` passed: 2 test files, 29 tests.
- `pnpm exec nx run framework-language-service:build --output-style=static` passed.
- `pnpm exec nx run framework-protocol:test --output-style=static` passed: 8 test files, 48 tests.
- `pnpm exec nx run framework-runtime:test --output-style=static` passed: 2 test files, 17 passed and 1 skipped.
- `pnpm exec nx run attune-architecture:test --output-style=static` passed: 7 test files, 76 tests.
- `pnpm exec nx run workspace:policy-fast --output-style=static` passed. The local PR completion subcheck printed a `curl 422` and skipped because no PR context was available, but the Nx target exited successfully.
- `pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json` passed with zero diagnostics.
- `pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json` passed with zero fixes for the clean package.
- `trellis-ls apply --project <temp-fixture>/tsconfig.json --fix-id <safe-fixture-fix> --mode diff --format json` passed through the repo-local binary and left the fixture source unchanged.
- `pnpm exec trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json` passed with `blocking: false`.
- `pnpm exec trellis-ls diagnostics --workspace . --profile recipe-only-source --format json` passed. The captured summary reported 483 diagnostics across the current repository migration backlog, including 49 `trellis/orphan-public-nx-target`, 46 `trellis/target-missing-recipe-invocation`, 22 `trellis/authored-attune-package-file`, and 33 `trellis/source-uses-legacy-abstraction` diagnostics.
- `openspec validate fork-effect-language-service-for-trellis-cli --strict` passed.

## Remaining Implementation Gaps

- Full upstream source fork/adaptation remains open: the current adapter is still focused and does not yet execute upstream `LSP.getSemanticDiagnosticsWithCodeFixes`.
- Full upstream Effect diagnostic/fix execution remains open: task 5.2 still needs the vendored/adapted `LSP.getSemanticDiagnosticsWithCodeFixes` path rather than the focused local `effect/floatingEffect` adapter.

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
