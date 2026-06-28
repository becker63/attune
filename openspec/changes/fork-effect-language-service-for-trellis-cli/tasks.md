## 1. Preflight And Inventory

- [ ] 1.1 Run `git status --short` and record unrelated dirty worktree state before editing.
- [ ] 1.2 Run `pnpm exec nx show projects` and confirm `framework-language-service`, `framework-protocol`, `framework-runtime`, and `workspace` are present.
- [ ] 1.3 Run `openspec list --json` and confirm this change is active alongside any completed predecessor changes.
- [ ] 1.4 Run baseline `pnpm exec nx run framework-language-service:test --output-style=static` and record existing failures.
- [ ] 1.5 Run baseline `pnpm exec nx run framework-protocol:test --output-style=static` and record existing failures.
- [ ] 1.6 Run baseline `pnpm exec nx run framework-runtime:test --output-style=static` and record existing failures.
- [ ] 1.7 Run baseline `pnpm exec nx run workspace:policy-fast --output-style=static` and record existing failures.
- [ ] 1.8 Run `find packages -path '*/scripts/*' -type f | sort` and record any package-local script regressions.

## 2. Upstream Effect Fork Landing

- [ ] 2.1 Copy/adapt upstream Effect language-service source from `Effect-TS/language-service` into `packages/trellis/language-service/src/upstream-effect/**`.
- [ ] 2.2 Add upstream attribution documenting repository URL, commit `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`, package version `0.86.2`, MIT license, copied directories, and local deviations.
- [ ] 2.3 Add package dependencies needed by the fork, including TypeScript project-service and Effect platform runtime dependencies where required.
- [ ] 2.4 Keep upstream editor patch/setup/config commands hidden or deferred from the public `trellis-ls` command surface.
- [ ] 2.5 Add tests that prove no runtime imports use undocumented `@effect/language-service/dist/*` paths.

## 3. Package CLI Surface

- [ ] 3.1 Add `trellis-ls` binary metadata to `packages/trellis/language-service/package.json`.
- [ ] 3.2 Add or adjust Nx `build`, `typecheck`, `test`, `check`, and `repair` targets for the language-service CLI package.
- [ ] 3.3 Implement the CLI entrypoint and command parser for canonical `diagnostics`, `fixes`, `apply`, and `check` commands.
- [ ] 3.4 Implement shared command context for workspace root, project/file/workspace scope, format, source filters, fail thresholds, and metadata.
- [ ] 3.5 Ensure JSON mode writes exactly one parseable JSON document to stdout and routes progress/human output away from JSON stdout.
- [ ] 3.6 Add CLI smoke tests for help output and canonical command availability.

## 4. JSON Contracts

- [ ] 4.1 Define Effect Schema-backed `TrellisLsCommandMetadata`.
- [ ] 4.2 Define Effect Schema-backed `TrellisLsDiagnostic` and `TrellisLsDiagnosticsOutput`.
- [ ] 4.3 Define Effect Schema-backed `TrellisLsFix` and `TrellisLsFixesOutput`.
- [ ] 4.4 Define Effect Schema-backed `TrellisLsApplyOutput`.
- [ ] 4.5 Define Effect Schema-backed `TrellisLsCheckOutput`.
- [ ] 4.6 Add schema decode tests for every JSON output family.
- [ ] 4.7 Add snapshot tests for representative diagnostics, fixes, apply, and check JSON output.

## 5. Upstream Effect Diagnostics And Fixes

- [ ] 5.1 Wrap upstream TypeScript project/file loading for `--project` and `--file` scopes.
- [ ] 5.2 Run upstream Effect diagnostics through the vendored/adapted `LSP.getSemanticDiagnosticsWithCodeFixes` path.
- [ ] 5.3 Normalize upstream diagnostics into `source: "effect"` and `effect/<ruleName>` codes with stable diagnostic IDs.
- [ ] 5.4 Normalize upstream quickfixes into `text-edit` and `workspace-edit` fixes with deterministic fix IDs.
- [ ] 5.5 Render quickfix previews and diffs without writing files.
- [ ] 5.6 Add a fixture that triggers an upstream Effect diagnostic such as `floatingEffect`.
- [ ] 5.7 Add a fixture that verifies an upstream Effect quickfix appears in `trellis-ls fixes --format json`.

## 6. Trellis Recipe Diagnostics

