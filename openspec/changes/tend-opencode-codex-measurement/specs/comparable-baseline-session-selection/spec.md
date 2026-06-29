## ADDED Requirements

### Requirement: Historical baseline can be narrowed to one comparable session
The measurement system SHALL derive a selected comparable historical baseline
session from safe trace metadata so the DB-backed treatment run can be compared
against one prior session rather than only against aggregate history.

#### Scenario: Historical traces are grouped by safe session identity
- **WHEN** Codex/OpenCode trace inventory runs
- **THEN** it groups historical metadata by safe session ID
- **AND** safe session IDs are non-sensitive IDs or deterministic hashes of
  raw IDs
- **AND** grouped session payloads use only allowed metadata: timestamps,
  command families, durations, exit codes, model IDs, token counts, tool-call
  counts, and high-level safe task labels when available
- **AND** grouped session payloads do not store raw prompts, full conversation
  text, raw trace rows, raw session dumps, secrets, raw stdout/stderr, or
  ambiguous text payloads

#### Scenario: Sessions are scored for comparability with the treatment
- **WHEN** historical session summaries are available
- **THEN** the system scores candidate sessions for similarity to the measured
  treatment task
- **AND** the score favors Attune/Trellis LS related command families
- **AND** the score favors sessions containing `framework-language-service`,
  `trellis-ls`, `recipe-substrate`, `tend-opencode`, or similar command-family
  signals
- **AND** the score favors sessions with enough command, duration, and
  exit-code samples to compare safely
- **AND** the score penalizes giant multi-day catchall sessions
- **AND** the score records human-readable safe score reasons

#### Scenario: Selected baseline session observations are emitted
- **WHEN** a comparable historical session is selected
- **THEN** the system emits or prepares a
  `measurement.baseline.session.selected` observation
- **AND** it emits or prepares a `measurement.baseline.session.summary`
  observation
- **AND** both observations are inserted through the framework observation sink
  by default
- **AND** both observations identify the measurement session, selected safe
  baseline session ID, selection score, selection reasons, and privacy summary

#### Scenario: Treatment is compared against selected baseline session
- **WHEN** final report projection runs
- **THEN** it compares the DB-backed treatment against the selected baseline
  session in addition to aggregate history
- **AND** the comparison includes selected baseline session ID hash, wall time,
  command count, repeated commands, failed commands, expensive checks, time to
  first useful diagnostic when inferable, duration p50/p95/max, token/tool
  counts when available, command success rate, and finding-quality comparison
- **AND** the report states whether the comparable-session baseline is strong
  enough to prepare for the heavy recipe-only migration test
- **AND** the recommendation keeps the heavy recipe-only migration paused when
  target/recipe identity, token/tool metrics, or comparable-session evidence
  remains weak

#### Scenario: Controlled baseline phase narrows comparison further
- **WHEN** commands in the same measurement session are observed with
  measurement phase `baseline`
- **THEN** report projection treats those command observations as the primary
  controlled baseline for the microbenchmark
- **AND** unphased or `treatment` command observations remain the treatment
  command set for backward compatibility with existing measurements
- **AND** aggregate historical trace inventory remains context rather than the
  primary microbenchmark baseline
- **AND** the controlled baseline and treatment comparison uses the same
  command observation schema, framework observation sink, target/recipe
  identity fields, duration metrics, exit codes, and safe token/tool aggregate
  fields
- **AND** the recommendation keeps the heavy migration paused when the
  controlled baseline is missing, has unknown target/recipe identity, or lacks
  safe token/tool aggregate metrics
