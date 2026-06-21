## ADDED Requirements

### Requirement: Source BOM records

Repeated or generated Attune source shapes SHALL be traceable through an Attune
Source BOM record that includes schema, capability, generator, path, owner, and a
short description.

#### Scenario: Nx generator emits managed source

- **WHEN** an Attune Nx generator creates a managed source file
- **THEN** it records the generated path in the package Source BOM shard
- **AND** the record identifies the generator and owning capability

### Requirement: Shared Source BOM writer

Attune Nx generators SHALL use a shared Source BOM helper instead of duplicating
ad hoc BOM serialization logic.

#### Scenario: Multiple generators add provenance

- **WHEN** two generators add records to the same shard
- **THEN** the helper stores one deterministic record per generated path and generator
