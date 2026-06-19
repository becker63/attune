## ADDED Requirements

### Requirement: Data-derived initial templates
The system SHALL seed the initial Joern proof template catalog from observed fuzzer/Axiom query families and documented Attune proof needs.

#### Scenario: Initial catalog is built
- **WHEN** the proof template catalog is generated or loaded
- **THEN** it includes inventory, source/sink, JSX/TSX source/sink, graph neighborhood, graph bridge, boundary crossing, findings, protocol deviation, wrapper, and validation template families

#### Scenario: Template records evidence source
- **WHEN** a template family is derived from fuzzer or Axiom observations
- **THEN** its metadata records the supporting run IDs, query family names, observed success notes, and known counterexample classifications where available

#### Scenario: Burn run evidence is imported
- **WHEN** the catalog imports Axiom evidence for run `joern-effect-burn-2h-20260618T220020Z`
- **THEN** it records that the run accepted 480 cases, rejected 0 cases, and emitted 38,612 query completions split into row, graph-facts, findings, and protocol-deviation families
- **AND** it uses those observed families to prioritize graph, finding, protocol, and row inventory proof templates

#### Scenario: Expectation run evidence is imported
- **WHEN** the catalog imports Axiom evidence for run `joern-effect-expectation-2h-20260618T184144Z`
- **THEN** it records 7,920 query completions, 59,616 result rows, 28 counterexamples, and 28 fixture candidates
- **AND** it records the syntax split of 13 TypeScript, 8 JavaScript, 4 TSX, and 3 JSX fixture candidates

### Requirement: Evidence-derived recipe priority
The proof template catalog SHALL prioritize recipe implementation based on Axiom evidence for high-yield, fragile, and hard-to-reach query families.

#### Scenario: High-yield graph recipes are selected first
- **WHEN** the first proof recipes are implemented
- **THEN** graph bridge and graph neighborhood recipes are included before broad convenience templates
- **AND** they support source/sink selectors, exec/spawn/eval sink selectors, distance 1 through 3, method inclusion, argument inclusion, path inclusion, and bounded result limits

#### Scenario: Hard-to-reach graph recipes are selected early
- **WHEN** the initial catalog is implemented
- **THEN** graph boundary, findings, and protocol-deviation recipes are included as named recipes
- **AND** they are not left as incidental generated query shapes available only through the low-level traversal API

#### Scenario: Fragile source/sink recipes are selected early
- **WHEN** source/sink proof recipes are implemented
- **THEN** they include generated source name, generated sink name, generated flow name, wrapper, generic decode, module split, async boundary, optional chain, and object destructure variants
- **AND** the variants are represented as recipe axes or named recipes rather than undocumented ad hoc query mutations

#### Scenario: JSX and TSX recipes are selected early
- **WHEN** the initial catalog is implemented
- **THEN** JSX and TSX prop-flow/component recipes are included with explicit Joern compatibility limitations
- **AND** their acceptance fixtures include at least one JSX and one TSX counterexample-derived specimen

#### Scenario: Inventory is supporting context
- **WHEN** inventory row recipes are implemented
- **THEN** they are classified as support/context recipes
- **AND** they do not replace the higher-priority proof recipes derived from graph and expectation failures

### Requirement: Evidence packet outputs
Every proof template SHALL decode Joern rows or graph materialization output into a schema-backed EvidencePacket with a clear status.

#### Scenario: Template produces useful evidence
- **WHEN** a proof template finds rows or graph facts matching its claim
- **THEN** the EvidencePacket status is `useful` or an equivalent positive status
- **AND** it includes template ID, bindings hash, nodes or rows, provenance, and query fingerprint

#### Scenario: Template produces no rows
- **WHEN** a proof template executes successfully but finds no matching evidence
- **THEN** the EvidencePacket status is `empty` or `weak`
- **AND** the packet still records template ID, bindings hash, query fingerprint, and execution metadata

### Requirement: Graphology-backed proof templates
The template catalog SHALL include graph templates that exercise Graphology materialization without treating mutable Graphology objects as canonical evidence.

#### Scenario: Graph neighborhood template executes
- **WHEN** a graph neighborhood proof template executes
- **THEN** it materializes the graph internally
- **AND** it returns immutable graph facts or evidence snapshots rather than exporting a mutable Graphology instance

#### Scenario: Graph bridge template executes
- **WHEN** a graph bridge or path proof template executes
- **THEN** every returned edge references existing returned nodes
- **AND** the evidence fingerprint is stable for equivalent input rows and bindings

### Requirement: Fuzzer-backed acceptance criteria
The proof template catalog SHALL include tests or fixtures that replay representative successful query shapes and classified counterexamples from `joern-effect-properties`.

#### Scenario: Successful query family is replayed
- **WHEN** catalog acceptance tests run
- **THEN** representative row, graph-facts, findings, protocol, source/sink, and JSX/TSX query families from the Axiom-backed runs compile and execute or render deterministically

#### Scenario: Classified counterexample is replayed
- **WHEN** a fixture classified as query-template-gap, expectation-too-broad, or Joern language-model-gap is replayed
- **THEN** the catalog preserves the classification
- **AND** either the refined template observes the expected evidence or the fixture remains documented as a known limitation

#### Scenario: Representative Axiom query names are replayed
- **WHEN** catalog acceptance tests replay Axiom-derived query families
- **THEN** they include representative generated query names for graph neighborhood, graph bridge, graph boundary, graph protocol, generated row call signal, and generated identifier repeat/ast-parent shapes
- **AND** every replayed query family produces a stable proof template ID, query fingerprint, and evidence packet status

#### Scenario: Fragile mutation recipes are replayed
- **WHEN** catalog acceptance tests replay expectation-derived failures
- **THEN** they include mutation chains covering source/sink flow plus function wrap, generic decode, module split, async boundary, optional chain, object destructure, and JSX prop-flow
- **AND** each replay asserts whether the refined recipe observes the expected evidence or preserves a documented Joern/model limitation

### Requirement: Axiom evidence refresh
The proof template catalog SHALL provide a repeatable way to refresh its Axiom-derived evidence summary without committing local trace files or JSONL artifacts.

#### Scenario: Evidence refresh target runs
- **WHEN** the evidence refresh target queries Axiom
- **THEN** it reads run IDs, target/mode, query kinds, query names, query fingerprints, row counts, syntax flavors, mutation sequences, expectation failure counts, and fixture candidate classifications
- **AND** it writes or generates only schema-checked catalog evidence data intended for source control or generated docs

#### Scenario: Axiom credentials are unavailable
- **WHEN** the evidence refresh target runs without Axiom credentials
- **THEN** it fails clearly before mutating catalog evidence
- **AND** normal package typecheck and unit tests can still run using checked-in evidence fixtures

### Requirement: Template docs and constraints
Each public proof template SHALL describe its claim, inputs, outputs, limitations, cost class, examples, counterexamples, and fuzzer-derived notes.

#### Scenario: Template has JSX or TSX limitations
- **WHEN** a template has known JSX or TSX behavior differences
- **THEN** its documentation and agent projection include those limitations and any Joern-version-specific compatibility notes

#### Scenario: Template is exposed to the agent catalog
- **WHEN** a template is exposed to the agent catalog
- **THEN** its docs include enough structured constraints for the validator and enough natural-language hints for an agent to choose it safely
