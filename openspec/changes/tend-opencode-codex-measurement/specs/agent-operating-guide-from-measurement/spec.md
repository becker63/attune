## ADDED Requirements

### Requirement: Measurement produces sanitized reports
The system SHALL produce sanitized measurement reports under
`.attune/cache/measurement/reports/` and SHALL NOT include raw prompts,
secrets, full private traces, or full conversation text.

#### Scenario: Required reports are produced
- **WHEN** the measurement workflow completes or reaches a safe stopping point
- **THEN** it produces
  `.attune/cache/measurement/reports/historical-baseline.md`
- **AND** it produces
  `.attune/cache/measurement/reports/command-ladder.md`
- **AND** it produces
  `.attune/cache/measurement/reports/codex-opencode-micro-experiment.md`
- **AND** it produces
  `.attune/cache/measurement/reports/tend-opencode-measurement-report.md`
- **AND** it produces
  `.attune/cache/measurement/reports/AGENTS.proposed.md`

#### Scenario: Reports remain private-text safe
- **WHEN** reports summarize harness proof, command observations, trace
  inventory, or micro-experiment findings
- **THEN** they use bounded summaries, aggregate counts, command names,
  durations, exit codes, timestamps, safe token/tool metrics, and high-level
  findings
- **AND** they do not include raw prompts, full conversations, secrets, raw
  session dumps, or full command transcripts

### Requirement: Final report answers migration readiness questions
The final measurement report SHALL answer whether the system is ready to begin
the heavy recipe-only LS-guided migration.

#### Scenario: Success criteria are answered
- **WHEN** `.attune/cache/measurement/reports/tend-opencode-measurement-report.md`
  is produced
- **THEN** it answers whether Codex successfully invoked `tend-opencode`
  externally
- **AND** it answers whether `tend-opencode` proved the full plugin suite was
  loaded
- **AND** it answers whether Tend command observation captured useful
  validation timing data
- **AND** it answers whether historical Codex traces exposed repeated
  expensive command patterns
- **AND** it answers whether the micro-experiment showed measurable improvement
  in command discipline or context usage
- **AND** it answers whether the repository is ready to attempt the heavy
  recipe-only LS-guided migration

#### Scenario: Remaining gaps are explicit
- **WHEN** any required evidence is missing, inconclusive, or unsafe to collect
- **THEN** the final report lists the measurement gap
- **AND** it recommends the smallest follow-up needed before the migration
  decision is revisited

### Requirement: Draft AGENTS guidance is derived from measurement
The system SHALL produce `AGENTS.proposed.md` as a draft operating guide based
on measured command discipline.

#### Scenario: Proposed guide teaches harnessed migration discipline
- **WHEN** `AGENTS.proposed.md` is produced
- **THEN** it teaches agents to use `tend-opencode fingerprint` and
  `tend-opencode run-harness-test` before measurement or harnessed migrations
- **AND** it teaches agents to use `trellis-ls diagnostics` before broad edits
- **AND** it teaches agents to use `trellis-ls fixes` and `apply --mode diff`
  before manual repair
- **AND** it teaches agents to use `tend-opencode observe` for expensive
  commands
- **AND** it teaches agents to prefer package-local checks before workspace
  checks
- **AND** it teaches agents to run `workspace:policy-fast` as final
  confirmation rather than as a reflex
- **AND** it teaches agents to never use global OpenCode for Attune measurement
- **AND** it teaches agents to never dump raw Codex/OpenCode traces into
  reports
- **AND** it teaches agents to route architecture changes through OpenSpec and
  recipes

#### Scenario: Root agent contract is not silently replaced
- **WHEN** `AGENTS.proposed.md` is produced
- **THEN** the implementation treats it as a draft report artifact
- **AND** it does not overwrite the root `AGENTS.md`
- **AND** it names any human-review step needed before promotion

### Requirement: Entrypoint debt is tracked in reports
The measurement SHALL track legacy OpenCode entrypoint references as debt when
they affect measurement guidance.

#### Scenario: Legacy references are summarized
- **WHEN** the implementation scans measurement docs, specs, scripts, and prior
  harness change artifacts for old OpenCode entrypoint references
- **THEN** the final report lists legacy `attune-opencode` references that were
  found
- **AND** it distinguishes prior-history references from live measurement
  workflow drift
- **AND** live measurement workflow drift is fixed to `tend-opencode`
