## ADDED Requirements

### Requirement: FoldKit fixture route drives the fake loop
Attune SHALL provide a fixture-mode FoldKit workbench route that drives the fake closed loop through typed FoldKit route events and messages.

#### Scenario: Fixture route starts
- **WHEN** the fixture workbench route opens
- **THEN** FoldKit records a typed route-opened event
- **AND** initializes route interaction state without mutating semantic projection state directly.

#### Scenario: Fixture snapshot loads
- **WHEN** fixture discovery state is loaded for the route
- **THEN** FoldKit handles a typed snapshot-loaded message
- **AND** stores the Effect-atom-derived `WorkbenchSnapshot` for rendering.

### Requirement: Fixture projection uses Effect AtomRegistry atoms
Attune SHALL derive fixture route `DecisionPacket`, scene/report state, review queue, and `WorkbenchSnapshot` through Effect's experimental `AtomRegistry` and `Atom` DAG.

#### Scenario: Durable fixture event is projected
- **WHEN** a durable fixture event updates the read model
- **THEN** projection writes use Effect `Reactivity.mutation` to invalidate the relevant run-scoped keys
- **AND** the `AtomRegistry` refreshes affected effect-backed atoms and dependent derived atoms before FoldKit receives the refreshed snapshot.

#### Scenario: FoldKit renders fixture state
- **WHEN** FoldKit renders fake closed-loop state
- **THEN** it reads from the atom-derived `WorkbenchSnapshot`
- **AND** it does not maintain a separate durable fixture projection in the FoldKit model.

### Requirement: FoldKit commands advance fixture runtime steps
Attune SHALL advance the fixture closed loop through named FoldKit commands that call a fixture runtime adapter.

#### Scenario: Fixture step command runs
- **WHEN** FoldKit handles a `FixtureStepRequested` message
- **THEN** the update function returns an `ApplyFixtureStep` command
- **AND** the command appends semantic events, projects them, invalidates Effect Reactivity keys, reads `workbenchSnapshotAtom(runId)`, and returns a typed fixture-step-applied message.

#### Scenario: Promotion command runs
- **WHEN** the user requests promotion for a fixture hypothesis
- **THEN** FoldKit records the selected hypothesis and pending command in interaction state
- **AND** the durable promotion event is produced by the fixture runtime, not by mutating FoldKit model state directly.

### Requirement: FoldKit event stream models user-visible fixture progress
Attune SHALL model fake closed-loop progress as an ordered fixture event stream visible at the FoldKit boundary.

#### Scenario: User accepts the fixture decision
- **WHEN** the user accepts the fixture `run_joern_template` decision
- **THEN** FoldKit appends a typed decision-accepted fixture event
- **AND** the next fake proof step is derived from the current `DecisionPacket`.

#### Scenario: Fake proof completes
- **WHEN** the fake Joern proof returns deterministic evidence
- **THEN** FoldKit observes a typed proof-completed fixture event
- **AND** the event contains only schema-backed evidence data and known template IDs.

### Requirement: Fixture events propagate through Effect Reactivity and semantic projections
Attune SHALL adapt durable fixture events into semantic discovery or report events so the rest of the system observes the same read-model, Effect Reactivity, Effect atom, and snapshot contracts as the async route.

#### Scenario: Evidence is surfaced
- **WHEN** the fixture proof-completed event produces an `EvidencePacket`
- **THEN** the adapter appends an `evidence.scored` semantic event
- **AND** replay updates the semantic projection, invalidates evidence and run metric view keys through Effect `Reactivity`, and refreshes the Effect atom DAG before a new `WorkbenchSnapshot` reaches FoldKit.

#### Scenario: Selection changes
- **WHEN** a user selects an anchor or hypothesis in the fixture route
- **THEN** FoldKit updates interaction state
- **AND** no semantic discovery event is appended unless the user executes a durable command.

### Requirement: Fixture replay is deterministic
Attune SHALL replay the same fixture event stream deterministically across package tests and route tests.

#### Scenario: Event stream is replayed twice
- **WHEN** the same fixture route event stream is replayed twice
- **THEN** the resulting `DecisionPacket` values match
- **AND** the observable route state reaches the same terminal fixture step.

### Requirement: Dispatch and FoldKit render refreshed fixture state
Attune SHALL render refreshed fake-loop state through Dispatch/FoldKit from the Effect-atom-derived `WorkbenchSnapshot`, not from ad hoc UI-only mock data.

#### Scenario: Evidence changes snapshot
- **WHEN** the fake proof evidence is appended and replayed
- **THEN** the `WorkbenchSnapshot` version increases
- **AND** the Dispatch/FoldKit workbench view renders the updated evidence and best-next-action state from that snapshot.

### Requirement: Fixture route is backend hot-swappable
Attune SHALL keep the fixture route on the same read boundary as the future asynchronous backend.

#### Scenario: Async backend replaces fake clients
- **WHEN** fake clients are replaced by real CocoIndex, Joern, optimizer, and persistence services
- **THEN** FoldKit continues consuming the same atom-derived `WorkbenchSnapshot` contract
- **AND** no migration from UI-owned fixture projection state is required.

### Requirement: Async route remains out of fixture scope
Attune SHALL keep asynchronous orchestration separate from the FoldKit fixture closed-loop route.

#### Scenario: Fixture route runs in local tests
- **WHEN** the fixture closed-loop tests execute
- **THEN** they do not require real CocoIndex, real Joern, Pi/local model processes, background queues, subscriptions, Neon, or Kubernetes.
