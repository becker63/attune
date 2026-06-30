## ADDED Requirements

### Requirement: Promotion-eligible loops are pre-registered
The system SHALL require pre-run registration before a benchmark loop can be
promoted as credible 10x-20x reasoning evidence.

#### Scenario: Loop registration is emitted before result knowledge
- **WHEN** a promotion-eligible benchmark loop starts
- **THEN** the system emits a registration observation before treatment results
  are available
- **AND** the registration includes loop ID, benchmark run ID, packet IDs or
  holdout commitments, diagnostic families, allowed files, excluded scopes,
  baseline, arms, budgets, validation ladder, stop rules, negative controls,
  scoring policy, and source-state fingerprints

#### Scenario: Post-start goalpost changes block promotion
- **WHEN** a loop changes packet set, source scope, baseline, stop rule,
  scoring policy, or validation ladder after registration
- **THEN** the system records the change as a caveat
- **AND** the loop cannot be audit-promoted unless a new loop is registered

### Requirement: Hidden holdouts confirm visible packet optimization
The system SHALL support seeded hidden holdout packets for credible 10x-20x
reasoning claims.

#### Scenario: Holdout commitment is registered
- **WHEN** a promotion-eligible loop selects packets
- **THEN** the system stores a deterministic seed, holdout selection policy, and
  holdout identity commitments before the treatment arm runs
- **AND** the agent-visible run context does not reveal full holdout contents
  before evaluation

#### Scenario: Holdout failure blocks the headline claim
- **WHEN** visible packets reach the 10x checkpoint or 20x goal but holdout
  packets do not confirm comparable improvement
- **THEN** target status reports a candidate visible result
- **AND** the 20x goal remains unpassed

### Requirement: Paired source state is enforced
The system SHALL ensure comparable benchmark arms start from paired source and
packet state.

#### Scenario: A/B arms start from the same state
- **WHEN** a comparable benchmark loop starts
- **THEN** each arm records the same base commit, dependency lock hash, packet
  inventory hash, allowed source-scope hash, and worktree/source-state
  fingerprint

#### Scenario: State drift lowers confidence
- **WHEN** an arm starts or resumes from a different source state without an
  explicit registered reason
- **THEN** target status lowers confidence or blocks promotion according to the
  registered scoring policy

### Requirement: Negative controls and precision penalties are scored
The system SHALL include negative controls and precision penalties in credible
benchmark scoring.

#### Scenario: Negative controls protect against broad cleanup
- **WHEN** a loop includes should-not-change files, out-of-scope diagnostics, or
  refusal-required packet targets
- **THEN** touching or clearing them as primary progress lowers precision and
  can block audit promotion

#### Scenario: Precision penalties are applied
- **WHEN** an arm introduces new diagnostics, suppresses diagnostics, deletes
  target code without replacement, changes out-of-scope files, fails validation,
  or touches negative controls
- **THEN** the scorer records a precision penalty and exposes both raw and
  precision-adjusted improvement multiples

### Requirement: All-in cost accounting is used
The system SHALL use all-in cost accounting for credible 10x-20x target status.

#### Scenario: All-in token ledger is complete
- **WHEN** target status computes an improvement multiple
- **THEN** it includes planning, retries, failed commands, subagents,
  validation, report projection, patch attempts, cache behavior, and tool calls
  when those fields are available
- **AND** missing cost fields lower confidence instead of being treated as zero

### Requirement: Aggregate statistics prevent best-run claims
The system SHALL report aggregate performance across pre-registered packet
classes rather than allowing a single best packet to carry the headline claim.

#### Scenario: Aggregate target status is projected
- **WHEN** multiple packet classes or diagnostic families are registered
- **THEN** the system reports median, geometric mean, and worst-quartile
  improvement multiples in addition to any best-run result

#### Scenario: Cross-family confirmation is required
- **WHEN** a 20x goal candidate comes from only one diagnostic family or one
  unusually easy packet
- **THEN** target status marks the result as not robust until additional
  pre-registered diagnostic families confirm the target band

### Requirement: Audit promotes candidates to credible claims
The system SHALL distinguish exploratory results, candidate results, and
audit-promoted credible claims.

#### Scenario: Audit promotes the result
- **WHEN** a loop reaches the 20x goal
- **THEN** only an audit loop can promote it to a credible claim
- **AND** the audit confirms pre-registration, paired state, holdout results,
  exact scoring, all-in costs, negative-control cleanliness, source-scope
  correctness, SQL provenance, privacy, and report projection
