## Context

The packetized Recipe migration program has two child implementation changes:

- `bootstrap-packetized-openspec-apply` creates the packet-aware Tend/OpenCode apply harness.
- `compress-recipe-authoring-surface` uses that harness for the first high-density Recipe/ManagedRecipe authoring cut.

The parent change, `coordinate-packetized-recipe-migration-goal`, exists to keep the sequence, gates, and 20x analysis explicit. It does not implement runtime code.

This parent change also defines the actor boundary for Phase B:

- Codex may implement and repair the bootstrap harness.
- Codex may monitor Tend/OpenCode runs, inspect framework DB observations, analyze telemetry, optimize packet variants over measured slices, and update OpenSpec artifacts.
- Tend/OpenCode is the implementor for Recipe migration slices.
- Raw Codex source edits to Recipe migration targets are not valid migration evidence and must be reverted or replayed through Tend/OpenCode before scoring.

The benchmark orientation is evidence-bound:

- Packet arm: 134,431 tokens, 6 commands, about 45.7s, 30/30 exact source-scope clears.
- Raw arm: 3,722,627 tokens, 63 commands, about 184.6s, 30/30 exact source-scope clears.
- Promoted result: 27.69x precision-adjusted reasoning-bearing improvement.

Packetization is not universal. It wins only when packet geometry, target density, fastpath composition, and selected-target checks amortize fixed packet overhead.

## Goals / Non-Goals

**Goals:**

- Track the child changes as one ordered program.
- Require bootstrap completion and external harness proof before the Recipe migration starts.
- Require Recipe migration slices to be executed by Tend/OpenCode, not by Codex hand edits.
- Define how Codex monitors, tunes, blocks, or hands off the Tend/OpenCode implementor.
- Define packet work as an optimization loop over packet variants, not a one-time choice of a "best" packet.
- Define a concrete trace-rich, secret-redacted `GoalAnalysisRecord`.
- Require periodic goal analysis at specific checkpoints.
- Distinguish implementation progress, migration progress, packet-family candidate evidence, and audit-promoted 20x evidence.
- Define stop/go status rules for missing proof, missing store health, failed validation, stale/flickering targets, trace-capture risk, or incomplete accounting.
- Keep analysis payloads trace-rich, secret-redacted and compatible with framework recipe observations.

**Non-Goals:**

- Implement the packet sidecar.
- Implement the Recipe authoring API cut.
- Replace the child OpenSpec changes.
- Add a new public command surface.
- Claim 20x globally or automatically from completed tasks.
- Add a second DB ledger or Tend/OpenCode DB lifecycle commands.
- Let Codex directly implement Phase B migration source edits.
- Treat Codex-authored migration edits as packet benchmark evidence.

## Decisions

### Use a parent OpenSpec change as the governance artifact

The parent tracker references the child changes and defines phase gates, analysis cadence, claim status, and stop conditions.

Rationale: OpenSpec is already the planning gate. Keeping governance there makes the sequence visible to Codex, Tend/OpenCode, and human reviewers.

Alternative considered: Add more tasks directly to both child changes. That would duplicate gate logic and make the overall program harder to inspect.

### Model the program as explicit phases

The phase state values are:

```ts
type PacketizedRecipeMigrationPhase =
  | "planned"
  | "bootstrap-implementation"
  | "bootstrap-external-proof"
  | "migration-preview"
  | "migration-active"
  | "completion-analysis"
  | "blocked"
```

Rationale: The hard demarcation becomes a status value that can be reported and tested.

Alternative considered: Let each apply session decide whether to proceed. That would reintroduce drift.

### Define the goal analysis record

The governance tracker uses a trace-rich, secret-redacted record shape:

```ts
interface GoalAnalysisRecord {
  readonly schemaVersion: string
  readonly changeId: string
  readonly phase: PacketizedRecipeMigrationPhase
  readonly childChangeStatuses: Record<string, "not-started" | "apply-ready" | "in-progress" | "complete" | "blocked">
  readonly gateStatus: Record<string, "unknown" | "passed" | "failed" | "not-required">
  readonly packetFamily?: string
  readonly packetLoopState?: "not-started" | "shadow" | "preview" | "active" | "complete" | "blocked" | "failed-validation" | "budget-exhausted" | "needs-human" | "stale" | "unsafe"
  readonly selectedTotal?: number
  readonly selectedRemaining?: number
  readonly cleared?: number
  readonly stale?: number
  readonly flicker?: number
  readonly refused?: number
  readonly failedValidation?: number
  readonly tokenTelemetry?: BoundedTelemetrySummary
  readonly commandTelemetry?: BoundedTelemetrySummary
  readonly baselineComparison?: BaselineComparisonSummary
  readonly validationTargets: readonly string[]
  readonly validationStatus: "not-run" | "passed" | "failed" | "blocked"
  readonly storeHealth: "unknown" | "not-required" | "healthy" | "unhealthy"
  readonly observationIds: readonly string[]
  readonly claimStatus: "not-started" | "insufficient-evidence" | "blocked" | "candidate" | "audit-promoted"
  readonly blockers: readonly string[]
  readonly nextAction: string
}
```

