## ADDED Requirements

### Requirement: Effect Schema serializes to descriptors, not executable behavior

Attune SHALL serialize Effect Schema boundary shapes into SQLite descriptor rows
while retaining executable schema values in TypeScript source for decode/encode.

#### Scenario: Schema symbol is materialized

- **WHEN** an exported Effect Schema symbol is discovered
- **THEN** Attune SHALL store a schema descriptor row with source symbol id,
  role, descriptor hash, shape JSON, annotations JSON, and serialization status

#### Scenario: Schema contains executable features

- **WHEN** a schema contains transforms, refinements, filters, or other
  non-serializable executable behavior
- **THEN** Attune SHALL store a non-serializable feature marker
- **AND** diagnostics MAY explain that runtime decode/encode still depends on
  the executable source symbol

### Requirement: Schema descriptors support diagnostics and freshness

Schema descriptor rows SHALL be sufficient for diagnostics, repair freshness,
schema change detection, generated artifact invalidation, observation grouping,
and language-service quick info.

#### Scenario: Schema shape changes

- **WHEN** the indexed shape or annotations for an Effect Schema symbol change
- **THEN** Attune SHALL update the descriptor hash or AST hash
- **AND** generated artifacts and observations that depend on that descriptor
  SHOULD become queryable as stale or affected

#### Scenario: Schema is not fully serializable

- **WHEN** a schema has non-serializable executable features
- **THEN** Attune SHALL preserve the executable TypeScript symbol as the runtime
  decode/encode authority
- **AND** the descriptor SHALL record enough feature markers for diagnostics and
  repair planning

### Requirement: Schema descriptors are associated with source symbols

Every schema descriptor SHALL reference the indexed TypeScript symbol that owns
the executable schema value.

#### Scenario: Descriptor is queried by symbol

- **WHEN** tooling asks for schemas associated with a source symbol or project
- **THEN** Attune SHALL answer from schema_descriptor rows joined to symbol and
  source_file rows

#### Scenario: Descriptor lacks a source symbol

- **WHEN** schema serialization cannot identify the owning TypeScript symbol
- **THEN** Attune SHALL emit a diagnostic or observation rather than treating
  the descriptor as trusted source truth
