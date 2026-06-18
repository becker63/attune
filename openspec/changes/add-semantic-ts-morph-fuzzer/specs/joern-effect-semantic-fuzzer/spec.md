## ADDED Requirements

### Requirement: Semantic fuzzer models projects and mutation plans
The semantic fuzzer SHALL represent fuzz inputs as typed multi-file projects and replayable semantic mutation plans.

#### Scenario: Semantic case is generated
- **WHEN** the fuzzer generates a semantic case
- **THEN** the case records project id, files, syntax flavors, mutation sequence, FastCheck seed, and FastCheck path

### Requirement: Semantic mutations are applied through ts-morph
The semantic fuzzer SHALL apply structured mutations through ts-morph-backed rules with explicit preconditions.

#### Scenario: Mutation site is unavailable
- **WHEN** a semantic mutation cannot find a safe site in the project
- **THEN** the fuzzer rejects that mutation without corrupting the project

### Requirement: Semantic output is admitted before Joern
The semantic fuzzer SHALL parse generated project files before Joern import or query execution.

#### Scenario: Generated semantic project is invalid
- **WHEN** OXC rejects a generated file
- **THEN** the fuzzer emits rejection telemetry
- **AND** Joern import is not attempted for that project

### Requirement: Semantic fuzzer exposes Effect services
The semantic fuzzer SHALL expose service interfaces and live layers for corpus, mutation, admission, scheduling, and telemetry.

#### Scenario: Running semantic fuzzing
- **WHEN** a semantic fuzzer target runs
- **THEN** it composes semantic fuzzer services through Effect Layers

### Requirement: Semantic fuzzer uses public joern-effect APIs
The semantic Joern oracle SHALL exercise public `joern-effect` DSL, CpgProgram, decoding, and evidence/materialization APIs.

#### Scenario: Semantic project reaches Joern
- **WHEN** a semantic project is imported
- **THEN** query recipes run through the public joern-effect API surface
*** Add File: C:\Users\johns\Documents\Codex\2026-06-10\files-mentioned-by-the-user-you\attune\openspec\changes\add-semantic-ts-morph-fuzzer\specs\joern-effect-semantic-corpus\spec.md
## ADDED Requirements

### Requirement: Semantic corpus contains typed project seeds
The semantic corpus SHALL represent seeds as typed project records with files, origin metadata, syntax flavors, and tags.

#### Scenario: Semantic corpus is loaded
- **WHEN** the semantic corpus service loads seeds
- **THEN** each seed is decoded through Effect Schema before use

### Requirement: Semantic corpus includes TS/JS/JSX/TSX coverage
The semantic corpus SHALL include initial curated seeds for JavaScript, TypeScript, JSX, TSX, modules, async flows, generics, object shapes, classes, and source/sink patterns.

#### Scenario: Quick semantic fuzzing runs
- **WHEN** a quick semantic fuzzer run samples seeds
- **THEN** at least one JavaScript or TypeScript seed and at least one JSX or TSX capable seed are available

### Requirement: Counterexamples can re-enter semantic corpus
The semantic corpus SHALL allow promoted counterexamples to be converted into semantic project seeds.

#### Scenario: Counterexample is promoted
- **WHEN** a counterexample candidate is promoted
- **THEN** the semantic corpus can include it as a replayable seed

### Requirement: External corpus ingestion is pinned before use
External corpora SHALL be introduced through pinned normalization targets rather than ad hoc runtime downloads.

#### Scenario: Public corpus is added later
- **WHEN** a public TypeScript corpus is ingested
- **THEN** the corpus source, version, and normalization metadata are recorded
*** Add File: C:\Users\johns\Documents\Codex\2026-06-10\files-mentioned-by-the-user-you\attune\openspec\changes\add-semantic-ts-morph-fuzzer\specs\joern-effect-semantic-telemetry\spec.md
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
*** Add File: C:\Users\johns\Documents\Codex\2026-06-10\files-mentioned-by-the-user-you\attune\openspec\changes\add-semantic-ts-morph-fuzzer\specs\joern-effect-corpus-fuzzer\spec.md
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
*** Add File: C:\Users\johns\Documents\Codex\2026-06-10\files-mentioned-by-the-user-you\attune\openspec\changes\add-semantic-ts-morph-fuzzer\specs\joern-effect-fuzz-query-reuse\spec.md
## ADDED Requirements

### Requirement: Semantic projects reuse Joern imports
Semantic fuzzer runs SHALL import accepted project shards once per worker and run multiple query recipes against the imported CPG.

#### Scenario: Semantic Joern run executes
- **WHEN** a semantic project shard is accepted for Joern
- **THEN** Joern import happens once for that shard
- **AND** multiple query recipes can run against the imported CPG

### Requirement: Semantic import mode remains separate
The semantic fuzzer SHALL expose an import-focused mode that stresses project generation and Joern import without query recipes.

#### Scenario: Semantic import target runs
- **WHEN** the semantic import target runs
- **THEN** it imports generated semantic projects without running query recipes
