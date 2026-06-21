## ADDED Requirements

### Requirement: Native Alchemy is the only lifecycle automation abstraction
Attune SHALL use native Effect/Alchemy resources, stacks, state, preview/diff, apply, destroy, and gate semantics for lifecycle automation instead of local helper CLIs, wrapper schedulers, command runners, or parallel state machines.

#### Scenario: Lifecycle automation is added
- **WHEN** a change automates infrastructure, host installation, deployment, external state convergence, or irreversible operations
- **THEN** it is modeled as native Alchemy resources and stacks
- **AND** local helper commands are not introduced as the canonical operator or agent workflow.

#### Scenario: Existing helper orchestration exists
- **WHEN** an existing local helper duplicates Alchemy lifecycle behavior
- **THEN** the implementation removes it or migrates its behavior into Alchemy resources
- **AND** any retained code is limited to tests, fixtures, or resource module exports, not an alternate user-facing workflow.

### Requirement: External capabilities are Effect services
Attune SHALL wrap external systems and side effects in typed Effect services with Live, DryRun, and Test layers before Alchemy resources use them.

#### Scenario: Provider boundary is implemented
- **WHEN** code needs Nix, SOPS, Tailscale, SSH, Disko, `nixos-anywhere`, filesystem state, network discovery, Kubernetes, GitHub, Linear, or any other external capability
- **THEN** domain code calls an Effect service from context
- **AND** raw subprocesses, filesystem mutation, network calls, or API calls are confined to Live layers.

#### Scenario: Test layer is used
- **WHEN** an agent or test exercises a deployment workflow
- **THEN** Test layers simulate external observations and transitions without touching real machines or secrets
- **AND** the same resource graph and schemas are used as the Live workflow.

### Requirement: Effect Schema guards all boundaries
Attune SHALL use Effect Schema for resource props, service inputs, service outputs, observed state, evidence records, errors, and serialized local state.

#### Scenario: Boundary data enters the system
- **WHEN** provider output, runtime input, local evidence, decrypted metadata, network discovery results, or Alchemy state is read
- **THEN** it is decoded or encoded through Effect Schema
- **AND** invalid data becomes typed failure rather than unstructured runtime assumptions.

### Requirement: Prefer Effect ecosystem capabilities before custom shapes
Attune SHALL prefer existing Effect, Effect Schema, Alchemy, and ecosystem-provided abstractions before creating custom implementation shapes.

#### Scenario: A needed abstraction appears to be missing
- **WHEN** an implementer thinks a custom lifecycle, service, schema, retry, schedule, validation, or test abstraction is needed
- **THEN** they first check whether the Effect ecosystem, Alchemy, Nx, or existing Attune generators already provide the capability
- **AND** custom implementation is allowed only when the ecosystem path is unavailable, unsuitable for a documented reason, or explicitly requested.

### Requirement: Repeated patterns become Nx generators
Attune SHALL use Nx generators for repeated Effect service, Alchemy resource, Effect Schema, provider layer, and test fixture shapes.

#### Scenario: Existing generator fits
- **WHEN** an agent needs to create a shape covered by an existing `@attune/nx` generator
- **THEN** it uses the generator rather than hand-writing the repeated files
- **AND** generated output follows the established Effect/Alchemy/Schema conventions.

#### Scenario: Pattern repeats without a generator
- **WHEN** a new Effect/Alchemy shape repeats or is expected to repeat across resources, providers, services, or tests
- **THEN** the implementation creates or extends an `@attune/nx` generator for that shape
- **AND** follow-up hand-written copies are avoided.

### Requirement: Tests use Effect-style simulated worlds
Attune SHALL design platform automation tests around Effect Test layers, deterministic simulated worlds, schema fixtures, and provider observation records.

#### Scenario: Day-0 deployment is tested
- **WHEN** the ThinkCentre day-0 deployment is tested
- **THEN** tests run the native Alchemy graph over Effect Test layers for Nix, SOPS, Tailscale, LAN discovery, SSH, Disko, `nixos-anywhere`, and comin
- **AND** destructive operations, missing evidence, stale evidence, wrong-host evidence, secret redaction, and successful convergence are covered without live machines.
