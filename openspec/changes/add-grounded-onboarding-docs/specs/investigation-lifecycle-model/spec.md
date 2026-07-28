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

### Requirement: Typed investigation state capabilities

The system SHALL represent materialized, active, and finalized investigation
states with distinct typed capabilities. Only an active capability SHALL be
accepted by operation execution, artifact promotion, or finalization APIs, and
only the validated workspace boundary SHALL construct an active capability.

#### Scenario: Finalized capability is used for execution

- **WHEN** a caller attempts to pass a finalized investigation capability to an
  operation execution API
- **THEN** the type-checking test suite rejects the transition

### Requirement: Effect Tool/Toolkit-backed operation facade

The system SHALL use the installed Effect Tool and Toolkit APIs as the sole
schema and typed-handler authority. Each supported MCP tool SHALL have one
Effect Tool that binds its parameters, success result, expected failure, and
handler requirements; the Attune Toolkit SHALL derive the typed handler
collection and MCP contract from those Tools.

Each Tool SHALL be wrapped by one inferred `Operation` facade that carries only
Attune-owned execution metadata: access, a closed lifecycle transition
(`materialize`, `preserve`, or `finalize`), receipt identity, writer policy,
and durable correlation facts. The MCP server SHALL remain an adapter over the
Toolkit and SHALL preserve the published MCP tool names and generated
contract-schema behavior.

#### Scenario: New operation is added through one Effect Tool

- **WHEN** an implementer defines an Effect Tool and wraps it with
  `Operation.define`
- **THEN** its parameters, result, expected failures, handler requirements,
  MCP contract, and Attune execution metadata are derived without a second
  schema definition or handwritten duplicate handler signature

### Requirement: Generic operation type relationships

The system SHALL expose generic type relationships that preserve an
operation's specific Tool parameters, success result, expected error union,
and Attune-owned terminal receipt/writer-policy facts through the investigation
service and MCP adapter. `Operation.define<const D extends OperationShape>(
definition: D & Validate<D>): Operation<D>` SHALL infer those relationships
from one definition object without callers supplying duplicate type arguments
or widening to a common untyped result.

The public projection vocabulary SHALL be limited to `Operation.Input`,
`Operation.Result`, `Operation.Error`, and the explicit receipt projection
required by the durable service. Receipt relations, terminalizability,
correlation selection, union distribution, and handler wiring SHALL remain
private implementation details. Public helpers SHALL distribute over operation
unions while preserving each input/result/error/receipt/policy branch; a union
SHALL never collapse branded receipt fields to `never` or permit cross-branch
pairing.

The operation facade SHALL prove that the durable invocation engine can
construct every failed or cancelled terminal result using its receipt alone; an
operation SHALL NOT require failure-only result fields that the engine cannot
synthesize.

#### Scenario: Generic execution retains a Maude result type

- **WHEN** a caller executes the Maude operation through the generic
  investigation service
- **THEN** TypeScript infers the Maude payload, result, receipt, and expected
  error types rather than the union of every tool operation's types

#### Scenario: Registry type relation regresses

- **WHEN** an operation facade or service change widens an operation-specific
  input, result, receipt, error, or writer-policy type
- **THEN** an `expect-type` test fails before the change is accepted

#### Scenario: Union operation is paired with one branch's input

- **WHEN** a caller supplies a union-valued operation but supplies the input or
  implementation payload for only one possible operation
- **THEN** TypeScript rejects the call instead of widening the descriptor
  relationship

#### Scenario: Structural operation bypasses the Effect Tool facade

- **WHEN** a registration entry resembles an operation but is not defined from
  an Effect Tool through `Operation.define`
- **THEN** the adapter rejects it rather than accepting a structurally
  assembled parallel operation contract

#### Scenario: Valid correlated operation union is projected

- **WHEN** a generic caller carries a union of complete operation definitions
- **THEN** payload, result, receipt, handler, recovery, writer-policy, and
  service output types distribute to the exact union of correlated branches

#### Scenario: Failure result requires an implementation-owned field

- **WHEN** an operation adds a required field beside a failed or cancelled
  receipt
- **THEN** the operation facade rejects it before the runtime can accept an
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
