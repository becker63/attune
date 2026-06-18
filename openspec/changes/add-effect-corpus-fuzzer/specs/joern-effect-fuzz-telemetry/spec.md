## ADDED Requirements

### Requirement: Fuzzer emits OTLP/Axiom telemetry
The fuzzer SHALL emit structured telemetry for run, worker, case, import, query, shrink, and counterexample lifecycle events.

#### Scenario: Fuzzer run completes
- **WHEN** a fuzzer run completes
- **THEN** Axiom receives run summary events with run id, target, worker count, case counts, failure counts, and duration

### Requirement: Case telemetry includes replay metadata
Each admitted or failing case SHALL include replay metadata.

#### Scenario: Counterexample is found
- **WHEN** a fuzzer case fails
- **THEN** telemetry includes FastCheck seed, FastCheck path, corpus seed id, mutator sequence, syntax flavor, Joern project name, query fingerprint, invariant id, and failure class

### Requirement: Rejection telemetry is preserved
Rejected generated cases SHALL be observable without consuming Joern resources.

#### Scenario: Admission rejects generated source
- **WHEN** a generated source case is rejected
- **THEN** the fuzzer emits a rejection event with reason, syntax flavor, seed id, and mutators

### Requirement: Telemetry supports debugging query reuse
Telemetry SHALL distinguish import/index time from query execution time.

#### Scenario: Query fuzzing is slow
- **WHEN** Axiom is queried for slow fuzzer activity
- **THEN** import duration, query duration, worker id, project name, and query fingerprint are available as separate fields
