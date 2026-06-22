# attune-nx-migration-agent Handoff

## Changed

- Added `packages/attune-nx/src/attune.package.ts` as the canonical
  Effect Schema-backed `attune-nx` package contract.
- Added `packages/attune-nx/src/attune.package.typecheck.ts` with
  compile-only assertions for package contract validity, exact handler maps,
  exact property maps, layer metadata, test layer metadata, and type-guidance
  completeness.
- Added `packages/attune-nx/test/attune-package-contract.test.ts` covering
  operation ids, package views, runtime contract decoding, exact handler and
  property maps, inferred law alignment, and type-guidance partitions.
- Added `packages/attune-nx/vitest.config.ts` so package tests resolve
  `@attune/architecture` to the source package-contract kernel instead of the
  stale root dist bundle.
- Updated `packages/attune-nx/attune.source-bom.json` with the
  `@attune/nx:package-contract` entry for the contract and assertion module.
- Updated `packages/attune-nx/package.json` and `pnpm-lock.yaml` so
  `@attune/nx` declares the contract kernel/runtime dependencies it now imports:
  `@attune/architecture` and `effect`.
- Updated `packages/attune-nx/tsconfig.json` so typecheck resolves the source
  package-contract kernel and can typecheck this cross-package contract slice.
- Marked OpenSpec task `9.1` complete.

## Generated / Contract Shape

- The contract keeps the generated `@attune/nx:package-contract` module shape:
  `PackageContractSchema`, `PackageViews`, operation schemas,
  `PackageContract`, `PackageLayer`, `PackageTestLayer`,
  `PackageFuzzHandlers`, `PackageProperties`, `PackageTypeGuidance`, and a
  compile-only assertion module.
- Public operations now cover:
  - `generate-effect-service`
  - `generate-package-contract`
  - `generate-atom-view`
  - `query-generator-inventory`
  - `infer-package-contract-graph`
  - `upsert-source-bom-provenance`
  - `normalize-executor-intent`
- Package views include generator plan, generated diff, provenance, contract
  graph, generator inventory, and executor intent atoms/Reactivity keys.

## Validated

- `nx run attune-nx:typecheck`
- `nx run attune-nx:test -- --run test/attune-package-contract.test.ts`
- `nx run workspace:package-contracts-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/attune-nx/src/attune.package.ts packages/attune-nx/src/attune.package.typecheck.ts packages/attune-nx/test/attune-package-contract.test.ts packages/attune-nx/attune.source-bom.json packages/attune-nx/package.json packages/attune-nx/tsconfig.json packages/attune-nx/vitest.config.ts pnpm-lock.yaml`

## Not Run

- Full `nx run attune-nx:test`; this slice ran the focused package-contract
  test plus package typecheck and workspace package-contract conformance.
- `nx run attune-nx:build`; build output is not required for this contract
  slice and the repo is still using source aliases during the in-place
  migration.

## Package Contract Status

- `attune-nx` is contract-bearing and passes its local compile-only contract
  assertions.
- Runtime tests decode `PackageContract` through `PackageContractSchema` and
  assert the exact handler/property maps against the operation list.
- The Source BOM shard records the package-contract ownership entry with
  options hash `fnv1a32:7c940244`.

## Blockers / Residual Debt

- Direct `nx generate @attune/nx:package-contract ...` failed before writing
  files because Nx executed the TS generator source and then could not resolve
  source-local `.js` imports such as `src/internal/paths.js`. The contract was
  customized from the generated module shape manually for this slice.
- `@attune/architecture` package root dist still does not expose the Phase 1
  package-contract kernel from its package root bundle. `attune-nx` uses
  source-level aliases for typecheck and Vitest until the architecture package
  public build/export surface is cleaned up by its migration owner.
- `packages/attune-nx/project.json` still uses raw `nx:run-commands` targets.
  That is task `9.4` / tooling command-surface ownership, not this package
  contract slice.

## Next-Agent Recommendations

- Tooling validation agent should run full `nx run attune-nx:test` after the
  other Phase 4 tooling contracts land.
- Architecture migration owner should make `@attune/architecture` package root
  exports match the source package-contract kernel so package consumers do not
  need source aliases long term.
- Command-surface owner should replace or explicitly block remaining
  `attune-nx` raw `run-commands` targets with typed `attune:*` executors.
