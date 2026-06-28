## Context

`packages/trellis/language-service` is currently a small recipe-shaped package named `@attune/framework-language-service`. It declares three editor-oriented recipes:

- `framework-language-service.program-diagnostic-view`
- `framework-language-service.recipe-health-view`
- `framework-language-service.typescript-projection`

The package projects `ProgramDiagnostics`, `ProgramFactQuery`, `RecipeDiagnostic`, `RecipeRepair`, and `RecipeReceipt` into editor-like diagnostics, code actions, code lenses, quick info, and TypeScript language-service shapes. It does not expose a real CLI, does not ship a binary, and only records a reference to upstream `@effect/language-service`.

The adjacent substrate is now strong enough for a headless repair surface:

- `@attune/framework-protocol` defines `Recipe`, `ManagedRecipe`, `RecipeInvocation`, `RecipeObservation`, `ProjectionRegistry`, `NxTargetProjection`, `ProgramDiagnostic`, `ProgramRepairAction`, and `RecipeRepair`.
- `@attune/framework-runtime` defines `ProgramDiagnostics`, `ProgramFactQuery`, `ProgramFactProjection`, `RecipeReceiptStore`, `PostgresRecipeReceiptStore`, and in-memory receipt store fallback.
- `packages/trellis/architecture` owns current framework policy checks and public Nx repair/check surfaces.
- `packages/trellis/oxlint-policy` currently holds deterministic policy pressure for generated ownership, Nx target ownership, script workflow cleanup, ManagedRecipe substrate, raw Postgres boundary, and private ledger linkage.

Upstream inventory taken from `Effect-TS/language-service`:

- Repository: `https://github.com/Effect-TS/language-service`
- Main commit inspected: `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee` (`2026-05-22T12:15:43+02:00`, "Preserve applicableGotoDefinition when ancestor type cannot be resolved (#740)")
- Published package inspected: `@effect/language-service@0.86.2`
- License: MIT, copyright Effectful Technologies Inc.
- Useful source surfaces: `src/cli.ts`, `src/cli/diagnostics.ts`, `src/cli/quickfixes.ts`, `src/cli/check.ts`, `src/cli/utils.ts`, `src/core/**`, `src/diagnostics/**`, `src/refactors/**`, `src/codegens/**`, `src/completions/**`, `src/goto/**`, `src/inlays/**`, `src/quickinfo/**`, `src/renames/**`, and `test/**`.
- Useful implementation facts: upstream uses `@typescript-eslint/project-service` for project/file loading, `effect/unstable/cli` for commands, `LSP.getSemanticDiagnosticsWithCodeFixes` for Effect diagnostics and quickfix collection, and TypeScript `ChangeTracker` to render quickfix text changes.

Preflight observations for this proposal:

- `pnpm exec nx show projects` includes `framework-language-service`.
- `openspec list --json` shows `arbor-recipe-substrate-migration` and `effect-oxlint-recipe-substrate-clean-fork` complete, with this new change scaffolded.
- `find packages -path '*/scripts/*' -type f` currently reports no live package-local script files in this working tree.
- The worktree is already dirty from the prior clean-fork slice, so implementation must preserve unrelated edits.

## Goals / Non-Goals

**Goals:**

- Provide `trellis-ls` as the stable public agent repair interface.
- Reuse upstream Effect language-service diagnostics and quickfix machinery without importing unstable upstream deep paths at runtime.
- Normalize TypeScript, Effect, and Trellis diagnostics into Effect Schema-backed JSON contracts.
- Express every command as a recipe pipeline, even when implementation collapses steps for performance.
- Re-express durable oxlint policy invariants as Trellis diagnostic recipes and fix plans.
- Prefer public Nx repair surfaces for structural fixes.
- Make `apply --mode diff` no-write and `apply --mode write` safe/refusal-gated.
- Record useful command observations through the existing receipt/observation spine when configured, with in-memory/file fallback.

**Non-Goals:**

