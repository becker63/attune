## ADDED Requirements

### Requirement: Export preview after promotion
The system SHALL generate an export preview when a valid measured candidate is promoted.

#### Scenario: Promote candidate
- **WHEN** a valid measured candidate is promoted by a human
- **THEN** the system shall append `rule_candidate.promoted` and generate an export preview

### Requirement: Native ast-grep artifacts
The export preview SHALL contain clean native repository artifacts for ast-grep.

#### Scenario: Preview artifact set
- **WHEN** an export preview is generated
- **THEN** it shall include native ast-grep rule content and positive and negative test fixture file previews

### Requirement: Private lineage boundary
The export preview SHALL NOT include private product lineage by default.

#### Scenario: Exclude intermediate history
- **WHEN** export preview files are shown
- **THEN** they shall omit agent attempts, false-positive labels, rejected candidates, intermediate measurements, reviewer notes, prompts, and raw provider responses

### Requirement: Clean repo artifact principle
The system SHALL distinguish accepted repository artifacts from Attune's private review history.

#### Scenario: Show export boundary
- **WHEN** the user views the export preview
- **THEN** the UI shall make clear which clean artifacts would enter the repository and which lineage remains private to Attune
