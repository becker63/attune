## ADDED Requirements

### Requirement: Event-sourced semantic projection
Attune SHALL derive semantic read state from append-only discovery events.

#### Scenario: Event log is replayed
- **WHEN** discovery events are replayed in order
- **THEN** projections reconstruct runs, anchors, hypotheses, evidence, review queue, and decision history deterministically.

### Requirement: Events mutate durable world state
Attune SHALL treat commands and service outcomes as events when they change durable discovery state.

#### Scenario: Motif promotion is requested
- **WHEN** a user or optimizer requests a motif promotion
- **THEN** the runtime records a domain event
- **AND** snapshot derivation observes the projection after replay rather than mutating FoldKit state directly.

### Requirement: Server-side atom-style derivation
Attune SHALL derive current reasoning views from projections through named atom-style view functions.

#### Scenario: Evidence changes for a hypothesis
- **WHEN** an evidence event is appended for a run
- **THEN** the decision packet, plateau state, review queue, and FoldKit scene can be recomputed from projection state.

### Requirement: Freshness versioning
Attune SHALL include an invalidation or projection version in semantic snapshots.

#### Scenario: Projection changes
- **WHEN** replay applies a new event that affects a run-scoped view key
- **THEN** the derived `WorkbenchSnapshot` version increases.

### Requirement: Replay separates domain and UI history
Attune SHALL keep domain replay separate from FoldKit interaction replay.

#### Scenario: User changes selected hypothesis
- **WHEN** the user selects a different hypothesis in FoldKit
- **THEN** the FoldKit model changes its interaction lens
- **AND** no semantic projection event is required unless the user executes a durable command.
