# Framework Testing Evidence Agent Handoff

Agent: `framework-testing-evidence-agent`
Wave: Phase 1A Attune Framework Foundation

Ownership:
- `framework/testing/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-testing-evidence-agent.md`

## Changed

- Split `@attune/framework-testing` into focused shared harness modules:
  operation registries, evidence producers, FastCheck wrappers, replay metadata,
  atom graph observers, and worker metadata.
- Added exact operation-map coverage helpers with runtime diagnostics and
  compile-time diagnostic types for generated handler/property/evidence maps.
- Added protocol evidence helpers that emit
  `AttuneProtocolEvidenceEvent` values for property runs, laws,
  counterexamples, Reactivity keys, and atom graph movement.
- Added Schema-coded replay metadata and counterexample cache entry helpers for
  later private runtime/cache persistence.
- Added a package-boundary FastCheck wrapper API with Schema-derived arbitrary
  slots via `Schema.toArbitrary`, provided arbitrary slots for waivered cases,
  output/error validation hooks, transform/filter metadata, replay metadata,
  and counterexample evidence.
- Added atom graph observation merge/dedupe helpers and worker/shard/random
  source/timeout metadata normalization.
- Expanded framework-testing tests across registry exactness, evidence events,
  atom graph observations, worker replay metadata, counterexample schema, and
  FastCheck property execution.

## Generated

- None.

## Validated

- `nx run framework-testing:typecheck`
  - Passed.
- `nx run framework-testing:test`
  - Passed; Nx also built the `attune-architecture` dependency.

## Not Run

- `workspace:policy-fast`
- `workspace:package-contracts-check`
- OpenSpec validation

## Contract Status

- `@attune/framework-testing` now has the shared evidence/harness primitives
  needed by generated package-boundary property modules.
- Evidence remains storage-agnostic and emits framework/protocol evidence
  events suitable for later runtime/cache writes.
- No report files, MCP adapters, SQLite internals, or Drizzle surfaces were
  added.

## Residual Migration Debt

- Generated harnesses still need to consume these helpers from `@attune/nx`.
- Type-level exactness is available as helper diagnostics, but descriptor-driven
  stale map checks still need generated compile-only assertion modules and Nx
  conformance integration.
- Worker execution is represented as metadata only; `@fast-check/worker`
  execution wrappers remain a later generated-target integration.
- Counterexample entries are Schema-coded values but are not yet written to the
  private framework runtime/cache.
- The Effect/FastCheck version boundary currently needs a narrow cast around
  `Schema.toArbitrary` because Effect's arbitrary type and workspace
  `fast-check` type come from different package versions.

## Blocked By

- No blocker for this slice.

## Next Agent

- Framework Nx/materialization agent should generate operation registries,
  exact property maps, and property modules against these helpers.
- Property/coverage conformance agent should compare emitted evidence against
  generated Protocol Obligations and project missing coverage through
  diagnostics/Nx output.
- Worker execution agent should bind the worker metadata helpers to
  `@fast-check/worker` targets while preserving the same evidence shape.
