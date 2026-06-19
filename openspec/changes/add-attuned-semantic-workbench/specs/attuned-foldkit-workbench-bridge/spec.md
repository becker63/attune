## ADDED Requirements

### Requirement: FoldKit consumes server snapshots
Attune SHALL connect semantic workbench state to FoldKit through typed server snapshot messages.

#### Scenario: Server snapshot changes
- **WHEN** the semantic runtime emits a `WorkbenchSnapshot`
- **THEN** FoldKit handles a typed `ServerSnapshotChanged` message
- **AND** the FoldKit model stores the latest snapshot for rendering.

### Requirement: FoldKit owns interaction lens state
FoldKit SHALL own the user's interaction state but not derive durable semantic truth.

#### Scenario: User selects a hypothesis
- **WHEN** the user selects a hypothesis in the Workbench route
- **THEN** FoldKit updates selected hypothesis state
- **AND** the server-derived decision packet remains the source of durable hypothesis/evidence truth.

### Requirement: Commands are the durable mutation bridge
Attune SHALL route durable user actions from FoldKit through commands that append semantic events.

#### Scenario: User requests rule promotion
- **WHEN** the user asks to promote a motif or rule candidate
- **THEN** FoldKit records pending command state
- **AND** the server command handler appends an event before a new snapshot reaches FoldKit.

### Requirement: Workbench route renders semantic summary
Dispatch/FoldKit SHALL render a semantic workbench summary from the latest server snapshot.

#### Scenario: User opens workbench
- **WHEN** a `WorkbenchSnapshot` is present
- **THEN** the Workbench view shows run status, best next action, hypotheses, evidence summary, review queue, and snapshot version.

### Requirement: Frontend migration stays joined
The semantic bridge SHALL integrate with the existing Dispatch/FoldKit frontend packages and route set.

#### Scenario: Dispatch frontend evolves
- **WHEN** the `add-dispatch-foldkit-frontend` work continues
- **THEN** semantic workbench snapshot rendering remains part of the same FoldKit app model and route grammar.
