# Phase 5 Handoff: `cocoindex-effect`

## Changed

- Added `packages/cocoindex-effect/src/attune.package.ts`.
- Added `packages/cocoindex-effect/src/attune.package.typecheck.ts`.
- Added `packages/cocoindex-effect/test/attune-package-contract.test.ts`.
- Updated `packages/cocoindex-effect/attune.source-bom.json` with the
  package-contract entry and contract shard.
- Updated `packages/cocoindex-effect/vitest.config.ts` with the local
  `@attune/architecture` source alias used by contract tests.
- Marked OpenSpec task `10.2` complete.

## Package Contract Status

- `PackageContractSchema`: exported from `@attune/architecture`.
- `PackageViews`: declares index freshness, search request/result, normalized
  anchors, anchor lookup, repository tool status, MCP tool registry, and
  command lifecycle Reactivity keys/atoms.
- `PackageContract`: present with package id `cocoindex-effect`, package kind
  `semantic-recall-service`, service ids for `CocoIndexClient` and
  `RepositoryIntelligence`, and 14 auditable operations.
- Operations cover `query`, `command`, `codec`, and `generator` kinds:
  client search/similar/get, fixture query, raw hit normalization, MCP result
  decoding, repository session/query/status, command lifecycle, MCP lifecycle,
  MCP schema emission, and MCP tool registry sync.
- `PackageLayer`: metadata-only live boundary that records required command,
  MCP, and Joern lifecycle inputs without spawning subprocesses.
- `PackageTestLayer`: deterministic fixture layer using `CocoIndexClientFixture`
  and fixture `RepositoryIntelligence`.
- `PackageFuzzHandlers`: exact operation map present.
- `PackageProperties`: exact operation map present.
- `PackageTypeGuidance`: present with law partitions, view partitions,
  commit-tier coverage hints, transforms, and fixture precondition filters.
- Compile-only assertions are present and typecheck.

## Validated

- `nx run cocoindex-effect:typecheck`
- `nx run cocoindex-effect:test -- --run test/attune-package-contract.test.ts`
- `nx run cocoindex-effect:test`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/cocoindex-effect/src/attune.package.ts packages/cocoindex-effect/src/attune.package.typecheck.ts packages/cocoindex-effect/test/attune-package-contract.test.ts packages/cocoindex-effect/attune.source-bom.json packages/cocoindex-effect/vitest.config.ts`

## Blocked / Not Green

- `nx run workspace:package-contracts-check` is not green yet. The Source BOM
  step passes, but `workspace:shape-conformance` reports root
  `attune.generator-shapes.json` entries for product package contracts still
  backed by `status: "migrate"` shapes:
  - `attune-foldkit.package-contract`
  - `attuned-discovery.package-contract`
  - `cocoindex-effect.package-contract`
- This is owned by the Phase 5 product ledger/root-manifest lane, not by this
  package contract slice.

## Residual Debt

- Live CocoIndex command and MCP clients still spawn subprocesses and read/merge
  `process.env` through existing generation/lifecycle code. The contract records
  this as `cocoindex-effect/live-subprocess-and-mcp-boundary`.
- `CocoIndexClient` and `RepositoryIntelligence` still use `Context.Service`
  instead of canonical generated `Effect.Service`. The contract records this as
  `cocoindex-effect/context-service-shape`.
- Checked-in MCP schema snapshot remains until schema inspection/generation is
  behind a typed Nx executor with versioned toolchain evidence.
- `project.json` and `package.json` still expose raw command/script surfaces;
  final cleanup is owned by task `10.5`.

## Next-Agent Recommendations

- Product ledger agent should flip `cocoindex-effect.package-contract` in
  `attune.generator-shapes.json` from `migrate` to generated-present once it
  reconciles sibling product packages.
- Command-surface cleanup agent should replace MCP schema/tool-registry
  generation targets with typed Nx executor or inferred generated-target
  semantics.
- Later service migration should use `@attune/nx:effect-service` for
  `CocoIndexClient` and `RepositoryIntelligence` once the package contract is
  consumed by sync generators.
