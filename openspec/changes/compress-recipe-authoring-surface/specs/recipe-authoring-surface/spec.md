# Specification: Recipe Authoring Surface

## ADDED Requirements

### Requirement: `defineRecipeModule` is the native authoring entrypoint
The system SHALL provide a file-local `defineRecipeModule(import.meta.url)` API for authoring ordinary and managed recipes.

#### Scenario: Ordinary recipe has small authored shape
- **WHEN** a module authors an ordinary recipe through `defineRecipeModule(import.meta.url)`
- **THEN** the recipe can be declared with `modes`, `input`, `output`, and `run`
- **AND** the author is not required to provide recipe ID, handler ID, source path, project ID, resource IDs, handler binding, or DAG edge IDs when they are deterministic.

#### Scenario: Managed recipe makes lifecycle risk visible
- **WHEN** a recipe uses plan/apply/check/destroy/write modes for external lifecycle or mutation
- **THEN** it is authored with `recipe.managed({...})` or an explicit equivalent review-gated lifecycle form
- **AND** `needsHumanReview` or equivalent safety policy remains visible.

### Requirement: Existing verbose runtime IR remains available
The system SHALL preserve the existing verbose TypeScript runtime IR as generated/lowered output and compatibility surface.

#### Scenario: Ordinary recipe lowers to runtime IR
- **WHEN** a small authored recipe is compiled or projected
- **THEN** the system can produce the equivalent verbose Recipe/Handler/Resource/DAG runtime representation
- **AND** existing runtime, packet, receipt, DB, Alchemy, and judgment infrastructure can consume that representation.

#### Scenario: Existing verbose APIs continue to work
- **WHEN** existing authored modules still use verbose runtime APIs
- **THEN** those APIs continue to typecheck and function until compatibility is proven and a later removal is explicitly specified.

#### Scenario: Generated runtime output is not authored truth
- **WHEN** generated runtime TypeScript exists under `.framework/generated`
- **THEN** it is treated as projection output
- **AND** authored source remains the `defineRecipeModule` recipe module.

### Requirement: Inference is deterministic and bounded
The system SHALL infer only deterministic identity and bookkeeping fields.

#### Scenario: Identity fields are inferable
- **WHEN** package/project, source file, export name, input schema, output schema, and handler function unambiguously determine recipe identity
- **THEN** the system may infer recipe ID, handler ID, source path, project/package ID, schema references, basic resource IDs, and handler binding.

#### Scenario: Ambiguous or unsafe meaning is not inferred
- **WHEN** a DAG relationship, mutation safety policy, business meaning, human review waiver, security/privacy policy, or production apply safety is ambiguous
- **THEN** the author must provide explicit intent or the system must emit a packet/diagnostic rather than guessing.

### Requirement: Generated surfaces are aligned but not globally migrated
The system SHALL use `.framework/generated` for new Recipe authoring projections while allowing existing `.attune/cache/generated` references to remain until a later generated-surface consolidation.

#### Scenario: New projection uses `.framework/generated`
- **WHEN** compact Recipe authoring lowers to generated TypeScript
- **THEN** the new projection is emitted under `.framework/generated`
- **AND** it includes provenance back to the authored recipe module.

#### Scenario: Existing generated cache references remain compatible
- **WHEN** existing tests or scaffolding still reference `.attune/cache/generated`
- **THEN** this change does not require them to move unless they are directly scoped to the Recipe authoring projection
- **AND** any implementation touching both surfaces includes an explicit compatibility note.

### Requirement: Migration is packetized and gated
The system SHALL migrate from verbose authoring to compact authoring through packetized OpenSpec apply after bootstrap proof passes.

#### Scenario: Bootstrap proof gates migration
- **WHEN** `compress-recipe-authoring-surface` would begin implementation
- **THEN** `bootstrap-packetized-openspec-apply` must be complete
- **AND** external Tend/OpenCode fingerprint and harness proof must pass
- **AND** the parent governance tracker must allow migration preview or active mode.

#### Scenario: Missing proof blocks raw migration
- **WHEN** required proof is missing and the user is not present
- **THEN** the agent MUST stop
- **AND** it MUST NOT continue the heavy Recipe API migration in raw Codex mode.

#### Scenario: Tend/OpenCode implements migration slices
- **WHEN** a scored Recipe migration slice runs
- **THEN** Tend/OpenCode performs the source edits, selected-target checks, validation ladders, and telemetry emission through the packetized apply or benchmark harness
- **AND** Codex acts only as monitor, harness fixer, packet tuner, DB analyst, or handoff coordinator.

#### Scenario: Raw Codex edits do not count
- **WHEN** Codex directly edits Recipe migration target source outside a Tend/OpenCode packetized run
- **THEN** the affected clears, token counts, command counts, and timing MUST NOT count toward packet-family candidate or audit-promoted 20x evidence
- **AND** the slice must be reverted or replayed through Tend/OpenCode before it can count.

### Requirement: Recipe authoring packet families provide optimizer search space
The system SHALL define bootstrapped packet families for the Recipe authoring API cut with selectors, target shapes, repairability, active eligibility, validation targets, judges, and metrics, and SHALL treat concrete packet variants as measured optimizer hypotheses.

#### Scenario: Inferable identity families produce selected-target scopes
- **WHEN** recipe declarations contain deterministic manual recipe IDs, source paths, handler IDs, project IDs, or resource IDs
- **THEN** packet families identify those targets, classify repairability and risk, produce selected-target status, and define validation targets before edits are applied.

