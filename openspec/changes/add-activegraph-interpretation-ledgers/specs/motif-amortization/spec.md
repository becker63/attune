## ADDED Requirements

### Requirement: Packets retain selected interpretation ledgers

A frozen motif packet SHALL embed the immutable `InterpretationLedger` bodies
selected by synthesis while native Joern, Maude, property, counterexample, and
ast-grep artifacts remain in their native forms behind exact references.
ActiveGraph history SHALL retain every authored ledger; the packet SHALL carry
only selected ledgers.

For the documented payment packet, those exact references SHALL name
`joern-output.json`, Maude `stdout.txt`, property `counterexample.json` and
`run-details.json`, complete `property.ts`, and ast-grep `findings.jsonl`, plus
the candidate input-rule path tracked in `EXACT_SNAPSHOT`, the promoted
repository-root path `payment-retry.property.ts`, and
`RESEARCH_SNAPSHOT`. `artifact_promote` SHALL be the explicit mechanical copy
of receipt-listed complete `property.ts`; it SHALL leave `HEAD` unchanged and
the worktree dirty. `repository_checkpoint(policy: "commit")` SHALL commit
every non-ignored change and establish `RESEARCH_SNAPSHOT`. The packet SHALL
NOT imply that a raw mount path, `activegraph.call`, or ledger side effect
wrote repository bytes. Packet and ledger examples SHALL NOT replace the native files with
invented `attune:<tool>:<invocation>` aliases, `joern.summary`, or a generic
`result.json`.

The consumer SHALL be able to rebuild a ledger-reference-to-packet-digest index
from packet contents without another mutable source of truth.

#### Scenario: Accepted research becomes a packet

- **WHEN** synthesis freezes reusable research into a motif packet
- **THEN** the result identifies the selected ledger references
- **AND** the packet embeds the corresponding small immutable ledger documents
- **AND** it does not translate native executable artifacts into ledger fields

#### Scenario: Later evidence challenges a retained ledger

- **WHEN** a new ledger supersedes a decision retained by one or more packets
- **THEN** the earlier ledgers and packets remain immutable
- **AND** the rebuildable index identifies the affected packet digests for
  review rather than silently rewriting them

### Requirement: Ledger-aware prose control

The prose transfer control SHALL receive a flattened account of each retained
ledger's retained facts, omissions, assumptions, and limitations. It SHALL NOT
receive ledger source coordinates, supersession or dependency structure,
dependent-operation replay coordinates, native executable artifacts, or packet
digests unavailable to the cold arm.

#### Scenario: Construct prose from a ledger-bearing packet

- **WHEN** the runner creates the bounded prose control
- **THEN** the semantic content of retained decisions remains readable
- **AND** exact ledger references, native artifact bytes, replay coordinates,
  and ledger dependency structure are excluded
