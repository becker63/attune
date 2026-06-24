# Phase 3 Program-Index Repair Routing Slice

Date: 2026-06-24

## Changed

- Expanded program-index repair rows with implementation `route` and
  `validation_after_targets_json` fields.
- Rebuilt the `repairable_diagnostics` view so repair lookups can filter by
  workspace, project, source file path, and diagnostic id.
- Added repair delete support and tests proving repair insert, update, and
  delete invalidation rows.
- Added program-index repair-row planning in `framework-nx`, keeping public Nx
  targets primary while storing internal routes as implementation metadata.
- Updated `attune-repair` so indexed repair rows are read first. Safe rows with
  known routes execute through existing materializers; `needs-review`,
  `manual-only`, and blocked rows are reported but not executed by default.
- Updated the public Nx dry-run path so `nx run workspace:attune-repair
  --dryRun` invokes the repair CLI with `--dry-run` and prints the indexed
  repair summary without writing source or checked-in reports.

## Validated

- `nx run framework-sqlite:test --skipNxCache`
- `nx run framework-runtime:test --skipNxCache`
- `nx run framework-nx:test --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run framework-language-service:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run framework-sqlite:typecheck --skipNxCache`
- `nx run framework-runtime:typecheck --skipNxCache`
- `nx run framework-nx:typecheck --skipNxCache`
- `nx run attune-nx:typecheck --skipNxCache`
- `nx run attune-architecture:build --skipNxCache`
- `nx run attune-nx:build --skipNxCache`
- `nx run workspace:attune-check --skipNxCache`
- `nx run workspace:attune-repair --dryRun --skipNxCache`

## Observed

- Current workspace repair dry-run reads 27 indexed repair rows: 21 safe rows
  are blocked because they only route to program-index materialization, and 6
  manual-only checked-in report/artifact rows require human deletion or later
  compatibility cleanup.

## Still Open

- Compatibility APIs, helpers, generated outputs, and old ontology terms remain
  demolition scaffolding. They should be removed, renamed, quarantined, or
  archived in the later compatibility/ring cleanup phases once parity is proven.
