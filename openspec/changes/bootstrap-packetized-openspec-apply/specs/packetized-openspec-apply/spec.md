# Specification: Packetized OpenSpec Apply

## ADDED Requirements

### Requirement: Public OpenSpec command surface is preserved
The system SHALL preserve the existing OpenSpec/OpenCode slash command names while adding packet-aware behavior behind `/openspec-apply`.

#### Scenario: Commands remain installed
- **WHEN** the Tend/OpenCode harness self-test runs
- **THEN** the generated OpenCode config includes `/attune-fingerprint`, `/openspec-propose`, `/openspec-apply`, `/openspec-explore`, `/openspec-archive`, `/openspec-sync-specs`, `/openspec-status`, and `/openspec-validate`
- **AND** `.codex/skills/openspec-*` skill paths are configured.

#### Scenario: Packetized apply is not a new primary slash command
- **WHEN** packetized OpenSpec apply is available
- **THEN** `/openspec-apply` remains the primary public workflow
- **AND** any packetized apply, packet status, or packet loop CLI entrypoint is treated as an internal Tend/OpenCode debug or automation surface.

#### Scenario: Apply still works without packets
- **WHEN** packet sidecar proof is missing or packet economy rejects all candidates
- **THEN** `/openspec-apply` may continue in ordinary OpenSpec task mode
- **AND** it MUST NOT claim packetized execution.

### Requirement: Tend/OpenCode is the packetized apply harness
The system SHALL implement packetized OpenSpec apply through the existing Tend/OpenCode harness and Attune OpenCode plugin suite.

#### Scenario: Current codebase surfaces are used
- **WHEN** the packet sidecar is implemented
- **THEN** it extends or wraps the current surfaces under `.codex/skills/openspec-*`, `packages/tend/opencode/opencode-config/commands/`, `packages/tend/opencode/opencode-config/plugin-packages/@attune/`, `packages/tend/opencode/opencode-config/plugins/`, `packages/tend/opencode/src/`, and `packages/tend/opencode/test/opencode.test.ts`
- **AND** it does not create a generic parallel OpenSpec runner as the primary harness.

#### Scenario: Required Attune plugins are visible
- **WHEN** harness proof is produced
- **THEN** it proves the required plugin packages are loaded: `@attune/tend-opencode`, `@attune/magic-context-opencode`, `@attune/openrtk-opencode`, `@attune/tend-token-audit-opencode`, `@attune/tend-long-job-opencode`, and `@attune/trellis-ls-opencode`
- **AND** upstream OpenCode plugin visibility and hook exercise are proven.

#### Scenario: Harness preserves the measured implementor boundary
- **WHEN** Phase B Recipe migration slices run
- **THEN** Tend/OpenCode is the implementor that applies packet repairs and emits telemetry
- **AND** raw Codex edits are not counted as Tend/OpenCode packetized migration evidence.

### Requirement: Packetized apply modes have precise semantics
The system SHALL support `shadow`, `preview`, and `active` packetized apply modes with distinct proof and edit behavior.

#### Scenario: Shadow mode is read-only for packet repairs
- **WHEN** packetized apply runs in `shadow` mode
- **THEN** it resolves the change, reads normal OpenSpec apply context, discovers packet candidates, scores packet economy, and emits trace-rich, secret-redacted observations when possible
- **AND** it performs no packet source edits
- **AND** it remains DB-independent unless an observation store is already available.

#### Scenario: Preview mode plans without source edits
- **WHEN** packetized apply runs in `preview` mode
- **THEN** it performs all shadow-mode behavior, computes repair plans, computes validation ladders, and reports whether active mode would be allowed
- **AND** it performs no packet source edits.

#### Scenario: Active mode requires all live gates
- **WHEN** packetized apply runs in `active` mode
- **THEN** fingerprint proof, harness proof, plugin proof, packet sidecar self-test, explicit active-mode capability, framework store health, and trace-capture checks MUST pass
- **AND** the loop may apply eligible packet repairs, run selected-target checks, run validation ladders, emit recipe observations/receipts, and update task/progress projections from receipts.

### Requirement: External fingerprint and harness proof gate live migration
The system SHALL require external Tend/OpenCode proof before live packet migration.

