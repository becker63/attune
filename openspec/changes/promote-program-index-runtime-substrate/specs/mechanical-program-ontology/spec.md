## ADDED Requirements

### Requirement: Primary runtime vocabulary is mechanical

Attune SHALL use mechanical program fact names as the primary runtime
vocabulary for the program-index path.

#### Scenario: New runtime storage is added
- **WHEN** implementation adds program-index tables, rows, views, query
  objects, or projection records
- **THEN** those names SHALL be based on mechanical facts such as `project`,
  `target`, `source_file`, `symbol`, `schema_descriptor`, `edge`, `artifact`,
  `observation`, `diagnostic`, `repair`, or `invalidation`
- **AND** they SHALL NOT introduce new first-class Package, Protocol,
  Operation, View, Law, Obligation, Evidence, Delta, TypeGuidance, SourceBOM,
  GeneratorShape, FuzzHandler, PropertyMap, or RpcGroup runtime objects when a
  mechanical fact can represent the same data

#### Scenario: New diagnostic domain is added
- **WHEN** implementation adds diagnostics for package declarations,
  generated artifacts, schema descriptors, artifact ownership, observations, or
  repairs
- **THEN** the diagnostic SHALL identify the mechanical fact that is missing,
  stale, invalid, observed, or repairable
- **AND** compatibility terms MAY appear only as labels that explain where the
  fact came from

### Requirement: Rich Attune nouns are temporary legacy labels

Existing package-contract and protocol nouns SHALL be treated as temporary
legacy labels in the big-cut path and SHALL be removed from primary docs,
runtime APIs, diagnostics, generated surfaces, and normal agent workflow after
parity.

#### Scenario: Compatibility input is read
- **WHEN** Attune reads a package contract, protocol descriptor, operation,
  view, law, obligation, evidence map, delta-like report, Artifact ownership shard,
  generator shape, type guidance, property map, fuzz handler, or RPC group
- **THEN** it SHALL project that input into mechanical rows
- **AND** it SHALL mark the source as compatibility metadata rather than
  creating new primary runtime ontology

#### Scenario: Compatibility output remains required
- **WHEN** a project ring still requires an old generated companion or
  package-contract output for validation
- **THEN** the output SHALL remain available as compatibility input
- **AND** new implementation SHALL NOT expand it with new conceptual
  responsibilities unless needed to preserve current behavior during parity

#### Scenario: Package ring reaches parity
- **WHEN** a project ring reaches program-index diagnostic and repair parity
- **THEN** old ontology terms for that ring SHALL be removed from active
  public docs, normal diagnostics, generated surfaces, and primary runtime APIs
- **AND** any remaining old terms SHALL live only in explicitly named legacy
  adapter, historical, archived, or future-delete paths

### Requirement: New public docs teach only mechanical facts as the normal model

Agent-facing and public operating docs SHALL teach the mechanical program
model as the normal model and SHALL NOT keep old ontology vocabulary as a
parallel explanation.

#### Scenario: Public docs describe Attune checks
- **WHEN** docs explain `attune-check`, diagnostics, language-service output,
  or generated artifact freshness
- **THEN** they SHALL describe projects, files, symbols, schemas, edges,
  artifacts, observations, diagnostics, repairs, and invalidations as the
  primary model
- **AND** package-contract or protocol terms SHALL be labeled compatibility,
  migration, or advanced implementation details when mentioned

#### Scenario: Public docs describe repair
- **WHEN** docs explain `attune-repair`
- **THEN** they SHALL describe repair rows or repair plans over mechanical
  facts
- **AND** they SHALL NOT require agents to choose an operation, law,
  obligation, package fuzz handler, property map, or generator-shape object as
  the normal workflow

#### Scenario: Active docs mention old ontology after parity
- **WHEN** active docs for a migrated ring still present package contracts,
  protocols, operations, views, laws, obligations, evidence, deltas, type
  guidance, Artifact ownership, generator shapes, fuzz handlers, property maps, or RPC
  groups as normal workflow concepts
- **THEN** documentation policy SHALL report drift
- **AND** the docs SHALL be rewritten to mechanical language or moved to
  historical/archive context

### Requirement: Compatibility parity is measured by answers, not nouns

The program-index path SHALL prove it can answer the old layer's questions
without preserving the old layer's vocabulary as primary runtime objects.

#### Scenario: Old diagnostic is compared with new diagnostic
- **WHEN** a compatibility diagnostic and a program-index diagnostic are
  compared for parity
- **THEN** parity SHALL be based on the project, file, symbol, artifact,
  diagnostic code, repairability, and safety outcome
- **AND** the new path SHALL NOT be required to expose the same Package,
  Operation, Law, Obligation, Evidence, or Delta object shape

#### Scenario: Old generated companion is demoted
- **WHEN** an old generated companion is considered for demotion or deletion
- **THEN** the replacement proof SHALL identify the mechanical rows, SQL views,
  diagnostics, repairs, and validation targets that answer the same workflow
  questions

#### Scenario: Old object shape remains after parity
- **WHEN** an old Package, Operation, Law, Obligation, Evidence, Delta,
  TypeGuidance, SourceBOM, GeneratorShape, FuzzHandler, PropertyMap, or RpcGroup
  object shape remains in active primary runtime after parity
- **THEN** the implementation SHALL either delete it, rename it to mechanical
  terms, or move it behind an explicitly scoped legacy adapter with a deletion
  task
