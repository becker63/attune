## Purpose

Expose the authoritative Attune MCP capabilities to ActiveGraph through one
small typed, replay-safe, host-native Python bridge while leaving hypotheses,
relations, Markdown, and research interpretation under agent discretion.

## ADDED Requirements

### Requirement: Persistent host-native MCP session

The bridge SHALL use one long-lived MCP client session to communicate with the
host-native `attune-mcp` stdio server for an ActiveGraph run.

#### Scenario: Start an ActiveGraph run

- **WHEN** an ActiveGraph run first requires an Attune capability
- **THEN** the bridge SHALL acquire or connect to one host-native `attune-mcp` stdio process
- **AND** SHALL complete MCP initialization before invoking a tool
- **AND** SHALL retain that session for later Attune calls in the same run

#### Scenario: Invoke multiple capabilities

- **GIVEN** a healthy initialized session exists
- **WHEN** multiple Attune tools are called
- **THEN** the bridge SHALL reuse the session
- **AND** SHALL NOT launch one MCP process per tool invocation

#### Scenario: Close the run

- **WHEN** the bridge scope closes or the ActiveGraph run is cancelled
- **THEN** it SHALL close the MCP session
- **AND** SHALL terminate an MCP child process that it owns
- **AND** SHALL await transport cleanup without leaving an orphan server

#### Scenario: Execute a real investigation

- **WHEN** the bridge runs outside isolated unit tests
- **THEN** Joern, Maude, fast-check, ast-grep, Git, AgentFS, and the MCP process SHALL execute on the host through the Nix-pinned closure
- **AND** a virtual machine SHALL NOT be required by the bridge

### Requirement: Explicit typed capability wrappers

The ActiveGraph pack SHALL expose one explicit wrapper for every public Attune
MCP tool using generated Pydantic request and result types.

#### Scenario: Invoke a typed wrapper

- **WHEN** an ActiveGraph behavior invokes an Attune wrapper
- **THEN** ActiveGraph SHALL validate the wrapper arguments with its declared Pydantic input model
- **AND** the bridge SHALL validate structured MCP output with the generated result or typed-failure model
- **AND** the wrapper's Python signature SHALL expose the corresponding concrete input and output types to the configured static type checker

#### Scenario: Adapt ActiveGraph's non-generic decorator

- **WHEN** ActiveGraph's tool API cannot statically preserve the relationship between its input and output schema parameters
- **THEN** the bridge MAY contain one narrow generic adapter and one localized cast
- **AND** handwritten capability methods and wrappers outside that adapter SHALL NOT use unbounded `Any` to conceal contract mismatches

#### Scenario: Server advertises arbitrary tools

- **WHEN** MCP `tools/list` includes a tool that is not in the frozen generated contract
- **THEN** the bridge SHALL NOT dynamically expose it as an ActiveGraph tool
- **AND** adding support SHALL require an Effect contract export, generated-model update, and reviewed explicit wrapper

### Requirement: Contract digest handshake

The bridge SHALL verify that its generated contract matches the live Effect MCP
service before invoking an Attune capability in an ActiveGraph run.

#### Scenario: Contract matches

- **WHEN** the bridge opens a session
- **THEN** it SHALL read the authoritative Attune contract resource
- **AND** SHALL compare its digest with the digest packaged beside the generated Python models
- **AND** MAY proceed only when the values match exactly

#### Scenario: Contract differs

- **WHEN** the live digest differs from the generated client's expected digest
- **THEN** the bridge SHALL fail with an explicit contract-mismatch error
- **AND** SHALL report both expected and observed digests
- **AND** SHALL NOT invoke an Attune capability through the mismatched session

#### Scenario: Contract resource is unavailable

- **WHEN** the server cannot provide the contract document and digest required by the handshake
- **THEN** the bridge SHALL fail startup for Attune-backed tools
- **AND** SHALL NOT infer compatibility from tool names alone

### Requirement: Durable invocation identity

The bridge SHALL derive each Attune `invocationId` from durable ActiveGraph
execution identity rather than from process-local counters, random values, or
model-authored identifiers.

#### Scenario: Construct an invocation request

- **WHEN** an ActiveGraph behavior calls an Attune capability
- **THEN** the bridge SHALL derive the invocation identifier from stable run identity, triggering event identity, behavior or call-site identity, Attune tool name, canonical capability arguments, and contract digest
- **AND** SHALL inject the derived value into the generated MCP request
- **AND** SHALL use a documented versioned derivation

#### Scenario: Retry after a client crash

- **GIVEN** ActiveGraph retries the same durable behavior event with the same canonical arguments and contract digest
- **WHEN** the bridge reconstructs the request
- **THEN** it SHALL derive the same invocation identifier
- **AND** the Effect service SHALL be able to return the original terminal receipt without repeating the external operation

#### Scenario: Distinct logical call

