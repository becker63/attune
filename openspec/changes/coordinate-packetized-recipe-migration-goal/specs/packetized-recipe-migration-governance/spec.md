# Specification: Packetized Recipe Migration Governance

## ADDED Requirements

### Requirement: Governance tracks the ordered child changes
The system SHALL track `bootstrap-packetized-openspec-apply` and `compress-recipe-authoring-surface` as one ordered packetized Recipe migration program.

#### Scenario: Bootstrap precedes migration
- **WHEN** the governance tracker evaluates whether `compress-recipe-authoring-surface` may begin implementation
- **THEN** it requires `bootstrap-packetized-openspec-apply` to be complete
- **AND** it requires external Tend/OpenCode fingerprint and harness proof to pass.

#### Scenario: Missing bootstrap proof blocks migration
- **WHEN** bootstrap completion, fingerprint proof, harness proof, plugin proof, sidecar proof, trace-completeness proof, or active-mode store health is missing
- **THEN** the governance tracker marks the Recipe authoring migration as `blocked`
- **AND** it MUST NOT allow the heavy migration to continue as raw Codex work when the user is not present.

### Requirement: Tend/OpenCode is the Phase B migration implementor
The system SHALL treat Tend/OpenCode, not raw Codex, as the implementor for `compress-recipe-authoring-surface` migration slices.

#### Scenario: Codex may bootstrap and monitor but not migrate
- **WHEN** Phase B begins
- **THEN** Codex may start, monitor, analyze, tune, block, or hand off Tend/OpenCode packetized runs
- **AND** Codex may repair bootstrap harness defects that prevent Tend/OpenCode execution
- **BUT** Codex MUST NOT directly edit Recipe migration target source files as the migration implementor.

#### Scenario: Tend/OpenCode performs migration slices
- **WHEN** a Recipe migration slice is executed
- **THEN** Tend/OpenCode performs target selection, packet repair application, selected-target checks, validation ladders, and telemetry emission
- **AND** the resulting evidence is derived from Tend/OpenCode command, tool-call, token, reasoning-trace, validation, and observation records.

#### Scenario: Raw Codex migration edits are contaminated
- **WHEN** a Recipe migration source edit is made directly by Codex outside a Tend/OpenCode packetized apply or benchmark run
- **THEN** that slice is marked unscored contamination
- **AND** it MUST be reverted or replayed through Tend/OpenCode before its clears, token efficiency, or command efficiency can count toward candidate or audit-promoted evidence.

### Requirement: Governance records phase state
The system SHALL expose a phase state for the packetized Recipe migration program.

#### Scenario: Phase is explicit
- **WHEN** a status report, goal analysis, or handoff is produced
- **THEN** it identifies the current phase as `planned`, `bootstrap-implementation`, `bootstrap-external-proof`, `migration-preview`, `migration-active`, `completion-analysis`, or `blocked`.

#### Scenario: Active migration requires all gates
- **WHEN** the phase would move to `migration-active`
- **THEN** bootstrap proof, fingerprint proof, harness proof, plugin proof, packet sidecar self-test, explicit active-mode capability, framework store health, and trace-capture checks MUST pass.

### Requirement: Goal analysis record has a typed trace-rich, secret-redacted shape
The system SHALL define a `GoalAnalysisRecord` with bounded fields for program state, evidence, blockers, and next action.

#### Scenario: Record includes required status and evidence fields
- **WHEN** a goal analysis record is written
- **THEN** it includes `schemaVersion`, `changeId`, `phase`, `childChangeStatuses`, `gateStatus`, optional `packetFamily`, optional `packetLoopState`, selected-target counts, stale/flicker/refusal/failure counts, optional token telemetry, optional command telemetry, optional baseline comparison, `validationTargets`, `validationStatus`, `storeHealth`, `observationIds`, `claimStatus`, `blockers`, and `nextAction`.

#### Scenario: Claim status is controlled
- **WHEN** a goal analysis record is written
- **THEN** `claimStatus` is one of `not-started`, `insufficient-evidence`, `blocked`, `candidate`, or `audit-promoted`.

### Requirement: Periodic goal analysis is required
The system SHALL produce periodic analysis records for the packetization goal at defined checkpoints.

#### Scenario: Analysis runs around artifact and implementation boundaries
- **WHEN** a child artifact set becomes apply-ready, an implementation phase is about to start, bootstrap validation completes, or external fingerprint/harness proof completes
- **THEN** the governance tracker records goal analysis with child change status, gate status, validation status, blockers, claim status, and next action.

#### Scenario: Analysis runs during migration loops
- **WHEN** active packet mode is considered, a packet family begins, a packet family completes, blocks, fails, hands off, or a validation ladder completes
- **THEN** the governance tracker records target counts, selected-target clears, stale counts, flicker counts, refusal counts, failed validation counts, validation results, telemetry summaries, observation IDs, claim status, and remaining blockers.

#### Scenario: Gate failure triggers immediate analysis
- **WHEN** required proof, store health, validation, trace-completeness bounds, or accounting gates fail
- **THEN** the governance tracker immediately records a blocked analysis
- **AND** it identifies the missing evidence needed to resume.

### Requirement: Governance controls slice scaling and handoff
The system SHALL use DB-backed slice evidence to decide whether to shrink, revise, repeat, expand, or hand off Tend/OpenCode packet runs.

