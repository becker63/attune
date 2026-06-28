## ADDED Requirements

### Requirement: Codex orchestrates external Tend/OpenCode
The experiment SHALL treat Codex as the orchestrator and `tend-opencode` as an
external measured harness subprocess that emits observations to the framework
store.

#### Scenario: Codex invokes the harness externally
- **WHEN** the treatment experiment begins
- **THEN** Codex runs `nix run .#tend-opencode -- ...` commands as subprocesses
  from the Attune checkout
- **AND** the experiment records those commands as external harness calls
- **AND** it does not assume Codex and OpenCode share internal session state
- **AND** Tend/OpenCode does not administer the local recipe store lifecycle

#### Scenario: Uncontrolled nested sessions are forbidden
- **WHEN** the experiment needs deterministic harness evidence
- **THEN** it uses fingerprint, run-harness-test, debug info, doctor, observe,
  and safe decoding/reporting commands
- **AND** it does not launch uncontrolled nested OpenCode model sessions
- **AND** it does not call external LLMs as part of deterministic tests

### Requirement: Micro-experiment compares baseline and treatment observations
The system SHALL run a controlled, non-destructive migration-analysis
experiment for `packages/trellis/language-service` and SHALL store baseline
and treatment metrics as generic measurement observations.

#### Scenario: Baseline mode is measured
- **WHEN** the baseline mode runs
- **THEN** the task is exactly to analyze
  `packages/trellis/language-service` and report what remains before it can
  dogfood recipe-only source migration
- **AND** the baseline does not edit files
- **AND** the baseline does not require `tend-opencode` preflight
- **AND** the baseline does not require the `trellis-ls` diagnostic-first loop
- **AND** the measurement records file reads, shell commands, repeated
  commands, failed commands, expensive checks, wall time, token/context metrics
  when available, and quality of findings as observations or export-only
  projections

#### Scenario: Treatment mode begins with DB-backed proof chain
- **WHEN** the treatment mode runs
- **THEN** it begins with `nix run .#tend-opencode -- fingerprint --format json`
- **AND** it runs `nix run .#tend-opencode -- run-harness-test --format json`
- **AND** it refuses to continue unless the harness proof gate passes
- **AND** it refuses to continue unless the framework local store is healthy
- **AND** it creates or records a `measurement.session.started` observation
- **AND** it stores the Trellis LS diagnostic observation before treatment
  analysis
- **AND** it stores expensive validation command observations during treatment

#### Scenario: Treatment mode observes Trellis diagnostics
- **WHEN** the treatment mode analyzes recipe-only migration readiness
- **THEN** it runs
  `nix run .#tend-opencode -- observe --format json -- trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`
- **AND** it prefers the Trellis diagnostics, fixes, `apply --mode diff`, and
  check ladder before broad manual file inspection
- **AND** it records every expensive validation command through Tend command
  observation and the shared framework observation sink

### Requirement: Micro-experiment comparison is evidence-based
The system SHALL compare baseline and treatment results using command,
timing, context, and finding-quality metrics stored in or projected from the
framework store.

#### Scenario: Metrics are compared
- **WHEN** both baseline and treatment modes complete or fail safely
- **THEN** the comparison includes total shell commands, repeated commands,
  failed commands, expensive checks, `workspace:policy-fast` count when
  measured, time to useful diagnostic, token/context metrics when available,
  quality of migration next-step plan, and whether raw context use decreased
- **AND** the comparison report is generated from stored observations rather
  than cache files as durable truth

#### Scenario: Expected migration findings are checked
- **WHEN** the experiment evaluates finding quality
- **THEN** it checks whether the analysis identifies that authored
  `attune.package.ts` remains or has legacy equivalent debt
- **AND** it checks whether the analysis identifies CLI core ownership of too
  much diagnostic/fix ontology
- **AND** it checks whether the analysis identifies that recipes are not yet
  the single authored declaration
- **AND** it checks whether the analysis identifies that recipe-only migration
  needs deeper repair coverage
- **AND** it checks whether the analysis identifies that `trellis-ls` should
  become the migration machine

#### Scenario: Recommendation is bounded by evidence
- **WHEN** the treatment does not improve command discipline or context usage
  enough to justify the heavy migration
- **THEN** the final report recommends additional measurement or harness work
  instead of starting the heavy recipe-only migration
- **AND** it lists the evidence gaps that blocked the recommendation
