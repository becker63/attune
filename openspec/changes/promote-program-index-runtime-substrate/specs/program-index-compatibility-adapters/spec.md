## ADDED Requirements

### Requirement: Package contracts ingest as temporary legacy facts

Current package-contract declarations and generated contract outputs SHALL be
ingestible as transitional program-index facts until mechanical parity is
proven for the relevant project ring.

#### Scenario: Package contract output is indexed
- **WHEN** a generated PackageContract output is available
- **THEN** Attune SHALL project it into symbol, schema, edge, artifact,
  observation, diagnostic, or repair rows
- **AND** the rows SHALL be marked with compatibility source metadata

#### Scenario: Operation metadata is indexed
- **WHEN** old operation metadata is read from compatibility outputs
- **THEN** Attune SHALL represent it as exported symbol facts with schema and
  edge metadata
- **AND** it SHALL NOT require new first-class persisted Package, Operation, or
  Law tables

#### Scenario: Package contract parity is proven
- **WHEN** the program index answers the package contract check, diagnostic,
  repair, and generated freshness questions for a project ring
- **THEN** active runtime code for that ring SHALL stop depending on generated
  PackageContract object shapes as primary data
- **AND** remaining package-contract code SHALL be legacy adapter, historical,
  or future-delete code only

### Requirement: Artifact ownership shards ingest as temporary legacy facts

Current Artifact ownership shards SHALL be ingestible as artifact and artifact ownership
facts until artifact ownership rows prove parity.

#### Scenario: Artifact ownership shard is indexed
- **WHEN** a Artifact ownership shard is available
- **THEN** Attune SHALL project the shard into artifact ownership rows
- **AND** the rows SHALL be marked with `artifact-ownership-compat` metadata

#### Scenario: Artifact ownership shard is missing
- **WHEN** a required Artifact ownership compatibility shard is missing before a ring is
  migrated
- **THEN** Attune SHALL emit a diagnostic and repair classification
- **AND** it SHALL NOT treat package-local Artifact ownership shards as final source
  truth

#### Scenario: Source ownership parity is proven
- **WHEN** artifact ownership rows answer the Artifact ownership
  checks for a project ring
- **THEN** Artifact ownership shards for that ring SHALL be deleted, quarantined, or
  moved to historical/generated compatibility paths
- **AND** active docs SHALL stop describing Artifact ownership as normal workflow

### Requirement: Type guidance and evidence maps ingest as observations

Existing type-guidance, package fuzz, property, and evidence maps SHALL ingest
as transitional observations rather than new package declaration requirements
until observation/schema_descriptor rows prove parity.

#### Scenario: Type guidance is indexed
- **WHEN** existing PackageTypeGuidance or equivalent generated guidance is
  available
- **THEN** Attune SHALL project it into observation or edge rows
- **AND** the rows SHALL be marked with compatibility source metadata

#### Scenario: New package lacks type guidance compatibility output
- **WHEN** a migrated package does not have old type-guidance output
- **THEN** program-index diagnostics SHALL NOT require that output as source
  truth

#### Scenario: Observation parity is proven
- **WHEN** observation and schema_descriptor rows answer the relevant
  type-guidance, fuzz, property, or evidence questions
- **THEN** old type-guidance, package fuzz, property, and evidence map outputs
  SHALL be removed from active primary runtime paths or moved behind legacy
  adapter code with a deletion task

### Requirement: Generated companions ingest as generated artifacts

Generated companions SHALL be indexed as generated artifacts and not treated as
authored package source. They SHALL be deleted or quarantined after
program-index generated artifact parity is proven.

#### Scenario: Framework-owned generated companion is present
- **WHEN** a generated contract, registry, typecheck aggregate, or generated
  companion exists under framework-owned generated paths
- **THEN** Attune SHALL index it as a generated artifact with freshness state

#### Scenario: Package-local generated companion is present
- **WHEN** a package-local generated companion exists in package source
- **THEN** Attune SHALL index it as transitional generated artifact state
- **AND** policy MAY emit a staged diagnostic to move it into framework-owned
  generated/cache/index ownership

#### Scenario: Generated artifact parity is proven
- **WHEN** artifact rows, freshness checks, diagnostics, repairs, and
  validation targets answer the same workflow questions as a generated
  companion
- **THEN** that companion SHALL be removed from active package-local source
  and primary generated lookup paths
- **AND** any retained copy SHALL be explicitly historical, archived, or
  legacy adapter data

### Requirement: Parity mismatches are classified before deletion

Compatibility outputs SHALL remain available only until parity mismatches are
classified and deletion or quarantine preconditions are met.

#### Scenario: New and old diagnostics disagree
- **WHEN** program-index diagnostics and compatibility diagnostics disagree for
  a project ring
- **THEN** Attune SHALL classify the mismatch as expected shape difference,
  missing program-index field, deprecated old diagnostic, or regression
- **AND** the relevant compatibility output SHALL NOT be deleted until the
  mismatch is resolved or explicitly deferred

#### Scenario: Compatibility output has no unresolved mismatch
- **WHEN** a compatibility output has a mechanical replacement and no
  unresolved parity mismatch
- **THEN** the implementation SHALL delete, quarantine, or archive the old
  output rather than keep it as active workflow truth
