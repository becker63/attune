# cross-language-contracts Specification

## Purpose

Define one-way generation of deterministic JSON Schema and strict Pydantic projections while Effect remains the validation authority.

## Requirements

### Requirement: Generator-ready standard JSON Schema

The system SHALL derive one standards-compliant JSON Schema Draft 2020-12
compound document from the repository-pinned Effect request, result, receipt,
typed-failure, and resource schemas.

#### Scenario: Export the contract document

- **WHEN** the contract export runs
- **THEN** `contracts/attune-tools.schema.json` SHALL itself be a valid JSON Schema Draft 2020-12 document
- **AND** every exported definition SHALL be addressable by a stable name
- **AND** every `$ref` SHALL resolve within that exact document
- **AND** definitions referenced through `$defs` SHALL be installed beneath the document's `$defs` member
- **AND** consumers SHALL NOT need to understand Effect's intermediate JSON-Schema document representation

#### Scenario: Export the complete capability ABI

- **WHEN** the contract document is inspected
- **THEN** it SHALL identify every public MCP tool and read-only resource
- **AND** SHALL identify each tool's input, accepted result, and typed pre-acceptance failure definitions
- **AND** SHALL preserve the wire names, required members, nullability, bounds, literals, unions, and available descriptions expressed by Effect Schema

#### Scenario: Effect schema changes

- **WHEN** an authoritative Effect schema changes
- **THEN** the exported standard document SHALL change deterministically
- **AND** no handwritten Python or JSON Schema declaration SHALL be required to express the same change

### Requirement: Deterministic contract digest

The system SHALL publish a SHA-256 digest of the exact canonical bytes of the
checked-in contract document.

#### Scenario: Repeat an unchanged export

- **GIVEN** the authoritative Effect schemas and exporter version are unchanged
- **WHEN** the contract export runs more than once
- **THEN** it SHALL produce byte-identical JSON
- **AND** `contracts/attune-tools.sha256` SHALL remain unchanged

#### Scenario: Contract bytes drift

- **WHEN** the checked-in contract document or digest differs from a fresh export
- **THEN** the contract check SHALL fail
- **AND** SHALL report that the generated projection is stale

#### Scenario: Digest is served at runtime

- **WHEN** a client reads the MCP contract resource
- **THEN** the server SHALL expose the same document bytes and digest installed by the build
- **AND** SHALL NOT synthesize a different live contract representation

### Requirement: Generated strict Pydantic projections

The Python project SHALL generate Pydantic v2 models from the checked-in
standard JSON Schema using an exactly pinned build-time generator.

#### Scenario: Generate Python capability models

- **WHEN** Python contract generation runs
- **THEN** it SHALL generate statically usable models for tool requests, accepted results, receipts, typed failures, artifact references, and resource contracts
- **AND** the generated models SHALL preserve MCP wire aliases during validation and serialization
- **AND** closed Effect structures SHALL reject unknown fields
- **AND** literals and discriminated receipt variants SHALL remain distinguishable to Python type checkers and Pydantic

#### Scenario: Contract intentionally permits unknown JSON

- **GIVEN** an authoritative Effect field uses an unconstrained JSON value such as a Joern result summary
- **WHEN** its Python model is generated
- **THEN** that field SHALL remain explicitly unconstrained
- **AND** the generator SHALL NOT invent a narrower semantic type

#### Scenario: Optional and nullable members

- **WHEN** the Effect-derived JSON Schema distinguishes required, omittable, and nullable members
- **THEN** the generated Pydantic projection SHALL preserve the represented wire behavior
- **AND** Python convenience defaults SHALL NOT cause serialization to add members that were absent unless the caller requests that behavior

### Requirement: Generated-code drift is a build failure

Generated Python models SHALL be checked into the repository for review and
editor support, but SHALL remain replaceable projections of the checked-in JSON
Schema.

#### Scenario: Validate checked-in generated models

- **WHEN** repository checks run
- **THEN** generation SHALL run into a clean temporary output
- **AND** the check SHALL fail when that output differs from the checked-in generated package
- **AND** the check SHALL NOT rewrite source files implicitly

#### Scenario: Ordinary Python development

- **GIVEN** the checked-in contract and generated models are current
- **WHEN** a developer type-checks or tests the Python project
- **THEN** those checks SHALL NOT require a running MCP server
- **AND** SHALL NOT require Node-based schema generation

#### Scenario: Runtime startup

- **WHEN** the ActiveGraph bridge starts
- **THEN** it SHALL import pre-generated models
- **AND** SHALL NOT generate Pydantic classes dynamically from `tools/list` or another live server response

### Requirement: Effect remains the validation authority

Generated Pydantic models SHALL provide client-side static and runtime safety,
but SHALL NOT replace server-side Effect decoding or mechanical validation.

#### Scenario: A refinement is not portable to JSON Schema

- **GIVEN** an Effect refinement such as repository containment, canonical request identity, or an execution-state check cannot be represented completely in JSON Schema
- **WHEN** a Python model accepts the corresponding payload
- **THEN** the Effect service SHALL still enforce the authoritative refinement
- **AND** the bridge SHALL surface the returned typed failure without reclassifying it semantically

#### Scenario: Python and Effect disagree

- **WHEN** a payload passes generated Pydantic validation but fails authoritative Effect validation
- **THEN** the Effect result SHALL govern capability execution
- **AND** the Python package SHALL NOT patch or broaden the server contract locally

#### Scenario: Contract evolution

- **WHEN** a breaking wire change is required
- **THEN** it SHALL originate in the Effect schema and contract version
- **AND** the JSON Schema, digest, Pydantic models, and bridge compatibility expectation SHALL be regenerated downstream in that order

### Requirement: One-way cross-language build graph

The build SHALL preserve the dependency direction from Effect contracts to
Python projections without introducing a Node/Python contract cycle.

#### Scenario: Build all projections

- **WHEN** the cross-language build runs
- **THEN** it SHALL export and check the Effect-derived JSON Schema before generating Python models
- **AND** SHALL type-check and test the Python package only after generated-code drift passes
- **AND** SHALL package the exact contract digest with the Python bridge

#### Scenario: Python implementation changes

- **WHEN** handwritten ActiveGraph client or pack code changes without a wire-contract change
- **THEN** the Effect schema and JSON Schema SHALL NOT need regeneration

#### Scenario: Reproducible closure

- **WHEN** Nix builds the ActiveGraph bridge
- **THEN** it SHALL use the pinned Node, Python, uv lock, generator, Pydantic, ActiveGraph, and MCP SDK closure
- **AND** SHALL run schema validity, generation drift, Python static typing, and Python test checks
