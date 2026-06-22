# law-inference-agent Handoff

## Changed Files

- `packages/attune-architecture-lint/src/package-contract/laws.ts`
  - Added canonical operation-kind and law-family Schema values.
  - Added canonical law ids and descriptors for schema validation,
    determinism/idempotence, side-effect boundaries, view movement, observed
    idempotence, destructive approval, projection/event/state, generator
    provenance, policy findings, and Joern/template evidence.
  - Added `inferLaws`, `inferLawIds`, `allowedLawIdsForKind`,
    `isLawAllowedForKind`, `isLawAllowedForOperation`, and
    `missingMetadataForOperation`.
  - Added type helpers for `AllowedLawIdForKind`,
    `AllowedLawIdForOperation`, `InferredLawsFor`, and metadata-sensitive law
    ids.
- `packages/attune-architecture-lint/test/package-contract-laws.test.ts`
  - Added query, generator, resource-provider, projection, policy-rule, and
    joern-template coverage.
  - Added explicit destructive resource-provider assertions for observed
    idempotence, current proof, destructive approval, and no-repeat destructive
    behavior.

## Validation

- Passed: `nx run attune-architecture:test`
  - Full package target passed with 6 test files and 26 tests.
- Failed: `nx run attune-architecture:typecheck`
  - Failure is outside this agent's owned files:
    `test/package-contract-type-guidance.test.ts(233,7)`.
  - The compile-only assertion currently reports a literal-union mismatch in
    `TypeGuidancePartitionIds` for the type-guidance agent's fixture.

## Contract Status

- The law kernel is usable as a direct module at
  `src/package-contract/laws.ts`.
- The module intentionally does not update `src/index.ts`; barrel/export
  integration should be handled by the parent or the contract integration
  agent.
- Runtime values are backed by Effect Schema where they cross the value
  boundary (`OperationKindSchema`, `LawFamilySchema`, `LawIdSchema`,
  `LawDescriptorSchema`).
- Type helpers preserve metadata-sensitive law ids for touched views,
  destructive proof, destructive approval, observed idempotence, and typed
  errors.

## Residual Debt

- Reconcile the duplicated operation-kind declarations between `core.ts` and
  `laws.ts` during the integration pass. This agent avoided editing `core.ts`.
- Wire `inferLaws` into the core operation builders once the builder API is
  stable.
- Decide whether custom law extensions should stay constrained to canonical
  law ids or receive a separate branded extension id type.
- Promote `missingMetadataForOperation` into compile-only assertions or runtime
  conformance diagnostics after the assertion agent owns the public diagnostic
  shape.
- Connect inferred laws to generated property/evidence harnesses in later
  phases.

## Blockers

- `attune-architecture:typecheck` cannot pass until the type-guidance fixture
  type assertion at `test/package-contract-type-guidance.test.ts(233,7)` is
  fixed by its owning agent.

## Next-Agent Recommendations

- The contract integration agent should export the package-contract modules
  through a stable barrel after all Phase 1 modules land.
- The assertion agent should consume `AllowedLawIdForOperation` and
  `missingMetadataForOperation` so invalid explicit law claims and missing
  destructive metadata fail before runtime checks.
- The type-guidance agent should use `inferLawIds` as the source for law
  partitions where possible, while keeping non-law partitions such as
  `disk-proof.present` and `host-readiness.moves` separate from canonical law
  ids.
