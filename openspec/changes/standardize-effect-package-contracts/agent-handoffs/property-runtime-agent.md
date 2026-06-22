# Property Runtime Agent Handoff

Agent: `property-runtime-agent`
Phase: 3 property/evidence runtime

Ownership:
- `packages/joern-effect-properties/src/packageBoundaryProperty.ts`
- `packages/joern-effect-properties/test/package-boundary-property.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/property-runtime-agent.md`

## Changed

- Added a reusable package-boundary property runtime next to the existing
  Joern-specific `attuneProperty` event wrapper.
- Modeled package id, operation id, law ids, seed/run metadata, replay seed
  metadata, arbitrary provenance, output/error validation hooks,
  counterexample summaries, and structured evidence records.
- Added `providedArbitrarySlot` for generated harnesses that already hold a
  FastCheck arbitrary.
- Added `schemaArbitrarySlot` backed by Effect Schema's `Arbitrary.make(schema)`
  so generated package harnesses can preserve Schema authority while recording
  the schema source.
- Added `checkPackageBoundaryProperty`, which uses `fast-check` directly and
  returns evidence instead of throwing first.
- Added `replaySeedFromEvidence` for later evidence merge/replay agents.
- Added focused tests for:
  - successful evidence
  - Effect Schema-derived arbitrary provenance
  - failure evidence and counterexample metadata
  - deterministic seed/run metadata
  - output/error validation hooks
  - replay seed shape

## Generated

- None.

## Validation

Passed:
- `nx run joern-effect-properties:test -- --run test/package-boundary-property.test.ts`
  - Built the `joern-effect` dependency through Nx.
  - Result: 1 file, 6 tests passed.
- `nix develop --command pnpm --dir packages/joern-effect-properties exec vitest run test/package-boundary-property.test.ts`
  - Result: 1 file, 6 tests passed.
- `pnpm --dir packages/joern-effect-properties exec tsc --noEmit --pretty false --module NodeNext --moduleResolution NodeNext --target ES2023 --lib ES2023 --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --types node,vitest/globals src/packageBoundaryProperty.ts test/package-boundary-property.test.ts`
  - Focused TypeScript check for this slice passed.
- `openspec validate standardize-effect-package-contracts --type change`
  - Passed.
- `git diff --check -- packages/joern-effect-properties/src/packageBoundaryProperty.ts packages/joern-effect-properties/test/package-boundary-property.test.ts openspec/changes/standardize-effect-package-contracts/agent-handoffs/property-runtime-agent.md`
  - Passed.

Not green:
- `nx run joern-effect-properties:typecheck`
  - Fails in neighboring Phase 3 `src/coverageSearch.ts`, outside this
    agent's ownership.
  - Current reported errors are literal status widening and union narrowing for
    `CoverageSearchFinding` fields.
  - `src/packageBoundaryProperty.ts` no longer appears in the package-wide
    typecheck error list after the local variance fix.

## Contract Status

- package: `joern-effect-properties`
- PackageContract: not implemented by this slice.
- PackageLayer: not implemented by this slice.
- PackageTestLayer: not implemented by this slice.
- property evidence: initial package-boundary runtime evidence implemented.
- Effect RPC harness: not implemented by this slice.
- worker execution: not implemented by this slice; worker metadata should be
  merged by a later coordinator or worker agent.
- atom/Reactivity coverage: not implemented by this slice.
- Nx targets: no target changes.

## Residual Migration Debt

- The runtime is not exported from `src/index.ts` yet because Phase 3 package
  exports are coordinator-owned.
- Evidence is intentionally local and compact. Later integration should align
  it with the shared Schema-coded package evidence envelope, Effect RPC harness
  descriptors, worker metadata, type-guidance partitions, atom graph coverage,
  transform/filter metadata, and V8/Istanbul coverage records.
- `checkPackageBoundaryProperty` currently returns failure evidence instead of
  throwing. A later assertion wrapper can throw after evidence emission when
  needed by Vitest/Nx targets.
- The runtime accepts Schema-derived or provided arbitraries. Final generated
  harnesses should use `schemaArbitrarySlot` by default and reserve
  `providedArbitrarySlot` for refinements or waivered custom generation.

## Blockers

- No local blocker for this slice.
- Package-wide typecheck is blocked by unowned `src/coverageSearch.ts` errors
  from a sibling Phase 3 slice.

## Next-Agent Recommendations

- Phase 3 coordinator should export `packageBoundaryProperty.ts` after sibling
  evidence modules settle.
- Coverage-search agent should merge transform/filter/type-guidance/V8 fields
  into this evidence model rather than creating a second property-run envelope.
- Worker-fuzz agent should contribute worker/shard/random-source/timeout
  metadata through the same replay/evidence shape.
- Effect RPC harness agent should call this runtime around generated
  operation-specific RPC clients and Schema-backed output/error validators.
- Joern properties migration agent should replace package-local property
  wrappers incrementally while keeping `attuneProperty` intact for existing
  Joern event telemetry until the final evidence envelope is integrated.