- No VS Code extension, editor UI, or tsserver protocol integration.
- No public TypeScript import API for agents.
- No package rename to `@attune/trellis-language-service` in this change.
- No live Postgres requirement for basic diagnostics/fixes/checks.
- No Kubernetes, NixOS, platform deployment, or external infrastructure mutation.
- No new private language-service ledger.
- No reintroduction of package-local `scripts/` workflows.
- No custom ManagedResource runtime separate from Alchemy-aligned ManagedRecipe metadata.
- No ContextLens, ContextPacket, vector selection, semantic compression, or agent memory work.

## Decisions

### Keep Package Identity, Add CLI Binary

Keep `packages/trellis/language-service` named `@attune/framework-language-service` and keep the Nx project name `framework-language-service` for the first fork. Add a `bin` entry named `trellis-ls` and a build target that emits executable CLI output.

Alternatives considered:

- Rename to `@attune/trellis-language-service` now. This is cleaner long-term, but it would require tsconfig path updates, package references, import-boundary tests, recipe catalog churn, and likely unrelated migration noise.
- Create a separate package. This would split the repair loop from the existing recipe-shaped language-service package and create a second ontology.

### Vendor Upstream Source Under a Clearly Attributed Subtree

Land upstream source under `packages/trellis/language-service/src/upstream-effect/**` with an `UPSTREAM.md` or equivalent attribution file containing repository URL, commit, package version, copied directories, license note, and local deviations. Prefer wrapper/adaptation modules outside the vendored subtree.

Initial copied/adapted directories should include upstream CLI utilities, core LSP machinery, diagnostics, refactors, quickinfo, codegens, completions, goto, inlays, renames, and focused tests/fixtures. Hidden/deferred upstream commands such as `patch`, `unpatch`, `setup`, `config`, `overview`, and `layerinfo` may be copied for future sync context but must not become public Trellis commands.

Alternatives considered:

- Import from `@effect/language-service/dist/*`. This depends on undocumented internal paths and is explicitly not acceptable for the agent repair contract.
- Flatten all upstream source into top-level `src`. This makes future upstream syncs harder and obscures which code is local adaptation.

### CLI Commands Are Recipe Pipelines

Implement command handlers as local recipe pipelines with stable recipe IDs:

- `trellis-language-service.workspace-inventory`
- `trellis-language-service.typescript-program`
- `trellis-language-service.upstream-effect-diagnostics`
- `trellis-language-service.upstream-effect-fixes`
- `trellis-language-service.recipe-registry-facts`
- `trellis-language-service.project-facts`
- `trellis-language-service.generated-artifact-facts`
- `trellis-language-service.nx-target-facts`
- `trellis-language-service.db-receipt-spine-facts`
- `trellis-language-service.tend-linkage-facts`
- `trellis-language-service.diagnostic-recipes`
- `trellis-language-service.repair-plan`
- `trellis-language-service.apply-repair`
- `trellis-language-service.diagnostics-json-projection`
- `trellis-language-service.fixes-json-projection`
- `trellis-language-service.apply-result-json-projection`
- `trellis-language-service.check-summary-projection`

The code may optimize by sharing TypeScript program/project-service loading and fact snapshots, but the recipe catalog and design vocabulary must preserve these roles.

### JSON Contracts Live With the CLI and Use Effect Schema

Define `TrellisLsDiagnosticsOutput`, `TrellisLsDiagnostic`, `TrellisLsFixesOutput`, `TrellisLsFix`, `TrellisLsApplyOutput`, `TrellisLsCheckOutput`, and `TrellisLsCommandMetadata` as Effect Schema-backed contracts in the language-service package. Exporting them for tests is acceptable, but docs and agent guidance must present CLI JSON as the stable API, not TypeScript imports.

If protocol reuse becomes necessary, move only neutral data contracts into `@attune/framework-protocol` in a later, explicit task. Do not make that move just to expose agent imports.

### Deterministic IDs, Recomputed Fix State

Diagnostic IDs are deterministic hashes over command scope, normalized source family, code, file, span, message fingerprint, recipe/projection identity, and relevant fact IDs. They must not include timestamps or run IDs.

