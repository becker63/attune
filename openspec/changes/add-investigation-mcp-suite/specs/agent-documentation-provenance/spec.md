## ADDED Requirements

### Requirement: Traceable documentation and research runs

The system SHALL record research and documentation-agent runs in ActiveGraph
with content-addressed source revision and manifest inputs, agent/version
configuration, prompts, tool invocations, claims, evidence, unresolved
questions, validation results, review decisions, rendered artifacts, and
publication revisions.

#### Scenario: Reviewer inspects a proposed guide

- **WHEN** a reviewer opens a proposed onboarding guide
- **THEN** the system provides a trace from the guide's claims through its
  evidence, manifest revision, agent run, validation result, and approval state

### Requirement: Content and execution provenance separation

The system SHALL distinguish an agent execution from factual support. A
published claim SHALL have `derivedFrom` or `informedBy` content-provenance
edges to current manifest facts or approved research claims, and SHALL have
separate execution, validation, and approval edges.

#### Scenario: Completed agent run lacks evidence

- **WHEN** a documentation-agent run completes without valid evidence for a
  claim
- **THEN** the completed execution record does not make the claim publishable
  and validation rejects the draft

### Requirement: Selective guide invalidation

The system SHALL use graph edges from manifest facts to research conclusions
and guide sections to identify only affected content after an API manifest
change. The static site SHALL remain readable without ActiveGraph; trace and
invalidation behavior SHALL be an additive runtime capability.

#### Scenario: One tool operation changes

- **WHEN** an API manifest change affects one tool operation
- **THEN** the system identifies guides and research conclusions connected to
  that operation without marking unrelated onboarding pages stale

### Requirement: Exact static publication binding

The documentation builder SHALL accept a publication trace only when it is
current, uses stable content-derived identities, and contains the exact
`GuideDraft` to approval and passed-validation edges plus the exact publication
to rendered-artifact to guide-draft chain. The approval decision SHALL bind the
reviewer, decision identity and time, source revision, manifest digest, complete
draft digest, and evidence digest recorded by the reviewed guide. When only
unrelated source or manifest metadata changes, the builder MAY accept an
explicit approval carry-forward chain instead of a direct current-draft
approval, but only when the prior and current complete draft/evidence digests
are identical, their independently projected prose and evidence-support
topologies are identical, the revalidation follows both latest passed
validations and the human decision, and every linked review and content lineage
remains current.

Validation, approval, invalidation, and approval carry-forward records SHALL
be authoritative atomic lifecycle events. Presentation relations SHALL be
strictly validated repairable projections: missing relations after a partial
write SHALL NOT hide a negative event, while a retry MAY restore only the
exact relation set for the same content-addressed record. Stored records and
relations SHALL be rejected when their actor, endpoint types, relation data,
or provenance kind do not match the canonical model.
Validation, review, carry-forward, and publication records SHALL additionally
be authorized by an immutable host-supplied policy of exact identity/version
or identity/role pairs that is not derived from graph records. Their public
write methods SHALL also require independent, opaque host authority evidence
that resolves to the exact operation scope and identity metadata; a record's
self-declared fields or an additional caller-supplied actor string SHALL NOT
serve as that evidence. Publication revisions SHALL be single-binding
aggregates keyed by guide and revision, and each record SHALL commit to its
exact rendered-artifact content address.

#### Scenario: Matching values appear in unrelated trace nodes

- **WHEN** a trace contains the expected revision and digests but does not
  connect them through the required approval, validation, rendering, and
  publication edges
- **THEN** the static publication build rejects the trace

#### Scenario: Unchanged guide is carried to a new manifest

- **WHEN** a current validated draft has the same complete draft and evidence
  digests as a previously approved draft, and a workflow records an exact
  carry-forward edge to that still-current latest human decision
- **THEN** the publication trace identifies both drafts, the human decision,
  and the machine carry-forward record without representing the workflow as a
  new human reviewer

#### Scenario: Prior review is later rejected

- **WHEN** a rejection, failed validation, or invalidation supersedes any
  lineage used by an approval carry-forward
- **THEN** rendering and publication through that carry-forward are rejected

#### Scenario: Review write stops before its relation is emitted

- **WHEN** a rejection or failed validation record is durable but its
  presentation edge is absent after a crash
- **THEN** publication still observes the negative event and retry repairs the
  exact missing edge without creating another decision

#### Scenario: Unknown actor declares itself authoritative

- **WHEN** a graph record names an unconfigured validator, reviewer,
  carry-forward workflow, or publisher even when its stored actor string agrees
- **THEN** traversal, rendering, publication, and trace export reject the record

#### Scenario: Caller impersonates a configured authority

- **WHEN** a caller submits a validation, review, carry-forward, or publication
  record naming a configured identity without an independently resolved
  credential for that exact scope and role or version
- **THEN** the adapter rejects the call before lookup or mutation and does not
  derive authority from the submitted fields

#### Scenario: Publication retry follows a partial write

- **WHEN** a publication record is durable but its presentation edge is
  missing after a crash
- **THEN** an authorized retry may repair only the edge to the artifact address
  committed by that record, while another site, publisher, or artifact for the
  same guide and revision is rejected

#### Scenario: Claimed digests conceal changed support

- **WHEN** prior and current trace records repeat the same claimed digests but
  their section prose or exact content-support edges differ
- **THEN** publication rejects the carry-forward after independently projecting
  and comparing both lineages

### Requirement: Redacted deterministic public traces

Public trace exports SHALL use content-derived node and edge identities and
SHALL omit prompts, model settings, tool payloads, private messages, evidence
excerpts, and review rationales. Trace, node, node-data, nested collection, and
edge envelopes SHALL be closed and type-checked before republication; unknown
fields, values of the wrong runtime type, and relations whose source/target
object types violate the canonical topology SHALL be rejected even when their
identities have been recomputed. The two `renders` relations SHALL accept only
rendered-artifact to guide-draft and publication-revision to rendered-artifact
pairs. A trace SHALL remain byte-stable when the same semantic graph is built
in another insertion order.

#### Scenario: Contributor opens a guide trace

- **WHEN** a contributor follows a published trace link
- **THEN** the trace explains the claim, evidence, validation, approval, and
  publication lineage without exposing private execution payloads


## ADDED Requirements

### Requirement: Coarse experiment publication linkage
The Python provenance boundary SHALL retain a stable content-addressed link
from a completed ActiveGraph research run and its evaluator result to the
immutable exported PublicationBundle. It SHALL preserve the distinction between
execution history and factual support, but SHALL reuse existing events and
generic record/trace facilities rather than adding experiment-specific graph
objects, per-relation traversals, authorization machinery, or approval
carry-forward behavior.

#### Scenario: Inspect a published experiment
- **WHEN** a reviewer follows a publication bundle's ActiveGraph address
- **THEN** the trace identifies the originating run, evaluator result, and
frozen bundle address
- **AND** it does not expose private prompts, messages, or full tool payloads

### Requirement: Immutable experiment revision
Changed evaluator output, manifest facts, report content, or approval SHALL
produce a new immutable publication bundle/revision in Python. The static docs
site SHALL consume the new bundle only after its bound approval; it SHALL NOT
perform graph invalidation or lifecycle repair.

#### Scenario: Replace a published report
- **WHEN** a corrected report revision is approved
- **THEN** Python exports a new bound bundle and links it to the prior revision
- **AND** the prior checked-in record remains an immutable historical artifact

