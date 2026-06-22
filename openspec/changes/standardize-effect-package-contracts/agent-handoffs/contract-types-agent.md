# contract-types-agent handoff

Wave: Phase 1 contract type kernel
Scope: foundational package-contract core only

## Changed

- `packages/attune-architecture-lint/src/package-contract/core.ts`
  - Added the canonical operation-kind taxonomy:
    `codec`, `query`, `command`, `projection`, `event-facade`,
    `atom-family`, `resource-provider`, `generator`, `policy-rule`, and
    `joern-template`.
  - Added the first package-kind literal set from the migration inventory:
    `generator-tooling`, `architecture-policy`, `policy-plugin`,
    `core-discovery-runtime`, `semantic-recall-service`, `foldkit-ui`,
    `agent-extension`, `joern-runtime-and-dsl`, `property-proof-runtime`,
    `platform-resource-provider`, and `day0-resource-runbook`.
  - Added Effect Schema-backed runtime schemas for operation kinds, package
    kinds, package views, touched views, operation descriptors, and package
    contract descriptors.
  - Added identity builders: `definePackageViews`, `touches`,
    `defineOperation`, and `definePackageContract`.
  - Added the compile-time core types:
    `AttuneOperationContract`, `AttunePackageContract`, `OperationIds`,
    `OperationById`, `InputOf`, `EncodedInputOf`, `OutputOf`,
    `EncodedOutputOf`, `ErrorOf`, `EncodedErrorOf`, `ViewKeysOf`,
    `AtomIdsOf`, touched-view helpers, `OperationMapOf`, and
    `PackageContractTypes`.
  - Added branded diagnostic helpers:
    `AttuneTypeError`, `AttuneBrandedDiagnostic`, `AttuneTypeDiagnostic`, and
    `attuneTypeDiagnostic`.
- `packages/attune-architecture-lint/test/package-contract-core.test.ts`
  - Added focused runtime and type-inference coverage for literal package ids,
    operation ids, package views, touched Reactivity keys/atoms, Schema-derived
    decoded/encoded input/output/error types, identity-builder stability, and
    runtime schema/diagnostic helper usability.
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/contract-types-agent.md`
  - This handoff.

## Validation

- `nx run attune-architecture:test`
  - Passed.
  - Observed 5 test files and 18 tests passing, including
    `test/package-contract-core.test.ts`.
- `nx run attune-architecture:typecheck`
  - Failed in a concurrently added file outside this agent's ownership:
    `test/package-contract-type-guidance.test.ts`.
  - Failure summary: `TypeGuidancePartitionIds` currently widens one partition
    id union to `string`, causing an `expectTypeOf(...).toEqualTypeOf<...>()`
    constraint mismatch.
  - No errors were reported from `src/package-contract/core.ts` or
    `test/package-contract-core.test.ts`.

## Contract Status

- The core contract authoring surface is now present and literal-preserving.
- Operation input/output/error helpers derive through Effect Schema
  `Schema.Schema.Type` and `Schema.Codec.Encoded`.
- Runtime contract schemas intentionally validate the descriptor envelope and
  treat operation schema values as `Schema.Unknown`; later agents can add
  richer schema-value metadata and ledger encoding without changing the
  authoring helpers.
- No OpenSpec task checkbox was marked complete from this narrow slice because
  Phase 1 still needs assertion, law, type-guidance, negative-fixture, and
  integration agents before task 15.3 is complete.

## Residual Debt

- `core.ts` is not exported from `src/index.ts` because this agent was
  explicitly forbidden from editing `src/index.ts`.
- The package directory is still physically named
  `packages/attune-architecture-lint`; this slice used the current checked-out
  path and did not attempt the final directory rename.
- Duplicate operation id rejection, kind-specific metadata gates, inferred law
  compatibility, exact handler maps, layer conformance, and guidance
  completeness remain for the other Phase 1 agents.
- `PackageContractSchema` is a first descriptor schema, not yet the complete
  final ledger schema.

## Blockers

- Full package typecheck is currently blocked by
  `test/package-contract-type-guidance.test.ts`, owned by the type-guidance
  slice.

## Next-Agent Recommendations

- Export the package-contract public surface from a dedicated
  `src/package-contract/index.ts` and then from the package API once the Phase 1
  modules are integrated.
- Have the law-inference agent import `OperationKind` and `AttuneTypeError`
  from `core.ts` instead of duplicating taxonomy strings.
- Have assertion and guidance agents reuse `OperationIds`, `OperationById`,
  `InputOf`, `OutputOf`, `ErrorOf`, `ViewKeysOf`, and `AtomIdsOf` so the repo
  has one correlated contract map.
- Fix the type-guidance partition-id widening before treating
  `attune-architecture:typecheck` as a Phase 1 exit signal.
