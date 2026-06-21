## ADDED Requirements

### Requirement: Agents query Source BOM ownership before repeated-shape edits
Agents SHALL query Source BOM shard ownership before editing repeated,
generated, or template-like source shapes.

#### Scenario: A generator owns a shape
- **WHEN** Source BOM ownership identifies an `@attune/nx` generator or sync generator for a shape
- **THEN** the agent uses that generator path instead of hand-editing drift

#### Scenario: Source BOM ownership is missing or ambiguous
- **WHEN** a repeated or generated shape lacks clear Source BOM ownership
- **THEN** the agent reports the blocker or follow-up before guessing ownership
