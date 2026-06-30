## ADDED Requirements

### Requirement: Packet clears are scored by exact target identity
The system SHALL score packet clears using exact target diagnostic identity
instead of rule-family counts or aggregate safe-fix counts.

#### Scenario: Exact diagnostic target clears
- **WHEN** a hidden evaluator compares a finished arm against a fixed packet target
- **THEN** a diagnostic is counted as cleared only when the same evaluator ID,
  profile, rule, source path, stable range fingerprint, and diagnostic identity
  from the target are absent from the hidden result
- **AND** same-rule diagnostics outside the target identity are reported as
  incidental context rather than primary packet clears

#### Scenario: Aggregate safe-fix count is not primary progress
- **WHEN** a packet target has a representative item and an aggregate safe-fix count
- **THEN** the scorer MUST NOT convert the aggregate safe-fix count into cleared
  diagnostics unless every safe-fix instance is represented by an exact target
  item

### Requirement: Source scope is part of primary scoring
The system SHALL distinguish allowed source migration scope from evaluator,
framework, measurement, generated, report, OpenSpec, and other incidental edits.

#### Scenario: Out-of-scope cleanup does not win the primary score
- **WHEN** an arm clears diagnostics outside the allowed benchmark source scope
- **THEN** those clears are reported as incidental hidden improvement
- **AND** they do not count toward primary validated packet clears or the
  10x-20x token-efficiency target band

#### Scenario: Scope policy is visible
- **WHEN** a loop selects a packet or packet set
- **THEN** the loop observation records the allowed source scope, excluded
  scopes, and how out-of-scope edits will affect scoring

### Requirement: Reasoning burden is part of benchmark scoring
The system SHALL classify packet clears by reasoning burden so the final 20x
goal cannot be satisfied by trivial autofix-only throughput.

#### Scenario: Autofix-only clears are separated
- **WHEN** a packet clear comes from an obvious local safe fix that requires no
  repository inspection or migration strategy
- **THEN** the scorer reports it as autofix-only progress
- **AND** it does not count as reasoning-bearing evidence for the 20x goal

#### Scenario: Reasoning-bearing clears count toward the goal
- **WHEN** a packet clear requires source inspection, Effect context/error
  reasoning, cross-file dependency interpretation, control-flow repair, or
  validation-led adjustment
- **THEN** the scorer reports it as reasoning-bearing progress
- **AND** it can contribute to the final 20x goal when exact hidden target
  identity and source-scope checks pass

#### Scenario: Reasoning weights are pre-registered
- **WHEN** a loop uses reasoning-weighted scoring
- **THEN** the weighting policy is registered before result knowledge
- **AND** the report shows unweighted exact reasoning-bearing clears alongside
  weighted metrics
- **AND** weighted metrics cannot override source-scope failures, holdout
  failures, negative-control failures, or low precision

### Requirement: Primary target score is precision-adjusted and all-in
The system SHALL compute the primary 10x-20x target status from all-in token
costs and precision-adjusted reasoning-bearing clears.

#### Scenario: Primary score is computed
- **WHEN** a loop reports target status
- **THEN** the primary improvement multiple uses reasoning-bearing exact clears
  per all-in token cost, adjusted for precision penalties
- **AND** combined, autofix-only, cache-normalized, and reasoning-weighted
  multiples are reported as secondary context

#### Scenario: Gaming behavior lowers score
- **WHEN** an arm changes out-of-scope files, suppresses diagnostics, deletes
  target code without replacement, introduces new diagnostics, fails validation,
  or touches negative controls
- **THEN** the scorer lowers the precision-adjusted score or blocks promotion
  according to the pre-registered scoring policy

### Requirement: Trace telemetry is normalized across runtimes
The system SHALL normalize Codex and OpenCode trace telemetry so token, tool,
patch, validation, and command-family metrics are comparable and missing data is
explicit.

#### Scenario: Codex patch events are counted
- **WHEN** Codex emits an `apply_patch` event as `custom_tool_call`
- **THEN** the benchmark telemetry records the patch call, bounded affected file
  metadata, and privacy summary without storing raw patch text

#### Scenario: Token cache semantics are explicit
- **WHEN** OpenCode and Codex token telemetry are projected together
- **THEN** the projection records all-in token totals, input tokens, output
  tokens, reasoning tokens, cached input/read tokens, and cache semantics
- **AND** cache-normalized metrics are either computed explicitly or marked not
  measured with a reason

### Requirement: Scorer self-checks guard credibility
The system SHALL run scorer self-checks before a benchmark loop can be promoted
as credible target evidence.

#### Scenario: Inconsistent packet target blocks credibility
- **WHEN** a packet target stores fewer exact items than its safe-fix or target
  diagnostic count
- **THEN** the scorer marks the loop target status as not credible
- **AND** the report identifies the inconsistent target fields

#### Scenario: Hidden and projected clears disagree
- **WHEN** projected packet clears exceed exact hidden target clears
- **THEN** the scorer marks the loop target status as not credible
- **AND** it emits the mismatch as a target-status blocker