Rationale: Later implementation agents need exact fields for analysis instead of prose notes.

Alternative considered: Use free-form handoff summaries only. That would make claim status hard to audit.

### Make Tend/OpenCode the Phase B implementor

Phase B is not "Codex with a packet checklist." It is an optimization loop where Tend/OpenCode performs the migration slices and emits trace, token, tool-call, command, selected-target, validation, and observation data into the framework DB.

Codex responsibilities in Phase B are limited to:

- Verifying gates.
- Starting or resuming Tend/OpenCode packetized apply/benchmark runs.
- Reading and analyzing `framework_event.recipe_observation`.
- Revising packet variants, selectors, repair fastpaths, economy gates, validation ladders, and harness code when the Tend/OpenCode implementor underperforms.
- Shrinking, expanding, or blocking slices based on observed evidence.
- Preparing the handoff when the packet set appears consistently strong enough for a larger autonomous OpenCode run.

Tend/OpenCode responsibilities in Phase B include:

- Evaluating packet-variant hypotheses over selected-target scopes.
- Applying source edits for migration slices.
- Running selected-target checks and validation ladders.
- Recording command/tool/token/reasoning-trace telemetry and DB-backed observations.
- Producing packet-family and packet-variant evidence for candidate or audit-promoted claims.

Any Recipe migration source edit made directly by Codex outside Tend/OpenCode is contaminated for benchmark purposes. The governance tracker must mark the affected slice as unscored, reverted, or replay-required.

Rationale: The program is trying to measure whether the packetized Tend/OpenCode implementor can produce the 20x result, not whether a raw Codex session can complete the migration.

Alternative considered: Allow Codex to do small "obvious" migration edits and record them. That invalidates the benchmark because it changes the implementor under measurement.

### Optimize over packet variants, not packet selection

Packet families are the search space, not the answer. A family or dense source file becomes useful only after a packet variant repeatedly proves that its selector, repair path, validation ladder, and selected-target judge clear real targets with good all-in telemetry.

Each optimizer iteration records:

- Packet family and variant identity.
- Optimization hypothesis and prerequisites.
- Source or package slice.
- Selected-target before/current status from `framework_event.recipe_observation`.
- Command, tool-call, token, validation, and exposed reasoning-trace telemetry for the Tend/OpenCode implementor run.
- Benchmark classification such as exploratory probe, rejected variant, candidate, or audit-promoted evidence.
- Optimizer action: reject, revise selector, add oracle, change validation ladder, replay, shrink, expand, or hand off.

A rejected variant is not failure to hide. It is optimizer evidence that updates packet geometry or harness behavior. The governance tracker must not scale a variant merely because it had high target density, and must not count exploratory delegated edits as the packet arm.

Rationale: The goal is to create the packet/framework combination that reliably approaches the 10-20x band with 20x as the target. That requires iterative packet improvement, not choosing a packet once and defending it.

Alternative considered: Select the densest packet family and migrate it. The current source-path evidence showed that this games the denominator when selectors are too broad or repair fastpaths are not yet true packets.

### Require periodic analysis at concrete checkpoints

Goal analysis records are required:

- After each child artifact set becomes apply-ready.
- Before implementation phases.
- After bootstrap validation.
- After external fingerprint/harness proof.
- Before active packet mode.
- Before each packet family or packet variant begins.
- After each packet family or packet variant completes, blocks, fails, is rejected, or hands off.
- After each validation ladder.
- At final handoff/completion.
- Immediately on a gate failure.

Rationale: Evidence should be recorded near the work, not reconstructed at the end.

Alternative considered: Only write a final completion report. That would not catch premature migration, stale targets, or weak accounting early enough.

### Separate progress status from claim status

The tracker separately records:

- Implementation progress: child artifact and task state.
- Migration progress: packet loop and selected-target state.
- Candidate evidence: target counts, clears, stale/flicker/refusal counts, telemetry, validation, baseline comparison, and observation IDs.
- Audit-promoted evidence: paired accounting, selected-target status, reasoning-bearing/autofix separation, validation, trace completeness, trace-completeness bounds, and applicable holdout or negative-control status.

Claim status values are:

