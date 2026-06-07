## ADDED Requirements

### Requirement: Rule candidate card
The system SHALL present every rule candidate as a rule card grounded in intent, examples, structural proxy, native deterministic rule content, measurement, labels, revision history, promotion state, known limits, and export preview state.

#### Scenario: Render complete candidate
- **WHEN** a candidate has intent, looks-like example, does-not-look-like example, native ast-grep YAML, structural proxy, and completed measurement
- **THEN** the Rule Workbench shall show the candidate intent, both examples, the structural proxy, the native rule, compact measurement status, compact findings summary, known limits, and lineage timeline

#### Scenario: Missing examples mark candidate invalid
- **WHEN** a candidate is missing either the looks-like example or the does-not-look-like example
- **THEN** the Rule Workbench shall mark the candidate invalid and block promotion

### Requirement: Workbench-first vertical slice
The first implementation slice SHALL prioritize the Rule Workbench artifact surface over complete secondary pages.

#### Scenario: Render narrow vertical slice
- **WHEN** the first fixture scenario is loaded
- **THEN** the system shall render fixture events, projection state, highlighted examples, highlighted deterministic rule, compact measurement, provenance timeline, and export preview path in the Workbench

#### Scenario: Defer full secondary pages
- **WHEN** Findings, Lineage, Exports, Discover, or Settings routes are outside the first slice
- **THEN** they may render route stubs or minimal acceptance paths while the Workbench artifact surface remains complete

### Requirement: Finding review commands
The system SHALL convert finding review actions into domain commands instead of mutating product truth directly.

#### Scenario: Mark finding false positive
- **WHEN** the user marks an unreviewed finding as false positive
- **THEN** the Findings page shall emit a `LabelFinding` command with label `false_positive`

#### Scenario: Ignore finding
- **WHEN** the user ignores an unreviewed finding
- **THEN** the Findings page shall emit a `LabelFinding` command with label `ignored`

### Requirement: Candidate promotion controls
The Rule Workbench SHALL emit promotion and revision commands from explicit human actions.

#### Scenario: Promote valid measured candidate
- **WHEN** the user promotes a candidate with required examples, valid native rule content, and completed measurement
- **THEN** the Rule Workbench shall emit a `PromoteRuleCandidate` command

#### Scenario: Block promotion without measurement
- **WHEN** the user attempts to promote a candidate without a completed measurement
- **THEN** the Rule Workbench shall not emit `PromoteRuleCandidate` and shall expose the promotion block reason

#### Scenario: Render default primary actions
- **WHEN** a measured candidate is open in the Rule Workbench
- **THEN** the primary candidate actions shall be `Revise rule` and `Promote rule`

### Requirement: Human-readable lineage
The Rule Workbench SHALL show a readable lineage timeline derived from domain events rather than raw event payloads.

#### Scenario: Render lineage from events
- **WHEN** candidate generation, measurement, labeling, revision, and promotion events exist
- **THEN** the Rule Workbench shall show a timeline explaining what happened, what changed, and why the candidate can be trusted or rejected
