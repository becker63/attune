## MODIFIED Requirements

### Requirement: Small public onboarding surface

The supported `attune-mcp` package entry SHALL expose exactly six distinct
names: `Attune`, `Investigation`, `AttuneReceipt`, `AttuneToolkit`,
`InvestigationLifecycleError`, and `AttuneToolFailure`. A same-name type and
value SHALL count as one concept.

The package entry SHALL NOT export the operation registry, operation-name or
input/result/error/receipt/writer projections, service factory aliases,
validator hooks, lifecycle-state aliases, capability issuers, per-tool
constants, implementation handlers, persistence stores, invocation engines,
platform helpers, or recursive module barrels. Those remain implementation
details, while callers infer operation types from explicit `Attune` members.

#### Scenario: Contributor opens the generated API reference

- **WHEN** the documentation extractor reads the supported package entry
- **THEN** it observes the exact six names in source-authored lifecycle order
- **AND** the complete supported model is readable without selecting among
  registry, projection, factory, or lifecycle-alias concepts

### Requirement: Keyed operation type relationships

The system SHALL privately derive a finite operation-name key union and keyed
input, result, error, receipt, and writer-policy relationships for the eight
registered operations. The explicit `Attune` service and MCP adapter SHALL
preserve the corresponding operation-specific types; for example, executing
`maude_run` SHALL yield the Maude result rather than a union of every operation
result. Callers SHALL infer those relationships from service methods instead of
importing projection aliases from the package root.

The system SHALL NOT provide a general-purpose `Operation.define` extension
facade or a dependent generic correlation algebra for arbitrary operations.
Adding a ninth operation is a product change that extends the closed private
registry, its relationships, correlation metadata, contract evidence, and
tests.

Receipt correlation, terminalizability, and handler relations SHALL be
validated deterministically against each registered Tool's schema before an
operation can accept work. Every failed or cancelled result SHALL remain
constructible from its receipt alone; an operation SHALL NOT require
failure-only result fields that the durable invocation engine cannot synthesize.

#### Scenario: Keyed execution retains a Maude result type

- **WHEN** a caller executes `maude_run` through `Attune`
- **THEN** TypeScript infers the Maude payload, result, receipt, and expected
  error types rather than the union of every tool operation's types
- **AND** no public projection import is required

#### Scenario: Registered correlation metadata drifts

- **WHEN** a registered operation names a missing or incorrectly typed
  correlation field, receipt identity, lifecycle relation, or writer policy
- **THEN** deterministic registry validation fails before that operation can
  accept work

#### Scenario: Keyed operation input and result regress

- **WHEN** a service or adapter change widens a registered operation's input,
  result, receipt, error, or writer-policy type
- **THEN** an `expect-type` test fails before the change is accepted

#### Scenario: Failure result requires an implementation-owned field

- **WHEN** an operation adds a required field beside a failed or cancelled
  receipt
- **THEN** registry validation rejects it before the runtime can accept an
  invocation that it cannot terminalize
