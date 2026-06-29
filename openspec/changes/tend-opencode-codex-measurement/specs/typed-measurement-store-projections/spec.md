## ADDED Requirements

### Requirement: SQL type-safety is preserved for measurement storage
The system SHALL use the existing SQL route and validation surfaces for
measurement observation storage and projection queries.

#### Scenario: Framework schemas are preserved
- **WHEN** measurement storage and projection support is implemented
- **THEN** it preserves the schema names `framework_core`, `framework_event`,
  and `framework_view`
- **AND** it uses `framework_event.recipe_observation` for measurement
  observations before adding product-specific DB tables
- **AND** it does not reintroduce SQLite, Drizzle, PgTyped, or package-local
  generated companion ledgers as live measurement inputs

#### Scenario: Measurement SQL statements are validated
- **WHEN** SQL validation runs for the framework recipe receipt spine
- **THEN** it validates inserting measurement observations
- **AND** it validates querying observations by measurement session
- **AND** it validates querying command observations by recipe ID
- **AND** it validates querying command observations by Nx target
- **AND** it validates querying command observations by generic target ID and
  measurement phase
- **AND** it validates querying observations by observation kind
- **AND** it validates querying harness proof observations
- **AND** it validates querying lifecycle health observations
- **AND** it validates querying report projection inputs

### Requirement: Typed projection helpers back reports
The system SHALL expose typed query/read-model helpers for measurement report
projection rather than relying on cache files as source truth.

#### Scenario: Reports query typed projection helpers
- **WHEN** a report generator produces command ladder, historical baseline,
  micro-experiment, final measurement, or `AGENTS.proposed.md` output
- **THEN** it queries typed projection helpers backed by the framework runtime
  store boundary
- **AND** the helper returns sanitized records keyed by measurement session,
  observation kind, recipe ID, Nx target, or observation ID as needed
- **AND** the helper returns sanitized observation timelines, safe trace totals,
  duration summaries, success/failure rates, target/recipe coverage counts,
  store-emission coverage, and diagnostic latency when available
- **AND** the helper returns selected comparable baseline session summaries
  and selected-baseline-vs-treatment comparisons when available
- **AND** the helper returns controlled baseline phase metrics and safe
  aggregate token/tool counts when available
- **AND** the helper returns phase-level generic agent metrics and
  migration-readiness gate summaries when available
- **AND** the report generator does not query raw Postgres directly from
  product code

#### Scenario: Report projection observations are emitted
- **WHEN** a markdown or JSON report is generated under
  `reports/tend-opencode-codex-measurement/`
- **THEN** the system emits or prepares a `measurement.report.projected`
  observation
- **AND** the observation records report path, measurement session ID,
  projection input observation IDs, generated timestamp, and privacy summary
- **AND** the report file remains an export/cache artifact

### Requirement: Projection queries support operational comparison
The typed projection layer SHALL support the measurement comparisons required
by the command ladder and micro-experiment.

#### Scenario: Command observations can be selected by operational identity
- **WHEN** projection helpers query command observations
- **THEN** they can select by measurement session ID
- **AND** they can select by inferred recipe ID when available
- **AND** they can select by inferred Nx target when available
- **AND** they can select by generic target ID for non-Nx producer commands
- **AND** they can select by measurement phase so one controlled baseline phase
  can be compared with treatment observations in the same session
- **AND** they can select by `measurement.command.observed` observation kind

#### Scenario: Health and proof observations can be selected
- **WHEN** projection helpers prepare measurement preflight and final reports
- **THEN** they can select harness proof observations
- **AND** they can select framework local store lifecycle health observations
- **AND** they can select SQL validation evidence observations
- **AND** they can select trace inventory and micro-experiment summary
  observations
- **AND** they can select `measurement.agent.metrics.summary` observations by
  measurement phase
- **AND** they can select `measurement.migration-readiness.summary`
  observations for final readiness reports
