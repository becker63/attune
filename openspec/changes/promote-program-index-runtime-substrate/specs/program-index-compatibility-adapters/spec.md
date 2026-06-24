## ADDED Requirements

### Requirement: Package contracts ingest as compatibility facts

Current package-contract declarations and generated contract outputs SHALL be
ingestible as transitional program-index facts.

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

### Requirement: Source BOM shards ingest as compatibility facts

Current Source BOM shards SHALL be ingestible as artifact and source ownership
facts.

#### Scenario: Source BOM shard is indexed
- **WHEN** a Source BOM shard is available
- **THEN** Attune SHALL project the shard into artifact/source ownership rows
- **AND** the rows SHALL be marked with `source-bom-compat` metadata

#### Scenario: Source BOM shard is missing
- **WHEN** a required Source BOM compatibility shard is missing before a ring is
  migrated
- **THEN** Attune SHALL emit a diagnostic and repair classification
- **AND** it SHALL NOT treat package-local Source BOM shards as final source
  truth

### Requirement: Type guidance and evidence maps ingest as observations

Existing type-guidance, package fuzz, property, and evidence maps SHALL ingest
as transitional observations rather than new package declaration requirements.

#### Scenario: Type guidance is indexed
- **WHEN** existing PackageTypeGuidance or equivalent generated guidance is
  available
- **THEN** Attune SHALL project it into observation or edge rows
- **AND** the rows SHALL be marked with compatibility source metadata

#### Scenario: New package lacks type guidance compatibility output
- **WHEN** a migrated package does not have old type-guidance output
- **THEN** program-index diagnostics SHALL NOT require that output as source
  truth

### Requirement: Generated companions ingest as generated artifacts

Generated companions SHALL be indexed as generated artifacts and not treated as
authored package source.

#### Scenario: Framework-owned generated companion is present
- **WHEN** a generated contract, registry, typecheck aggregate, or generated
  companion exists under framework-owned generated paths
- **THEN** Attune SHALL index it as a generated artifact with freshness state

#### Scenario: Package-local generated companion is present
- **WHEN** a package-local generated companion exists in package source
- **THEN** Attune SHALL index it as transitional generated artifact state
- **AND** policy MAY emit a staged diagnostic to move it into framework-owned
  generated/cache/index ownership

### Requirement: Parity mismatches are classified before deletion

Compatibility outputs SHALL remain available until parity mismatches are
classified and deletion preconditions are met.

#### Scenario: New and old diagnostics disagree
- **WHEN** program-index diagnostics and compatibility diagnostics disagree for
  a package ring
- **THEN** Attune SHALL classify the mismatch as expected shape difference,
  missing program-index field, deprecated old diagnostic, or regression
- **AND** the relevant compatibility output SHALL NOT be deleted until the
  mismatch is resolved or explicitly deferred
