## ADDED Requirements

### Requirement: Linear clean slate before automation
Attune SHALL require a clean Linear workspace surface before automated issue projection begins.

#### Scenario: Linear automation starts
- **WHEN** Attune is ready to create or update Linear work items automatically
- **THEN** old unfinished project clutter is archived, removed, or bypassed by creating a new clean rollout project
- **AND** automation writes only into the approved clean project

### Requirement: Linear as human-facing ledger
Attune SHALL use Linear as a human-facing ledger rather than the durable source of truth.

#### Scenario: OptimizationPacket projects to Linear
- **WHEN** an OptimizationPacket requires human or agent work
- **THEN** Attune creates or updates a Linear issue containing source run IDs, evidence references, risk labels, required validation, owner expectations, and acceptance criteria
- **AND** durable event history remains in Attune storage and artifact references rather than only Linear comments

### Requirement: Linear validation evidence
Attune SHALL prevent Linear status from becoming accepted progress without validation evidence.

#### Scenario: Issue is marked done
- **WHEN** a Linear issue represents an Attune implementation or promotion task
- **THEN** the issue includes links or references to validation commands, run summaries, artifacts, or human acceptance notes
- **AND** high-risk issues require a human review marker before acceptance
