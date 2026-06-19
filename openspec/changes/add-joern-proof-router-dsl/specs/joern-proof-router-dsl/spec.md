## ADDED Requirements

### Requirement: Proof router declaration
The system SHALL provide a tRPC-shaped proof router DSL for declaring known Joern proof procedures with stable IDs, versions, metadata, schemas, documentation, examples, query planning, evidence decoding, and Effect-based execution.

#### Scenario: Developer declares a proof procedure
- **WHEN** a developer defines a proof procedure with metadata, input schema, output schema, docs, examples, plan, and decoder
- **THEN** the procedure is available from a router under a stable procedure key and a stable template ID
- **AND** the procedure type exposes schema-derived input and output types
- **AND** the procedure implementation returns an Effect workflow rather than a raw Promise

#### Scenario: Procedure omits required docs
- **WHEN** a public proof procedure omits title, summary, or binding documentation
- **THEN** the router declaration fails typechecking or validation before the procedure is exported

### Requirement: Recipe-backed procedures
The proof router DSL SHALL implement public proof procedures on top of typed ProofRecipe data so Axiom-derived recipe families determine the first supported proof shapes.

#### Scenario: Procedure uses recipe data
- **WHEN** a public proof procedure is declared
- **THEN** it references one or more schema-backed ProofRecipe values
- **AND** those recipes declare family, axes, evidence summaries, docs, and query-plan compilation

#### Scenario: Recipe axes are exposed to tests
- **WHEN** property tests generate proof invocations
- **THEN** they can generate recipe axes such as graph family, source selector, sink selector, distance, method inclusion, argument inclusion, path inclusion, syntax flavor, mutation pressure, and result limit without generating raw Joern query text

### Requirement: Procedure plan separation
The proof router DSL SHALL separate descriptive query planning from Joern interpretation so procedure construction cannot execute Joern, read files, read environment variables, emit telemetry directly, or decode raw Joern rows.

#### Scenario: Procedure is constructed
- **WHEN** application code imports and constructs a proof router
- **THEN** no Joern process is started
- **AND** no query is executed
- **AND** no runtime side effect occurs outside Effect service/layer construction

#### Scenario: Procedure is executed
- **WHEN** a validated procedure invocation reaches the interpreter boundary
- **THEN** the router supplies a typed query plan to the Joern runtime service
- **AND** raw Joern results are decoded by the declared decoder before evidence leaves the boundary

### Requirement: Inline and generated documentation
The proof router DSL SHALL expose rich inline documentation and generated catalog documentation from the same procedure metadata and Effect Schema annotations.

#### Scenario: Developer hovers a procedure
- **WHEN** a developer hovers a proof procedure or one of its schema-backed bindings in TypeScript
- **THEN** the displayed documentation includes the procedure title, summary, binding descriptions, examples, known limitations, and fuzzer-derived notes where present

#### Scenario: Catalog documentation is generated
- **WHEN** the proof catalog documentation target runs
- **THEN** every public proof procedure produces documentation containing its template ID, version, family, accepted bindings, output evidence shape, examples, budget class, and limitations

#### Scenario: Axiom-backed docs are generated
- **WHEN** a proof procedure is backed by fuzzer/Axiom observations
- **THEN** the generated documentation includes supporting run IDs, observed query kinds, representative query names, observed row/count summaries where available, and known counterexample classes
- **AND** the hover documentation summarizes those observations without requiring the developer to open Axiom

### Requirement: Middleware and resource boundaries
The proof router DSL SHALL support Effect middleware/layers for validation, budget checks, anchor resolution, evidence cache lookup, telemetry enrichment, and Joern worker acquisition.

#### Scenario: Invocation passes through middleware
- **WHEN** a proof procedure is invoked through the router
- **THEN** configured middleware runs in deterministic order before Joern execution
- **AND** middleware can enrich context, reject invalid bindings, short-circuit from cache, or attach telemetry attributes

#### Scenario: Middleware rejects an invocation
- **WHEN** middleware rejects an invocation because of budget, missing anchors, or incompatible bindings
- **THEN** the procedure returns a typed Effect error
- **AND** Joern execution does not start
