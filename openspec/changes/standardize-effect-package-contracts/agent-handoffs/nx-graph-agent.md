# nx-graph-agent Handoff

## Scope

Phase 2 implementation slice for the Nx graph/discovery helper. This agent kept
the work pure and local to `attune-nx`; it did not register an Nx plugin,
executor, generator, or public barrel export.

## Changed

- `packages/attune-nx/src/package-contract-graph.ts`
  - Added pure discovery helpers for active Nx project roots and expected
    `src/attune.package.ts` contract paths.
  - Added metadata stubs for discovered package contracts.
  - Added invalid-root, inactive-project, missing-contract, and present-contract
    reporting.
  - Added DI summary helpers for contract-like `services`, `provides`,
    `requires`, `dependencies`, `layers`, and operation metadata values.
  - Added atom/Reactivity graph summary helpers for package views and
    operation view edges.
  - Added target semantics for `sync-package-contract`,
    `service-conformance`, `property`, `coverage-conformance`,
    `atom-graph-conformance`, and `check-generated`.
- `packages/attune-nx/test/package-contract-graph.test.ts`
  - Covered project discovery, invalid and missing path reporting, DI
    dependency summarization, atom graph summarization, combined package graph
    summaries, and inferred target metadata.

## Validated

- `nx run attune-nx:typecheck` passed.
- `nx run attune-nx:test -- --run test/package-contract-graph.test.ts` passed.
- The new `test/package-contract-graph.test.ts` also passed during the full
  `nx run attune-nx:test` attempt.

## Not Fully Green

- `nx run attune-nx:test` is failing in neighboring generator expectations that
  were outside this agent's ownership:
  - `test/generators.test.ts` still expects the old
    `Context.Tag`-based `effect-service` output, but the generator now emits an
    `Effect.Service` class.
  - `test/generator-snapshots.test.ts` has stale inline snapshot digests for
    the same changed generated output.

## Residual Debt

- `package-contract-graph.ts` is intentionally not exported from
  `packages/attune-nx/src/index.ts`; the coordinator should export it when the
  Phase 2 public surface is ready.
- The helper currently consumes contract-like values rather than importing the
  architecture package contract types. That keeps the graph helper pure and
  avoids a cross-package dependency while the contract kernel is still moving.
- No Nx inferred target/plugin registration exists yet. The target semantics
  table is ready for the later executor/plugin agent.

## Next-Agent Recommendations

- Update the `effect-service` generator tests/snapshots in the generator-owning
  slice, not as part of this graph helper.
- Add the public export only after the package-contract generator and executor
  agents agree on the final API.
- Reuse `discoverPackageContracts` as the source of truth for the first
  `workspace:package-contracts-check` implementation.
