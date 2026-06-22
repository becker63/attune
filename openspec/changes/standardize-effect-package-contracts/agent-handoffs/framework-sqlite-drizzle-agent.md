Agent:
- framework-sqlite-drizzle-agent

Wave:
- Phase 1A Attune Framework Foundation, SQLite/Drizzle store slice for
  `standardize-effect-package-contracts`.

Ownership:
- `framework/sqlite/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-sqlite-drizzle-agent.md`
- No edits to `framework/runtime` or `tasks.md`.

Changed:
- Replaced the minimal synchronous store shape in `framework/sqlite/src/index.ts`
  with a private Effect service API backed by `Context.Service` and
  `Layer`.
- Kept the default local cache at gitignored `.attune/cache/protocol.sqlite`.
- Added node:sqlite migrations/init, health reporting, reset/reinitialize,
  deterministic descriptor hash verification, generated artifact content hash
  helper, descriptor receipts, typed store errors, and list/query helpers.
- Added Schema-coded payload encode/decode and row-shape decode before values
  cross the SQLite boundary.
- Added roundtrip storage for descriptors, obligations, evidence runs,
  evidence events, generated artifacts, and deltas.
- Added an in-memory test service implementation with the same Effect-returning
  API.
- Removed the stale `@attune/framework-runtime` dependency and Vitest alias
  from `framework/sqlite` so the dependency direction remains runtime ->
  sqlite, not sqlite -> runtime.

Generated:
- No checked-in ProtocolDelta, obligation, evidence, architecture, Linear,
  GitHub, or cloud-agent reports were generated.
- Added this handoff file only.

Validated:
- `nx run framework-sqlite:typecheck`
  - Result: passed.
- `nx run framework-sqlite:test`
  - Result: passed; 7 Vitest tests passed. Nx also ran the declared
    `attune-architecture:build` dependency successfully.

Not run:
- Full workspace policy, runtime integration, language-service diagnostics,
  Nx materializer, PostgreSQL/Neon, and proof-pressure targets.

Contract status:
- `framework/sqlite` now exposes a private Effect service boundary suitable for
  framework/runtime integration.
- Raw SQLite tables and migration SQL remain private implementation details in
  `framework/sqlite/src/index.ts`; no raw Drizzle or SQLite table object is
  exported as public package API.
- Descriptor and generated artifact hashes are recorded through service methods
  and helpers; descriptors with non-deterministic hashes are rejected.
- Protocol rows are Schema-coded at write/read boundaries.
- `tasks.md` remains unchanged per delegation.

Residual migration debt:
- Drizzle is available elsewhere in the workspace lockfile, but
  `@attune/framework-sqlite` does not currently depend on Drizzle. This slice
  therefore implements the service boundary over `node:sqlite`.
- A future Drizzle migration can replace the node:sqlite internals behind the
  same `ProtocolStoreApi` without exposing tables to product packages.
- Runtime delta computation still belongs in `framework/runtime`; sqlite now
  persists and lists deltas but does not duplicate runtime projection logic.
- Future runtime/query agents should add integration tests once
  `framework/runtime` consumes this store service.

Blocked by:
- No local blocker for this sqlite service slice.
- Drizzle-backed implementation is blocked on an intentional dependency/API
  decision for `@attune/framework-sqlite`.

Next agent:
- Wire `framework/runtime` to consume `ProtocolStore` through the Effect layer
  boundary, then validate descriptor materialization, obligation persistence,
  evidence persistence, generated artifact stale-state deltas, and diagnostic
  query projections end to end.