#### Scenario: Packet variants are optimization hypotheses
- **WHEN** a packet family, source slice, or dense target set is considered
- **THEN** the governance tracker treats it as a packet-variant hypothesis to measure
- **AND** it does not treat family selection, source selection, or target density alone as evidence that the packet arm works.

#### Scenario: Underperforming slices trigger revision and replay
- **WHEN** Tend/OpenCode slices do not show credible packet-family efficiency, selected-target stability, telemetry quality, or validation reliability
- **THEN** Codex revises packet variant geometry, selectors, repair fastpaths, economy gates, validation ladders, or harness behavior
- **AND** the slice is replayed through Tend/OpenCode rather than repaired manually by Codex.

#### Scenario: Rejected variants remain optimizer evidence
- **WHEN** a Tend/OpenCode packet-loop analysis marks a packet variant as rejected, exploratory, stale, unsafe, or insufficient-evidence
- **THEN** the result is retained as optimizer evidence
- **AND** the next action identifies whether to reject, revise selector, add oracle, change validation ladder, replay, shrink, expand, or hand off.

#### Scenario: Strong slices trigger user handoff before full run
- **WHEN** Tend/OpenCode slices show stable selected-target clears, healthy store observations, acceptable telemetry quality, reliable validation, and credible 20x-candidate evidence for the scoped packet variants
- **THEN** Codex prepares a handoff for the user
- **AND** it does not start the full autonomous OpenCode migration run on its own.

#### Scenario: Handoff includes exact run and analysis instructions
- **WHEN** Codex hands off to the user
- **THEN** the handoff includes exact Tend/OpenCode commands, framework DB/store status, SQL pipeline/query references, packet families ready for active execution, packet families remaining preview or human-reviewed, recent telemetry and validation status, claim status, blockers, and evidence gaps.

### Requirement: External proof commands are mandatory
The system SHALL require the Tend/OpenCode external proof commands before Phase B can proceed.

#### Scenario: Fingerprint proof command is recorded
- **WHEN** bootstrap implementation is complete
- **THEN** the governance tracker requires `nix run .#tend-opencode -- fingerprint --format json`
- **AND** it records whether the parseable JSON proof passed.

#### Scenario: Harness proof command is recorded
- **WHEN** bootstrap implementation is complete
- **THEN** the governance tracker requires `nix run .#tend-opencode -- run-harness-test --format json`
- **AND** it records whether the parseable JSON proof passed.

### Requirement: Goal claims are evidence-bound
The system SHALL separate implementation completion from claims about the 20x packetization goal.

#### Scenario: Completed tasks do not imply 20x proof
- **WHEN** child OpenSpec tasks are complete but paired accounting, selected-target status, validation evidence, trace completeness, trace-completeness bounds, or holdout/negative-control evidence is missing where applicable
- **THEN** the claim status remains `insufficient-evidence` or `blocked`.

#### Scenario: Candidate claim requires scoped evidence
- **WHEN** a report marks a packet family as a 20x candidate
- **THEN** it includes the scoped packet family, baseline/comparison basis, target counts, command/token telemetry, validation results, selected-target status, and trace-rich, secret-redacted observation IDs.

#### Scenario: Audit promotion requires all gates
- **WHEN** a report marks a result as `audit-promoted`
- **THEN** paired accounting, selected-target status, reasoning-bearing/autofix separation, validation, trace completeness, trace-completeness bounds, and required holdout or negative-control status MUST be present.

### Requirement: Governance observations are trace-rich
The system SHALL keep governance analysis rich enough to audit the 20x packetization claim, including exposed prompts when available, command stdout/stderr, tool calls, validation output, token efficiency, structured reasoning traces, selected-target status, and DB observation IDs.

The system SHALL redact obvious secret-shaped values before durable storage and SHALL NOT require hidden assistant chain-of-thought as a durable artifact.

#### Scenario: Analysis payload is trace-complete
- **WHEN** a goal analysis record is written
- **THEN** it may include exposed prompts, command stdout/stderr, tool-call inputs and outputs, token telemetry, validation output, structured reasoning summaries, source spans, source excerpts, patch excerpts, hashes, target IDs, packet IDs, observation IDs, and status enums.
- **AND** it identifies whether token values are provider-native, parsed from output, or estimated.

### Requirement: Governance aligns with framework observations
The system SHALL align active migration analysis with the framework runtime observation spine without adding a Tend-owned durable ledger.

#### Scenario: Store-backed analysis uses framework observation names
- **WHEN** governance analysis is emitted during active packet migration and store health is available
- **THEN** it uses the existing framework observation boundary and preserves `framework_core`, `framework_event`, `framework_view`, and `framework_event.recipe_observation`.

#### Scenario: Early analysis may be file-level
- **WHEN** bootstrap, preview, or proof phases run without active-mode store health
- **THEN** governance analysis may remain in OpenSpec handoff artifacts or bounded JSON output
- **AND** it does not require Tend/OpenCode to administer DB lifecycle.

### Requirement: Governance does not replace child implementation specs
The system SHALL use the governance spec to coordinate, gate, and analyze the child changes without absorbing their implementation requirements.

#### Scenario: Child scope remains owned by child changes
- **WHEN** implementation work is planned for packet sidecar behavior or Recipe authoring compression
- **THEN** the detailed implementation tasks remain in `bootstrap-packetized-openspec-apply` or `compress-recipe-authoring-surface`
- **AND** the governance tracker records only phase, gate, analysis, and claim status.
