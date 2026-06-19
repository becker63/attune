## ADDED Requirements

### Requirement: Semantic recall service boundary
Attune SHALL wrap CocoIndex-style semantic recall behind a typed service contract.

#### Scenario: Anchor search runs
- **WHEN** the runtime asks for anchors for a repo snapshot
- **THEN** the service returns typed anchor cards with source locations, vocabulary, score, and excerpts.

### Requirement: Joern proof service boundary
Attune SHALL run structural proof through known typed Joern templates.

#### Scenario: Hypothesis needs proof
- **WHEN** an agent decision selects `run_joern_template`
- **THEN** the runtime accepts only a known template ID and typed template inputs
- **AND** the proof result is recorded as an evidence event.

### Requirement: Optimizer harness boundary
Attune SHALL treat Pi or a local model as a bounded optimizer over a `DecisionPacket`.

#### Scenario: Decision turn starts
- **WHEN** the optimizer receives current state
- **THEN** it chooses one next move from known action kinds
- **AND** the app validates that move before routing it.

### Requirement: Local pipeline fixtures
Attune SHALL provide deterministic fixture implementations for semantic recall, Joern proof, and optimizer services in the first slice.

#### Scenario: Tests run without local services
- **WHEN** package tests execute on a clean workstation
- **THEN** they can exercise the recall-to-proof-to-decision flow without starting CocoIndex, Joern, Pi, or a local LLM process.

### Requirement: Budget-aware decisions
Attune SHALL include scarce resource budgets in decision packets and optimizer inputs.

#### Scenario: Joern budget is exhausted
- **WHEN** no Joern proof budget remains
- **THEN** the optimizer harness does not select a Joern template run as an available decision.

### Requirement: Closed-loop fake-client golden slice
Attune SHALL prove the first recall-to-proof-to-snapshot loop before expanding platform, generator, Dispatch feed, Kubernetes, scheduler, lease, budget, worker-safety, app-server, or new UI surfaces.

#### Scenario: Golden slice uses deterministic test clients
- **WHEN** the golden-slice proof runs without CocoIndex, Joern, Pi, or local LLM processes
- **THEN** a fake-CocoIndex client returns normalized `AnchorCard` records for one repo snapshot
- **AND** a fixture optimizer chooses `run_joern_template` from a derived `DecisionPacket`
- **AND** a fake-Joern client returns one normalized `EvidencePacket` for one known template
- **AND** semantic events replay to the same `DecisionPacket` twice
- **AND** the `WorkbenchSnapshot` version changes after evidence is scored.

#### Scenario: Golden slice reports runtime yield
- **WHEN** the loop completes
- **THEN** `RunSummary` reports search/index time, proof time, cache hit or miss, and useful evidence count
- **AND** Dispatch/FoldKit renders refreshed snapshot or feed state from projections
- **AND** no Kubernetes apply is required.
