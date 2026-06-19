## ADDED Requirements

### Requirement: Semantic discovery domain packets
Attune SHALL define typed semantic discovery packets for runs, anchors, motif hypotheses, evidence, decision packets, agent decisions, and workbench snapshots.

#### Scenario: Discovery run is represented
- **WHEN** a discovery run enters the workbench runtime
- **THEN** the run has a stable run ID, repo identity, snapshot ID, status, budget, and timestamps.

#### Scenario: Decision packet is built
- **WHEN** projections contain anchors, hypotheses, evidence, and budget state for a run
- **THEN** the system can produce a bounded `DecisionPacket` that contains only current trusted world state and available decisions.

### Requirement: Joern proof evidence packets
Attune SHALL represent Joern proof output as normalized evidence packets rather than raw query rows.

#### Scenario: Joern template result is recorded
- **WHEN** a known Joern proof template returns rows or graph paths
- **THEN** the result is decoded into an evidence packet with template ID, hypothesis ID, confidence, summary, duration, and bounded excerpts.

### Requirement: Bounded agent decisions
Attune SHALL model Pi/local optimizer output as a single validated `AgentDecision` chosen from known decision kinds.

#### Scenario: Optimizer proposes next action
- **WHEN** the optimizer receives a `DecisionPacket`
- **THEN** it emits exactly one typed `AgentDecision`
- **AND** it does not invent IDs, evidence packets, templates, or arbitrary Joern query text.

### Requirement: Workbench snapshot contract
Attune SHALL expose a typed `WorkbenchSnapshot` that joins decision packet, FoldKit scene data, review queue, and invalidation version for one run.

#### Scenario: Snapshot crosses server-to-FoldKit boundary
- **WHEN** the semantic runtime derives a new current view
- **THEN** FoldKit receives a `WorkbenchSnapshot`
- **AND** FoldKit can render the snapshot without reading projection internals or atom internals.

### Requirement: Schema-backed boundary types
Attune SHALL make semantic boundary types serializable and schema-decodable.

#### Scenario: Snapshot is loaded from a fixture or subscription
- **WHEN** a fixture or future subscription emits a semantic packet
- **THEN** the packet can be decoded before use
- **AND** invalid packet shape fails before reaching FoldKit rendering.