#### Scenario: Root catalog and projection families produce selected-target scopes
- **WHEN** root recipe catalogs contain behavior or verbose runtime declarations should be generated
- **THEN** packet families select root-catalog thinness and generated-runtime-projection targets with judges for aggregation-only catalogs, projection existence, provenance, and runtime compatibility.

#### Scenario: Managed review policy family is selected
- **WHEN** managed or lifecycle recipes use plan/apply/check/destroy/write modes
- **THEN** the managed review policy family verifies `recipe.managed(...)`, `needsHumanReview`, provider/lifecycle resources, or equivalent explicit review policy.

#### Scenario: Packet variants are optimized over slices
- **WHEN** a Recipe authoring packet family is run on a source or package slice
- **THEN** the result records packet variant identity, optimizer iteration, hypothesis, prerequisites, optimization status, optimizer action, selected-target delta, command/tool/token telemetry, validation status, and observation IDs
- **AND** underperforming or unsafe variants are rejected or revised before replay rather than scaled.

### Requirement: Packet families control active-mode eligibility
The system SHALL allow active packet mode for Recipe authoring families only when each family-specific gate and the global packetized apply gates pass.

#### Scenario: Deterministic simple families may become active
- **WHEN** manual recipe ID, source path, or handler ID targets are unambiguous, high-density, safe or guided, and have focused validation
- **THEN** those families may enter active mode after fingerprint, harness, plugin, sidecar, active capability, store, trace-capture, and economy gates pass.

#### Scenario: Riskier families default to preview or human
- **WHEN** project/resource identity, root catalog behavior, generated projection, or managed review policy targets are ambiguous, broad, or safety-sensitive
- **THEN** the family remains preview, guided, human-reviewed, or blocked until explicit safety and validation gates pass.

### Requirement: Migration metrics and 20x claims are evidence-bound
The system SHALL separate implementation progress, migration progress, packet-family candidate evidence, and audit-promoted 20x evidence.

#### Scenario: Migration progress does not imply 20x proof
- **WHEN** compact authoring tasks complete or authored boilerplate decreases
- **THEN** the system reports migration progress
- **AND** it does not claim 20x unless paired accounting and DB-backed target status support the claim.

#### Scenario: Underperforming slices are revised and replayed
- **WHEN** Tend/OpenCode slice evidence does not approach the target packet-efficiency goal
- **THEN** packet variant geometry, selectors, repair fastpaths, economy gates, framework/tooling support, or validation ladders are revised
- **AND** the slice is replayed through Tend/OpenCode instead of manually completed by Codex.

#### Scenario: Candidate evidence is family-scoped
- **WHEN** a packet family reports 20x candidate evidence
- **THEN** it includes scoped family identity, selected total, selected remaining, cleared count, stale/flicker/refusal counts, command/token telemetry, validation status, baseline comparison, and trace-rich, secret-redacted observation IDs.

#### Scenario: Audit-promoted claim requires all evidence gates
- **WHEN** a result is marked `audit-promoted`
- **THEN** paired accounting, selected-target status, reasoning-bearing/autofix separation, validation, trace completeness, trace-completeness bounds, and applicable holdout or negative-control status MUST be present.

#### Scenario: Full run is handed off to the user
- **WHEN** scoped Tend/OpenCode slices show stable clears, healthy DB observations, adequate telemetry, reliable validation, and credible packet-family candidate evidence
- **THEN** Codex prepares a handoff with exact Tend/OpenCode commands, DB analysis instructions, ready packet families, blocked or preview families, validation status, telemetry status, claim status, and remaining evidence gaps
- **AND** Codex does not independently start the full autonomous OpenCode migration run.

### Requirement: Recipe migration observations are trace-rich
The system SHALL store enough Recipe migration observations and analysis to audit selected targets, tool calls, validation, command output, token efficiency, and structured exposed reasoning traces.

The system SHALL redact obvious secret-shaped values before durable storage and SHALL NOT require hidden assistant chain-of-thought as a durable artifact.

#### Scenario: Payload contains trace-complete audit fields
- **WHEN** a Recipe migration observation, status, or analysis record is written
- **THEN** it may contain counts, paths, hashes, target IDs, packet IDs, observation IDs, validation command names, source spans or fingerprints, status enums, exposed prompts, command stdout/stderr, tool-call inputs/outputs, token telemetry, validation output, structured reasoning summaries, and source or patch excerpts needed to audit migration behavior.
- **AND** it identifies whether token values are provider-native, parsed from exposed output, or estimated.

### Requirement: Migration tests are first-class
The system SHALL include tests proving compact authoring, generated projection, compatibility, packet status, and guarded 20x claims.

#### Scenario: Authoring API tests prove type inference and safety
- **WHEN** Recipe authoring tests run
- **THEN** they cover `defineRecipeModule` type inference, ordinary recipe small authored shape, managed recipe small authored shape, and apply/write/destroy safety diagnostics.

#### Scenario: Projection and compatibility tests prove runtime continuity
- **WHEN** projection tests run
- **THEN** generated `.framework` projection exists, provenance points back to the authored recipe module, and existing verbose runtime APIs still work.

#### Scenario: Packet migration tests prove measurement discipline
- **WHEN** packet migration tests run
- **THEN** selected-target status is emitted per packet family, authored-boilerplate deltas are measured, and no 20x claim is allowed without paired accounting and DB-backed target status.
