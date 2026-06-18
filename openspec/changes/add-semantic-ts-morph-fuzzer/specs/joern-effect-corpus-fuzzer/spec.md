## ADDED Requirements

### Requirement: Existing corpus fuzzer can delegate to semantic mode
The existing corpus fuzzer SHALL remain available while semantic fuzzing is added as an additional mode.

#### Scenario: Existing quick fuzzer runs
- **WHEN** `joern-effect-properties:fuzz:quick` runs
- **THEN** the existing source-shaped fuzzer behavior remains available

### Requirement: Semantic mode shares counterexample promotion
The existing counterexample promotion model SHALL be reusable by semantic fuzzer failures.

#### Scenario: Semantic failure is useful
- **WHEN** a semantic failure is classified as a fixture candidate
- **THEN** it can be represented as a promoted counterexample seed
