## ADDED Requirements

### Requirement: Program index is the primary local compiler database

Attune SHALL treat the SQLite program index as the primary local compiler
database for mechanical workspace facts once materialization succeeds.

#### Scenario: Workspace facts are materialized
- **WHEN** Attune materializes workspace state
- **THEN** it SHALL store Nx projects, targets, TypeScript source files,
  exported symbols, Effect Schema descriptors, edges, artifacts, observations,
  diagnostics, repairs, and invalidation events as queryable program-index rows
- **AND** compatibility package-contract outputs MAY be indexed as transitional
  facts

#### Scenario: Program index is unavailable
- **WHEN** the local program index cannot be opened, migrated, or materialized
- **THEN** Attune SHALL report the program-index failure
- **AND** check paths MAY use compatibility diagnostics only when the fallback
  is explicitly marked

### Requirement: Program index stores compatibility facts with source metadata

Compatibility rows SHALL identify the transitional source that produced them
and SHALL remain migration scaffolding rather than permanent primary ontology.

#### Scenario: Compatibility fact is inserted
- **WHEN** Attune indexes data from package-contract generated output, Source
  BOM shards, type guidance, generated companions, or package-contract tests
- **THEN** the resulting rows SHALL include source metadata such as
  `package-contract-compat`, `artifact-ownership-compat`,
  `type-guidance-compat`, or `generated-companion-compat`
- **AND** those rows SHALL NOT be treated as authored source truth

#### Scenario: Compatibility fact is absent
- **WHEN** a migrated package no longer has package-local generated companions
- **THEN** program-index materialization SHALL NOT fail solely because those
  package-local companions are absent

#### Scenario: Mechanical row reaches parity
- **WHEN** mechanical program-index rows answer the same check, repair,
  freshness, and diagnostic questions as a compatibility source
- **THEN** that compatibility source SHALL no longer be required for primary
  materialization
- **AND** active check and repair paths SHALL prefer the mechanical rows

### Requirement: SQL views provide mechanical derivations

Attune SHALL provide SQL views for simple mechanical derivations before adding
bespoke TypeScript projection code for equivalent joins.

#### Scenario: Diagnostic lookup is requested
- **WHEN** tooling needs diagnostics for a file or project
- **THEN** Attune SHOULD answer through program-index tables or views such as
  `diagnostics_by_file`

#### Scenario: Repair lookup is requested
- **WHEN** tooling needs repairable diagnostics
- **THEN** Attune SHOULD answer through program-index tables or views such as
  `repairable_diagnostics`

#### Scenario: Artifact freshness is requested
- **WHEN** tooling needs generated artifact freshness
- **THEN** Attune SHOULD answer through program-index artifact rows or
  stale-artifact views

### Requirement: Program index remains local framework-owned state

The program index SHALL remain local framework-owned materialization state, not
package-authored source truth.

#### Scenario: Product package imports program-index internals
- **WHEN** a product package imports SQLite, Drizzle, raw ProgramIndex tables,
  ProtocolStore internals, or generated cache paths
- **THEN** architecture policy SHALL report an import-boundary violation

#### Scenario: Generated cache is written
- **WHEN** Attune writes generated/debug/typecheck artifacts derived from the
  program index
- **THEN** it SHALL write them under framework-owned generated/cache locations
  or explicitly documented framework-owned checked-in paths
- **AND** product packages SHALL NOT import those cache paths as product source
