# generator-snapshot-agent Handoff

## Scope

Phase 2 validation agent for deterministic `@attune/nx` generator snapshots.

Owned files:

- `packages/attune-nx/test/generator-snapshots.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/generator-snapshot-agent.md`

No generator source files, `generators.json`, root configs, architecture package
files, graph files, executor files, or existing tests were edited.

## Changed

- Added a MemoryTree-style generator snapshot harness for currently registered
  and implemented generator surfaces.
- Added deterministic `@attune/nx:effect-service` output checks that compare
  two fresh in-memory generations and snapshot generated file digests plus
  Source BOM shard/index JSON.
- Added deterministic `@attune/nx:discovery-event` output checks that compare
  two fresh in-memory generations and snapshot generated file digests plus the
  generated event source.
- Added a Source BOM determinism check that proves repeated upserts and object
  option key ordering produce stable generated JSON.
- Added explicit future snapshot extension slots for:
  - `@attune/nx:package-contract`
  - `@attune/nx:atom-view`
  - generated Effect RPC package harness output
  - worker-compatible FastCheck property and type-guidance output
  - generated ledger/provenance replacement output

## Generated Files

None. Inline snapshots live in the new Vitest test file.

## Validation

Passed:

- `pnpm exec vitest run test/generator-snapshots.test.ts --update`
- `pnpm exec vitest run test/generator-snapshots.test.ts`
- `nx run attune-nx:typecheck`

Failed:

- `nx run attune-nx:test`

Failure details:

- The new `test/generator-snapshots.test.ts` passes.
- The package-level test run fails in pre-existing
  `packages/attune-nx/test/generators.test.ts`.
- The stale assertion expects
  `export class DecisionRunner extends Context.Tag`, while the current
  `@attune/nx:effect-service` generator now emits the canonical
  `Effect.Service` shape with `accessors: true`, operation schema slots,
  `PackageLayer`, and `PackageTestLayer`.
- I did not edit `test/generators.test.ts` because it was outside this agent's
  ownership boundary.

## Package Contract Status

Validation-only slice. No package contract was added or migrated in this agent.

## Residual Migration Debt

- Existing `generators.test.ts` should be updated by the effect-service
  generator owner or Phase 2 coordinator to assert the new canonical
  `Effect.Service` output.
- Future generator owners should extend `generator-snapshots.test.ts` when
  package-contract, atom-view, RPC harness, worker property, type-guidance, and
  ledger sync generators are registered.
- The snapshot harness currently records file digests for broad generated
  outputs and exact content for the discovery-event source and Source BOM JSON.
  Future high-risk generated outputs should add exact content snapshots where
  the text is still readable.

## Blockers

- Full `attune-nx:test` cannot pass until the stale existing
  `Context.Tag` assertion is updated to the new `Effect.Service` generator
  contract.

## Next-Agent Recommendations

- `effect-service-generator-agent`: update `test/generators.test.ts` to assert
  the canonical `Effect.Service` shape, `accessors: true`, operation schema
  slots, package layer exports, and updated Source BOM fields.
- `package-contract-generator-agent`: add package-contract generation snapshots
  to the future extension slot once the generator registers.
- `atom-view-generator-agent`: add Reactivity key, base atom, derived atom, and
  package view graph snapshots once the generator registers.
- `property-runtime-agent`: add worker-compatible property and type-guidance
  output snapshots when those generators land.
- Phase 2 coordinator: run `nx run attune-nx:test` after the stale existing
  generator test is updated, then record the wave-level validation result.
