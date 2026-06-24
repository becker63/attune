## ADDED Requirements

### Requirement: Program-index projections are read-only atom views

Program-index atoms SHALL be read-only derived views over SQLite facts.

#### Scenario: Program-index atom reads data
- **WHEN** a program-index atom evaluates
- **THEN** it SHALL read through framework runtime query services
- **AND** it SHALL NOT mutate SQLite, invoke Nx, call external services, or
  own lifecycle

#### Scenario: Derived program projection combines facts
- **WHEN** a derived atom such as workspace health, file diagnostics, package
  summary, or repair-plan summary evaluates
- **THEN** it SHALL compose indexed facts and base atom results
- **AND** it SHALL remain side-effect-free

### Requirement: Program-index invalidation drives Reactivity

Program-index row changes SHALL create invalidation entries or emitted
Reactivity keys so projections can refresh.

#### Scenario: Symbol fact changes
- **WHEN** a symbol row is inserted, updated, or deleted
- **THEN** Attune SHALL record or emit an invalidation for the changed symbol
  subject

#### Scenario: Schema or artifact fact changes
- **WHEN** schema descriptor or artifact rows are inserted, updated, or deleted
- **THEN** Attune SHALL record or emit schema or artifact invalidations for the
  changed subjects

#### Scenario: Diagnostic or repair fact changes
- **WHEN** diagnostic or repair rows are inserted, updated, or deleted
- **THEN** Attune SHALL record or emit diagnostic or repair invalidations for
  the changed subjects

### Requirement: Language service reads projected diagnostics and repairs

The TypeScript language-service surface SHALL read program-index-backed
diagnostics and repair hints through framework runtime services.

#### Scenario: File diagnostics are requested
- **WHEN** the language service requests diagnostics for a file
- **THEN** it SHALL query ProgramDiagnostics, ProgramFactQuery, or equivalent
  runtime projection services
- **AND** it SHALL NOT read raw SQLite tables directly

#### Scenario: Code actions are requested
- **WHEN** a diagnostic has a safe or reviewable repair row
- **THEN** the language service SHALL expose a repair hint or code action that
  names the public Nx repair target
- **AND** it SHALL NOT mutate generated artifacts directly
