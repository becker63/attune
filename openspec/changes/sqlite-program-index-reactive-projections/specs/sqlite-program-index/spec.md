## ADDED Requirements

### Requirement: SQLite stores mechanical program facts

Attune SHALL store mechanical program facts in a local SQLite program index
rather than requiring package-local generated protocol manifests as source
truth.

#### Scenario: Project graph is indexed

- **WHEN** Attune materializes the workspace
- **THEN** Nx projects, targets, roots, source roots, and dependency edges SHALL
  be stored as queryable SQLite rows

#### Scenario: Source symbols are indexed

- **WHEN** Attune indexes TypeScript source files
- **THEN** exported symbols, source ranges, symbol hashes, and import/export
  edges SHALL be stored as queryable SQLite rows

#### Scenario: Generated artifact freshness is indexed

- **WHEN** Attune checks generated artifacts
- **THEN** artifact rows SHALL record source hash/fingerprint inputs and
  fresh/stale/missing status

### Requirement: Program index uses a small local compiler database schema

Attune SHALL model the initial program index around mechanical categories such
as project, target, source_file, symbol, schema_descriptor, edge, artifact,
observation, diagnostic, repair, and invalidation_log.

#### Scenario: Program index is created

- **WHEN** the local program index is initialized
- **THEN** it SHALL create or migrate the tables needed for projects, targets,
  source files, symbols, schema descriptors, edges, artifacts, observations,
  diagnostics, repairs, and invalidation events

#### Scenario: Program index path is needed

- **WHEN** Attune stores local compiler-database state
- **THEN** it SHOULD use `.attune/cache/program-index.sqlite` or the current
  framework SQLite cache location
- **AND** the database SHALL remain local framework materialization state rather
  than a package-authored source file

### Requirement: SQL views SHALL provide mechanical derivations

Attune SHALL provide SQL views for simple derivations over indexed program
facts before adding bespoke TypeScript projection classes for the same
mechanical joins.

#### Scenario: Symbol facts are queried

- **WHEN** tooling needs symbols grouped by source file or schema descriptors
  grouped by source symbol
- **THEN** Attune SHOULD answer through SQL views such as `symbols_by_file` and
  `schemas_by_symbol`

#### Scenario: Artifact or diagnostic state is queried

- **WHEN** tooling needs stale artifacts, diagnostics by file, repairable
  diagnostics, project health, or schema serialization issues
- **THEN** Attune SHOULD answer through SQL views over the program index
