Changed:
- Migrated supported product package `typecheck`, `typecheck:classic`, `lint`, and `test` targets in `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`, and `attune-pi-agent` from `nx:run-commands` to `@attune/nx` typed executors.
- Migrated `attune-foldkit:build` to `@attune/nx:toolchain` for Vite build.
- Migrated `attune-pi-agent:property` and `attune-pi-agent:mutation` to `@attune/nx:toolchain`.
- Migrated `cocoindex-effect:check-generated` to `@attune/nx:generated` while preserving its dependency on the existing generation target.

Generated files:
- None.

Validated:
- `nx run-many -t typecheck -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent` passed.
- `nx run-many -t test -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent --excludeTaskDependencies` passed.
- `nx run-many -t typecheck:classic -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent` passed.
- `nx run cocoindex-effect:check-generated --excludeTaskDependencies` passed.
- `nx run attune-foldkit:build --excludeTaskDependencies` passed.
- `nx run attune-pi-agent:property` passed.
- Direct `pnpm exec tsx scripts/generate-cocoindex-mcp-types.ts` from `packages/cocoindex-effect` passed.

Validation failures:
- `nx run-many -t test -p attuned-discovery,cocoindex-effect,attune-foldkit,attune-pi-agent` failed before three product test targets ran because dependency `attune-architecture:build` fails in `src/package-contract/validation.ts` with `exactOptionalPropertyTypes` around `OperationLawInput.views`.
- `nx run attune-foldkit:build` failed before the product build ran for the same `attune-architecture:build` error.
- `nx run cocoindex-effect:check-generated` failed in dependency `cocoindex-effect:emit-mcp-schema`.
- `nx run cocoindex-effect:emit-mcp-schema --verbose` failed because `packages/cocoindex-effect/scripts/generationStage.ts` calls `spawnSync("pnpm exec tsx", ...)`; Node treats that as one executable name. The direct underlying generator command succeeds.

Not run:
- `nx run attune-pi-agent:mutation`; this is the heavy Stryker campaign and was not required for the focused validation slice.

Package contract status:
- `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`, and `attune-pi-agent` already have migrated package contracts for this product-command slice.

Residual migration debt:
- `@attune/nx:toolchain` needs a behaviorful `tsup` build adapter before these product `build` or `build:lib` targets can drop raw command strings:
  - `attuned-discovery:build`
  - `cocoindex-effect:build`
  - `attune-foldkit:build:lib`
  - `attune-pi-agent:build`
- `@attune/nx:toolchain` needs a behaviorful `vite:serve` adapter with typed host/port options before `attune-foldkit:serve` can drop its raw command string.
- `@attune/nx:generated` needs behaviorful sync/scaffold adapters for package-local generation stages and Nx generator invocation before CocoIndex MCP generation targets can drop raw command strings:
  - `cocoindex-effect:inspect-cocoindex-mcp`
  - `cocoindex-effect:emit-mcp-schema`
  - `cocoindex-effect:scaffold-mcp-search-tool`
  - `cocoindex-effect:sync-mcp-tools`
  - `cocoindex-effect:generate`
- MCP remains an optional CocoIndex adapter surface in this handoff; it is not promoted as a core Attune Framework concept.
- Package-local `package.json` files for the four product packages do not define `scripts`, so there were no package-local script entries to remove in this slice.

Blockers:
- Do not remove the raw targets listed above until the missing typed adapters can execute the same behavior with `dryRun: false`; replacing them with dry-run intent-only targets would break package command behavior.
- Fix `packages/cocoindex-effect/scripts/generationStage.ts` or replace it with a typed generated adapter before relying on `cocoindex-effect:generate` as a passing dependency.
- Fix the upstream `attune-architecture:build` TypeScript error before dependency-inclusive product test/build validation can pass.

Next-agent recommendations:
- Add `@attune/nx:toolchain` adapters for `typescript:build` or `bundler:build` backed by `tsup`, and `vite:serve`.
- Add `@attune/nx:generated` behaviorful sync/scaffold support for explicit generator invocations and package generation-stage adapters, with typed outputs and provenance.
- After those adapters land, rerun this product-command cleanup and remove the remaining raw `nx:run-commands` surfaces.
