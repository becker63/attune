## ADDED Requirements

### Requirement: Tend command observation runs through `tend-opencode`
The system SHALL measure validation commands by running them through
`nix run .#tend-opencode -- observe --format json -- <command...>`.

#### Scenario: Observed command emits safe JSON
- **WHEN** a measurement command is executed through
  `nix run .#tend-opencode -- observe --format json -- <command...>`
- **THEN** stdout is one parseable JSON observation document
- **AND** the document includes command, cwd, startedAt, completedAt,
  durationMs, exitCode, bounded stdout summary, bounded stderr summary,
  inferred Nx target when available, inferred recipe ID when available,
  observation ID, and `rawOutputStored: false`

#### Scenario: Raw output is not stored
- **WHEN** the observed command writes stdout or stderr
- **THEN** the observation stores bounded summaries rather than full raw output
- **AND** secret-shaped values are redacted from summaries
- **AND** the measurement report does not embed the full command output

### Requirement: Required validation ladder is observed
The system SHALL collect Tend observations for the required validation ladder
commands before producing the command ladder report.

#### Scenario: Required commands are measured
- **WHEN** the command ladder benchmark runs
- **THEN** it observes
  `pnpm exec nx run framework-language-service:typecheck --output-style=static`
- **AND** it observes
  `pnpm exec nx run framework-language-service:test --output-style=static`
- **AND** it observes
  `pnpm exec nx run tend-opencode:test --output-style=static`
- **AND** it observes
  `pnpm exec nx run workspace:recipe-substrate-check --output-style=static`
- **AND** it observes
  `pnpm exec nx run workspace:policy-fast --output-style=static`

#### Scenario: Command observations are stored locally
- **WHEN** a required ladder command finishes
- **THEN** the implementation stores its observation JSON under
  `.attune/cache/measurement/commands/`
- **AND** the stored observation keeps `rawOutputStored: false`
- **AND** the stored observation can be summarized without requiring the raw
  command transcript

### Requirement: Observations remain linked to recipe semantics
Command observations SHALL preserve links to RecipeReceipt and
RecipeObservation semantics without introducing a second ledger.

#### Scenario: Recipe identity is inferred when available
- **WHEN** an observed command maps to a known Nx target or recipe validation
  surface
- **THEN** the observation records the inferred Nx target
- **AND** the observation records the inferred recipe ID when available
- **AND** the measurement does not write raw EventLog events or a separate
  durable ledger

#### Scenario: Unknown recipe identity remains explicit
- **WHEN** an observed command cannot be mapped to a recipe ID
- **THEN** the observation keeps the command measurement
- **AND** the report marks the recipe ID as unknown rather than inventing a
  compatibility ontology