Fix IDs are deterministic hashes over diagnostic ID, fix kind, upstream fix name or Trellis repair action ID, affected file list, command target, and edit/preview fingerprint. `trellis-ls apply` recomputes diagnostics and fixes for the same project/file scope and selects the matching fix ID. `.attune/cache/trellis-ls` may cache expensive previews, but cache is optimization only and not the source of truth.

### Fix Discovery Supports Diagnostic and Project Scope

`trellis-ls fixes` supports both targeted and broad modes:

- `--diagnostic-id <id>` returns fixes for one diagnostic.
- `--project` or `--file` without a diagnostic ID returns all discovered fixes in scope.

This keeps the closed loop precise while still letting agents inspect all safe options when no ID has been selected yet.

### Safe Apply Has a Narrow First-Class Surface

`apply --mode diff` renders a unified diff or command preview and never writes. `apply --mode write` applies exactly one safe fix when `safe: true` and `requiresReview: false`.

Allowed write-mode actions:

- `text-edit` and `workspace-edit` that do not target generated/cache/descriptor files except where the diagnostic specifically authorizes a safe generated ownership header edit.
- `nx-repair` when the command is a public repair/check surface such as `nx run <project>:repair` or `nx run workspace:repair` and the fix metadata marks it safe.

Refused write-mode actions:

- destructive lifecycle actions, deployment/apply/destroy operations, NixOS host mutation, Kubernetes mutation, live DB migration without an existing explicit guard, review-required ManagedRecipe action, direct generated/cache/descriptor edits that should route through repair, direct internal generator commands unless a diagnostic explicitly downgrades them to safe, and every `manual` fix.

### Receipts and Observations Are Optional Evidence

The CLI defaults to in-memory/file-backed evidence and emits command metadata in JSON. When a `RecipeReceiptStore` or configured file/store route is available, the CLI records useful `RecipeObservation` rows for diagnostic runs, fix lists, applied fixes, refused fixes, Nx repair results, generated freshness results, and check summaries.

No language-service-specific ledger is introduced. The Postgres route remains the existing `framework_core`, `framework_event`, and `framework_view` spine through runtime services.

## Risks / Trade-offs

- Upstream source is large and fast-moving -> Keep vendored code isolated, document the commit, and put local changes in wrappers whenever possible.
- CLI fork may accidentally expose a TypeScript library API -> Keep docs and tests focused on `trellis-ls`; retain import-boundary policy coverage for product imports.
- Recomputing fixes could fail if the workspace changes between `fixes` and `apply` -> Return machine-readable not-found/stale-fix metadata and require the agent to rerun diagnostics/fixes.
- Running Nx repair from write mode could become too powerful -> Allow only public safe targets by default and refuse review-required or destructive actions.
- Trellis diagnostics could duplicate oxlint output during migration -> Use stable `source` and `code` families, and treat oxlint as temporary pressure until replacement diagnostics are covered.
- JSON contract churn could break agents -> Version outputs with `schemaVersion: 1`, add schema decode tests, and snapshot command output.
- Basic diagnostics must run without Postgres -> Keep DB-backed receipt emission optional and test the no-DB path.
- Current dirty worktree may contain unrelated migration edits -> Implementation tasks require `git status --short` before edits and must not revert unrelated files.

## Migration Plan

### Phase 0: Preflight

Run and record:

- `git status --short`
- `pnpm exec nx show projects`
- `openspec list --json`
- `pnpm exec nx run workspace:policy-fast --output-style=static`
- `pnpm exec nx run framework-language-service:test --output-style=static`
- `pnpm exec nx run framework-protocol:test --output-style=static`
- `pnpm exec nx run framework-runtime:test --output-style=static`
- `find packages -path '*/scripts/*' -type f | sort`

Document existing failures before implementation.

### Phase 1: Upstream Landing

Copy/adapt upstream source into `src/upstream-effect/**`, add attribution, add required dependencies, and preserve license notices. Do not expose upstream commands directly.

### Phase 2: CLI Contracts and Entry Point

Add `trellis-ls` binary, command parser, common command context, JSON schemas, text formatter, exit-code handling, and tests that execute the built/local CLI.

