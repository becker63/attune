# attune-foldkit Migration Agent Handoff

Agent: attune-foldkit-migration-agent

Wave: Phase 5 product package migration

Ownership:
- `packages/attune-foldkit/src/attune.package.ts`
- `packages/attune-foldkit/src/attune.package.typecheck.ts`
- `packages/attune-foldkit/test/attune-package-contract.test.ts`
- `packages/attune-foldkit/attune.source-bom.json` package-contract entries
- `packages/attune-foldkit/vitest.config.ts` package-local alias needed for
  the contract import
- `openspec/changes/standardize-effect-package-contracts/tasks.md`

Changed:
- Added the canonical Effect Schema package contract for `attune-foldkit`.
- Added `foldkit-ui` operations for:
  - `model-codec`
  - `message-update-command`
  - `view-model-query`
  - `fixture-route-command`
  - `fixture-route-query`
  - `activity-fixture-codec`
  - `mdx-fixture-codec`
  - `site-fixture-codec`
  - `workbench-snapshot-view-lens`
  - `foldkit-scene-atom`
  - `route-trace-atom`
  - `export-packet-atom`
- Added package views for current route, selected hypothesis/evidence, server
  snapshot lens, route trace, FoldKit scene, export packet, fixture route
  state, and WorkbenchSnapshot view atoms/Reactivity keys.
- Added model/update/view, fixture, activity, MDX/site, snapshot-lens, and
  atom-view schemas used by the package contract.
- Added `PackageLayer`, `PackageTestLayer`, exact `PackageFuzzHandlers`, exact
  `PackageProperties`, `PackageTypeGuidance`, coverage-search hints, and
  compile-only contract assertions.
- Added explicit waivers for the dev-only global fixture session and
  hand-authored FoldKit fixtures until the scoped service and fixture/scene
  generators land.
- Added focused package contract tests for operation ids, update/view metadata,
  fixture boundary metadata, view graph metadata, inferred laws/type guidance,
  and exact handler/property maps.
- Added a Vitest source alias for `@attune/architecture`.
- Added Source BOM package-contract provenance and `contractShards` entry for
  this package.
- Marked OpenSpec task `10.3` complete.

Generated / Contract Shape:
- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`
- `test/attune-package-contract.test.ts`
- Source BOM package-contract entry for `@attune/nx:package-contract`
- Package contract exports:
  `PackageContractSchema`, `PackageViews`, operation schemas,
  `PackageContract`, `PackageLayer`, `PackageTestLayer`,
  `PackageFuzzHandlers`, `PackageProperties`, and `PackageTypeGuidance`.

Validated:
- `nx run attune-foldkit:typecheck`
- `nx run attune-foldkit:test -- --run test/attune-package-contract.test.ts`
- `nx run attune-foldkit:test`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/attune-foldkit/src/attune.package.ts packages/attune-foldkit/src/attune.package.typecheck.ts packages/attune-foldkit/test/attune-package-contract.test.ts packages/attune-foldkit/vitest.config.ts packages/attune-foldkit/attune.source-bom.json`

Not green / not owned by this slice:
- `nx run workspace:package-contracts-check` currently fails in
  `workspace:shape-conformance`.
- `workspace:source-bom-check` passes.
- `workspace:shape-conformance` reports generated contract shards backed by
  root manifest package-contract shapes still marked `migrate` for:
  - `attune-foldkit`
  - `attune-pi-agent`
  - `attuned-discovery`
  - `cocoindex-effect`
- Root `attune.generator-shapes.json` product package-contract status updates
  are owned by the Phase 5 `product-ledger-agent`, not this package migration
  slice.

Not run:
- `workspace:policy-fast`
- `workspace:policy-proof-pressure`
- Runtime `@effect/rpc` imports, per Phase 5 compatibility constraint.

Package Contract Status:
- package: `attune-foldkit`
- kind: `foldkit-ui`
- `PackageContract`: present and Schema-decodable
- `PackageLayer`: present, minimal `Layer.empty` metadata wrapper
- `PackageTestLayer`: present, minimal `Layer.empty` metadata wrapper
- `attune.package.typecheck`: present and included in package typecheck
- exact `PackageFuzzHandlers`: present for all 12 operations
- exact `PackageProperties`: present for all 12 operations
- `PackageTypeGuidance`: present with schema, law, view, transform, and
  commit-tier coverage-search partitions for all 12 operations
- package views: current route, selected hypothesis, selected evidence, server
  snapshot lens, route trace, FoldKit scene, export packet, fixture route state,
  and WorkbenchSnapshot view atoms/Reactivity keys

Residual Migration Debt:
- `packages/attune-foldkit/project.json` still uses raw `nx:run-commands`
  targets for Vite, tsup, TypeScript, oxlint, and Vitest. This belongs to task
  `10.5`.
- `packages/attune-foldkit/package.json` still exposes package-local scripts.
  This belongs to task `10.5`.
- `src/fixture-route.ts` still has a dev-only global `activeSession`; the
  contract records this as a waiver until a scoped fixture route service lands.
- FoldKit scene, MDX, and site fixtures remain hand-authored until
  `@attune/nx:foldkit-scene-atom`, `@attune/nx:foldkit-atom-fixture`, and
  `@attune/nx:foldkit-mdx-fixture` exist.
- Root generator-shape status for `attune-foldkit.package-contract` still needs
  the product-ledger agent to flip from `migrate` to `generated`.

Blocked by:
- None for the package-local contract migration.
- Workspace package-contract gate remains blocked by Phase 5 root product
  ledger status reconciliation across product packages.

Next-Agent Recommendations:
- `product-ledger-agent`: update product package-contract shapes in
  `attune.generator-shapes.json` after all product package contracts land.
- `product-boundary-validation-agent`: keep the FoldKit contract discovery
  guard and include exact operation/type-guidance map assertions in the
  product boundary suite.
- `product-command-surface` / task `10.5`: replace remaining FoldKit
  package scripts and raw `nx:run-commands` with typed/inferred Nx targets.
- Future FoldKit generator agents: generate the scene atom, route fixture, MDX
  fixture, and site fixture families from `@attune/nx` rather than expanding
  hand-authored fixture shapes.
