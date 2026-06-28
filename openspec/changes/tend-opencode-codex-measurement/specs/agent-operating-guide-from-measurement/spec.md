## ADDED Requirements

### Requirement: Measurement produces store-projected sanitized reports
The system SHALL produce sanitized measurement reports under
`reports/tend-opencode-codex-measurement/` as projections from DB-backed
framework observations and SHALL NOT include raw prompts, secrets, full
private traces, raw trace rows, full command output, or full conversation text.

#### Scenario: Required reports are produced
- **WHEN** the measurement workflow completes or reaches a safe stopping point
- **THEN** it produces
  `reports/tend-opencode-codex-measurement/historical-baseline.md`
- **AND** it produces
  `reports/tend-opencode-codex-measurement/command-ladder.md`
- **AND** it produces
  `reports/tend-opencode-codex-measurement/codex-opencode-micro-experiment.md`
- **AND** it produces
  `reports/tend-opencode-codex-measurement/tend-opencode-measurement-report.md`
- **AND** it produces
  `reports/tend-opencode-codex-measurement/AGENTS.proposed.md`
- **AND** each report can identify the measurement session and relevant
  observation IDs used as projection input

#### Scenario: Reports remain private-text safe
- **WHEN** reports summarize harness proof, command observations, trace
  inventory, lifecycle health, or micro-experiment findings
- **THEN** they use bounded summaries, aggregate counts, command names,
  durations, exit codes, timestamps, safe token/tool metrics, high-level
  findings, observation IDs, and store emission statuses
- **AND** they do not include raw prompts, full conversations, secrets, raw
  session dumps, raw trace rows, raw private trace dumps, or full command
  transcripts

### Requirement: Final report answers migration readiness questions
The final measurement report SHALL answer whether the system is ready to begin
the heavy recipe-only LS-guided migration using DB-backed measurement evidence.

#### Scenario: Success criteria are answered
- **WHEN** `reports/tend-opencode-codex-measurement/tend-opencode-measurement-report.md`
  is produced
- **THEN** it answers whether Codex successfully invoked `tend-opencode`
  externally
- **AND** it answers whether `tend-opencode` proved the full plugin suite was
  loaded
- **AND** it answers whether the framework-managed local recipe store was
  healthy for full measurement
- **AND** it answers whether command observation captured useful validation
  timing data in the framework store
- **AND** it answers whether historical Codex traces exposed repeated
  expensive command patterns through sanitized aggregate observations
- **AND** it answers whether the micro-experiment showed measurable improvement
  in command discipline or context usage
- **AND** it answers whether the repository is ready to attempt the heavy
  recipe-only LS-guided migration

#### Scenario: Remaining gaps are explicit
- **WHEN** any required evidence is missing, inconclusive, or unsafe to collect
- **THEN** the final report lists the measurement gap
- **AND** it recommends the smallest follow-up needed before the migration
  decision is revisited
- **AND** it identifies whether the gap is harness proof, framework store
  health, SQL validation, observation emission, projection, or privacy related

### Requirement: Draft AGENTS guidance is derived from measurement projections
The system SHALL produce `AGENTS.proposed.md` as a draft operating guide based
on measured command discipline and framework-store projection evidence.

#### Scenario: Proposed guide teaches harnessed migration discipline
- **WHEN** `AGENTS.proposed.md` is produced
- **THEN** it teaches agents to use `tend-opencode fingerprint` and
  `tend-opencode run-harness-test` before measurement or harnessed migrations
- **AND** it teaches agents that framework-runtime owns local recipe store
  lifecycle
- **AND** it teaches agents to use `trellis-ls diagnostics` before broad edits
- **AND** it teaches agents to use `trellis-ls fixes` and `apply --mode diff`
  before manual repair
- **AND** it teaches agents to use `tend-opencode observe` for expensive
  commands
- **AND** it teaches agents to prefer package-local checks before workspace
  checks
- **AND** it teaches agents to treat `workspace:policy-fast` as final
  confirmation for future migration work rather than as a reflex
- **AND** it teaches agents to never use global OpenCode for Attune measurement
- **AND** it teaches agents to never dump raw Codex/OpenCode traces into
  reports or the framework store
- **AND** it teaches agents to route architecture changes through OpenSpec and
  recipes

#### Scenario: Root agent contract is not silently replaced
- **WHEN** `AGENTS.proposed.md` is produced
- **THEN** the implementation treats it as a draft report artifact
- **AND** it does not overwrite the root `AGENTS.md`
- **AND** it names any human-review step needed before promotion

### Requirement: Entrypoint and lifecycle ownership debt is tracked in reports
The measurement SHALL track legacy OpenCode entrypoint references and database
lifecycle ownership drift when they affect measurement guidance.

#### Scenario: Legacy references are summarized
- **WHEN** the implementation scans measurement docs, specs, scripts, and prior
  harness change artifacts for old OpenCode entrypoint references
- **THEN** the final report lists legacy `attune-opencode` references that were
  found
- **AND** it distinguishes prior-history references from live measurement
  workflow drift
- **AND** live measurement workflow drift is fixed to `tend-opencode`

#### Scenario: Tend-owned lifecycle drift is summarized
- **WHEN** the implementation scans command help, docs, specs, scripts, and
  reports for Tend-owned DB lifecycle commands
- **THEN** it reports any `tend-opencode db up`, `db down`, `db migrate`, or
  `db validate` references as lifecycle ownership drift
- **AND** it replaces live lifecycle guidance with framework-runtime local
  store commands or RecipeInvocation-backed Nx targets
