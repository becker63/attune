## ADDED Requirements

### Requirement: Feed projections
Dispatch SHALL expose RSS, Atom, and JSON Feed projections from the same dispatch item stream.

#### Scenario: User subscribes to Dispatch
- **WHEN** a feed reader requests Dispatch output
- **THEN** the feed includes compact title, summary, timestamp, severity, links, and artifact references
- **AND** it does not embed heavy logs or raw artifacts.

### Requirement: Review and safety feeds
Dispatch SHALL expose focused feeds for human-review and safety-critical items.

#### Scenario: Safety gate is raised
- **WHEN** a safety item enters the Dispatch stream
- **THEN** it appears in the main feed
- **AND** it appears in the safety feed
- **AND** it includes the required human action.

### Requirement: Daily digest feed
Dispatch SHALL expose a daily digest feed summarizing accepted work, failures, blockers, and next actions.

#### Scenario: Daily digest is generated
- **WHEN** a digest item is produced
- **THEN** the digest feed includes shipped changes, blocked tasks, failed validation, fuzzer findings, budget posture, and human actions needed.
