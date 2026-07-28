# activegraph-capability-bridge Specification

## Purpose

Define how Python experiment packs compose ActiveGraph mechanics while retaining narrow, read-only artifact access.

## Requirements

### Requirement: Python researchbench composition

The bridge SHALL support composition by the Python researchbench pack using its
existing eight explicit typed wrappers, contract handshake, durable invocation
identity, and recorded-response replay semantics. It SHALL expose no dynamic
research operation generation and SHALL remain the authority boundary between
consumer interpretation and Effect-owned execution.

#### Scenario: Researchbench invokes an Attune operation

- **WHEN** an Attune-profile ActiveGraph behavior invokes one of the eight
  capability wrappers
- **THEN** the bridge preserves its generated request/result validation and
  receipt semantics
- **AND** researchbench records only consumer-owned interpretation and opaque
  references above that result

### Requirement: Narrow read-only retained-artifact access

The bridge SHALL expose a typed, read-only, content-addressed retained-artifact
access wrapper when researchbench needs bytes for deterministic evaluation or
publication extraction. It SHALL apply declared redaction limits, SHALL not
copy AgentFS authority, and SHALL not let the benchmark mutate retained
artifacts outside existing MCP operations.

#### Scenario: Extract public artifact metadata

- **WHEN** the experiment compiler requests an allowed retained artifact
  reference
- **THEN** the bridge returns only the declared read-only bounded projection
- **AND** raw private payloads remain unavailable to public rendering
