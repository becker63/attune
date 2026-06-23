## ADDED Requirements

### Requirement: Public Attune commands collapse to check and repair

The workspace SHALL expose a small public operating surface centered on Attune
check and repair targets. Lower-level package-contract, framework-policy,
generator, type-guidance, evidence, and proof-pressure targets MAY exist as
internal or advanced checks, but the documented normal agent workflow SHALL
start with check and repair.

#### Scenario: Agent checks workspace

- **WHEN** an agent needs to validate normal Attune framework state
- **THEN** the documented default command SHALL be `workspace:attune-check`
- **AND** lower-level package-contract, framework-policy, and generator-shape
  checks SHALL be treated as implementation details unless debugging requires
  them

#### Scenario: Agent repairs workspace

- **WHEN** framework diagnostics include safe repair actions
- **THEN** the documented default command SHALL be `workspace:attune-repair`
- **AND** the repair target SHALL route to the required generator or
  materializer internally

#### Scenario: Agent works on one project

- **WHEN** an agent edits a single package or framework project
- **THEN** the public project commands SHALL be `<project>:attune-check`,
  `<project>:attune-repair`, `<project>:typecheck`, and `<project>:test`
- **AND** more specific repair-registry, repair-properties, repair-type-guidance,
  repair-evidence, and repair-generated targets SHALL NOT be the default public
  workflow vocabulary

### Requirement: Diagnostics route generator repairs

Repairable framework diagnostics SHALL include structured repair plans so agents
do not need to memorize generator names for normal work.

#### Scenario: Missing generated artifact

- **WHEN** a generated companion, operation registry, evidence scaffold,
  type-guidance projection, or package contract is missing or stale
- **THEN** the diagnostic SHALL include a repair action or explain why no safe
  automatic repair exists
- **AND** the public instruction SHALL remain an Attune repair target

#### Scenario: Generator is needed

- **WHEN** a repair requires an `@attune/nx` generator or framework
  materializer
- **THEN** the repair plan SHALL identify the generator or materializer as an
  internal implementation detail
- **AND** the default agent-facing instruction SHALL be to run the suggested
  `attune-repair` target

#### Scenario: Repair plan is shown

- **WHEN** check output or the language service presents a repairable diagnostic
- **THEN** the repair plan SHALL explain what happened, why Attune cares,
  whether the repair is safe, what command to run, what files or cache records
  may change, what must not be hand-edited, and what validation should run next

### Requirement: ProtocolStore records repair-plan projections

The runtime SHALL be able to store or project diagnostics and repair plans so
the language service can present code actions without knowing generator
internals.

#### Scenario: Nx check computes repair plan

- **WHEN** Nx detects a repairable protocol diagnostic
- **THEN** it SHALL expose or persist the repair plan through
  ProtocolStore/ProtocolQuery-compatible projections
- **AND** the language service SHALL be able to project that plan as a code
  action

#### Scenario: Repair updates generated state

- **WHEN** Nx repair applies a safe generated repair
- **THEN** generated artifact freshness, descriptor hash, diagnostics, and
  repair-plan state SHALL be refreshed in ProtocolStore or the framework-owned
  materialization projection
