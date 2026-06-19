## ADDED Requirements

### Requirement: Bounded proof catalog
The system SHALL project the proof router into a bounded agent-facing catalog that only permits known template IDs, known template versions, and schema-checked bindings.

#### Scenario: Agent chooses a known template
- **WHEN** an agent emits a `run_joern_template` decision with a known template ID and schema-valid bindings
- **THEN** the validator accepts the decision for routing if referenced hypothesis, anchor, and budget state are valid

#### Scenario: Agent invents a template
- **WHEN** an agent emits a `run_joern_template` decision with an unknown template ID or version
- **THEN** the validator rejects the decision before Joern execution

### Requirement: No arbitrary query text
The agent-facing surface SHALL NOT accept arbitrary Joern query text, raw traversal programs, raw CPGQL snippets, or ad hoc Graphology materialization code from the agent.

#### Scenario: Agent includes query text
- **WHEN** an agent decision includes a raw query string or traversal program field
- **THEN** schema decoding or validation rejects the decision
- **AND** the rejection explains that the agent must choose a known proof template

#### Scenario: Procedure internally renders query text
- **WHEN** a validated template invocation executes
- **THEN** query text may be rendered internally from the procedure query plan
- **AND** the rendered query text is not treated as user-authored input

### Requirement: Dumb-agent guidance
The agent catalog SHALL include enough structured guidance for a low-capability agent to choose a template without inferring hidden conventions.

#### Scenario: DecisionPacket includes proof options
- **WHEN** a `DecisionPacket` includes available Joern proof options
- **THEN** each option includes a template ID, title, short summary, allowed binding fields, binding descriptions, examples, expected evidence status, cost class, limitations, and validation hints

#### Scenario: Binding requires an anchor
- **WHEN** a template binding must reference an existing anchor or hypothesis
- **THEN** the agent catalog represents that binding as an allowed reference type with valid IDs supplied by the current packet

#### Scenario: Template has observed reliability data
- **WHEN** Axiom-backed execution data exists for a proof template
- **THEN** the agent catalog includes compact observed evidence hints such as supported syntax flavors, high-signal query families, known failure classes, and cost/row-count notes
- **AND** the hints remain advisory and do not let the agent bypass schema validation

#### Scenario: Recipe has design-pressure priority
- **WHEN** a proof recipe is prioritized because Axiom showed high yield, fragility, or hard-to-reach behavior
- **THEN** the agent catalog exposes the priority reason as structured guidance
- **AND** the agent catalog still exposes only known recipe IDs and bounded schema-backed axes

#### Scenario: Recipe is only supporting inventory
- **WHEN** a proof recipe is classified as supporting inventory rather than primary proof
- **THEN** the agent catalog labels it as context-gathering support
- **AND** the catalog recommends higher-priority graph, source/sink, boundary, finding, protocol, or JSX/TSX recipes when their preconditions are satisfied

### Requirement: Decision validation
The proof agent surface SHALL validate template decisions against current run state, known IDs, template schemas, budget state, and repeated-decision policy.

#### Scenario: Decision references missing hypothesis
- **WHEN** an agent decision references a hypothesis ID that does not exist in the current run state
- **THEN** validation rejects the decision with a typed reason

#### Scenario: Decision exceeds budget
- **WHEN** an agent decision would exceed the proof budget for the current run
- **THEN** validation rejects or defers the decision before Joern execution
