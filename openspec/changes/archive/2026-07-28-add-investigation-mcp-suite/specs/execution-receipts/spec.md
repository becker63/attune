## Purpose

Define the small mechanical ABI shared by MCP clients: schema-derived tool
contracts, caller-stable invocation identity, append-only native artifacts,
terminal receipts, opaque references, read-only inspection, and explicit
artifact promotion.

## ADDED Requirements

### Requirement: Effect Schema is the contract authority

The system SHALL define MCP request, response, receipt, resource, and typed failure shapes once with the repository-pinned Effect Schema API.

#### Scenario: Build the contract bundle

- **WHEN** the MCP contracts are built
- **THEN** the system SHALL emit a deterministic `contracts/attune-tools.schema.json`
- **AND** SHALL emit a digest of those exact schema bytes

#### Scenario: Tool contract changes

- **WHEN** an Effect tool schema changes
- **THEN** the checked-in schema bundle and digest SHALL change deterministically
- **AND** validation SHALL fail if generated contract artifacts are stale

#### Scenario: Included non-TypeScript client

- **WHEN** the included ActiveGraph bridge or another client integrates with Attune
- **THEN** it SHALL be able to generate or validate client models from the checked-in JSON Schema
- **AND** the TypeScript MCP runtime SHALL NOT require a Python runtime

### Requirement: Caller-stable invocation identity

Every mutating or executing MCP request SHALL contain a caller-selected `invocationId`, and the service SHALL compute a canonical digest of the accepted request; except for bootstrap materialization, invocation identity SHALL be `(investigationId, tool, invocationId)`.

#### Scenario: First invocation

- **WHEN** no accepted request exists for the same investigation, tool, and invocation identifier
- **THEN** the service SHALL persist the request before executing the underlying capability

#### Scenario: Retry a completed invocation

- **GIVEN** the same invocation identifier has the same input digest and a terminal receipt
- **WHEN** the request is retried
- **THEN** the service SHALL return the existing receipt
- **AND** SHALL NOT repeat the external operation

#### Scenario: Reuse an identifier with different input

- **GIVEN** an accepted request exists for the invocation identifier
- **WHEN** a request has a different input digest
- **THEN** the service SHALL fail with `InvocationConflict`
- **AND** SHALL NOT alter the earlier artifacts

#### Scenario: Retry an incomplete invocation

- **GIVEN** the accepted request exists without a terminal receipt
- **WHEN** the same invocation is retried
- **THEN** the service SHALL fail with `InvocationIncomplete`
- **AND** SHALL NOT guess whether the external operation completed
- **AND** SHALL NOT automatically replay it

#### Scenario: Materialization has no capsule yet

- **WHEN** `repository_materialize` accepts a new invocation before an AgentFS database exists
- **THEN** its invocation identifier SHALL be service-global within the configured Attune home
- **AND** the service SHALL apply the same digest and receipt rules in a bounded bootstrap location
- **AND** the bootstrap request and receipt SHALL remain authoritative for materialization idempotency
- **AND** the service SHALL copy the same accepted-request and terminal-receipt bytes into the published investigation before publishing the successful bootstrap receipt
- **AND** a retry that finds the capsule copy but no bootstrap receipt SHALL report `InvocationIncomplete`
- **AND** SHALL NOT reconstruct or reconcile an authoritative receipt from the capsule copy

#### Scenario: Concurrent duplicate requests

- **GIVEN** two calls use the same invocation key and input digest concurrently
- **WHEN** neither has yet published a receipt
- **THEN** one simple keyed OS lock SHALL serialize lookup through terminal publication
- **AND** at most one underlying operation SHALL execute
- **AND** the lock SHALL NOT introduce owner epochs, durable running state, or reconciliation

#### Scenario: Retry after finalization

- **GIVEN** an invocation completed before its investigation was finalized
- **WHEN** the exact same invocation key and digest are retried after finalization
- **THEN** the service SHALL return the existing receipt
- **AND** SHALL NOT perform current snapshot or finalization checks first

### Requirement: Append-only invocation directory

Each accepted invocation SHALL own one directory at `/artifacts/<tool>/<invocation-id>/`.

#### Scenario: Persist an invocation

- **WHEN** an invocation is accepted
- **THEN** its directory SHALL contain a deterministic canonical serialization of the accepted decoded request
- **AND** SHALL contain the exact accepted free-form references
- **AND** SHALL retain exact tool-native source/file inputs and available outputs

#### Scenario: Complete an invocation

- **WHEN** the operation reaches a controlled terminal outcome
- **THEN** the service SHALL publish exactly one immutable `receipt.json`
- **AND** SHALL NOT overwrite a completed invocation directory

#### Scenario: Process stops before completion

- **WHEN** request persistence succeeds but terminal receipt publication does not
- **THEN** the directory SHALL remain inspectable
- **AND** absence of `receipt.json` SHALL be the sole V0 incomplete marker

### Requirement: Mechanical terminal receipt

Every controlled terminal outcome after request acceptance SHALL publish a discriminated `AttuneReceipt` containing only execution identity and mechanical facts.

#### Scenario: Successful operation

- **WHEN** a capability completes successfully
- **THEN** its receipt SHALL record schema version, invocation and investigation identifiers, tool, operation, the exact used snapshot, input digest, toolchain digest, timestamps, status, and path-addressed digest-bearing artifact references
- **AND** it SHALL NOT contain a failure member

#### Scenario: Controlled failure

- **WHEN** an operation fails through a known timeout, resource limit, parse error, decode error, stale snapshot, path error, or process exit
- **THEN** the receipt SHALL use status `failed`
- **AND** SHALL require a typed failure classification
- **AND** MAY omit the snapshot only when no commit was resolved or used
- **AND** SHALL retain available native evidence
- **AND** the accepted tool call SHALL return the receipt as structured terminal data

