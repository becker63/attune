Agent:
- framework-runtime-sqlite-adapter-agent

Wave:
- Phase 1A Attune Framework Foundation seam for
  `standardize-effect-package-contracts`.

Ownership:
- Worked only in `framework/runtime/**`, `framework/sqlite/**`, and this
  handoff file.
- Did not edit package contracts or `openspec/changes/standardize-effect-package-contracts/tasks.md`.
- The workspace already had dirty framework/runtime and framework/sqlite work;
  this slice preserved it and only added the runtime/sqlite adapter seam.

Changed:
- Added `framework/runtime/src/SqliteProtocolStoreAdapter.ts` with
  `runtimeProtocolStoreFromSqlite`, `RuntimeProtocolStoreFromSqliteLive`, and
  `SqliteRuntimeProtocolStoreLive`.
- Kept duplicate store names clear by aliasing sqlite imports internally and
  continuing to expose the runtime `ProtocolStore` interface as the abstraction
  consumed by `ProtocolRuntime`, `ProtocolQuery`, and `ProtocolDiagnostics`.
- Added `@attune/framework-sqlite` as a private framework/runtime dependency
  and a Vitest alias so runtime tests can exercise the real sqlite backend.
- Added `replaceDeltas(packageId, deltas)` to the runtime store interface and
  sqlite store API so delta refresh replaces a package's previous diagnostics
  instead of leaving resolved rows behind.
- Updated runtime refresh to persist computed deltas through replacement
  semantics.
- Added runtime integration coverage for sqlite `:memory:` materialization:
  descriptor -> obligations -> generated artifact -> evidence -> delta refresh
  -> query summary/deltas -> diagnostics.
- Added sqlite test coverage that `replaceDeltas("demo", [])` clears persisted
  package deltas.

Generated:
- No generated source, checked-in ProtocolDelta reports, obligation reports,
  evidence summaries, architecture summaries, Linear/GitHub summaries, or
  cloud-agent reports.

Validated:
- `nx run framework-runtime:typecheck`
- `nx run framework-sqlite:typecheck`
- `nx run framework-runtime:test`
  - Passed; 7 Vitest tests passed. Nx also ran the declared
    `attune-architecture:build` dependency successfully.
- `nx run framework-sqlite:test`
  - Passed; 7 Vitest tests passed. Nx also ran the declared
    `attune-architecture:build` dependency successfully.

Not run:
- Workspace-wide policy targets, language-service targets, framework-nx
  materializer targets, PostgreSQL/Neon backends, and proof-pressure targets.

Package contract status:
- No package contracts were edited.
- Runtime storage remains abstract for runtime consumers: runtime services use
  the runtime `ProtocolStore` interface, and sqlite is selected only through the
  adapter layer.
- Product packages still have no reason to import `@attune/framework-sqlite`;
  sqlite tables and node:sqlite details remain private to `framework/sqlite`.

Residual migration debt:
- The adapter currently creates sqlite stores without a scoped finalizer; tests
  use `:memory:` and process teardown. A future resource-managed store layer
  should close file-backed sqlite handles explicitly when long-lived runtime
  processes arrive.
- Runtime now has an intentional framework-internal dependency on
  `@attune/framework-sqlite`; import-boundary policy should continue rejecting
  product package sqlite imports.
- `ProtocolRuntime.refreshDeltas` still computes deltas in runtime and persists
  them wholesale per package; richer delta status lifecycles can layer on top of
  the same replacement boundary later.

Blockers:
- None for this seam.

Next agent:
- Framework Nx/materializer work can consume `ProtocolRuntime` with
  `SqliteRuntimeProtocolStoreLive({ path })` for local cache-backed diagnostic
  runs without depending on sqlite rows or generated report files as source
  truth.
