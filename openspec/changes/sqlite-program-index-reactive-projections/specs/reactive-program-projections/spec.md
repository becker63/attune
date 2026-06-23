## ADDED Requirements

### Requirement: Program projections are atom/Reactivity-derived views over SQLite facts

Attune SHALL derive live diagnostics, repair plans, file summaries, and
workspace health from SQLite program facts using Reactivity and atoms.

#### Scenario: Indexed facts change

- **WHEN** program index rows change
- **THEN** Attune SHALL emit or record invalidation keys for the changed fact
  domain
- **AND** base atoms reading that domain SHALL refresh from SQLite

#### Scenario: Derived projection is needed

- **WHEN** the language service or check command needs diagnostics or repair
  plans
- **THEN** it SHOULD read atom-derived projections over SQLite facts rather
  than recomputing the full workspace imperatively

#### Scenario: Atom implementation attempts a write

- **WHEN** a program-index atom attempts to write SQLite, run Nx, call external
  services, or own lifecycle
- **THEN** architecture policy SHOULD reject it

### Requirement: SQLite invalidation drives Reactivity keys

Attune SHALL bridge program-index invalidation rows to Reactivity keys so
framework projections refresh when indexed facts change.

#### Scenario: Symbol invalidation is recorded

- **WHEN** a symbol row is inserted, updated, or deleted
- **THEN** Attune SHALL record or emit a `symbol` invalidation for the changed
  symbol id

#### Scenario: Schema or artifact invalidation is recorded

- **WHEN** schema_descriptor or artifact rows change
- **THEN** Attune SHALL record or emit `schema` or `artifact` invalidations for
  the changed subjects

#### Scenario: Diagnostic or repair invalidation is recorded

- **WHEN** diagnostic or repair rows change
- **THEN** Attune SHALL record or emit `diagnostic` or `repair` invalidations
  for the changed subjects

### Requirement: Program-index atoms are read-only projections

Program-index atoms SHALL explain indexed facts and SHALL NOT perform writes or
external actions.

#### Scenario: Base atom reads program facts

- **WHEN** a base atom such as `projectIndexAtom(projectId)` or
  `diagnosticsForFileAtom(filePath)` evaluates
- **THEN** it SHALL read SQL tables or views through framework runtime services

#### Scenario: Derived atom combines program projections

- **WHEN** a derived atom such as `workspaceHealthAtom()` or
  `repairPlansAtom(projectId)` evaluates
- **THEN** it SHALL combine base atom results into a live projection
- **AND** it SHALL NOT mutate SQLite, invoke Nx, call external services, or own
  worker lifecycle
