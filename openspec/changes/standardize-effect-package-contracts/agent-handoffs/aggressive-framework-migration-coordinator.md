Agent: aggressive-framework-migration-coordinator
Wave: Phase 0 preflight + Phase 1A framework foundation slice
Ownership:
- Coordinated preflight subagents for workspace inventory, baseline validation, and architecture rename planning.
- Added the first root `framework/` project ring outside `packages/`.
- Integrated focused architecture-policy helpers for framework import boundaries and no checked-in protocol reports.
- Coordinated Phase 2 import-migration subagents for existing tooling/product package contracts.

Changed:
- Added root framework projects:
  - `framework/protocol`
  - `framework/runtime`
  - `framework/sqlite`
  - `framework/language-service`
  - `framework/nx`
  - `framework/testing`
- Added `framework/*` to `pnpm-workspace.yaml`.
- Added TypeScript path aliases for `@attune/framework-protocol`, `@attune/framework-runtime`, `@attune/framework-sqlite`, `@attune/framework-language-service`, `@attune/framework-nx`, and `@attune/framework-testing`.
- Added gitignored local protocol cache paths under `.attune/cache/`.
- Added a public `@attune/framework-protocol` facade that currently bridges to the existing `@attune/architecture` package-contract kernel and exposes `defineAttunePackage`, `views`, and kind-specific operation builders.
- Added minimal framework runtime projection from obligations/evidence/generated-artifact state into internal deltas and diagnostics.
- Added minimal framework SQLite/cache store API with in-memory test store and default `.attune/cache/protocol.sqlite` path.
- Added minimal language-service action/code-lens helpers over protocol diagnostics.
- Added minimal framework Nx action-plan helper for deterministic materialization code actions.
- Added minimal framework testing helpers for operation registries, evidence producers, and atom graph observations.
- Exported new architecture-policy helpers from `@attune/architecture`:
  - `framework-import-boundary`
  - `framework-no-report-policy`
- Updated `@attune/nx:package-contract` output to import the public contract DSL from `@attune/framework-protocol`.
- Migrated existing tooling/product package contract files and contract tests from direct `@attune/architecture` imports to `@attune/framework-protocol`:
  - `attune-nx`
  - `effect-oxlint-policy`
  - `attuned-discovery`
  - `cocoindex-effect`
  - `attune-foldkit`
  - `attune-pi-agent`
- Added package Vitest source aliases for `@attune/framework-protocol`, retaining `@attune/architecture` aliases only as bridge support while the framework facade re-exports the current kernel.

Generated:
- No checked-in protocol reports, ProtocolDelta reports, evidence summaries, or architecture summary artifacts were generated.
- No local SQLite database was generated.
- Framework tests are source fixtures only.

Validated:
- `openspec validate standardize-effect-package-contracts --type change` passed.
- `nx show projects | rg "framework"` showed all six framework projects.
- `git check-ignore -v .attune/cache/protocol.sqlite .attune/cache/protocol/example.json` confirmed cache paths are ignored.
- `nx run-many -t typecheck -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing` passed.
- `nx run-many -t test -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing` passed.
- `nx run attune-architecture:typecheck` passed.
- `nx run attune-architecture:test -- test/framework-import-boundary.test.ts test/framework-no-report-policy.test.ts` passed.
- `nx run attune-architecture:test` passed, 11 files / 66 tests.
- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test` passed, 10 files / 44 tests.
- `nx run attune-nx:test -- test/package-contract-generator.test.ts` passed after the generator template switched to `@attune/framework-protocol`.
- `nx run-many -t typecheck -p attune-nx,effect-oxlint-policy,attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent` passed.
- `nx run-many -t test -p attune-nx,effect-oxlint-policy,attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent` passed.
- `nx run workspace:package-contracts-check` passed.
- `rg` confirmed migrated package-contract source/typecheck/test files no longer import `@attune/architecture` directly.
- `git diff --check` passed.

Not run:
- Full repo typecheck/test was not run for this slice.
- `workspace:policy-fast` and `workspace:policy-proof-pressure` were not run.
- Real SQLite/Drizzle lifecycle tests were not run because this slice only added the framework scaffold and in-memory store seam.

Contract status:
- The root framework ring now exists and is visible to Nx.
- Product package contracts remain on the existing `@attune/architecture` import surface for now.
- Existing migrated tooling/product package contracts now import the preferred `@attune/framework-protocol` public DSL.
- The framework protocol facade is a bridge over the current architecture package-contract kernel; it is not yet the final physical home of the type kernel.
- `workspace:package-contracts-check` remains green with framework projects present.

Residual migration debt:
- The framework project `typecheck` and `test` targets still use `nx:run-commands` because the current repo target grammar has not yet completed the typed executor migration. This is non-final Phase 7 debt.
- `framework/runtime` is a minimal pure projection seam, not real `Effect.Service` / `Layer` implementation yet.
- `framework/sqlite` is an in-memory seam and cache-path contract, not a real SQLite/Drizzle store yet.
- `framework/language-service` exposes helper functions, not a TypeScript language-service plugin/server yet.
- `framework/nx` exposes action plans only; real generators/executors/materializers still need to move from `packages/attune-nx` into `framework/nx` or be bridged deliberately.
- `framework/testing` exposes operation/evidence helpers only; it does not yet bridge FastCheck, workers, coverage search, replay, or atom graph observers.
- Import-boundary and no-report helpers are tested and exported but not wired as required workspace gates. Wiring the import-boundary rule immediately would currently flag existing product raw Drizzle usage in `packages/attuned-discovery/src/memory/schema.ts`; that should be addressed or explicitly waived in the product migration slice.
- `packages/attune-architecture-lint` still physically exists; the rename-plan agent recommends the physical move to `packages/attune-architecture` in Phase 8 after the framework protocol extraction stabilizes.
- Source BOM and generator-shape manifests remain migration scaffolding and have not been replaced by framework diagnostics/local cache.
- Proof packages and platform/resource packages still lack package contracts.

Blocked by:
- No hard blocker for the next slice.
- The main ordering constraint is to avoid turning new guardrails into required workspace failures before package-local Drizzle/runtime/import debts are either migrated or waived.

Next agent:
- `framework-protocol-core-agent` should move the package-contract kernel into `framework/protocol` or create a stricter final bridge, then migrate a small tooling-package consumer set to import `@attune/framework-protocol`.
- `framework-runtime-agent` and `framework-sqlite-agent` should replace the current seams with real Effect services/layers and SQLite/Drizzle store lifecycle.
- `framework-nx-materializer-agent` should implement real deterministic materialization/generator targets, using the now-green `@attune/nx:package-contract` source-mode test as the migration baseline.
- `framework-information-hiding-validation-agent` should wire the new import-boundary/no-report helpers into a diagnostic target after the current product raw Drizzle boundary is migrated or waived.
