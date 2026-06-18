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
