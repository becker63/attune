Agent: type-guidance-agent
Wave: Phase 1 - Contract Type Kernel
Ownership:
- `packages/attune-architecture-lint/src/package-contract/type-guidance.ts`
- `packages/attune-architecture-lint/test/package-contract-type-guidance.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/type-guidance-agent.md`

Changed:
- Added the first Schema-backed `PackageTypeGuidance` model in `type-guidance.ts`.
- Added guidance schemas for sources, schema source descriptors, partitions, coverage-search hints, transform descriptors, and measured filter descriptors.
- Added `defineTypeGuidance(contract, guidance)` to normalize generated/sync-generated const guidance into a Schema-decoded runtime artifact.
- Added structural contract-id helpers:
  - `PackageContractOperationId`
  - `PackageContractPackageId`
  - `TypeGuidanceOperationIds`
  - `TypeGuidanceOperation`
  - `TypeGuidancePartitionIds`
  - `PackageTypeGuidanceFor`
- Added runtime partition helpers:
  - `operationPartitionIds`
  - `packagePartitionIds`
- Added tests covering operation id preservation, source label capture, Schema descriptor capture, stable runtime partition ids, and transform/filter metadata without a custom fuzzer envelope.

Generated:
- None.

Validated:
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test -- --run test/package-contract-type-guidance.test.ts`
- `nx run attune-architecture:test`
- `git diff --check -- packages/attune-architecture-lint/src/package-contract/type-guidance.ts packages/attune-architecture-lint/test/package-contract-type-guidance.test.ts`

Not run:
- Workspace policy gates. This slice is package-local and Phase 1 integration is still in progress.

Contract status:
- package: `attune-architecture`
- PackageContract: not implemented by this agent; depends on contract-types-agent.
- PackageLayer: not implemented by this agent.
- PackageTestLayer: not implemented by this agent.
- attune.package.typecheck: not implemented by this agent; depends on compile-assertion-agent.
- PackageTypeGuidance: initial Schema-backed model and helper implemented.
- package views: represented as guidance view partitions only; full atom/Reactivity graph model is pending later phases.
- property evidence: transform/filter/coverage-search metadata slots are modeled, but evidence emission is pending Phase 3.
- Nx targets: no target changes; existing `attune-architecture` test/typecheck targets validated the slice.

Residual migration debt:
- `type-guidance.ts` is not exported from `src/index.ts` or a package-contract barrel yet because those files were outside this agent's ownership. The Phase 1 coordinator should wire exports after integrating all kernel modules.
- `defineTypeGuidance` currently performs key-alignment type validation and Effect Schema runtime value validation. Full completeness checks against laws, views, typed errors, and generated harness artifacts should land in `AssertTypeGuidanceComplete`.
- The generated const guidance spec preserves maximal literal partition ids at compile time. The Schema-decoded runtime artifact intentionally has stable broad Schema types for persistence/report boundaries.

Blocked by:
- No local blocker.

Next agent:
- Contract-types-agent should align the structural `PackageContractLike` assumptions with the canonical contract model.
- Compile-assertion-agent should consume `TypeGuidanceOperationIds` and `TypeGuidancePartitionIds` from generated `attune.package.typecheck.ts`.
- Package-contract-generator-agent should generate `PackageTypeGuidance` as a const guidance artifact and pass it through `defineTypeGuidance`.
- Property-runtime-agent should consume `coverageSearch`, `transformIds`, `filterIds`, `transforms`, and `filters` when building FastCheck/Effect RPC evidence.
