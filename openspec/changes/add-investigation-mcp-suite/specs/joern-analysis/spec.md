## Purpose

Execute Joern against an exact investigation commit while preserving native
query evidence and reusing the existing `joern-effect` library.

## ADDED Requirements

### Requirement: Investigation-bound Joern execution

Every Joern request SHALL name an existing investigation and the exact committed snapshot to analyze.

#### Scenario: Query the expected commit

- **GIVEN** the investigation is clean and `HEAD` equals `expectedSnapshot`
- **WHEN** `joern_query` executes
- **THEN** Joern SHALL import or reuse a CPG derived from that exact commit
- **AND** the receipt SHALL identify the commit

#### Scenario: Reject arbitrary host input

- **WHEN** a request attempts to supply a repository path outside the investigation
- **THEN** the service SHALL reject the request

#### Scenario: Reject stale or dirty repository state

- **WHEN** `HEAD` differs from `expectedSnapshot` or the repository is dirty
- **THEN** the request SHALL fail before Joern execution

### Requirement: Mechanical CPG identity

The service SHALL record a Joern import's repository commit, frontend, import options, Joern environment, and relevant CPG schema identity.

#### Scenario: Reuse the same import identity

- **GIVEN** a current CPG exists for the same mechanical identity
- **WHEN** another query is submitted
- **THEN** the service MAY reuse that CPG and scoped Joern session as an internal optimization
- **AND** this capability SHALL NOT require a general session-registry framework

#### Scenario: Query a different identity

- **WHEN** the commit, frontend, import options, or Joern environment changes
- **THEN** the service SHALL NOT reuse an incompatible CPG
- **AND** SHALL NOT expose a separate semantic reindex workflow

### Requirement: Native raw CPGQL

The public MCP capability SHALL accept native CPGQL and preserve its exact accepted text.

#### Scenario: Execute a raw query

- **WHEN** a client submits valid CPGQL
- **THEN** the system SHALL execute it through `joern-effect`
- **AND** SHALL retain the exact query and complete bounded native result

#### Scenario: Joern rejects a query

- **WHEN** Joern reports a parse, evaluation, transport, or process failure
- **THEN** the terminal receipt SHALL contain a typed mechanical failure
- **AND** available native output SHALL remain retained

### Requirement: Internal typed query support

The application SHALL preserve the ability for internal TypeScript callers to execute existing `joern-effect` typed queries and Effect Schema decoders.

#### Scenario: Typed result decodes

- **WHEN** a typed query result matches its decoder
- **THEN** the caller SHALL receive the decoded value
- **AND** the emitted CPGQL and encoded native result SHALL be retained

#### Scenario: Typed result does not decode

- **WHEN** a typed query result violates its decoder
- **THEN** the operation SHALL fail with the existing typed decode error
- **AND** the undecodable payload SHALL remain retained

### Requirement: Complete evidence and bounded MCP response

The system SHALL retain Joern request and output evidence independently of the bounded value returned through MCP.

#### Scenario: Result fits the response budget

- **WHEN** a result fits the configured MCP response budget
- **THEN** the response MAY contain the complete parsed result
- **AND** the receipt SHALL still reference the retained native artifact

#### Scenario: Result exceeds a retained-output limit

- **WHEN** an enforced output limit terminates or truncates collection
- **THEN** the receipt SHALL classify the limit failure
- **AND** every truncated artifact reference SHALL state `complete: false`
- **AND** the service SHALL NOT describe the prefix as complete evidence

### Requirement: Scoped Joern lifecycle

The service SHALL delegate Joern startup, readiness, import, query transport, and shutdown to the existing scoped `joern-effect` implementation.

#### Scenario: Acquire a Joern session

- **WHEN** no reusable session exists
- **THEN** the service SHALL acquire a scoped Joern server
- **AND** SHALL wait for readiness before importing or querying

#### Scenario: Cancel a query

- **WHEN** the MCP request is cancelled or reaches its timeout
- **THEN** Effect interruption SHALL propagate through the Joern operation
- **AND** scoped process and output resources SHALL be cleaned up
