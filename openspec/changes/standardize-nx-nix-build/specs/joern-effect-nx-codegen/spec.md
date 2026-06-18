## ADDED Requirements

### Requirement: joern-effect exposes Nx generation targets
The `joern-effect` package SHALL expose Nx targets for code generation and generation validation.

#### Scenario: Regenerating joern-effect
- **WHEN** a developer runs the `joern-effect` generation target
- **THEN** Nx regenerates the package's generated schemas, traversal DSL surface, template registries, bindings, and evidence types from checked-in inputs

#### Scenario: Checking generated freshness
- **WHEN** a developer runs the `joern-effect` generation check target
- **THEN** the target fails if checked-in generated output is stale relative to generation inputs

### Requirement: joern-effect generation pipeline is split into Nx-owned stages
The `joern-effect` generation pipeline SHALL be represented as fine-grained Nx-owned stages rather than one opaque permanent script.

#### Scenario: Inspecting generation stages
- **WHEN** a developer inspects the `joern-effect` Nx project configuration
- **THEN** they can identify generation stages for schema extraction, schema documentation enrichment, schema normalization, schema module emission, node type emission, property metadata emission, traversal DSL emission, template registry emission, template binding emission, template evidence emission, optional FastCheck arbitrary emission, README rendering, aggregate generation, and generated freshness checking

#### Scenario: Running an aggregate generation target
- **WHEN** a developer runs the aggregate `joern-effect` generation target
- **THEN** Nx executes the required generation stages in dependency order
- **AND** the stages declare their inputs and outputs

#### Scenario: Repairing a generation failure
- **WHEN** one generation stage fails
- **THEN** the failed stage is visible as an Nx target or executor step with enough input/output metadata to debug it without rerunning unrelated stages manually

### Requirement: joern-effect generation is deterministic
The `joern-effect` generation pipeline SHALL produce deterministic output for the same pinned inputs and tool versions.

#### Scenario: Re-running generation without input changes
- **WHEN** a developer runs generation twice with the same Nix-provisioned toolchain and unchanged inputs
- **THEN** the second run produces no source diff

### Requirement: joern-effect generation inputs are explicit
The `joern-effect` generation targets SHALL declare and document their generation inputs.

#### Scenario: Inspecting generation inputs
- **WHEN** a developer inspects the `joern-effect` generation target
- **THEN** the target identifies the Joern schema inputs, template definitions, DSL generator source, documentation metadata when available, and configuration files used by generation

### Requirement: Generated joern-effect surface is descriptive
Generated `joern-effect` public API code SHALL describe Joern schemas, traversals, query plans, templates, bindings, and evidence shapes without executing Joern or touching runtime IO during construction.

#### Scenario: Constructing a traversal description
- **WHEN** a developer constructs a generated traversal or template description
- **THEN** the construction does not start Joern, spawn processes, read the filesystem, parse runtime JSON, or emit telemetry directly

### Requirement: Runtime execution remains behind Effect boundaries
The `joern-effect` runtime SHALL execute Joern, decode foreign output, and emit runtime telemetry only through approved Effect interpreter/runtime boundaries.

#### Scenario: Executing a Joern template
- **WHEN** application code runs a known Joern template
- **THEN** execution enters through an Effect service or program boundary
- **AND** foreign Joern output is decoded before becoming evidence

### Requirement: Joern templates are generated from known definitions
The `joern-effect` package SHALL generate template registries and binding/evidence schemas from known template definitions rather than accepting arbitrary agent-authored Joern query text.

#### Scenario: Agent requests proof
- **WHEN** Attune needs structural proof for a hypothesis
- **THEN** the package executes a known generated template with schema-checked bindings
- **AND** it does not accept arbitrary Joern source text from the agent as the v0 proof interface

### Requirement: joern-effect property tests integrate with generated outputs
The `joern-effect` package SHALL provide cheap property-test targets that exercise generated traversal descriptions, builder determinism, decoding, and evidence materialization where those components exist.

#### Scenario: Running cheap property checks
- **WHEN** a developer runs the cheap `joern-effect` property target
- **THEN** property tests validate deterministic rendering, stable fingerprints, and boundary-preserving construction without requiring Joern-gated integration by default

#### Scenario: Running Joern-gated property checks
- **WHEN** a developer runs the Joern-gated property target
- **THEN** the target may use the Nix-provisioned Joern runtime and generated fixture repos to validate real integration behavior

### Requirement: joern-effect may generate internal property-test support
The `joern-effect` generation pipeline SHALL be allowed to generate deterministic internal property-test support from the same schema/template inputs as the public SDK.

#### Scenario: Generating schema-derived arbitraries
- **WHEN** generation inputs include enough schema metadata to derive useful FastCheck arbitraries
- **THEN** the generation target may emit internal arbitrary helpers or fixture manifests
- **AND** those outputs are covered by the generation freshness check

#### Scenario: Preserving public package boundaries
- **WHEN** generated property-test support exists
- **THEN** it is not exported as part of the stable public SDK unless an explicit public API decision is made
