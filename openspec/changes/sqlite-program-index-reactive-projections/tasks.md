## 1. Proposal and compatibility planning

- [x] Document current generated-companion/package-contract inputs that must be ingested.
- [x] Identify existing framework/sqlite/runtime/protocol modules to extend rather than duplicate.
- [x] Add migration notes for compatibility with `standardize-effect-package-contracts` and `compress-attune-package-surface`.

## 2. SQLite program index schema

- [x] Define SQLite tables for project, target, source_file, symbol, schema_descriptor, edge, artifact, observation, diagnostic, repair, and invalidation_log.
- [x] Add schema migrations through framework/sqlite or framework/runtime.
- [x] Add in-memory/test adapter parity if needed.

## 3. Nx graph ingestion

- [x] Add `@nx/devkit` project graph loader.
- [x] Serialize projects, targets, and dependencies into SQLite.
- [x] Add tests using fixture project graph data.

## 4. TypeScript symbol indexing

- [x] Extract source files and exported symbols.
- [x] Store symbol rows with source ranges and hashes.
- [x] Store import/export and declaration edges.
- [x] Adapt existing protocol source extraction where useful.

## 5. Effect Schema descriptor serialization

- [x] Define `SchemaDescriptor` row format.
- [x] Serialize schema symbol ids, roles, hashes, shape JSON, annotations, serialization status, and non-serializable markers.
- [x] Preserve executable schema symbols for decode/encode.
- [x] Add diagnostics for unsupported/non-serializable schema features.

## 6. SQL projections and invalidation

- [x] Add SQL views for stale artifacts, diagnostics_by_file, repairable_diagnostics, symbols_by_file, schemas_by_symbol, and project_health.
- [x] Add invalidation_log writes through triggers or Effect materializer services.
- [x] Add Reactivity bridge that consumes invalidation_log and invalidates domain keys.

## 7. Atom-derived program projections

- [x] Add base atoms over program index tables/views.
- [x] Add derived atoms for project health, file diagnostics, repair plans, and workspace summary.
- [x] Enforce atom no-write policy for program-index atoms.

## 8. Diagnostics and repairs

- [x] Derive diagnostics from indexed facts and SQL/atom projections.
- [x] Store/project repair plans.
- [x] Route safe repairs to Nx materializers/generators.
- [x] Keep public check/repair command surface.

## 9. Compatibility adapters

- [x] Ingest existing attune.package.ts and generated companion data into the program index.
- [x] Ingest Source BOM shards as artifact/source ownership rows.
- [x] Ingest generated contract/type-guidance data as transitional rows or observations.
- [x] Add parity tests proving existing checks can be answered from the program index.

## 10. Validation and docs

- [x] Update AGENTS.md/operating docs to describe the program-index direction.
- [x] Validate OpenSpec change.
- [x] Record residual migration debt.

## Residual migration debt

- `framework/nx` uses the installed `nx/src/devkit-exports` TypeScript API for
  project graph ingestion because this checkout does not install standalone
  `@nx/devkit`. It is the same devkit export surface; switch the import to
  `@nx/devkit` when the workspace adds that package directly.
- The program index now materializes rows, views, invalidations, projections,
  diagnostics, repairs, and compatibility facts. Follow-up consolidation can
  route existing `workspace:attune-check`/`attune-repair` internals to this
  index as active architecture migration files settle.