- [ ] 6.1 Refactor language-service recipes from editor-first projections to CLI-first diagnostics/fixes/apply/check projections.
- [ ] 6.2 Reuse `ProgramDiagnostics`, `ProgramFactQuery`, and `ProgramFactProjection` for existing program fact diagnostics.
- [ ] 6.3 Add generated artifact ownership and freshness diagnostics using recipe/projection/generated artifact facts.
- [ ] 6.4 Add Nx target ownership/projection diagnostics using existing project JSON and ProjectionRegistry facts.
- [ ] 6.5 Add no-compat package-local script diagnostics.
- [ ] 6.6 Add ManagedRecipe/Alchemy substrate and review-gate diagnostics.
- [ ] 6.7 Add DB receipt-spine and private-ledger boundary diagnostics.
- [ ] 6.8 Add feasible Tend linkage diagnostics for missing recipe/run/receipt/observation identity.
- [ ] 6.9 Add tests proving oxlint-derived invariants are exposed as Trellis diagnostics while oxlint remains transitional.

## 7. Repair Plans

- [ ] 7.1 Normalize `ProgramRepairAction` and `RecipeRepair` into Trellis `text-edit`, `workspace-edit`, `nx-repair`, and `manual` fixes.
- [ ] 7.2 Implement deterministic fix ID generation from diagnostic ID, fix kind, payload, and affected files.
- [ ] 7.3 Prefer public `nx run <project>:repair` or `nx run workspace:repair` commands for structural repairs.
- [ ] 7.4 Serialize direct internal generator repairs only when the diagnostic explicitly requires them.
- [ ] 7.5 Filter direct generated/cache/descriptor file edits when repair should route through a recipe/generator/Nx target.
- [ ] 7.6 Add tests for `trellis-ls fixes --diagnostic-id <id>` and project-wide `trellis-ls fixes`.
- [ ] 7.7 Add Nx repair command serialization tests.

## 8. Safe Apply

- [ ] 8.1 Implement fix lookup by recomputing diagnostics and fixes for the current command scope.
- [ ] 8.2 Implement `apply --mode diff` for text edits, workspace edits, and Nx repair command previews without writing.
- [ ] 8.3 Implement `apply --mode write` for safe `text-edit` and `workspace-edit` fixes.
- [ ] 8.4 Implement `apply --mode write` for safe public `nx-repair` commands.
- [ ] 8.5 Implement refusal metadata and exit code `1` for unsafe, review-required, manual, destructive, infrastructure, live DB migration, and stale generated/cache/descriptor fixes.
- [ ] 8.6 Implement stale/not-found fix metadata when a selected fix ID cannot be recomputed.
- [ ] 8.7 Implement optional `--recheck` diagnostics/check follow-up.
- [ ] 8.8 Add no-write tests for diff mode.
- [ ] 8.9 Add safe write fixture tests.
- [ ] 8.10 Add refused unsafe fix tests.

## 9. Receipts And Observations

- [ ] 9.1 Add command evidence mode metadata for disabled, in-memory, file-backed, and durable store modes.
- [ ] 9.2 Record diagnostic run summary observations through `RecipeReceiptStore` when configured.
- [ ] 9.3 Record fix listing, applied fix, refused fix, Nx repair result, upstream quickfix result, generated freshness result, and check summary observations when configured.
- [ ] 9.4 Ensure basic diagnostics, fixes, apply diff, safe local apply, and check run without live Postgres.
- [ ] 9.5 Add tests proving no language-service-specific ledger or schema is created.

## 10. Public Contract Guardrails

- [ ] 10.1 Update package docs or README to document CLI commands, JSON stdout, and exit codes as the stable agent contract.
- [ ] 10.2 Avoid documenting public TypeScript imports as agent API.
- [ ] 10.3 Add or update import-boundary tests preventing product packages from importing language-service internals.
- [ ] 10.4 Ensure `effect-oxlint` remains described as transitional CI pressure rather than the permanent repair API.
- [ ] 10.5 Ensure package-local `scripts/` workflows are not reintroduced.

## 11. Validation

- [ ] 11.1 Run `pnpm exec nx run framework-language-service:typecheck --output-style=static`.
- [ ] 11.2 Run `pnpm exec nx run framework-language-service:test --output-style=static`.
- [ ] 11.3 Run `pnpm exec nx run framework-language-service:build --output-style=static`.
- [ ] 11.4 Run `pnpm exec nx run framework-protocol:test --output-style=static`.
- [ ] 11.5 Run `pnpm exec nx run framework-runtime:test --output-style=static`.
- [ ] 11.6 Run `pnpm exec nx run workspace:policy-fast --output-style=static`.
- [ ] 11.7 Run `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`.
- [ ] 11.8 Run `trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json`.
- [ ] 11.9 Run `trellis-ls apply --project <fixture-tsconfig> --fix-id <safe-fixture-fix> --mode diff --format json`.
- [ ] 11.10 Run `trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json`.
- [ ] 11.11 Run `openspec validate fork-effect-language-service-for-trellis-cli --strict`.
