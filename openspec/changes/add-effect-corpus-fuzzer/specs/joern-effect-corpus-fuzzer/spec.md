## ADDED Requirements

### Requirement: Fuzzer is implemented as Effect services
The corpus fuzzer SHALL be implemented as composable Effect services and Layers rather than as unstructured scripts.

#### Scenario: Running the fuzzer
- **WHEN** an Nx fuzzer target starts
- **THEN** it composes fuzzer services through Effect Layers
- **AND** scoped resources such as temporary repositories, Joern workers, and telemetry exporters are acquired and released through Effect

### Requirement: Corpus seeds are typed
The fuzzer SHALL represent corpus entries as typed seed records with id, origin, language, filename, source, and tags.

#### Scenario: Loading corpus seeds
- **WHEN** the fuzzer loads corpus seeds
- **THEN** each seed is decoded through Effect Schema
- **AND** invalid seed records are rejected before fuzz execution

### Requirement: Semantic mutators produce replayable cases
The fuzzer SHALL model mutations as replayable semantic operations over source or AST-shaped inputs.

#### Scenario: Generating a fuzz case
- **WHEN** FastCheck selects a seed and mutator sequence
- **THEN** the resulting case records the seed id, mutator sequence, mutator parameters, FastCheck seed, and FastCheck path

### Requirement: Cases are admitted before Joern execution
The fuzzer SHALL parse/admit generated cases before spending Joern import or query resources.

#### Scenario: Generated source is invalid
- **WHEN** OXC or the configured admission service rejects a generated case
- **THEN** the case is recorded as rejected
- **AND** Joern import is not attempted for that case

### Requirement: Counterexamples can be promoted
The fuzzer SHALL support promoting useful shrunk failures into corpus fixtures.

#### Scenario: Stable counterexample is found
- **WHEN** a failure shrinks to a useful case
- **THEN** the fuzzer records a fixture candidate with seed id, mutators, source, query recipe, and failure class
