## ADDED Requirements

### Requirement: Noun-oriented lifecycle modules

The MCP package SHALL expose its implementation through `server`,
`investigation`, `tools`, `platform`, and `contract` module boundaries.
`investigation` SHALL own materialization, execution, receipt, artifact, and
finalization lifecycle behavior. Each supported tool noun SHALL have a visible
module under `tools`, and the MCP server SHALL remain an adapter over the
application service.
Empty placeholder source files and directories SHALL not be retained as
architectural signposts; the physical tree and its documented module map SHALL
agree.

#### Scenario: Contributor locates a Maude operation

- **WHEN** a contributor looks for the implementation of the Maude tool
- **THEN** the contributor finds its operation module under `tools/maude` and
  can follow its dependency into `investigation` without first discovering the
  MCP registration implementation

### Requirement: Measurable TypeScript consolidation

The implementation SHALL reduce the combined physical TypeScript line count of
`packages/attune-mcp/src` and `packages/attune-mcp/test` by at least 3,285
lines relative to cleanup baseline commit
`c65a76c6f8fabf57c06d23a87096073a56301ba4` (11,285 lines; target at most
8,000 lines). The measurement SHALL include handwritten `.ts` files only and
exclude generated output, dependencies, and documentation.

The reduction SHALL come from eliminating duplicate type, compatibility, and
durable-record machinery or from demonstrably simpler equivalents. It SHALL
NOT be achieved by removing lifecycle safety checks, durable receipt behavior,
contract-schema validation, or meaningful positive and negative type tests.

#### Scenario: Consolidation target is evaluated

- **WHEN** the cleanup is evaluated against the recorded baseline
- **THEN** the combined handwritten TypeScript line count is at most 8,000
- **AND** the frozen MCP contract, durable retry behavior, lifecycle
  restrictions, and type-level regression checks continue to pass

### Requirement: Typed investigation state capabilities

The system SHALL represent materialized, active, and finalized investigation
states with distinct typed capabilities. Only an active capability SHALL be
accepted by operation execution, artifact promotion, or finalization APIs, and
only the validated workspace boundary SHALL construct an active capability.

#### Scenario: Finalized capability is used for execution

- **WHEN** a caller attempts to pass a finalized investigation capability to an
  operation execution API
- **THEN** the type-checking test suite rejects the transition

### Requirement: Effect Tool/Toolkit-backed closed operation registry

The system SHALL use the installed Effect Tool and Toolkit APIs as the sole
schema and typed-handler authority. Each supported MCP tool SHALL have one
Effect Tool that binds its parameters, success result, expected failure, and
handler requirements; the Attune Toolkit SHALL derive the typed handler
collection and MCP contract from those Tools.

The operation model SHALL be a closed registry containing exactly
`repository_materialize`, `repository_checkpoint`, `joern_query`, `maude_run`,
`property_run`, `ast_grep_run`, `artifact_promote`, and
`investigation_finalize`. Each key SHALL pair its Effect Tool with only the
Attune-owned execution metadata it needs: lifecycle transition, receipt
identity, writer policy, and durable correlation facts. The MCP server SHALL
remain an adapter over the Toolkit and SHALL preserve the published MCP tool
names and generated contract-schema behavior.

#### Scenario: Unsupported operation is registered

- **WHEN** an implementation attempts to register a tool outside the eight
  supported operation names
- **THEN** the registry validation fails before the MCP server accepts work

### Requirement: Keyed operation type relationships

The system SHALL expose a finite `AttuneOperationName` key union and keyed
input, result, error, receipt, and writer-policy projections for the eight
registered operations. The investigation service and MCP adapter SHALL accept
a key and preserve the corresponding operation-specific types; for example,
executing `maude_run` SHALL yield the Maude result type rather than a union of
every operation result.

The system SHALL NOT provide a general-purpose `Operation.define` extension
facade or a dependent generic correlation algebra for arbitrary operations.
Adding a ninth operation is a product change that extends the closed registry,
its keyed projections, its correlation metadata, contract evidence, and tests.

Receipt correlation, terminalizability, and handler relations SHALL be
validated deterministically against each registered Tool's schema before an
operation can accept work. Every failed or cancelled result SHALL remain
constructible from its receipt alone; an operation SHALL NOT require
failure-only result fields that the durable invocation engine cannot synthesize.

#### Scenario: Keyed execution retains a Maude result type

- **WHEN** a caller executes `maude_run` through the keyed investigation
  service
- **THEN** TypeScript infers the Maude payload, result, receipt, and expected
  error types rather than the union of every tool operation's types

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

### Requirement: Effect-native type and match utilities

The implementation SHALL use `Effect.Types` for local type simplification,
exact-property, and variance helpers only where they reduce a private helper's
complexity. It SHALL use `Effect.Match` for exhaustive runtime branching on
lifecycle transitions and terminal statuses. It SHALL retain `expect-type` and
native `@ts-expect-error` assertions under the repository TypeScript compiler.

The implementation SHALL NOT add `@effect/rpc`, `ts-pattern`, `hkt-toolbelt`,
HOTScript, ArkType, TypeBox, or TSTyche for this model. `type-fest` MAY be
introduced only for a clearly cosmetic utility absent from Effect.

#### Scenario: Lifecycle branch gains a state

- **WHEN** a lifecycle transition or terminal status is added
- **THEN** the corresponding `Effect.Match` branch fails compilation or tests
  until it handles the new case exhaustively

### Requirement: Cancellation-safe durable terminalization

After an invocation is accepted, the system SHALL retain its activity permit
and any acquired invocation/writer locks until the owned work has stopped and
one terminal result/receipt pair has been durably published. Cancellation MAY
abort owned native work, but SHALL NOT detach terminalization or permit another
exclusive lifecycle transition to overlap the critical tail.
The descriptor result and error projection SHALL be runtime-validated before
immutable terminal bytes become replay authority; implementation contract drift
SHALL yield a schema-valid terminal failure rather than poison exact retries.
Repository materialization SHALL serialize the complete base/capsule/binding
publication by investigation identity, including when different invocation
identities request the same investigation. Once an AgentFS mount has been
acquired for accepted work, cancellation SHALL NOT tear it down before that
work drains and publishes its terminal result.

#### Scenario: Finalization is interrupted after acceptance

- **WHEN** cancellation arrives while an accepted finalization is persisting
  its manifest transition
- **THEN** no second finalizer enters until the first has terminalized, exactly
  one successful finalization is possible, and retry observes the durable
  terminal record

#### Scenario: Two invocations request the same investigation identity

- **WHEN** distinct materialization invocations concurrently request one
  explicit investigation identity
- **THEN** exactly one coherent base, capsule, binding, and manifest is
  published, a matching request reuses it, and a conflicting repository loses
  with an identity conflict

#### Scenario: Accepted work is cancelled after mount acquisition

- **WHEN** cancellation aborts native work after its AgentFS mount is ready
- **THEN** the mount stays available until native cleanup and terminal
  result/receipt publication drain, then it is unmounted

