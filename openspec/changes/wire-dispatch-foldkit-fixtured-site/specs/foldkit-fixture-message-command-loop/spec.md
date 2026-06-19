# foldkit-fixture-message-command-loop

## ADDED Requirements

### Requirement: Fixture messages return typed commands

The FoldKit update loop MUST handle fixture start, step, applied, failed, server snapshot, anchor selection, and promotion messages. Start requests MUST return `StartFixtureRun`; step, anchor, proof, findings, and promotion requests MUST return exactly one `AdvanceFixtureStep` command for the deterministic transition.

#### Scenario: start request enters loading state

- **WHEN** `FixtureStartRequested` is handled
- **THEN** the model records `fixture:start`, sets route status to `loading`, clears route errors, and returns `StartFixtureRun`.

#### Scenario: applied result refreshes model state

- **WHEN** `FixtureStepApplied` is handled
- **THEN** `serverSnapshot`, selected run, selected anchor, route events, trace, summary, route status, and pending command are updated from the typed result.

#### Scenario: existing promotion action advances the fixture

- **WHEN** the existing Promote rule action emits `RequestedPromotion`
- **THEN** the update loop records the selected hypothesis and returns `AdvanceFixtureStep({ step: "request-promotion" })`.
