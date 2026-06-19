## ADDED Requirements

### Requirement: Constrained report actions
Attune SHALL model Workbench Scribe output as constrained report actions rather than arbitrary React, MDX components, or unvalidated layout code.

#### Scenario: Scribe writes a live report
- **WHEN** the Scribe receives a workbench/report snapshot
- **THEN** it emits a typed `ReportAction`
- **AND** that action uses only registered section templates, evidence IDs, scene IDs, and schema-decoded props.

### Requirement: Report events are replayable
Attune SHALL record report actions as report events that can be replayed independently from domain discovery events.

#### Scenario: Live report is reconstructed
- **WHEN** report events are replayed
- **THEN** the report projection reconstructs created sections, pinned evidence, narrative updates, and scene selection deterministically.

### Requirement: Scribe may explain but not invent facts
The Workbench Scribe SHALL only arrange and explain facts already present in the server-derived snapshot.

#### Scenario: Evidence is pinned
- **WHEN** a `pinEvidence` report action references an evidence ID
- **THEN** that evidence ID must exist in the current snapshot
- **AND** unsupported references are rejected before projection.

### Requirement: Report agent reliability boundary
The Workbench Scribe SHALL compose, summarize, and arrange existing facts; it SHALL NOT define new runtime behavior, invent facts, own async state, or mutate durable state outside validated report events.

#### Scenario: Scribe emits UI-facing output
- **WHEN** the local report agent emits output for the workbench
- **THEN** the output is a typed `ReportAction`
- **AND** it does not contain runtime-generated React, arbitrary executable MDX, unvalidated props, hidden state, direct database writes, or direct command mutations.

#### Scenario: Runtime validation handles invalid output
- **WHEN** report-agent output references an evidence ID, section ID, scene ID, component name, prop, or layout that is not allowed by the current snapshot and schema grammar
- **THEN** validation rejects the output before projection
- **AND** FoldKit does not render the invalid output.

### Requirement: Agent-generated frontend is composition, not architecture
Attune SHALL treat report-agent UI generation as composition inside a predesigned typed component/report grammar, not as agent ownership of frontend architecture.

#### Scenario: Run-specific report layout is produced
- **WHEN** a run needs a finding summary, evidence cluster, source/sink path card, plateau timeline, near-miss comparison, or rule-candidate panel
- **THEN** the Scribe selects from registered templates/components and schema-validated props
- **AND** it does not create new components, data dependencies, async state machines, or application behavior at runtime.

### Requirement: Workbench snapshot includes report projection
Attune SHALL include the current report projection in `WorkbenchSnapshot` so FoldKit can render the live explanation without running report-agent logic in the frontend.

#### Scenario: FoldKit renders live briefing
- **WHEN** FoldKit receives a `WorkbenchSnapshot`
- **THEN** it can render report sections, pinned evidence, narrative text, and selected scene from the snapshot.
