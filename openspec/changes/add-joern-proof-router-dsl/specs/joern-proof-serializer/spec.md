## ADDED Requirements

### Requirement: Schema-backed serialization
The system SHALL serialize proof router data only after decoding the relevant procedure metadata, bindings, inputs, outputs, evidence, and telemetry payloads with Effect Schema.

#### Scenario: Valid invocation is serialized
- **WHEN** a proof invocation satisfies the procedure input schema
- **THEN** the serializer produces canonical, agent, telemetry, and replay projections from the decoded value

#### Scenario: Invalid invocation is serialized
- **WHEN** a proof invocation does not satisfy the procedure input schema
- **THEN** serialization fails with a structured decode error
- **AND** no cache key, telemetry payload, or agent packet is emitted for the invalid value

### Requirement: Canonical execution projection
The serializer SHALL produce a deterministic canonical execution projection suitable for cache keys, replay, query fingerprints, and equality checks.

#### Scenario: Equivalent bindings differ by object insertion order
- **WHEN** two invocations use semantically equivalent bindings with different object key insertion order
- **THEN** their canonical execution payloads are byte-identical
- **AND** their binding hashes are identical

#### Scenario: Defaults are applied
- **WHEN** an invocation omits a binding that has a schema-defined default
- **THEN** the canonical execution payload includes the normalized default
- **AND** replaying the payload yields the same query plan as the original invocation

#### Scenario: Recipe axes are canonicalized
- **WHEN** two proof invocations use equivalent recipe axes with different optional field ordering or omitted defaults
- **THEN** their canonical recipe payloads are byte-identical
- **AND** their recipe hashes and binding hashes are identical

### Requirement: Agent projection
The serializer SHALL produce a compact agent projection that contains only the data a bounded agent needs to select a known proof template and fill allowed bindings.

#### Scenario: Agent catalog packet is serialized
- **WHEN** the agent projection is produced for a proof procedure
- **THEN** the packet includes the template ID, version, title, summary, binding schema, enum choices, defaults, examples, budget class, limitations, and expected evidence shape
- **AND** the packet omits arbitrary Joern query text

#### Scenario: Agent projection includes helper context
- **WHEN** a procedure has fuzzer-derived notes or suggested bindings
- **THEN** the agent projection includes concise hints explaining when the template is useful and what evidence it is expected to produce

### Requirement: Telemetry projection
The serializer SHALL produce a telemetry projection with stable dimensions for OpenTelemetry/Axiom joins.

#### Scenario: Proof invocation emits telemetry
- **WHEN** a proof invocation is serialized for telemetry
- **THEN** the payload includes template ID, template version, template family, binding hash, query fingerprint, evidence status, evidence counts, cache status, Joern version when available, run ID when available, and duration fields when available

#### Scenario: Fuzzer replay emits telemetry
- **WHEN** a fuzzer replay or counterexample uses a proof template
- **THEN** the telemetry projection includes source run ID, corpus seed ID, syntax flavor, mutation sequence summary, expectation classification, and fixture candidate ID when available

#### Scenario: Catalog evidence summary is serialized
- **WHEN** Axiom observations are attached to a proof template
- **THEN** the serializer can produce a catalog evidence summary containing run ID, target, mode, query kind, query name, query fingerprint, row count, syntax flavor, mutation sequence, expectation failure count, and fixture candidate classification
- **AND** the summary is schema-decoded before it is embedded in docs, agent packets, or telemetry

#### Scenario: Recipe priority is serialized
- **WHEN** a recipe is promoted because Axiom showed high yield, fragility, or hard-to-reach behavior
- **THEN** the serializer includes the promotion reason and supporting evidence IDs in catalog, agent, telemetry, and replay projections

### Requirement: Replay and fixture projection
The serializer SHALL produce a replay projection that is sufficient to reproduce proof template executions and fuzzer counterexamples without relying on local trace files.

#### Scenario: Counterexample fixture is serialized
- **WHEN** a fuzzer counterexample is promoted to a fixture candidate
- **THEN** the replay projection includes template ID, version, canonical bindings, source file snippets or references, mutation sequence, query previews or fingerprints, evidence summary, and failure classification

#### Scenario: Replay projection is decoded
- **WHEN** the replay projection is decoded later
- **THEN** it reconstructs the same canonical invocation and expected evidence assertion inputs
