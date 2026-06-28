## 1. Preflight And Inventory

- [x] 1.1 Run `git status --short` and record unrelated dirty worktree state before editing.
- [x] 1.2 Run `pnpm exec nx show projects` and confirm `framework-language-service`, `framework-protocol`, `framework-runtime`, and `workspace` are present.
- [x] 1.3 Run `openspec list --json` and confirm this change is active alongside any completed predecessor changes.
- [x] 1.4 Run baseline `pnpm exec nx run framework-language-service:test --output-style=static` and record existing failures.
- [x] 1.5 Run baseline `pnpm exec nx run framework-protocol:test --output-style=static` and record existing failures.
- [x] 1.6 Run baseline `pnpm exec nx run framework-runtime:test --output-style=static` and record existing failures.
- [x] 1.7 Run baseline `pnpm exec nx run workspace:policy-fast --output-style=static` and record existing failures.
- [x] 1.8 Run `find packages -path '*/scripts/*' -type f | sort` and record any package-local script regressions.

## 2. Upstream Effect Fork Landing

- [ ] 2.1 Copy/adapt upstream Effect language-service source from `Effect-TS/language-service` into `packages/trellis/language-service/src/upstream-effect/**`.
- [x] 2.2 Add upstream attribution documenting repository URL, commit `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`, package version `0.86.2`, MIT license, copied directories, and local deviations.
- [x] 2.3 Add package dependencies needed by the fork, including TypeScript project-service and Effect platform runtime dependencies where required.
- [x] 2.4 Keep upstream editor patch/setup/config commands hidden or deferred from the public `trellis-ls` command surface.
- [x] 2.5 Add tests that prove no runtime imports use undocumented `@effect/language-service/dist/*` paths.

## 3. Package CLI Surface

- [x] 3.1 Add `trellis-ls` binary metadata to `packages/trellis/language-service/package.json`.
- [x] 3.2 Add or adjust Nx `build`, `typecheck`, `test`, `check`, and `repair` targets for the language-service CLI package.
- [x] 3.3 Implement the CLI entrypoint and command parser for canonical `diagnostics`, `fixes`, `apply`, and `check` commands.
- [x] 3.4 Implement shared command context for workspace root, project/file/workspace scope, format, source filters, fail thresholds, and metadata.
- [x] 3.5 Ensure JSON mode writes exactly one parseable JSON document to stdout and routes progress/human output away from JSON stdout.
- [x] 3.6 Add CLI smoke tests for help output and canonical command availability.

## 4. JSON Contracts

- [x] 4.1 Define Effect Schema-backed `TrellisLsCommandMetadata`.
- [x] 4.2 Define Effect Schema-backed `TrellisLsDiagnostic` and `TrellisLsDiagnosticsOutput`.
- [x] 4.3 Define Effect Schema-backed `TrellisLsFix` and `TrellisLsFixesOutput`.
- [x] 4.4 Define Effect Schema-backed `TrellisLsApplyOutput`.
- [x] 4.5 Define Effect Schema-backed `TrellisLsCheckOutput`.
- [x] 4.6 Add schema decode tests for every JSON output family.
- [x] 4.7 Add snapshot tests for representative diagnostics, fixes, apply, and check JSON output.

## 5. Upstream Effect Diagnostics And Fixes

- [x] 5.1 Wrap upstream TypeScript project/file loading for `--project` and `--file` scopes.
- [ ] 5.2 Run upstream Effect diagnostics through the vendored/adapted `LSP.getSemanticDiagnosticsWithCodeFixes` path.
- [x] 5.3 Normalize upstream diagnostics into `source: "effect"` and `effect/<ruleName>` codes with stable diagnostic IDs.
- [x] 5.4 Normalize upstream quickfixes into `text-edit` and `workspace-edit` fixes with deterministic fix IDs.
- [x] 5.5 Render quickfix previews and diffs without writing files.
- [x] 5.6 Add a fixture that triggers an upstream Effect diagnostic such as `floatingEffect`.
- [x] 5.7 Add a fixture that verifies an upstream Effect quickfix appears in `trellis-ls fixes --format json`.

## 6. Trellis Recipe Diagnostics

- [x] 6.1 Refactor language-service recipes from editor-first projections to CLI-first diagnostics/fixes/apply/check projections.
- [x] 6.2 Reuse `ProgramDiagnostics`, `ProgramFactQuery`, and `ProgramFactProjection` for existing program fact diagnostics.
- [x] 6.3 Add generated artifact ownership and freshness diagnostics using recipe/projection/generated artifact facts.
- [x] 6.4 Add Nx target ownership/projection diagnostics using existing project JSON and ProjectionRegistry facts.
- [x] 6.5 Add no-compat package-local script diagnostics.
- [x] 6.6 Add ManagedRecipe/Alchemy substrate and review-gate diagnostics.
- [x] 6.7 Add DB receipt-spine and private-ledger boundary diagnostics.
- [x] 6.8 Add feasible Tend linkage diagnostics for missing recipe/run/receipt/observation identity.
- [x] 6.9 Add tests proving oxlint-derived invariants are exposed as Trellis diagnostics while oxlint remains transitional.

## 7. Repair Plans

