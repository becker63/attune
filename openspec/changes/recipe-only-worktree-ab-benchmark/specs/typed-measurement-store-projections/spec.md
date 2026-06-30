## ADDED Requirements

### Requirement: Benchmark projections are typed and DB-backed
The system SHALL expose typed projection helpers for benchmark runs, arms,
Codex telemetry, final judge results, and scorecards from the framework
runtime observation store.

#### Scenario: Scorecard reads from observations
- **WHEN** the benchmark scorecard is generated
- **THEN** it reads benchmark lifecycle, command, Codex telemetry, final judge,
  plan summary, and report projection observations by benchmark run ID and
  measurement session ID
- **AND** it does not read report files or local cache files as source truth

#### Scenario: Arm comparison is typed
- **WHEN** the projection compares benchmark arms
- **THEN** it returns typed records for each configured arm, including runtime,
  Trellis exposure, outcome metrics, cost metrics, safety violations, plan
  quality, validation status, and residual risk
- **AND** it includes frozen-evaluator outcome metrics, agent-local evaluator
  metrics, target-packet resolution metrics, token-efficiency ratios, and patch
  quality classifications

#### Scenario: Outcome-normalized token efficiency is projected
- **WHEN** benchmark reports render token metrics
- **THEN** they include tokens per hidden diagnostic cleared, hidden
  diagnostics cleared per million tokens, tokens per target packet item
  resolved, tokens per source-migration file, raw cluster tokens, primary
  thread tokens, subagent tokens, input tokens, output tokens, cached input
  tokens, and reasoning tokens when available
- **AND** they identify the token-efficiency leader only among arms in the
  comparable hidden-outcome band

### Requirement: SQL validation covers benchmark observations
The system SHALL extend the existing SQL route and validation surfaces for
benchmark observation insert and query paths.

#### Scenario: Benchmark SQL statements are validated
- **WHEN** framework-runtime SQL validation runs
- **THEN** it validates inserting benchmark lifecycle observations, Codex
  telemetry observations, final judge observations, and benchmark report
  projection observations
- **AND** it validates querying by benchmark run ID, arm ID, measurement
  session ID, observation kind, thread ID, and final judge status

#### Scenario: Framework schemas remain canonical
- **WHEN** benchmark storage is implemented
- **THEN** it preserves `framework_core`, `framework_event`, and
  `framework_view`
- **AND** it uses `framework_event.recipe_observation` before adding any
  product-specific benchmark tables

### Requirement: Benchmark reports are projections
The system SHALL generate benchmark markdown and JSON reports from typed DB
projections.

#### Scenario: Benchmark report projection is observed
- **WHEN** a benchmark report is generated under
  `reports/tend-opencode-codex-measurement/`
- **THEN** the system emits `measurement.report.projected` or
  `measurement.benchmark.report.projected` with report path, benchmark run ID,
  measurement session ID, input observation IDs, generated timestamp, and
  privacy summary

#### Scenario: Reports include telemetry provenance
- **WHEN** benchmark reports render token, tool, patch, command, or diagnostic
  metrics
- **THEN** each metric family identifies whether it came from command
  observations, Codex JSONL telemetry, Codex sqlite metadata, final judge
  observations, or manual review

#### Scenario: Evaluator contract is projected
- **WHEN** benchmark reports render final judge or token-efficiency metrics
- **THEN** they include the frozen evaluator root, commit, dirty-state count,
  command, package hash/version when available, lockfile hash when available,
  and whether diagnostic details came from full JSON or fallback parsing
