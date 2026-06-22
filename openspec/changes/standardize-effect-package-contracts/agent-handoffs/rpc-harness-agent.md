# rpc-harness-agent Handoff

## Scope

Phase 3 implementation slice for the first package-boundary RPC harness model.

Owned files:

- `packages/attune-architecture-lint/src/package-contract/rpc.ts`
- `packages/attune-architecture-lint/test/package-contract-rpc.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/rpc-harness-agent.md`

## Changed

- Added a Schema-backed package fuzz RPC group descriptor model.
- Added operation-specific RPC descriptor types and helpers:
  - stable `OperationRpcId`
  - `OperationRpcDescriptor`
  - `operationRpcRegistry`
  - `operationRpcDescriptorById`
- Added harness control RPC descriptors for:
  - `reset`
  - `snapshot`
  - `observe`
  - `flush-evidence`
  - `replay-counterexample`
  - `get-coverage`
  - `get-atom-graph`
- Added Schema-coded descriptor fields for payload, success, error, evidence,
  and replay identities.
- Added handler registry types backed by `PackageTestLayer`:
  - `OperationRpcHandlerContext`
  - `OperationRpcHandler`
  - `OperationRpcHandlerMap`
  - `PackageFuzzRpcHandlerRegistry`
  - `definePackageFuzzRpcHandlerRegistry`
- Added an explicit `@effect/rpc` adapter compatibility diagnostic:
  direct runtime import remains blocked while this workspace is on Effect 4 beta
  and `@effect/rpc@0.75.1`.
- Added tests for stable operation/control RPC ids, descriptor roles,
  operation/control registries, Schema decoding, adapter diagnostic decoding,
  and `PackageTestLayer`-backed handler maps.

## Validation

- `nx run attune-architecture:test -- --run test/package-contract-rpc.test.ts`
  passed: 1 file, 5 tests.
- `nx run attune-architecture:typecheck` passed.

## Residual Debt

- This slice intentionally does not import `@effect/rpc` at runtime. The future
  adapter should bind this descriptor model to actual Effect RPC groups once the
  peer surface is compatible with the repository Effect 4 beta.
- This slice is a descriptor/adaptor surface, not the final generator output.
  Phase 3 generator work still needs to emit package-local RPC harness files
  from `src/attune.package.ts`.
- The handler registry currently records the `PackageTestLayer` boundary and
  typed handler map. The runtime execution layer still needs to run handlers
  through Effect service accessors with `PackageTestLayer` provided.
- Property runtime work still needs to consume these descriptors for
  Schema-derived FastCheck arbitraries, workerized execution, replay, and
  evidence emission.

## Blockers

- No blocker for this descriptor slice.
- Direct `@effect/rpc` import remains intentionally blocked by compatibility
  diagnostic until the Effect 4 beta peer mismatch is resolved or an adapter is
  proven in this workspace.

## Next-Agent Recommendations

- Add the package-contract RPC generator output in `@attune/nx` so generated
  packages emit this descriptor model from their package contract.
- Connect generated property harnesses to the operation registry instead of
  importing package-private functions.
- Add compile-only exactness checks that generated handler maps and operation
  registries cover every contract operation and no stale operation ids.
- Extend the evidence runtime to encode replay seeds, counterexamples, coverage
  observations, and atom/Reactivity movement through Schema-backed descriptor
  identities.
