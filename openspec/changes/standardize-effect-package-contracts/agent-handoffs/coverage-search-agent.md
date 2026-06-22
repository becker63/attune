# Coverage Search Agent Handoff

## Scope

Phase 3 implementation slice for coverage-search evidence utilities in
`joern-effect-properties`.

Owned files:

- `packages/joern-effect-properties/src/coverageSearch.ts`
- `packages/joern-effect-properties/test/coverage-search.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/coverage-search-agent.md`

## Changed

- Added pure coverage-search evidence types and reducers for:
  - type-guidance partition hit, miss, and unreachable records
  - atom/Reactivity graph movement records
  - V8/Istanbul coverage point deltas
  - coverage-search transform metadata
  - measured filter metadata and acceptance-rate summaries
  - law observation records
  - high-rejection-filter, missing-atom-graph-movement, dead-harness, and
    weak-oracle findings
  - retained corpus seed ranking
- Added deterministic merge helpers that group evidence by package, operation,
  seed, shard, replay metadata, coverage point, atom graph edge, filter,
  transform, partition, and law identity.
- Added focused tests for:
  - partition hit/miss merging
  - high-rejection filter findings
  - missing atom graph movement findings
  - V8-covered-without-law weak-oracle findings
  - seed retention ranking

## Validation

- `pnpm --dir packages/joern-effect-properties exec vitest run test/coverage-search.test.ts`
  - passed, 5 tests
- `nx run joern-effect-properties:typecheck`
  - passed
- `openspec validate standardize-effect-package-contracts --type change`
  - passed
- `git diff --check -- packages/joern-effect-properties/src/coverageSearch.ts packages/joern-effect-properties/test/coverage-search.test.ts openspec/changes/standardize-effect-package-contracts/agent-handoffs/coverage-search-agent.md`
  - passed

## Package Contract Status

- This slice does not migrate `joern-effect-properties` to
  `src/attune.package.ts`.
- This slice does not export the new module from `src/index.ts`; the ownership
  boundary was intentionally limited to the evidence utility and tests.
- This slice does not wire the evidence utilities into the existing fuzz runner,
  property wrapper, package configs, or Nx targets.

## Residual Migration Debt

- Generated Effect RPC and worker property harnesses still need to emit these
  records from package-boundary runs.
- The coverage evidence should eventually be Schema-coded at worker, corpus,
  replay, and report boundaries. This slice kept the reducer pure TypeScript so
  runner agents can integrate it without taking on runtime dependencies here.
- The retained seed score weights are intentionally simple first-pass values:
  partition novelty `10`, implementation coverage `8`, atom movement `6`, law
  observation `4`, weak-oracle finding `3`, other findings `1`. Later agents can
  tune weights once the generated corpus loop emits real evidence.
- `src/index.ts` should be updated by the Phase 3 coordinator or package
  migration agent once the property evidence public surface is settled.

## Blockers

- None in this slice.

## Next-Agent Recommendations

- The worker/runtime agents should import `mergeCoverageSearchEvidence` and emit
  records from generated RPC harness cases rather than inventing another
  evidence envelope.
- The coverage-conformance agent should use `findMissingAtomGraphMovement`,
  `findWeakOracleCoverage`, and `findDeadHarnesses` as the initial diagnostic
  kernel, then add report formatting and Nx target wiring outside this module.
- The package migration agent should add Schema-backed encoded forms for these
  evidence records when `joern-effect-properties` gets its package contract and
  generated `PackageTypeGuidance`.
