## ADDED Requirements

### Requirement: Versioned hidden deterministic evaluators

The Python benchmark SHALL bind each frozen case to a versioned evaluator,
fixtures, hidden historical/mutation variants, negative controls, and scoring
rules. Evaluators SHALL run after result submission/finalization and SHALL not
disclose labels, post-fix diffs, mutation locations, or weights to agents.

#### Scenario: Agent submits research

- **WHEN** an arm finalizes a submission
- **THEN** the evaluator runs with the case's hidden fixture digest
- **AND** the agent receives no hidden labels before submission

### Requirement: Component-preserving quality evaluation

Evaluation SHALL retain localization, precision, recall, falsification, formal
utility, lowering quality, calibration, evidence trace, outcome honesty, and
repository-result coherence component scores. Composite acceptance MAY be
reported only with visible component metrics and versioned weights.

#### Scenario: Honest non-lowerability

- **WHEN** a submission correctly explains that no safe deterministic lowering
  exists
- **THEN** the evaluator can award calibration/outcome-honesty credit without
  requiring a manufactured rule

### Requirement: First motif family coverage

The benchmark SHALL provide snapshot-revalidation-under-writer-authority and
cancellation-safe-terminalization cases. Their hidden variants SHALL include
true instances and read-only, indirect-helper, decoy, correct-ordering, and
ignored-value controls as appropriate to the motif.

#### Scenario: Decoy snapshot comparison

- **WHEN** a submission treats a read-only decoy comparison as a mutation race
- **THEN** the evaluator records a precision failure rather than an accepted
  discovery
