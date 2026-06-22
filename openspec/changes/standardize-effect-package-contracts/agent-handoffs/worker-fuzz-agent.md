# Worker Fuzz Agent Handoff

Agent: `worker-fuzz-agent`
Phase: 3 property/evidence runtime

Ownership:
- `packages/joern-effect-properties/src/workerProperty.ts`
- `packages/joern-effect-properties/test/worker-property.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/worker-fuzz-agent.md`

## Changed

- Added the first `@fast-check/worker` integration wrapper for Attune property
  targets.
- Imported the real worker-aware `assert` and `propertyFor` APIs from
  `@fast-check/worker`.
- Added worker target metadata, commit/push/proof-pressure/nightly budget
  normalization, timeout/isolation metadata, shard metadata, random-source
  choice, worker evidence metadata, and deterministic evidence merge helpers.
- Added dry descriptor creation for worker-compatible properties. The descriptor
  exposes the real `propertyFor(new URL(...), options)` builder and the worker
  cleanup-aware `assert` binding without starting a long-running worker run in
  unit tests.
- Added focused deterministic Vitest coverage for budget normalization,
  random-source selection, descriptor creation/API bindings, evidence metadata,
  and deterministic worker evidence merging.

## Generated

- None.

## Validation

Passed:
- `nx run joern-effect-properties:test -- --run test/worker-property.test.ts`
  - Ran the focused worker test through the Nx target.
  - Nx also built `joern-effect`, the target dependency.
  - Result: 1 file, 5 tests passed.
- `pnpm --dir packages/joern-effect-properties exec tsc --noEmit --pretty false --strict --skipLibCheck --target ES2023 --lib ES2023 --module NodeNext --moduleResolution NodeNext --types node,vitest/globals src/workerProperty.ts test/worker-property.test.ts`
  - Focused TypeScript check for this slice passed.
- `openspec validate standardize-effect-package-contracts --type change`
  - Passed.
- `git diff --check -- packages/joern-effect-properties/src/workerProperty.ts packages/joern-effect-properties/test/worker-property.test.ts openspec/changes/standardize-effect-package-contracts/agent-handoffs/worker-fuzz-agent.md`
  - Passed.

Not green:
- `nx run joern-effect-properties:typecheck`
  - Fails in neighboring Phase 3 files outside this agent's ownership:
    `src/coverageSearch.ts` and `src/packageBoundaryProperty.ts`.
  - The focused TypeScript check above passed for the files owned by this
    worker-fuzz slice.

## Contract Status

- package: `joern-effect-properties`
- PackageContract: not implemented by this slice.
- PackageLayer: not implemented by this slice.
- PackageTestLayer: not implemented by this slice.
- worker property evidence: initial wrapper and metadata helpers implemented.
- Effect RPC harness: not implemented by this slice.
- atom/Reactivity coverage: not implemented by this slice.
- Nx workerized targets: not implemented by this slice.

## Residual Migration Debt

- The wrapper is not exported from `src/index.ts` yet because package exports
  are coordinator-owned for Phase 3.
- Unit tests intentionally use dry descriptor mode. Running a real worker
  assertion from TypeScript source requires the generated property module shape
  to be hoisted at module scope and executable by Node workers without relying
  on Vitest's TS transform path.
- The repo currently uses `fast-check@3` in package code while
  `@fast-check/worker@0.6.0` depends on `fast-check@4`. This wrapper avoids
  crossing arbitrary types in the public metadata helpers. Generated worker
  property modules should either align the FastCheck version surface or keep
  property construction inside the generated module that imports compatible
  arbitraries.
- Worker evidence currently records worker/shard/random-source/timeout metadata.
  Later Phase 3 slices still need to merge law, type-guidance, atom graph,
  coverage-search, replay, and counterexample evidence.

## Blockers

- No local blocker for descriptor-mode integration.
- Real worker execution tests should wait until the generated worker property
  module shape exists and can be executed as a worker module without brittle
  TypeScript loader assumptions.

## Next-Agent Recommendations

- `property-runtime-agent`: consume `WorkerEvidenceMetadata` when emitting
  operation evidence.
- `coverage-search-agent`: extend `WorkerEvidenceRecord` or the shared evidence
  envelope with transform/filter/type-guidance/V8 coverage fields instead of
  adding a second merge shape.
- `worker-validation-agent`: add one generated JavaScript worker smoke once the
  generator emits hoisted worker property modules.
- Phase 3 coordinator: export the wrapper from `src/index.ts` after sibling
  property/evidence modules settle.