- [x] 7.1 Normalize `ProgramRepairAction` and `RecipeRepair` into Trellis `text-edit`, `workspace-edit`, `nx-repair`, and `manual` fixes.
- [x] 7.2 Implement deterministic fix ID generation from diagnostic ID, fix kind, payload, and affected files.
- [x] 7.3 Prefer public `nx run <project>:repair` or `nx run workspace:repair` commands for structural repairs.
- [x] 7.4 Serialize direct internal generator repairs only when the diagnostic explicitly requires them.
- [x] 7.5 Filter direct generated/cache/descriptor file edits when repair should route through a recipe/generator/Nx target.
- [x] 7.6 Add tests for `trellis-ls fixes --diagnostic-id <id>` and project-wide `trellis-ls fixes`.
- [x] 7.7 Add Nx repair command serialization tests.

## 8. Safe Apply

- [x] 8.1 Implement fix lookup by recomputing diagnostics and fixes for the current command scope.
- [x] 8.2 Implement `apply --mode diff` for text edits, workspace edits, and Nx repair command previews without writing.
- [x] 8.3 Implement `apply --mode write` for safe `text-edit` and `workspace-edit` fixes.
- [x] 8.4 Implement `apply --mode write` for safe public `nx-repair` commands.
- [x] 8.5 Implement refusal metadata and exit code `1` for unsafe, review-required, manual, destructive, infrastructure, live DB migration, and stale generated/cache/descriptor fixes.
- [x] 8.6 Implement stale/not-found fix metadata when a selected fix ID cannot be recomputed.
- [x] 8.7 Implement optional `--recheck` diagnostics/check follow-up.
- [x] 8.8 Add no-write tests for diff mode.
- [x] 8.9 Add safe write fixture tests.
- [x] 8.10 Add refused unsafe fix tests.

## 9. Receipts And Observations

- [x] 9.1 Add command evidence mode metadata for disabled, in-memory, file-backed, and durable store modes.
- [x] 9.2 Record diagnostic run summary observations through `RecipeReceiptStore` when configured.
- [x] 9.3 Record fix listing, applied fix, refused fix, Nx repair result, upstream quickfix result, generated freshness result, and check summary observations when configured.
- [x] 9.4 Ensure basic diagnostics, fixes, apply diff, safe local apply, and check run without live Postgres.
- [x] 9.5 Add tests proving no language-service-specific ledger or schema is created.

## 10. Public Contract Guardrails

- [x] 10.1 Update package docs or README to document CLI commands, JSON stdout, and exit codes as the stable agent contract.
- [x] 10.2 Avoid documenting public TypeScript imports as agent API.
- [x] 10.3 Add or update import-boundary tests preventing product packages from importing language-service internals.
- [x] 10.4 Ensure `effect-oxlint` remains described as transitional CI pressure rather than the permanent repair API.
- [x] 10.5 Ensure package-local `scripts/` workflows are not reintroduced.

## 11. Validation

- [x] 11.1 Run `pnpm exec nx run framework-language-service:typecheck --output-style=static`.
- [x] 11.2 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [x] 11.3 Run `pnpm exec nx run framework-language-service:build --output-style=static`.
- [x] 11.4 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [x] 11.5 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [x] 11.6 Run `pnpm exec nx run workspace:policy-fast --output-style=static`.
- [x] 11.7 Run `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`.
- [x] 11.8 Run `trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json`.
- [x] 11.9 Run `trellis-ls apply --project <fixture-tsconfig> --fix-id <safe-fixture-fix> --mode diff --format json`.
- [x] 11.10 Run `trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json`.
- [x] 11.11 Run `openspec validate fork-effect-language-service-for-trellis-cli --strict`.

## 12. Recipe-Only Source Migration Dogfood

- [x] 12.1 Update OpenSpec proposal, design, delta specs, and tasks to include recipe-only source migration scope.
- [x] 12.2 Add protocol-level `defineRecipePackage` without recreating the old authored ProjectFacts symbol graph.
- [x] 12.3 Add protocol-level `defineProjectionRecipe`, `defineDiagnosticRecipe`, `defineRepairRecipe`, `defineObservationRecipe`, and `defineInvocationRecipe` as typed wrappers over `RecipeDefinition`.
- [x] 12.4 Refactor `packages/trellis/language-service/src/recipes.ts` to dogfood `defineRecipePackage` and specialized Recipe-family builders.
- [x] 12.5 Remove or quarantine `packages/trellis/language-service/src/attune.package.ts` after equivalent recipe package metadata exists.
- [x] 12.6 Add `--profile recipe-only-source` to diagnostics/check command context and JSON metadata.
- [x] 12.7 Move Trellis migration diagnostic logic from hardcoded CLI helpers into DiagnosticRecipe-owned modules.
- [x] 12.8 Move Trellis migration repair planning from hardcoded CLI helpers into RepairRecipe-owned modules.
- [x] 12.9 Add diagnostics for authored `attune.package.ts`, unowned source files, workflow code outside InvocationRecipe, generated output outside ProjectionRecipe, diagnostic logic outside DiagnosticRecipe, repair logic outside RepairRecipe, observation emission outside ObservationRecipe, and legacy ProjectFacts authored truth.
- [x] 12.10 Add fix plans for deleting/migrating language-service `attune.package.ts`, attaching unowned files to existing recipes, scaffolding InvocationRecipe/ProjectionRecipe declarations, and converting hardcoded diagnostic/fix helpers into DiagnosticRecipe/RepairRecipe declarations.
- [x] 12.11 Add tests for recipe-only profile diagnostics, fixes, apply diff, and refusal behavior.
- [x] 12.12 Run `pnpm exec trellis-ls diagnostics --workspace . --profile recipe-only-source --format json`.
