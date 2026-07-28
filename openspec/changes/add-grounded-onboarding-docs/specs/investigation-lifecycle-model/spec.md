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

### Requirement: Typed operation registry

The system SHALL describe each tool operation through a typed descriptor that
binds its name, input, success result, terminal receipt, error union, and
writer policy. Handler and MCP registration code SHALL derive operation typing
from the descriptor rather than casting operation input through an untyped JSON
value.

#### Scenario: New operation descriptor is registered

- **WHEN** an implementer adds a tool operation descriptor
- **THEN** its input/result/receipt types and writer policy are available to
  the application service and registration adapter without a handwritten
  duplicate handler signature

### Requirement: Generic operation type relationships

The system SHALL expose generic type relationships that preserve an operation's
specific input, success result, terminal receipt, error union, and writer policy
through the investigation service and registration boundaries. A generic
operation helper SHALL infer those types from a descriptor without callers
supplying duplicate type arguments or widening to a common untyped result.
Every public projection and helper SHALL distribute over descriptor unions
while preserving each selector/input/result/receipt/error/policy branch; a
union descriptor SHALL never collapse branded receipt fields to `never` or
permit cross-branch pairing.
Descriptor admission SHALL also prove that the durable invocation engine can
construct every failed and cancelled result using its terminal receipt alone;
an operation SHALL NOT require failure-only result fields that the engine
cannot synthesize.

#### Scenario: Generic execution retains a Maude result type

- **WHEN** a caller executes the Maude operation through the generic
  investigation service
- **THEN** TypeScript infers the Maude input, result, receipt, and expected
  error types rather than the union of every tool operation's types

#### Scenario: Registry type relation regresses

- **WHEN** a registry or service change widens an operation-specific input,
  result, receipt, error, or writer-policy type
- **THEN** an `expect-type` test fails before the change is accepted

#### Scenario: Union selector is paired with one branch's input

- **WHEN** a caller supplies a union-valued operation name or descriptor but
  supplies the input or implementation payload for only one possible operation
- **THEN** TypeScript rejects the call instead of widening the descriptor
  relationship

#### Scenario: Structural descriptor bypasses its factory

- **WHEN** a registry entry resembles a tool operation but violates the
  descriptor's receipt, correlation, policy, or lifecycle-input relation
- **THEN** registry admission rejects it even if it was assembled by spreading
  another descriptor

#### Scenario: Valid correlated operation union is projected

- **WHEN** a generic caller carries a union of complete operation descriptors
- **THEN** input, result, receipt, handler, recovery, writer-policy, and service
  output types distribute to the exact union of correlated branches

#### Scenario: Failure result requires an implementation-owned field

- **WHEN** a descriptor adds a required field beside a failed or cancelled
  receipt
- **THEN** descriptor and registry admission reject it before the runtime can
  accept an invocation that it cannot terminalize

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