#### Scenario: Required proof commands are used
- **WHEN** Phase A bootstrap implementation completes
- **THEN** a fresh external run outside the implementation session MUST execute `nix run .#tend-opencode -- fingerprint --format json`
- **AND** it MUST execute `nix run .#tend-opencode -- run-harness-test --format json`.

#### Scenario: Proof JSON contains required facts
- **WHEN** fingerprint and harness proof are parsed
- **THEN** they prove a flake-provided upstream OpenCode runtime, `/attune-fingerprint`, `/openspec-*` commands, `.codex` OpenSpec skills, required Attune plugin packages, upstream plugin visibility, plugin hook exercise, packet sidecar installation, packet sidecar self-test pass, and trace-complete parseable output.

#### Scenario: Harness proof is DB-independent
- **WHEN** fingerprint or harness self-test runs without a reachable framework store
- **THEN** it still emits parseable, sanitized JSON proof
- **AND** it does not start, migrate, validate, or administer the DB.

#### Scenario: Missing proof blocks Phase B
- **WHEN** the user is not present and required tool, plugin, fingerprint, harness, sidecar, or store proof is unavailable
- **THEN** the agent MUST stop instead of continuing `compress-recipe-authoring-surface` in raw Codex mode.

#### Scenario: Codex does not become the Phase B implementor
- **WHEN** required proof is available and Phase B is active
- **THEN** Codex may monitor, analyze, tune, repair the harness, or hand off
- **AND** Codex MUST NOT directly implement scored Recipe migration slices outside Tend/OpenCode.

### Requirement: Bootstrapped packet contracts are provided
The system SHALL define minimal bootstrapped packet contracts for the first Recipe API migration harness without redesigning the full packet protocol.

#### Scenario: Packet candidate contract is complete enough for economy decisions
- **WHEN** a packet candidate is emitted
- **THEN** it includes `schemaVersion`, `changeId`, optional `taskId`, `packetFamilyCode`, optional `packetVariant`, optional `optimizerIteration`, optional `optimizationHypothesis`, optional `optimizerPrerequisites`, `title`, `selectorSummary`, `targetEstimate`, `targetExamples`, `repairability`, `risk`, `staleRisk`, `validationTargets`, `allowedFiles`, `forbiddenFiles`, `economy`, `reason`, optional `optimizationStatus`, and optional `optimizerAction`.

#### Scenario: Economy estimate contract includes gate inputs
- **WHEN** packet economy is estimated
- **THEN** it includes `decision`, `targetCount`, `targetDensity`, `repeatedEditShape`, `safeFixDensity`, `validationCost`, `staleRisk`, `expectedSavings`, and `reason`.

#### Scenario: Loop status contract includes selected-target status
- **WHEN** packet loop status is emitted
- **THEN** it includes `mode`, `state`, `selectedTotal`, `selectedRemaining`, `cleared`, `stale`, `flicker`, `refused`, `failedValidation`, `validationTargets`, `observationIds`, and `nextAction`.

### Requirement: Packet economy gate is conservative
The system SHALL activate packet mode only when packet geometry, target density, repairability, validation cost, blast radius, and selected-target checks justify packet overhead.

#### Scenario: Economy uses required inputs
- **WHEN** a packet candidate is scored
- **THEN** the gate considers target count, target density, repeated edit shape, safe or guided repairability, stale/flicker risk, validation target cost, blast radius, allowed and forbidden file scope, human-review risk, and prior family or variant performance when available.

#### Scenario: Variant evidence is scored inside Tend/OpenCode
- **WHEN** a packet loop is used to evaluate migration efficiency
- **THEN** Tend/OpenCode joins selected-target observations, command/tool/token telemetry, validation status, and exposed reasoning-trace summaries through the framework SQL pipeline
- **AND** it emits a packet benchmark analysis observation that classifies the variant as exploratory, rejected, candidate, audit-promoted, or insufficient-evidence.

#### Scenario: Score-only analysis does not edit source
- **WHEN** a score-only packet-loop pass is run to join an already-observed implementation command
- **THEN** it emits analysis observations only
- **AND** it performs no packet source edits.

#### Scenario: Low-value candidates remain raw task or shadow
- **WHEN** a candidate is tiny, unstable, ambiguous, high-validation-cost, high-blast-radius, unsafe, or human-review-heavy
- **THEN** the economy decision is `raw-task` or `shadow`
- **AND** active packet mode is not entered.

