# Nx Runtime Graph Worker Handoff

Agent: `nx-runtime-graph-worker`

Scope:
- Implemented the Nx graph/runtime metadata slice for
  `standardize-effect-package-contracts`.
- Stayed inside graph/runtime integration ownership. Did not convert package
  command surfaces or replace project executors.
- Created this handoff because the requested
  `agent-handoffs/nx-runtime-graph-worker.md` file did not exist in the
  checkout.

Changed:
- `packages/attune-nx/src/package-contract-graph.ts`
  - Added target semantics for `protocol-materialize` and
    `framework-diagnostics`, completing the eight contract-derived target
    semantics requested by task 3.5.
  - Added `affectedBy` and `runtimeInputs` metadata to target semantics so
    descriptor hashes, generated artifact hashes, internal protocol deltas,
    repair actions, diagnostics, waiver state, and evidence state are explicit
    read-model inputs.
  - Added affected target derivation for package-contract, schema, service,
    Reactivity key, atom graph, generated artifact, runtime delta, waiver, and
    coverage changes, including DI propagation from provider packages to
    consumers.
  - Added workerized property shard metadata for package, operation, seed
    range, coverage corpus, worker count, timeout, isolation level, resource
    tier, random source, and evidence output.
  - Added deterministic merge target metadata for property evidence and atom
    graph coverage summaries, plus a deterministic shard-summary merge helper.
  - Extended runtime fact reads to consume generated artifact hashes and
    diagnostics through optional `ProtocolQuery`-shaped read-model methods
    instead of report/ledger files.
- `packages/attune-nx/test/package-contract-graph.test.ts`
  - Added tests for the full inferred target list, DI affected propagation,
    Reactivity/atom graph affected propagation, worker shard metadata,
    deterministic merge target metadata, deterministic shard merge output, and
    runtime read-model facts.
- `project.json`
  - Added metadata-only runtime check descriptors to
    `workspace:package-contracts-check`; no executor or command surface was
    changed.
- `openspec/changes/standardize-effect-package-contracts/tasks.md`
  - Marked 3.5, 3.6, 3.7, 3.8, and 3.14 complete.
  - Left 3.12 open because generic executor behavior, specialized executor
    justification, and direct command surface rejection tests are outside this
    slice.
  - Left 8.10 open because this slice added metadata/read-model coverage but
    did not change policy implementation.

Generated:
- No generated source, protocol reports, ledgers, evidence summaries,
  architecture summaries, or checked-in runtime artifacts were produced.

Validated:
- `pnpm exec vitest run packages/attune-nx/test/package-contract-graph.test.ts --config packages/attune-nx/vitest.config.ts` passed: 14 tests.
- `nx run framework-runtime:typecheck` passed.
- `nx run workspace:package-contracts-check` passed.
- `git diff --check -- packages/attune-nx framework/runtime openspec/changes/standardize-effect-package-contracts project.json` passed after the scoped edits.

Not run / blocked:
- `nx run attune-nx:typecheck` was attempted and is blocked by concurrent
  out-of-scope type errors:
  - `framework/protocol/src/index.ts` has an ambiguous `decodePackageContract`
    re-export.
  - `packages/attune-architecture/src/package-contract/validation.ts` has an
    `exactOptionalPropertyTypes` mismatch for operation view metadata.
- `nx run attune-nx:test -- --run package-contract-graph` was attempted and
  failed before reaching `attune-nx` because the dependent
  `attune-architecture:build` target hit the same validation exact-optional
  type error.
- `nx run framework-runtime:test` was attempted and failed before reaching
  runtime tests because the dependent `attune-architecture:build` target hit
  the same validation exact-optional type error.

Package contract status:
- The graph helper now exposes tested target semantics, affected-run metadata,
  worker shard metadata, deterministic merge metadata, and ProtocolQuery-backed
  runtime fact reads for package contract graph consumers.
- Runtime facts are modeled as read-model inputs and cache paths under
  `.attune/cache`, not checked-in reports.

Residual migration debt:
- Actual Nx plugin/project-graph registration still needs to consume these
  helpers.
- `workspace:package-contracts-check` now advertises runtime checks in metadata,
  but task 8.10 still needs policy implementation wiring if the coordinator
  wants that target to actively query runtime state.
- Broader task 3.12 remains open for generic typed executor behavior,
  specialized executor justification, and command-surface rejection tests.
- Concurrent edits are present in other `attune-nx` and `framework/runtime`
  files; this slice did not revert or overwrite them.

Blockers:
- Existing `attune-architecture` and `framework/protocol` type errors block
  Nx-owned typecheck/test validation paths that depend on architecture build.

Next agent:
- Wire `derivePackageContractAffectedTargets`,
  `inferWorkerizedPropertyShardMetadata`, and
  `inferDeterministicMergeTargetMetadata` into the concrete Nx graph/plugin or
  executor surface.
- Complete 8.10 by making `workspace:package-contracts-check` actively consume
  ProtocolQuery/runtime diagnostics when policy ownership is clear.
- Resolve the architecture/protocol exact-optional and re-export type blockers,
  then rerun the Nx validations listed above.
