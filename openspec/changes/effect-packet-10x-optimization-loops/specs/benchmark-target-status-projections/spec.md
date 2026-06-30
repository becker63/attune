## ADDED Requirements

### Requirement: Every loop emits target status
The system SHALL emit a target-status observation and report projection after
every benchmark optimization loop.

#### Scenario: Target status is emitted
- **WHEN** any `quick-turn`, `pair-turn`, `full-ab`, or `audit` loop completes,
  fails, or stops early
- **THEN** the system emits a target-status observation containing loop kind,
  benchmark run ID, baseline, corrected clears, token totals, improvement
  multiple, 10x checkpoint status, 20x goal status, reasoning-bearing packet
  status, precision-adjusted status, holdout status, negative-control status,
  confidence, blocker, and recommended next loop kind

#### Scenario: Status is visible during autonomous work
- **WHEN** an agent runs loops repeatedly
- **THEN** each loop's target status is projected into the DB-backed report so
  progress toward the target is visible without reading raw traces

#### Scenario: Ten x is not reported as completion
- **WHEN** target status reports that the 10x checkpoint has been reached
- **THEN** it still reports the overall target as incomplete until the 20x goal
  passes with reasoning-bearing diagnostic evidence

### Requirement: Target status uses corrected metrics
The system SHALL derive target status from corrected exact scoring and
normalized telemetry rather than legacy packet clears.

#### Scenario: Legacy metric is not enough
- **WHEN** legacy `validated packet clears` disagrees with exact hidden target
  clears
- **THEN** target status uses exact hidden target clears and reports the legacy
  mismatch as a caveat

#### Scenario: Missing metric lowers confidence
- **WHEN** token, patch, validation, hidden judge, or scope data is missing
- **THEN** target status records the missing field and lowers confidence rather
  than treating the value as zero

#### Scenario: Reasoning-bearing evidence is separated
- **WHEN** a target-status projection summarizes clears
- **THEN** it separates autofix-only clears from reasoning-bearing clears
- **AND** a 20x goal pass requires reasoning-bearing clears from harder Effect
  diagnostic packets, not only mechanical safe-fix throughput

#### Scenario: Reasoning metrics are projected
- **WHEN** target status is projected
- **THEN** it includes `reasoning_bearing_clears_per_million_tokens`,
  `reasoning_weighted_clears_per_million_tokens`,
  `precision_adjusted_reasoning_bearing_multiple`,
  `combined_improvement_multiple`, `autofix_only_improvement_multiple`, and
  `holdout_confirmed_improvement_multiple`

#### Scenario: Candidate and credible results are distinct
- **WHEN** a loop reaches the 20x threshold without pre-registration, paired
  state, holdout confirmation, negative-control cleanliness, all-in accounting,
  or audit promotion
- **THEN** target status reports a candidate result
- **AND** it does not report an audit-promoted credible 20x claim

### Requirement: Target status is queryable through SQL routes
The system SHALL validate SQL routes for target-status and loop observations
through the existing framework SQL pipeline.

#### Scenario: Target status SQL validates
- **WHEN** `framework-runtime:db:validate-sql` runs
- **THEN** it validates inserting and querying target-status observations by
  benchmark run ID, loop ID, loop kind, baseline, packet ID, target status,
  10x checkpoint status, 20x goal status, reasoning-burden classification,
  pre-registration status, holdout status, precision-adjusted status,
  negative-control status, confidence, and measurement session ID

#### Scenario: Report projection inputs are queryable
- **WHEN** a target-status report is projected
- **THEN** the projection can query loop observations, exact target scoring,
  telemetry summaries, hidden judge results, and audit results from
  `framework_event.recipe_observation`

### Requirement: Target status preserves privacy
The system SHALL keep target-status observations and reports free of raw
prompts, conversations, trace rows, command output, patch text, raw diffs,
secrets, and full source files.

#### Scenario: Target status payload is sanitized
- **WHEN** target status is emitted
- **THEN** payloads contain bounded counts, paths, hashes, statuses,
  observation IDs, and privacy summaries only