#### Scenario: Controlled cancellation

- **WHEN** Effect handles client cancellation and completes cleanup
- **THEN** the service SHALL persist a receipt with status `cancelled`
- **AND** SHALL record a typed cancellation failure
- **AND** delivery of that receipt over the cancelled response channel MAY be omitted
- **AND** a later exact retry or resource read SHALL expose the persisted receipt
- **AND** SHALL require a typed cancellation value

#### Scenario: Failure before acceptance

- **WHEN** schema decoding, invocation-key validation, or investigation resolution fails before `request.json` is persisted
- **THEN** the operation SHALL fail through the MCP tool failure channel
- **AND** SHALL NOT fabricate a receipt

#### Scenario: Host crash

- **WHEN** the host terminates before terminal publication
- **THEN** the system SHALL NOT fabricate a failed or cancelled receipt

### Requirement: Honest artifact references

Every artifact reference SHALL include its resource URI, media type, SHA-256 digest, byte length, and completeness flag.

#### Scenario: Complete retained output

- **WHEN** an output is retained in full
- **THEN** its artifact reference SHALL set `complete: true`

#### Scenario: Enforced limit retains a prefix

- **WHEN** an output limit permits retaining only a prefix
- **THEN** its artifact reference SHALL set `complete: false`
- **AND** the receipt SHALL classify the corresponding mechanical failure

#### Scenario: Bounded MCP response

- **WHEN** complete evidence exceeds the MCP response budget
- **THEN** the response SHALL return a bounded summary and artifact references
- **AND** the retained artifact, not the summary, SHALL carry the complete bytes when `complete: true`

### Requirement: Opaque free-form references

Every invocation SHALL accept a bounded array of `{ ref, note? }` values and persist it without a closed ontology.

#### Scenario: Reference an ActiveGraph object

- **WHEN** a caller supplies an ActiveGraph identifier and explanation
- **THEN** Attune SHALL retain the exact accepted strings
- **AND** SHALL NOT dereference or mirror the ActiveGraph object

#### Scenario: Reference an unknown value

- **WHEN** a reference does not name an Attune artifact or known run
- **THEN** the service SHALL still accept it after ordinary schema and size validation
- **AND** SHALL NOT infer its type, snapshot relationship, or semantics

#### Scenario: References are incomplete

- **WHEN** a caller omits a semantic edge or explanation
- **THEN** the service SHALL NOT synthesize one

### Requirement: Generic artifact promotion

The system SHALL expose one `artifact_promote` capability that copies caller-selected retained bytes into the investigation repository without deciding their semantic value.

#### Scenario: Promote an artifact

- **GIVEN** the source artifact belongs to the investigation
- **AND** the destination is contained beneath `/repo`
- **AND** the clean repository `HEAD` equals `expectedSnapshot`
- **WHEN** `artifact_promote` succeeds
- **THEN** it SHALL copy the exact retained bytes to the destination
- **AND** SHALL retain the resulting patch as invocation evidence
- **AND** SHALL leave the repository change uncommitted

#### Scenario: Destination already exists

- **WHEN** the destination contains different bytes
- **THEN** the explicit promotion request SHALL overwrite it after all state checks
- **AND** the patch SHALL expose the replacement

#### Scenario: Destination already has identical bytes

- **WHEN** the destination contains the same bytes
- **THEN** promotion SHALL succeed as a no-op
- **AND** SHALL report `workingTreeChanged: false`

#### Scenario: Reject an unsafe promotion

- **WHEN** the source is outside the investigation, the destination escapes `/repo`, targets Git administrative state, is Git-ignored, the expected commit is stale, the tree is dirty, or the investigation is finalized
- **THEN** promotion SHALL fail before copying bytes

#### Scenario: Promote any native artifact kind

- **WHEN** a caller selects a theory, property, rule, counterexample, Markdown note, or other retained artifact
- **THEN** the same capability SHALL handle the copy
- **AND** the service SHALL NOT apply tool-specific eligibility policy

### Requirement: Read-only inspection resources

The server SHALL expose contained, size-bounded resources for investigation metadata, receipts, artifacts, and the contract bundle.

#### Scenario: Read retained evidence

- **WHEN** a client requests a valid investigation artifact URI
- **THEN** the server SHALL return exact metadata and the retained bytes only when they fit the inline resource budget
- **AND** SHALL NOT permit path traversal or access to another investigation

#### Scenario: Artifact exceeds the resource budget

- **WHEN** retained bytes exceed the inline resource budget
- **THEN** the server SHALL return exact metadata and a typed `ResourceTooLarge` result
- **AND** SHALL NOT add range, streaming, listing, search, or indexing behavior in V0

#### Scenario: Read a finalized investigation

- **WHEN** the investigation is finalized
- **THEN** receipt and artifact resources SHALL remain readable

### Requirement: No research runtime

The Effect service SHALL NOT implement a semantic graph, event store, behavior runtime, workflow scheduler, fork/diff system, replay engine, policy engine, or universal research IR.

#### Scenario: Choose the next experiment

- **WHEN** a receipt or artifact suggests another experiment
- **THEN** the service SHALL return control to the caller
- **AND** SHALL NOT autonomously schedule the next tool

#### Scenario: Interpret conflicting evidence

- **WHEN** native artifacts disagree or leave a gap
- **THEN** Attune SHALL preserve the mechanical evidence
- **AND** SHALL leave interpretation, semantic lineage, and refinement to the agent

#### Scenario: Store Markdown

- **WHEN** Markdown is retained or promoted
- **THEN** Attune SHALL treat it as native opaque bytes
- **AND** SHALL NOT parse it into another source of truth
