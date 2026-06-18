## ADDED Requirements

### Requirement: Event-sourced lifecycle

The system SHALL represent the rule authoring lifecycle as domain events and derive workbench state from event projection.

#### Scenario: Project candidate and measurement

- **WHEN** a stream contains `rule_candidate.generated` and `astgrep_run.completed` events
- **THEN** the projection shall include candidate intent, examples, native rule content, match count, findings, and measurement status

#### Scenario: Project finding label

- **WHEN** a stream contains a finding label event for an existing finding
- **THEN** the projection shall update the finding review state and derived true-positive, false-positive, ignored, and unreviewed counts

### Requirement: Event envelopes

The system SHALL wrap appended events in envelopes containing event id, stream id, sequence, type, version, metadata, and creation time.

#### Scenario: Append events to stream

- **WHEN** events are appended to a stream with an expected sequence
- **THEN** the event store shall return envelopes with monotonically increasing stream sequence values

### Requirement: Fixture and in-memory stores

The system SHALL provide fixture-backed and in-memory event store implementations for the spike.

#### Scenario: Read typed scenario events

- **WHEN** a fixture-backed event store is initialized from a typed scenario
- **THEN** reading the scenario stream shall return the scenario events as event envelopes

#### Scenario: Append interaction events

- **WHEN** a user interaction emits a valid command during local development
- **THEN** the in-memory event store shall append the resulting events and make them available to projection

### Requirement: Promotion invariants

The command handler SHALL reject promotion when the candidate is missing required evidence.

#### Scenario: Reject promotion missing native rule

- **WHEN** `PromoteRuleCandidate` is handled for a candidate without valid native ast-grep YAML
- **THEN** the command handler shall fail without appending `rule_candidate.promoted`

#### Scenario: Reject promotion missing examples

- **WHEN** `PromoteRuleCandidate` is handled for a candidate without both required examples
- **THEN** the command handler shall fail without appending `rule_candidate.promoted`