### Phase 3: Effect Diagnostics and Fixes

Wrap upstream project/file loading, diagnostics, and quickfix collection. Normalize upstream diagnostics to `source: "effect"` and fixes to `text-edit` or `workspace-edit` with previews.

### Phase 4: Trellis Fact Diagnostics

Reuse existing protocol/runtime/architecture/oxlint-policy logic to produce Trellis diagnostic families for generated ownership, Nx target ownership/projection, no-compat scripts, ManagedRecipe/Alchemy substrate, DB receipt-spine boundaries, private ledger linkage, and feasible Tend linkage.

### Phase 5: Repair Plans and Apply

Normalize `ProgramRepairAction` and `RecipeRepair` into Trellis fixes, prefer public Nx repair commands, implement diff/write modes, enforce refusals, and recheck when requested.

### Phase 6: Receipt/Observation Integration

Record optional observations through `RecipeReceiptStore` or the configured no-DB store. Keep JSON output useful when no store is configured.

### Phase 7: Recipe Refocus and Validation

Replace the editor-first recipes in `src/recipes.ts` and `src/attune.package.ts` with CLI-first recipes and runtime roots. Update tests and run the validation plan.

Rollback is source-level only: remove the new binary, vendored upstream subtree, CLI contracts, and recipe refocus changes. No durable DB migration is required by the basic CLI path.

## Validation Plan

Required implementation gates:

- `pnpm exec nx run framework-language-service:typecheck --output-style=static`
- `pnpm exec nx run framework-language-service:test --output-style=static`
- `pnpm exec nx run framework-language-service:build --output-style=static`
- `pnpm exec nx run framework-protocol:test --output-style=static`
- `pnpm exec nx run framework-runtime:test --output-style=static`
- `pnpm exec nx run workspace:policy-fast --output-style=static`
- `openspec validate fork-effect-language-service-for-trellis-cli --strict`

Required CLI smoke tests:

- `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`
- `trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json`
- `trellis-ls apply --project <fixture-tsconfig> --fix-id <safe-fixture-fix> --mode diff --format json`
- `trellis-ls check --project packages/trellis/language-service/tsconfig.json --format json`

Required test categories:

- JSON schema decode tests.
- CLI diagnostics, fixes, apply, and check tests.
- `apply --mode diff` no-write test.
- `apply --mode write` safe edit fixture test.
- refused unsafe fix test.
- upstream Effect diagnostic/fix fixture test.
- Trellis recipe diagnostic fixture test.
- Nx repair command fix serialization test.
- no public programmatic API/import-contract test where practical.
- snapshot tests for JSON output.

## Open Questions

1. Package name: keep `@attune/framework-language-service` for this change; revisit rename after the CLI is stable.
2. Upstream location: use `src/upstream-effect/**` with attribution and local wrappers outside that subtree.
3. Upstream commands: expose only Trellis canonical commands; keep upstream `patch`, `unpatch`, `setup`, `config`, `overview`, `layerinfo`, and raw `codegen` hidden/deferred.
4. Diagnostic ID stability: deterministic hash of normalized diagnostic identity, not run time.
5. Fix state: recompute from deterministic IDs; use `.attune/cache/trellis-ls` only as optional optimization.
6. `fixes` scope: support both `--diagnostic-id` and whole project/file listing.
7. `apply --mode write`: implement safe text/workspace edits and safe public Nx repairs in the first pass; refuse everything review-required or unsafe.
8. Observations: emit to `RecipeReceiptStore` only when configured, otherwise include command metadata and optional file/in-memory evidence.
9. Upstream quickfix normalization: convert TypeScript `FileTextChanges` to `text-edit` for one file and `workspace-edit` for multiple files, with generated-file safety filtering.
10. Runtime reuse: reuse `ProgramDiagnostics`, `ProgramFactQuery`, `ProgramFactProjection`, `RecipeReceiptStore`, `RecipeRepairPlan`, `NxTarget`, architecture policy checks, and oxlint rule logic where practical instead of duplicating fact interpretation.
