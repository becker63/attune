# Property Negative Agent Handoff

## Scope

Added the Phase 3 validation fixture suite for property/evidence conformance.
This slice stayed within the assigned ownership:

- `packages/joern-effect-properties/test/property-negative-fixtures.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/property-negative-agent.md`

## Changed

- Added test-local property evidence fixture types and an analyzer that models
  the required negative findings until shared Phase 3 implementation modules
  are integrated.
- Added fixtures for:
  - dead harness paths when generated cases run but operation implementation
    coverage remains absent
  - missing type-guidance partitions
  - high-rejection FastCheck filters
  - unreachable expected error paths
  - missing atom/Reactivity movement
  - undeclared typed errors escaping the declared error channel
  - weak-oracle findings from mutation survival and covered implementation
    without semantic observation

## Validation

Passed:

```bash
pnpm --dir packages/joern-effect-properties exec vitest run test/property-negative-fixtures.test.ts
nx run joern-effect-properties:typecheck
openspec validate standardize-effect-package-contracts --type change
git diff --check -- packages/joern-effect-properties/test/property-negative-fixtures.test.ts openspec/changes/standardize-effect-package-contracts/agent-handoffs/property-negative-agent.md
```

Notes:

- Focused Vitest passed: 1 file, 6 tests.
- `nx run joern-effect-properties:typecheck` passed.
- OpenSpec validation passed.
- Scoped `git diff --check` passed.

## Package Contract Status

- Package contract: not yet migrated for `joern-effect-properties`.
- PackageTypeGuidance: represented by local fixture data only.
- Property evidence: represented by local fixture data only.
- Atom/Reactivity graph: represented by local fixture data only.

## Residual Debt

- Replace the local `analyzePropertyEvidence` helper with the shared Phase 3
  property evidence/coverage conformance module once it lands.
- Connect these scenarios to generated evidence emitted by
  `attuneProperty`, workerized property shards, and package contract-derived
  type guidance.
- Add Schema-backed evidence decoding in the implementation module rather than
  in this validation fixture file.
- Add deterministic evidence merge coverage once worker/shard evidence exists.

## Blockers

- No shared property evidence analyzer or coverage conformance module exists in
  `joern-effect-properties` yet.
- `joern-effect-properties` does not yet expose a final
  `src/attune.package.ts` contract, generated property harness, or
  PackageTypeGuidance artifact.

## Next-Agent Recommendations

- The property runtime agent should promote the fixture model into a shared
  Schema-backed evidence type and analyzer.
- The coverage-search agent should consume the same finding ids:
  `dead-harness-path`, `missing-type-partition`, `high-filter-rejection`,
  `unreachable-expected-error`, `missing-atom-movement`,
  `undeclared-typed-error`, and `weak-oracle`.
- The Joern properties migration agent should keep these tests as the negative
  conformance suite while replacing local fixture helpers with real package
  evidence imports.