```ts
type ClaimStatus =
  | "not-started"
  | "insufficient-evidence"
  | "blocked"
  | "candidate"
  | "audit-promoted"
```

Rationale: A migration can succeed while the 20x claim remains insufficient or blocked.

Alternative considered: Treat completed migration tasks as the claim. That would overstate evidence.

### Keep analysis trace-rich, secret-redacted

Analysis should contain enough exposed runtime detail to audit the optimization loop:

- Counts.
- Paths.
- Hashes.
- Target IDs.
- Packet IDs.
- Observation IDs.
- Validation command names.
- Source spans or fingerprints.
- Status enums.
- Exposed prompts and task prompts when available.
- Command stdout and stderr.
- Tool-call inputs, outputs, durations, and statuses.
- Token telemetry, including whether values are provider-native, parser-derived, or estimated.
- Structured reasoning summaries and reasoning phases exposed by the runtime or derived from visible prompt/output.
- Patch, diff, source, compiler, and validation excerpts when they are needed to explain packet behavior.

Analysis should redact obvious secret-shaped values before durable storage. Hidden assistant chain-of-thought is not a required durable artifact; structured exposed reasoning traces and summaries are the auditable substitute unless a runtime explicitly exposes more detail.

Rationale: This matches the current requirement that the DB be the source of truth for optimizing Tend/OpenCode packet loops.

Alternative considered: Store only bounded summaries. That is insufficient for auditing live token, tool-call, validation, and exposed reasoning-trace efficiency.

### Hand off before the full autonomous run

Codex should not keep scaling slices indefinitely. Once DB-backed slice evidence shows packet variants are stable, Tend/OpenCode can clear selected targets, telemetry quality is adequate, validation ladders are reliable, and claim status is at least a credible `candidate` for the scoped families, Codex prepares a handoff instead of starting the full repo-wide migration itself.

The handoff must include:

- Latest fingerprint and harness proof.
- Store health and SQL pipeline proof.
- Packet families and variants ready for larger execution.
- Families that must remain preview/human-reviewed.
- Recent target counts, clears, stale/flicker/refusal/failure counts.
- Token/tool/command telemetry and comparison basis.
- Validation ladder status.
- Exact command for the user to start the full Tend/OpenCode run.
- Claim status and evidence gaps.

Rationale: The user owns the decision to start the full autonomous OpenCode run after reviewing DB-backed evidence.

## Risks / Trade-offs

- [Risk] Governance becomes busywork. -> Mitigation: Require analysis only at phase boundaries, packet-family transitions, validation ladders, handoff, and failure points.
- [Risk] The Recipe migration starts before bootstrap proof. -> Mitigation: Mark phase `blocked` unless external fingerprint and harness proof are present.
- [Risk] The 20x goal is claimed from incomplete evidence. -> Mitigation: Claim status remains `insufficient-evidence` until required accounting and target status are present.
- [Risk] Parent analysis duplicates child tasks. -> Mitigation: Store summaries, statuses, IDs, blockers, and next actions, not copied task bodies.
- [Risk] Store observations are unavailable during early phases. -> Mitigation: Allow file-level OpenSpec analysis summaries before live packet mode; require store health for active packet observations.

## Migration Plan

1. Create and validate the parent OpenSpec artifacts.
2. Record an initial analysis after the three artifact sets are apply-ready.
3. During `bootstrap-packetized-openspec-apply`, maintain phase and gate status in the parent tracker.
4. After bootstrap implementation validation, record bootstrap validation analysis.
5. Run external fingerprint and harness proof outside the implementation session and record proof analysis.
6. Keep `compress-recipe-authoring-surface` in shadow/preview until parent gates pass.
7. Start only Tend/OpenCode-executed Recipe migration slices; do not perform raw Codex migration edits.
8. During active migration, record goal analysis before and after every Tend/OpenCode packet family, packet variant, and validation ladder.
9. If a slice fails to approach the 20x goal, revise packet geometry, selectors, fastpaths, economy gates, validation ladders, or harness behavior, then replay through Tend/OpenCode.
10. When packet variants appear strong enough for a larger autonomous run, stop and hand off exact Tend/OpenCode commands and DB analysis instructions to the user.
11. Produce final completion analysis that states implementation progress, migration progress, packet-family candidate evidence, and audit-promoted evidence separately.

## Open Questions

- Should the first implementation store parent analysis only in OpenSpec handoff notes, or also project it through `framework_event.recipe_observation` once the packet sidecar exists?
- What cadence should Tend/OpenCode enforce inside very long packet families beyond boundary analysis?
- Which holdout or negative-control fields should become mandatory before `audit-promoted` is allowed?