#### Scenario: High-density candidates still require gates
- **WHEN** a candidate has high density, repeated edit shape, low stale risk, focused validation, and safe or guided repairability
- **THEN** the economy decision may be `preview` or `active`
- **BUT** `active` is allowed only after fingerprint, harness, plugin, sidecar, explicit capability, store, and trace-capture gates pass.

### Requirement: Packet loop has exhaustive terminal states
The system SHALL expose packet loop state as `not-started`, `shadow`, `preview`, `active`, `complete`, `blocked`, `failed-validation`, `budget-exhausted`, `needs-human`, `stale`, or `unsafe`.

#### Scenario: Loop stops on completion
- **WHEN** selected target checking reports `selectedRemaining == 0` and judge requirements pass
- **THEN** the packet loop enters `complete`
- **AND** the result includes the next action for task/progress projection.

#### Scenario: Loop stops on blockers
- **WHEN** validation fails, stale/flicker exceeds threshold, no safe repair exists, human review is required, proof is missing, active-mode store health is missing, a secret leak or trace-integrity violation is detected, budget is exhausted, or the user interrupts
- **THEN** the packet loop enters the matching terminal state
- **AND** the result includes `nextAction`.

### Requirement: Live packet loops use framework store observations
The system SHALL emit active packet observations through the framework runtime/store boundary.

#### Scenario: Framework schema names are preserved
- **WHEN** packet sidecar observations are stored
- **THEN** the implementation preserves `framework_core`, `framework_event`, and `framework_view`
- **AND** it uses `framework_event.recipe_observation` before adding product-specific tables.

#### Scenario: Active mode requires store health
- **WHEN** active packet mode is requested
- **THEN** framework store health MUST be proven through the framework runtime/store surfaces
- **AND** missing or unhealthy store state blocks active packet mode.

#### Scenario: Tend/OpenCode does not own DB lifecycle
- **WHEN** packetized apply emits or tests observations
- **THEN** Tend/OpenCode acts as observation producer and harness
- **AND** it does not add DB start, migrate, repair, or private ledger commands as the packet storage path.

### Requirement: Packet observations and proof are trace-rich
The system SHALL emit packetized OpenSpec observations, harness proof, and analysis with enough exposed trace data to audit packet efficiency, including command stdout/stderr, tool-call events, token counters, validation output, and structured reasoning traces when available.

The system SHALL redact obvious secret-shaped values before durable storage and SHALL NOT require hidden assistant chain-of-thought as a durable artifact.

#### Scenario: Payload contains trace-complete audit fields
- **WHEN** packet sidecar emits an observation, status, or proof record
- **THEN** payloads may contain counts, paths, hashes, target IDs, packet IDs, observation IDs, validation command names, source spans or fingerprints, status enums, exposed prompts, command stdout/stderr, tool-call inputs/outputs, token telemetry, validation output, structured reasoning summaries, and source or patch excerpts needed to audit packet behavior.
- **AND** payloads identify whether token values are provider-native, parsed from exposed output, or estimated.

### Requirement: Bootstrap tests are first-class
The system SHALL include tests that prove packetized apply can be trusted before Phase B starts.

#### Scenario: Harness proof parser rejects missing capabilities
- **WHEN** fingerprint or harness JSON is parsed
- **THEN** tests reject missing `/attune-fingerprint`, missing `/openspec-apply`, missing OpenSpec skill path, missing required plugin package, plugin hooks not exercised, missing packet sidecar self-test, trace-incomplete output, and secret-leaking output.

#### Scenario: Mode edit behavior is tested
- **WHEN** packetized apply runs in tests
- **THEN** shadow mode and preview mode are proven not to write source
- **AND** active mode refuses without framework store health or without explicit active-mode capability.

#### Scenario: Economy and loop behavior are tested
- **WHEN** packet candidates and loop transitions are tested
- **THEN** low-density candidates remain `raw-task` or `shadow`, stale/flicker transitions to blocked or stale, terminal states are exhaustive, and each terminal result includes `nextAction`.

#### Scenario: Store and DB-independent proof are tested
- **WHEN** the store is healthy
- **THEN** `framework_event.recipe_observation` insertion and query are tested
- **AND** when DB is unavailable, fingerprint and harness self-test still produce parseable JSON proof.