- **WHEN** the triggering event, call-site identity, tool, canonical arguments, or contract digest differs
- **THEN** the bridge SHALL derive a different invocation identity
- **AND** SHALL NOT accidentally alias the operation to an earlier receipt

#### Scenario: ActiveGraph supplies a transient idempotency key

- **WHEN** ActiveGraph provides a process- or attempt-scoped idempotency value that is not guaranteed to survive durable replay
- **THEN** the bridge SHALL NOT use that value as the sole Attune invocation identity

### Requirement: Recorded-response replay semantics

Attune-backed ActiveGraph tools SHALL be declared nondeterministic external
tools for ActiveGraph replay even when the underlying Effect capability is
deterministic for immutable inputs.

#### Scenario: Register an Attune wrapper

- **WHEN** the infrastructure pack registers an Attune-backed tool
- **THEN** it SHALL set ActiveGraph's deterministic declaration to `false`
- **AND** ActiveGraph SHALL record the validated structured response in its event history

#### Scenario: Replay an existing ActiveGraph history

- **WHEN** ActiveGraph replays a recorded Attune tool call
- **THEN** it SHALL consume the recorded response
- **AND** SHALL NOT invoke the live MCP service merely to reproduce the historical graph

#### Scenario: Resume an interrupted external call

- **WHEN** an ActiveGraph execution retries because the Effect operation may have completed before the response was recorded
- **THEN** the bridge SHALL issue the request with the same durably derived invocation identifier
- **AND** SHALL rely on the Effect receipt contract for idempotent recovery
- **AND** SHALL NOT claim that ActiveGraph replay itself proves the external operation was not repeated

### Requirement: Capability results remain authoritative receipts

The bridge SHALL return Effect-produced structured results and receipt
references without copying native evidence or creating a competing execution
record.

#### Scenario: Capability succeeds or reaches a controlled terminal failure

- **WHEN** the MCP tool returns structured terminal data
- **THEN** the bridge SHALL validate and return that data through the generated model
- **AND** ActiveGraph MAY relate or annotate the receipt according to agent-authored research behavior
- **AND** AgentFS SHALL remain authoritative for complete request and artifact bytes

#### Scenario: MCP transport fails

- **WHEN** the stdio session fails before yielding a valid structured tool result
- **THEN** the bridge SHALL distinguish the transport failure from an Effect-produced typed capability failure
- **AND** SHALL NOT fabricate an Attune receipt

#### Scenario: Result contains opaque references

- **WHEN** an Attune request or result contains free-form references or Markdown
- **THEN** the bridge SHALL preserve their accepted strings
- **AND** SHALL NOT infer, validate, or normalize their semantic meaning

### Requirement: Infrastructure pack has no research ontology

The ActiveGraph bridge SHALL provide capabilities, models, and lifecycle
integration only; it SHALL NOT define a universal Attune object graph or shared
intermediate representation.

#### Scenario: Load the bridge pack

- **WHEN** the ActiveGraph infrastructure pack is loaded
- **THEN** it SHALL register the explicit Attune capability tools and required settings
- **AND** SHALL NOT require object types for observations, hypotheses, theories, counterexamples, rules, evaluations, repository files, or Joern graph nodes

#### Scenario: A research pack adds semantic structure

- **WHEN** a later handwritten pack defines Pydantic-backed objects, typed relation endpoints, Markdown conventions, or research behaviors
- **THEN** those definitions SHALL remain consumer-owned interpretations layered over opaque Attune receipts and artifact references
- **AND** they SHALL NOT alter the Effect capability ABI

#### Scenario: The agent cannot completely correlate evidence

- **WHEN** gaps remain between a Joern observation, a Maude theory, a fast-check counterexample, and an ast-grep lowering
- **THEN** the bridge SHALL allow the agent to retain partial free-form references and Markdown
- **AND** SHALL NOT synthesize a missing semantic edge or require one shared representation

### Requirement: Host-native reproducible packaging

The bridge SHALL be packaged as a uv-managed Python project and integrated into
the existing Nx and Nix build without making Python authoritative for MCP
contracts.

#### Scenario: Run developer checks

- **WHEN** the Python bridge is checked locally
- **THEN** Nx SHALL provide targets for generated-model drift, static typing, tests, and pack loading
- **AND** those targets SHALL consume the checked-in contract artifact through an acyclic dependency on the TypeScript contract target

#### Scenario: Build the reproducible application

- **WHEN** Nix builds the ActiveGraph bridge
- **THEN** it SHALL use the locked Python dependencies and install the expected contract digest
- **AND** the resulting host-native application SHALL be able to start the packaged `attune-mcp` server and complete the contract handshake

#### Scenario: Exercise the native boundary

- **WHEN** the integration check runs on a supported Linux system
- **THEN** it SHALL open one real stdio MCP session
- **AND** SHALL validate at least one generated request and response through the ActiveGraph wrapper boundary
- **AND** SHALL avoid a VM-only execution path
