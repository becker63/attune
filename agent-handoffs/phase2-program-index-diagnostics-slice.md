# Phase 2 Program-Index Diagnostics Slice

Change: `promote-program-index-runtime-substrate`
Date: 2026-06-24

## Implemented

- Program-index diagnostic rows now convert to runtime diagnostics with source
  path, code, severity, message, optional numeric `range`, optional `cause`
  payload, and repair actions derived from indexed repair rows.
- `ProgramIndexDiagnosticsLive` provides the existing diagnostics service with
  program-index-first behavior. It falls back to compatibility diagnostics only
  when the index has no rows for the requested file or the index read fails.
- Language-service runtime projection can consume the program-index-backed
  diagnostics service and expose repair hints from indexed repair rows.
- Compatibility artifact ingestion now emits source_file, artifact,
  observation, diagnostic, and repair rows for missing/stale artifacts,
  package-local generated companions, source-bom compatibility inputs, and
  checked-in report artifacts.
- `workspace:attune-check` now reaches `workspace:program-index-materialize`
  first through `workspace:package-contracts-check`, materializing Nx project
  graph, TypeScript source, schema_descriptor, edge, artifact, observation,
  diagnostic, and repair facts into `.attune/cache/program-index.sqlite` before
  compatibility checks run.
- Direct `package-check` contract checks now route to the public
  `workspace:attune-check` path, and the runtime read model records diagnostic
  origins as `program-index`, `compatibility`, or `both`.
- Ring A parity fixture added for `effect-oxlint-policy`: observed
  framework-owned artifacts are current, program-index diagnostics are empty,
  compatibility diagnostics are empty, and classified mismatches are empty.

## Validation

- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `nx run framework-protocol:typecheck --skipNxCache`
- `nx run framework-runtime:typecheck --skipNxCache`
- `nx run framework-language-service:typecheck --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-architecture:build --skipNxCache`
- `nx run workspace:program-index-materialize --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run framework-runtime:test --skipNxCache` after the Ring A parity fixture
- `nx run framework-language-service:test --skipNxCache`
- `nx run framework-nx:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run workspace:attune-check --skipNxCache` after the Ring A parity fixture

## Still Open

- Continue to program-index repair routing. Compatibility APIs/helpers remain
  demolition scaffolding and must be removed, renamed, quarantined, or archived
  before this OpenSpec change can finish.
