Agent: generator-type-guidance-worker
Wave: Phase 2/3 - Generator Type Guidance And Property Evidence
Ownership:
- `packages/attune-nx/src/generators/package-contract/generator.ts`
- `packages/attune-nx/test/package-contract-generator.test.ts`
- `framework/protocol/src/evidence/index.ts`
- `framework/testing/src/evidence-producer.ts`
- `framework/testing/src/package-harness.ts`
- `framework/testing/test/framework-testing.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/generator-type-guidance-worker.md`

Changed:
- Broadened `@attune/nx:package-contract` generated `PackageTypeGuidance` output with normalized source records, operation-id and operation-kind partitions, schema-guided transforms, empty filter slots, and kind-specific metadata partitions for generator, projection, policy, Joern, atom-family, and resource-provider/destructive-gate cases.
- Updated generated package harness output to emit `PackageHarnessControls`, include the generated `observe` control in property checks, and emit initial `typeGuidancePartitionEvidence` records for generated schema-boundary and Reactivity-key partitions.
- Added `type-guidance` as a Schema-backed protocol evidence kind.
- Added `typeGuidancePartitionEvidence()` in `framework/testing` for partition hits, misses, filters, unreachable states, replay metadata, filter ids, corpus seed ids, and guidance sources.
- Extended `createPackageHarnessClient()` with generated control RPC descriptors and per-invocation `typeGuidance` observations; atom graph observation now records an `observe` control event before Reactivity/atom movement evidence.
- Added focused assertions for generated type guidance, harness controls, partition evidence, no checked-in report posture, deterministic output, and resource/destructive guidance partitions.

Generated:
- New generated symbols from `@attune/nx:package-contract`: `PackageHarnessControls` and generated `typeGuidancePartitionEvidence(...)` producer calls.
- New generated `PackageTypeGuidance` fields: `sources`, `partitions`, `transforms`, `filters`, and kind-specific metadata partitions.
- No checked-in protocol reports, evidence summaries, ledgers, or materialized runtime/cache reports were generated.

Validated:
- `nx run attune-nx:typecheck`
- `nx run framework-testing:typecheck`
- `pnpm exec vitest run packages/attune-nx/test/package-contract-generator.test.ts`
- `pnpm exec vitest run framework/testing/test/framework-testing.test.ts`
- `git diff --check -- packages/attune-nx framework/testing openspec/changes/standardize-effect-package-contracts`

Not run:
- `nx run attune-nx:test -- --run package-contract-generator` did not complete because its dependency `attune-architecture:build` failed in concurrent untracked `packages/attune-architecture/src/package-contract/validation.ts` at line 147 on an `exactOptionalPropertyTypes` view-shape mismatch.
- `nx run framework-testing:test` hit the same `attune-architecture:build` dependency failure.
- `nx run workspace:policy-fast` and proof-pressure/fuzz tiers were not run; this slice stayed within generator/type-guidance/evidence surfaces.

Contract status:
- `@attune/nx:package-contract` now generates compile-only `AssertTypeGuidanceComplete<PackageContract, PackageTypeGuidance>` coverage against richer guidance fields.
- Generated Schema-backed harness evidence can record type-guidance hit/miss/filter/unreachable outcomes with replay context.
- Generated harness clients expose Schema-backed control RPC descriptors and record `observe` control movement during atom/Reactivity property observations.
- Worker property generation remains hoisted and worker-compatible; this slice did not add new project.json proof-pressure/fuzz target command surfaces.

Residual migration debt:
- Existing package contracts were not regenerated in place; this updates the generator/runtime path and focused expectations.
- `PackageTypeGuidance` generation is richer for new scaffolds, but package-specific custom law extensions and deep Schema AST branch extraction still need sync/materializer expansion beyond this single-operation scaffold.
- Harness controls now expose descriptors and `observe` evidence, but reset/snapshot/flush/replay/coverage control implementations still need package-specific handlers.
- Type-guidance partition evidence is emitted as protocol events; private Protocol Runtime/Store persistence and language-service diagnostic projection remain follow-up work.
- `7.8` workerized proof-pressure/fuzz target wiring was left to the command-surface/proof-pressure owner to avoid project.json target conversions.

Blocked by:
- Concurrent `attune-architecture` validation work currently breaks Nx test target dependencies with `packages/attune-architecture/src/package-contract/validation.ts(147,44)` under `exactOptionalPropertyTypes`.

Next agent:
- Fix or integrate the concurrent `attune-architecture` validation exact-optional view mismatch, then rerun the canonical Nx test targets.
- Extend the package-contract sync/materializer to regenerate existing packages with the richer `PackageTypeGuidance` artifact.
- Add package-specific harness control handlers for reset/snapshot/flush/replay/coverage where packages expose observation hooks.
- Route `type-guidance` evidence into private protocol runtime/cache diagnostics and coverage conformance.
