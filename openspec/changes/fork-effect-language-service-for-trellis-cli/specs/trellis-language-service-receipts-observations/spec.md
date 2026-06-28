## ADDED Requirements

### Requirement: Existing receipt spine
The system SHALL use the existing RecipeReceiptStore and RecipeObservation model for durable command evidence and MUST NOT create a new private language-service ledger.

#### Scenario: Store integration uses framework runtime
- **WHEN** the CLI records durable evidence
- **THEN** evidence is written through the framework runtime receipt/observation service rather than a language-service-specific ledger

### Requirement: No live Postgres requirement
Basic diagnostics, fixes, apply diff, safe local apply, and check commands SHALL run without live Postgres.

#### Scenario: Diagnostics without database
- **WHEN** no Postgres configuration is available
- **THEN** `trellis-ls diagnostics --format json` still runs using in-memory or file/cache evidence

### Requirement: Useful observation kinds
The system SHALL be able to record observations for diagnostic run summaries, fix list summaries, applied fix summaries, refused unsafe repairs, generated freshness repair results, Nx repair command results, upstream Effect quickfix application results, and check summaries.

#### Scenario: Refusal observation
- **WHEN** an unsafe fix is refused and an observation store is configured
- **THEN** the CLI records a RecipeObservation describing the refusal reason and selected fix ID

### Requirement: Command metadata reports evidence mode
JSON command metadata SHALL report whether receipt/observation recording was disabled, in-memory, file-backed, or durable through the runtime store.

#### Scenario: No-store metadata
- **WHEN** no receipt store is configured
- **THEN** JSON metadata states that durable receipt recording was not used

### Requirement: Observations link to recipes and runs when available
Recorded observations SHALL include recipe ID, run ID, receipt ID, or diagnostic/fix IDs when those identifiers are available.

#### Scenario: Applied fix links to diagnostic
- **WHEN** a fix is applied for a Trellis recipe diagnostic
- **THEN** the observation payload links the fix ID to the originating diagnostic ID and recipe ID

### Requirement: Durable DB path preserves framework schema names
When durable DB-backed evidence is configured, the system SHALL preserve the existing `framework_core`, `framework_event`, and `framework_view` schema boundary.

#### Scenario: DB-backed recording uses framework schemas
- **WHEN** the CLI records through Postgres-backed runtime services
- **THEN** it uses the existing framework receipt spine and does not create language-service-specific schema names
