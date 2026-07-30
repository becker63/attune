## ADDED Requirements

### Requirement: Explicit interpretation ledgers

The research pack SHALL model every retained agent-authored transition between
native evidence forms as an immutable, content-addressed
`InterpretationLedger` document. A ledger SHALL identify its schema version,
case, local question, non-empty opaque source references, non-empty retained
facts, intentionally omitted facts, agent-authored assumptions, selected next
experiment or representation, expected discriminating observation, known
limitations, and optional superseded ledger reference.

The ledger SHALL remain a consumer-owned typed value recorded through
ActiveGraph event and tool history. It SHALL NOT become a fifth ActiveGraph
object, a new relation, an MCP operation or semantic schema, a universal
intermediate representation, or mechanically validated evidence.

#### Scenario: Agent selects a materially different experiment

- **WHEN** an agent uses existing evidence to choose a materially different
  experiment or representation
- **THEN** it records an `InterpretationLedger` before invoking the dependent
  capability
- **AND** the ledger states what observation is expected to distinguish the
  live alternatives

#### Scenario: Agent selects from retained Attune evidence

- **WHEN** the source is a native file retained by an Attune receipt
- **THEN** `source_refs` contains that receipt-returned artifact URI
- **AND** it does not replace the URI with a human-authored tool alias or
  summary filename

#### Scenario: Agent revises an interpretation

- **WHEN** later evidence changes an earlier assumption, omission, or selected
  transition
- **THEN** a new immutable ledger MAY cite the earlier ledger reference in
  `supersedes`
- **AND** the earlier ledger remains unchanged in ActiveGraph history

### Requirement: Common deterministic ledger recording

Every benchmark arm SHALL expose the same deterministic
`record_interpretation` ActiveGraph tool. The typed tool call SHALL retain the
exact ledger body and event position in ActiveGraph history and SHALL return
only a `ledger:sha256:...` content-addressed reference. It SHALL perform no
filesystem, process, network, AgentFS, or MCP effect.

The tool SHALL reject a ledger whose `case_id` differs from the immutable pack
settings. Its typed schema SHALL participate in the common-tool digest, and
the investigate behavior SHALL allow enough bounded tool turns for each
returned ledger address to precede its dependent capability call.

#### Scenario: Compare conventional and Attune arms

- **WHEN** the research pack composes either capability profile
- **THEN** both profiles expose `record_interpretation` with the same input and
  output contracts
- **AND** the Attune profile still differs by exactly the existing eight MCP
  capability wrappers

#### Scenario: Ledger addresses another case

- **WHEN** `record_interpretation` receives a ledger for a case other than the
  pack's configured case
- **THEN** it rejects the call before returning a content address
- **AND** it performs no external operation

### Requirement: Explicit evidence relation and ledger selection

`InvestigationOutput` SHALL explicitly select either `supports` or
`challenges` for each emitted evidence-to-claim relation and MAY carry ledger
references. The handler SHALL preserve those ledger references with existing
evidence references and SHALL emit the selected relation without inferring it
from claim state.

`Result` SHALL expose the ledger references retained during synthesis without
embedding or mutating ledger bodies.

The Case-triggered research behaviors SHALL match ActiveGraph's
`object.created` payload shape, read the current case from that triggering
event, and rely on the constrained behavior graph to stamp actor and causal
metadata.

#### Scenario: Counterexample challenges a claim

- **WHEN** an investigation output labels accepted evidence as `challenges`
- **THEN** the graph emits a `challenges` relation rather than `supports`
- **AND** the evidence preserves its ledger, receipt, and artifact references

#### Scenario: Synthesis selects surviving decisions

- **WHEN** synthesis accepts only some authored decision edges
- **THEN** `Result.retained_ledger_refs` identifies those ledger references
- **AND** unselected ledgers remain available in ActiveGraph history

#### Scenario: Case creation schedules research

- **WHEN** ActiveGraph emits `object.created` for the configured `Case`
- **THEN** the investigate and synthesize behaviors match the event
- **AND** their handlers can create their declared objects and relations
  through the constrained behavior graph
