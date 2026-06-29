## ADDED Requirements

### Requirement: Tend command observation is DB-first
The system SHALL measure validation commands by running them through
`nix run .#tend-opencode -- observe --format json -- <command...>` and SHALL
use the configured framework store as the durable observation sink by default.

#### Scenario: Observed command emits safe JSON and store identity
- **WHEN** a measurement command is executed through
  `nix run .#tend-opencode -- observe --format json -- <command...>`
- **THEN** stdout is one parseable JSON document
- **AND** the command is run exactly as requested
- **AND** the document includes command, argv, cwd, startedAt, completedAt,
  durationMs, exitCode, bounded stdout summary, bounded stderr summary,
  inferred Nx target when available, generic target ID when available,
  inferred recipe ID when available, measurement session ID when available,
  measurement phase when supplied, safe aggregate token/tool metrics when
  supplied by parseable JSON output, observation ID, store emission status, and
  `rawOutputStored: false`
- **AND** by default the observation ID identifies the `RecipeObservation`
  inserted through the framework runtime boundary
- **AND** explicit export-only or in-memory test modes are the only normal
  non-Postgres paths

#### Scenario: Cache JSON is export-only
- **WHEN** a required ladder command finishes
- **THEN** the durable command observation is stored in
  `framework_event.recipe_observation`
- **AND** any JSON under `.attune/cache/measurement/commands/` is an export or
  projection of stored observation data
- **AND** the cache file is not required as the source of truth for later
  reports

### Requirement: Command observation payload is privacy bounded
The command observation payload SHALL preserve operational command metrics
without storing raw command transcripts or private agent text.

#### Scenario: Allowed command metadata is stored
- **WHEN** a command observation is emitted
- **THEN** the payload may include command, argv, cwd, startedAt, completedAt,
  durationMs, exitCode, bounded stdout summary, bounded stderr summary,
  inferred Nx target, generic target ID, inferred recipe ID when available,
  measurement session ID when available, measurement phase, safe aggregate
  token/tool counts and source, and `rawOutputStored: false`
- **AND** safe token/tool metrics are limited to numeric aggregate fields from
  parseable JSON such as `totalTokens`, `total_tokens`, `tokensUsed`,
  `toolCallCount`, or recognized tool-call event types

#### Scenario: Forbidden command data is not stored
- **WHEN** the observed command writes stdout or stderr
- **THEN** the observation stores bounded summaries rather than full raw output
- **AND** secret-shaped values are redacted from summaries before DB insertion
- **AND** the observation payload does not store full stdout, full stderr, raw
  prompts, full conversations, secrets, raw trace dumps, or ambiguous private
  text payloads
- **AND** measurement reports do not embed full command output

### Requirement: Required validation ladder observations use shared store semantics
The system SHALL collect command observations for the required validation ladder
before producing the command ladder report and SHALL keep those observations
linked to recipe semantics.

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
- **AND** it may observe direct producer commands such as
  `pnpm exec trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`
  and `pnpm exec trellis-ls fixes --project packages/trellis/language-service/tsconfig.json --format json`
- **AND** it may observe direct Trellis LS repair-loop commands such as
  `trellis-ls apply`, `trellis-ls apply-codefix`, and `trellis-ls check`
  with generic target IDs mapped to existing Trellis language-service recipe
  projections
- **AND** it may observe Tend/OpenCode report-generation producer commands
  with a generic `tend-opencode:measurement-report` target ID
- **AND** it maps framework-language-service repair and workspace DB wrapper
  commands to their framework-owned recipe IDs when those commands are
  observed
- **AND** it observes
  `pnpm exec nx run workspace:policy-fast --output-style=static` only when
  policy-fast remains part of the measured ladder, not as automatic final
  validation

#### Scenario: Recipe identity is inferred when available
- **WHEN** an observed command maps to a known Nx target or recipe validation
  surface
- **THEN** the observation records the inferred Nx target when the command is
  an Nx target
- **AND** the observation records a generic target ID such as
  `trellis-ls:diagnostics` for non-Nx producer commands
- **AND** generic target IDs include Trellis LS diagnostics, fixes, apply,
  apply-codefix, and check surfaces when observed directly
- **AND** the observation records the inferred recipe ID when available
- **AND** the measurement does not write raw EventLog events or a separate
  durable ledger

#### Scenario: Unknown recipe identity remains explicit
- **WHEN** an observed command cannot be mapped to a recipe ID
- **THEN** the observation keeps the command measurement
- **AND** the report marks the recipe ID as unknown rather than inventing a
  compatibility ontology
