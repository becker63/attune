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

## Validation

- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `nx run framework-protocol:typecheck --skipNxCache`
- `nx run framework-runtime:typecheck --skipNxCache`
- `nx run framework-language-service:typecheck --skipNxCache`

## Still Open

- Route check executor internals through program-index materialization and mark
  diagnostic origin as program-index, compatibility, or parity.
- Add Ring A diagnostic parity fixtures before deleting old diagnostic helpers.
