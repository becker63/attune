## ADDED Requirements

### Requirement: Import/index cost is separated from query fuzzing
The fuzzer SHALL separate Joern import/index work from query fuzzing work.

#### Scenario: Running query fuzzing
- **WHEN** a corpus project has been imported into a Joern worker
- **THEN** the fuzzer runs multiple generated DSL query recipes against that imported CPG
- **AND** it does not re-import the project for every query recipe

### Requirement: Joern workers own isolated mutable state
Each parallel Joern fuzz worker SHALL own its own Joern server, port, workspace, and temporary directory.

#### Scenario: Running multiple workers
- **WHEN** the fuzzer runs with more than one worker
- **THEN** each worker uses isolated Joern runtime state
- **AND** no worker changes another worker's active project or workspace

### Requirement: Import fuzzing remains available
The system SHALL keep an explicit mode that stresses Joern import/index behavior.

#### Scenario: Running import-focused fuzzing
- **WHEN** a developer runs the import-focused fuzz target
- **THEN** the fuzzer varies projects and measures import/index failures separately from query-only failures

### Requirement: Query recipes exercise public joern-effect APIs
Generated query recipes SHALL use public `joern-effect` DSL/program APIs.

#### Scenario: Query recipe is generated
- **WHEN** the fuzzer generates a DSL query recipe
- **THEN** it renders through the public `joern-effect` API
- **AND** decoded/materialized results are validated by the public schemas/evidence APIs
