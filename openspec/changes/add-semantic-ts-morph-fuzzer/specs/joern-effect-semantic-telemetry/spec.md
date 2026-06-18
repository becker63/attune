## ADDED Requirements

### Requirement: Semantic fuzzer emits mutation telemetry
The semantic fuzzer SHALL emit OTLP/Axiom telemetry for semantic project generation, mutation planning, mutation application, admission, Joern import, query execution, shrink, and fixture-candidate lifecycle.

#### Scenario: Semantic mutation is applied
- **WHEN** a mutation rule changes a project
- **THEN** telemetry includes mutation kind, project id, file id, FastCheck seed, FastCheck path, and syntax flavor

### Requirement: Semantic failures include replay metadata
Semantic fuzzer failures SHALL include enough metadata to replay the failing case.

#### Scenario: Semantic counterexample is found
- **WHEN** a semantic case fails
- **THEN** telemetry includes corpus seed id, mutation sequence, FastCheck seed, FastCheck path, failure class, and query fingerprint when available

### Requirement: Semantic query telemetry distinguishes import and query work
Semantic fuzzer telemetry SHALL distinguish project import/index duration from query recipe execution.

#### Scenario: Query recipe completes
- **WHEN** a query recipe runs against an imported semantic project
- **THEN** telemetry includes project name, worker id, query fingerprint, row count, and duration where available
