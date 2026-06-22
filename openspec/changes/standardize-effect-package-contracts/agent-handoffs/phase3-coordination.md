# Phase 3 Coordination

Phase 3 starts from the integrated Phase 2 generator/executor surface. The
workspace dependency set now includes:

- `@fast-check/worker@0.6.0`
- `@effect/rpc@0.75.1`

`@fast-check/worker` imports successfully and exposes `assert` and
`propertyFor`. Direct runtime import of `@effect/rpc@0.75.1` currently fails in
this workspace because the package expects an Effect 3-era module path while
the repo uses Effect 4 beta. Phase 3 agents should produce Schema-backed RPC
descriptors and adapter seams, but must not build tests that require direct
`@effect/rpc` runtime import until the compatibility issue is resolved.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| rpc-harness-agent | `019eed3f-4201-7a11-b2e0-8937595ce450` | Sartre | package-contract RPC descriptor surface |
| property-runtime-agent | `019eed3f-60f8-7212-a608-5cf8c3f6abc0` | James | package-boundary property runtime |
| worker-fuzz-agent | `019eed3f-7189-73a0-a78d-53d63cefb66e` | Hilbert | `@fast-check/worker` wrapper and worker evidence metadata |
| coverage-search-agent | `019eed3f-825f-7f32-bca8-f80d0e55f78a` | Avicenna | coverage-search evidence and merge utilities |
| property-negative-agent | `019eed3f-93b1-7c12-9612-58cb7e4ba477` | Fermat | property/evidence negative fixtures |
| worker-validation-agent | `019eed3f-cf5e-7f40-a9d7-5a1950bfc12d` | Hume | worker and RPC compatibility validation |

## Coordinator Checkpoint

- Integrated the package-contract RPC descriptor module as a public
  architecture package surface without importing `@effect/rpc` at runtime.
- Integrated `joern-effect-properties` property/evidence modules into the
  package export surface:
  - `packageBoundaryProperty`
  - `workerProperty`
  - `coverageSearch`
- Added focused tests proving package fuzz RPC ids, operation/control
  registries, Schema descriptor roles, blocked adapter compatibility metadata,
  and PackageTestLayer-backed handler map typing.
- Validated the property-negative fixture suite through the public
  `joern-effect-properties:test` Nx target.
- Confirmed `@fast-check/worker` exports `assert` and `propertyFor`, and that
  workerized tests need hoisted properties in worker-loadable runtime modules.
- Confirmed direct root and package-local `@effect/rpc` imports fail against the
  current Effect 4 beta resolution because `effect/dist/GlobalValue.js` is not
  available in Effect 4.

Validation passed:

```bash
nx run attune-architecture:typecheck
nx run attune-architecture:test
nx run attune-nx:typecheck
nx run attune-nx:test
nx run joern-effect-properties:typecheck
nx run joern-effect-properties:test -- --run test/package-boundary-property.test.ts test/worker-property.test.ts test/coverage-search.test.ts
nx run joern-effect-properties:test -- --run test/property-negative-fixtures.test.ts
openspec validate standardize-effect-package-contracts --type change
```

## Integration Rules

- The coordinator owns package exports and OpenSpec task status after all
  Phase 3 implementation slices land.
- `@effect/rpc` compatibility is a recorded blocker for runtime adapter tests,
  not a reason to invent a second non-Schema invocation protocol.
- Worker tests must stay bounded and deterministic. Long-running fuzz pressure
  belongs to later proof-pressure targets.
- Phase 3 is complete only after changed package tests/typechecks pass and
  evidence records include replay, worker/shard, type-guidance, atom graph, law,
  and coverage-search metadata at the implemented boundary.
