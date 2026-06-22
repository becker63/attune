# compile-assertion-agent Handoff

OpenSpec change: `standardize-effect-package-contracts`

## Changed Files

- `packages/attune-architecture-lint/src/package-contract/assertions.ts`
- `packages/attune-architecture-lint/test/package-contract-assertions.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/compile-assertion-agent.md`

## Implemented

- Added branded `AttuneTypeDiagnostic` and `AssertTrue`.
- Added structural compile-only assertion helpers:
  - `AssertPackageContract`
  - `AssertExactHandlers`
  - `AssertPropertyHarnesses`
  - `AssertLayerProvidesPackageServices`
  - `AssertLayerSatisfiesRequiredServices`
  - `AssertTypeGuidanceComplete`
- Added no-op runtime assertion functions that return `true` for valid
  compile-time shapes and introduce no side effects.
- Added helper extraction for operation ids and required service ids.
- Aligned package-kind and operation-kind validation to the core type unions
  through type-only imports from `./core.js`.
- Accepted either design-style top-level kind metadata or the current core
  `metadata` slot for kind-specific metadata checks.
- Added positive type-oriented examples that force the assertions to evaluate
  during test compilation.

## Contract Status

The assertion kernel is intentionally structural so it can compile before the
`core.ts`, law, RPC, and type-guidance agents finish their APIs. It currently
checks:

- package id and operations presence
- package kind freshness against the core package kind union
- duplicate operation ids for tuple contracts
- missing or unknown operation kinds
- missing operation input/output schema slots
- unknown touched Reactivity keys and atom ids
- required metadata for resource, generator, projection, policy, Joern,
  event-facade, and atom-family operations
- exact handler/property operation maps
- simple callable/property-like handler values
- package layer provided service declarations
- test layer required service declarations
- type-guidance operation freshness plus explicit law partition freshness and
  view-partition presence

## Validated

- Narrow compile check for this slice passed:
  `pnpm exec tsc --noEmit --pretty false --module NodeNext --moduleResolution NodeNext --target ES2023 --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --types node,vitest/globals src/package-contract/assertions.ts test/package-contract-assertions.test.ts`
- Isolated assertion test passed:
  `pnpm exec vitest run test/package-contract-assertions.test.ts`

## Not Passing / Blockers

- `nx run attune-architecture:test` was attempted after neighboring Phase 1
  files appeared and failed in concurrent, unowned law-inference files:
  `src/package-contract/laws.ts:114` raises `Cannot access 'law' before
  initialization`.
- `nx run attune-architecture:typecheck` was attempted and failed in
  concurrent, unowned law/type-guidance files:
  - `src/package-contract/laws.ts:114..215`: block-scoped variable `law` used
    before declaration/assignment.
  - `test/package-contract-laws.test.ts:31`: inferred law type mismatch.
  - `test/package-contract-type-guidance.test.ts:233`: type-guidance literal
    partition ids are compared against diagnostic string output.

## Residual Debt

- Exact payload/success/error compatibility is not yet checked because this
  slice does not own the core Effect Schema/RPC model.
- Effect `Layer` generic extraction is not implemented yet; layer assertions
  currently use contract-visible structural service arrays such as `provides`,
  `providedServices`, or `_attuneProvides`.
- Negative type fixtures are still needed in an isolated compile-only runner so
  branded diagnostics can be asserted without putting failing examples in
  normal tests.
- The assertion module is not exported from a public barrel yet because this
  agent was explicitly scoped away from `src/index.ts` and package public API
  files.

## Next-Agent Recommendations

- `core`/barrel integration should re-export this module from the final
  `@attune/architecture/package-contract` public surface.
- `type-guidance-agent` should align its guidance helper types with
  `AssertTypeGuidanceComplete` or replace the local structural assumptions with
  the final Schema-backed model.
- `negative-fixture-agent` should add isolated failing fixtures for duplicate
  ids, extra handlers, missing handlers, unknown touched views, missing
  destructive approval, stale type guidance, and missing layer services.
- `layer`/RPC follow-up should replace structural service arrays with concrete
  Effect `Layer` and RPC handler type extraction once the final core API lands.
