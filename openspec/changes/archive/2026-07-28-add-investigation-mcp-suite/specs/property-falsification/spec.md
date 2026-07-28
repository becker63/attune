## Purpose

Run agent-authored TypeScript, Effect, and fast-check properties against an
exact repository commit and retain reproducible, minimized counterexample
evidence without introducing an Attune property language or conformance model.

## ADDED Requirements

### Requirement: Native TypeScript property source

The system SHALL accept ordinary TypeScript whose default export is a native fast-check synchronous or asynchronous property accepted by `fc.check`.

#### Scenario: Use a native arbitrary

- **WHEN** a property uses a fast-check arbitrary directly
- **THEN** the pinned property runner SHALL execute it without translating it into an Attune generator representation

#### Scenario: Run an Effectful check

- **WHEN** an asynchronous fast-check property evaluates an Effect through the pinned Effect runtime
- **THEN** the runner SHALL treat it as ordinary native property code
- **AND** SHALL NOT require a configurable Attune service environment

#### Scenario: Derive an arbitrary from Effect Schema

- **WHEN** a property uses the pinned `Schema.toArbitrary` integration
- **THEN** the runner SHALL permit the native derived arbitrary
- **AND** SHALL NOT persist a second Attune schema for the generated values

#### Scenario: Use advanced fast-check behavior

- **WHEN** a property uses asynchronous checks, model-based commands, or scheduler APIs supported by the pinned fast-check version
- **THEN** the runner SHALL preserve access to those native APIs

### Requirement: Exact property input before execution

The system SHALL persist the accepted request, references, TypeScript source, parameters, and expected repository commit before loading the property.

#### Scenario: Property source fails to load

- **WHEN** source compilation, module loading, or contract validation fails
- **THEN** the service SHALL publish a typed execution failure when controlled completion is possible
- **AND** SHALL retain the exact source and diagnostics

#### Scenario: Host terminates during execution

- **WHEN** request persistence succeeds but no terminal receipt is published
- **THEN** the source and parameters SHALL remain inspectable
- **AND** the invocation SHALL be reported as incomplete

### Requirement: Commit-bound property workspace

Every property invocation SHALL execute against the exact clean commit named by `expectedSnapshot`.

#### Scenario: Snapshot matches

- **GIVEN** the investigation is clean and `HEAD` equals `expectedSnapshot`
- **WHEN** `property_run` executes
- **THEN** the property process SHALL receive a read-only view of that commit
- **AND** a private writable work directory

#### Scenario: Snapshot is stale or dirty

- **WHEN** the repository is dirty or `HEAD` differs from `expectedSnapshot`
- **THEN** the request SHALL fail before the property process starts

#### Scenario: Property writes scratch data

- **WHEN** a property writes generated fixtures or temporary state
- **THEN** those writes SHALL remain in its private work directory
- **AND** SHALL NOT mutate the investigation repository or immutable base

### Requirement: Structured fast-check execution

The runner SHALL use `fc.check` or an equivalent native API that returns structured run details rather than relying only on a thrown assertion.

#### Scenario: No counterexample is found

- **WHEN** all configured runs pass
- **THEN** the response SHALL report `no-counterexample`
- **AND** the retained run details SHALL include the effective parameters and seed
- **AND** the service SHALL NOT claim the property is universally proven

#### Scenario: A property is falsified

- **WHEN** fast-check finds and shrinks a counterexample
- **THEN** the response SHALL report `counterexample`
- **AND** SHALL retain the seed, counterexample path, run count, shrink count, and native fast-check report
- **AND** SHALL retain the minimized counterexample as JSON when safely serializable
- **AND** SHALL otherwise retain fast-check's native string representation
- **AND** SHALL NOT require a universal JavaScript-value codec

#### Scenario: Execution fails independently of falsification

- **WHEN** the runner, property effect, or owned subprocess fails before producing a valid fast-check outcome
- **THEN** the terminal receipt SHALL use status `failed` with a typed execution failure
- **AND** the response SHALL NOT misclassify the failure as a property counterexample

### Requirement: Native deterministic replay coordinates

The property capability SHALL accept a fast-check seed and counterexample path for explicit replay without defining a server-wide replay ontology.

#### Scenario: Replay a minimized failure

- **GIVEN** a prior run returned a seed and counterexample path
- **WHEN** a later request supplies those native coordinates with the same source, snapshot, and toolchain
- **THEN** the runner SHALL pass them to fast-check
- **AND** SHALL retain the new invocation independently

#### Scenario: Replay does not reproduce

- **WHEN** native replay coordinates no longer produce the prior outcome
- **THEN** the service SHALL retain and report the observed result
- **AND** SHALL NOT infer whether source, environment, or semantics changed

### Requirement: Controlled property process

Property execution SHALL use the Nix-pinned Node, Effect, fast-check, and Attune property runner with Effect-managed timeout, cancellation, and cleanup.

#### Scenario: Timeout

- **WHEN** a property exceeds its configured timeout
- **THEN** Effect SHALL terminate the owned process
- **AND** the receipt SHALL classify the timeout as a mechanical failure
- **AND** available output SHALL be retained

#### Scenario: MCP cancellation

- **WHEN** the client cancels the request
- **THEN** Effect interruption SHALL propagate to the property process
- **AND** resource finalizers SHALL run

### Requirement: Agent-owned interpretation

The property capability SHALL NOT decide what a counterexample means or whether it semantically validates a Joern observation, Maude theory, or ast-grep rule.

#### Scenario: Retain cross-tool references

- **WHEN** a property request cites tool artifacts or external semantic objects
- **THEN** the service SHALL persist the references as bounded opaque values
- **AND** SHALL NOT dereference or type those relationships

#### Scenario: Leave a semantic gap

- **WHEN** no mechanical relation can be established between referenced evidence and the property
- **THEN** the service SHALL still execute the property
- **AND** SHALL leave interpretation to the caller

### Requirement: Promotion remains separate

`property_run` SHALL preserve every attempt in AgentFS and SHALL NOT contain a property-specific Git promotion workflow.

#### Scenario: Promote a surviving property

- **WHEN** a caller selects a retained property source for Git
- **THEN** the caller SHALL use `artifact_promote`
- **AND** earlier attempts and counterexamples SHALL remain retained
