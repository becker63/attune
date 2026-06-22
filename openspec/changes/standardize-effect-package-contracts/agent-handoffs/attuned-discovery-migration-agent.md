# attuned-discovery Migration Agent Handoff

Role: Phase 5 `attuned-discovery-migration-agent`

## Changed

- Added `packages/attuned-discovery/src/attune.package.ts`.
- Added `packages/attuned-discovery/src/attune.package.typecheck.ts`.
- Added `packages/attuned-discovery/test/attune-package-contract.test.ts`.
- Updated `packages/attuned-discovery/attune.source-bom.json` with a generated
  package-contract shard for this package.
- Updated `packages/attuned-discovery/vitest.config.ts` with a package-local
  `@attune/architecture` source alias for contract tests.

## Generated Files

- `src/attune.package.ts`
- `src/attune.package.typecheck.ts`
- `test/attune-package-contract.test.ts`

The files are authored in the generated contract shape used by Phase 4 package
contracts. A later generator freshness ratchet still needs to prove exact
`@attune/nx:package-contract` reproduction.

## Package Contract Status

- `PackageContractSchema`: exported through the shared architecture contract
  surface.
- `PackageContract`: present with package id `attuned-discovery` and package
  kind `core-discovery-runtime`.
- `PackageLayer`: present, metadata-backed, declaring package-owned discovery
  services.
- `PackageTestLayer`: present, deterministic in-memory audit boundary metadata.
- `PackageFuzzRpcGroup`: present as descriptor metadata only; no runtime
  `@effect/rpc` import.
- `PackageFuzzHandlers`: exact operation map present.
- `PackageProperties`: exact operation map present.
- `PackageTypeGuidance`: present with Schema sources, law partitions,
  view partitions, commit-tier coverage hints, transforms, and one measured
  read-model scope filter.
- Compile-only assertions: present in `src/attune.package.typecheck.ts`.

Operations:

- `discovery-events-facade` (`event-facade`)
- `discovery-event-log-append` (`event-facade`)
- `event-replay-projection` (`projection`)
- `read-model-query` (`query`)
- `reactivity-key-map` (`query`)
- `base-atom-family` (`atom-family`)
- `derived-workbench-atom-family` (`atom-family`)
- `domain-event-codecs` (`codec`)

Package views cover event-log append, projection movement, run state, metrics,
anchors, families, hypotheses, evidence, review queue, score features,
DecisionPacket, FoldScene, WorkbenchSnapshot, read-model projection, and domain
codec movement.

## Validated

- `nx run attuned-discovery:typecheck`
- `nx run attuned-discovery:test -- --run test/attune-package-contract.test.ts`
- `nx run attuned-discovery:test`
- `nx run workspace:source-bom-check`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- packages/attuned-discovery/src/attune.package.ts packages/attuned-discovery/src/attune.package.typecheck.ts packages/attuned-discovery/test/attune-package-contract.test.ts packages/attuned-discovery/attune.source-bom.json packages/attuned-discovery/vitest.config.ts`

## Not Green

- `nx run workspace:package-contracts-check`

Failure is in product-ledger coordination, not this package's contract files:

- `attune.generator-shapes.json` still has
  `attuned-discovery.package-contract` at status `migrate` while this package
  Source BOM shard now records the generated contract outputs.
- The same workspace gate also reports `attune-foldkit.package-contract` and
  `cocoindex-effect.package-contract` at status `migrate`.

The product-ledger agent should update the root generator-shape entries for all
landed Phase 5 product contracts together.

## Residual Migration Debt

- `DiscoveryEvents` and `DiscoveryEventLog` still use `Context.Service`; the
  contract records a pre-ratchet waiver until canonical `Effect.Service`
  wrappers/generators land.
- `src/index.ts` remains the consolidated discovery/event/projection/atom file;
  the contract records this as debt until event, projection, Reactivity key,
  atom-family, and derived-atom generators own the split.
- Product package scripts and raw `nx:run-commands` targets remain for task
  `10.5`; this slice did not migrate command surfaces.
- Generated RPC/property execution is descriptor-only in this wave because the
  direct runtime `@effect/rpc` import remains blocked against the current Effect
  4 beta dependency resolution.

## Next-Agent Recommendations

- Product-ledger agent: ratchet `attuned-discovery.package-contract` from
  `migrate` to `generated` in `attune.generator-shapes.json` once the product
  package contracts are landed, and rerun `workspace:package-contracts-check`.
- Product-boundary validation agent: add a guard that fails if
  `attuned-discovery` loses either `src/attune.package.ts` or
  `src/attune.package.typecheck.ts`.
- Generator follow-up: make `@attune/nx:package-contract` emit the
  discovery-runtime archetype so this contract can be checked for stale
  generated output.
