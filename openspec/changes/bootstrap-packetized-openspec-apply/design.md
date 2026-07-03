## Context

The existing OpenSpec apply flow resolves a change, runs `openspec status --change <name> --json`, runs `openspec instructions apply --change <name> --json`, reads context files, implements tasks, and marks checkboxes. That is the path to preserve.

The packetized implementation must attach to the current Tend/OpenCode harness and plugin suite, including:

- `.codex/skills/openspec-*`
- `packages/tend/opencode/opencode-config/commands/`
- `packages/tend/opencode/opencode-config/plugin-packages/@attune/`
- `packages/tend/opencode/opencode-config/plugins/`
- `packages/tend/opencode/src/attune-cli.ts`
- `packages/tend/opencode/src/benchmark.ts`
- `packages/tend/opencode/src/cli-core.ts`
- `packages/tend/opencode/src/cli.ts`
- `packages/tend/opencode/src/contracts.ts`
- `packages/tend/opencode/src/measurement.ts`
- `packages/tend/opencode/src/packet-links.ts`
- `packages/tend/opencode/src/recipes.ts`
- `packages/tend/opencode/src/test-recipes.ts`
- `packages/tend/opencode/test/opencode.test.ts`

Framework observation and receipt integration must align with:

- `packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql`
- `packages/trellis/runtime/src/LocalTimescaleRecipe.ts`
- `packages/trellis/runtime/src/RecipeReceiptStore.ts`
- `packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts`
- `packages/trellis/runtime/src/MeasurementObservation.ts`
- `packages/trellis/runtime/src/ProgramFactStore.ts`
- `packages/trellis/runtime/src/ProgramFactRuntime.ts`
- `packages/trellis/runtime/src/RecipeKernel.ts`
- `packages/trellis/runtime/src/SqlRoute.ts`

The implementation should reuse existing measurement specs and runtime observation concepts: DB-backed recipe observations, typed measurement projections, framework-managed local store lifecycle, command observations, sanitized trace inventory, and report projections through the framework store. It must not introduce a Tend-specific durable packet ledger before using `framework_event.recipe_observation`.

This bootstrap change enables the Phase B implementor boundary. Codex may build and repair the Tend/OpenCode harness in Phase A. After external proof passes, Tend/OpenCode must execute the Recipe migration slices whose efficiency is being measured; Codex monitors, analyzes DB observations, optimizes packet variants over slices, fixes harness defects, and prepares handoff.

## Goals / Non-Goals

**Goals:**

- Preserve the public `/attune-fingerprint` and `/openspec-*` slash command names.
- Add a packet sidecar behind `/openspec-apply`.
- Provide internal CLI/debug commands for packetized apply, status, and loop execution.
- Make shadow, preview, and active mode semantics precise.
- Define bootstrapped packet contracts only large enough for the Recipe API cut harness.
- Carry packet optimizer metadata so variants can be rejected, revised, replayed, expanded, or handed off from DB-backed evidence.
- Add conservative packet economy gates that prevent tiny or unstable slices from regressing.
- Add a single packet loop API with terminal states and next action.
- Prove packaging, command, skill, plugin, sidecar, and trace-completeness through external Tend/OpenCode JSON proof.
- Require framework store health for live active packet execution.
- Emit active packet observations through `framework_event.recipe_observation`.
- Preserve trace-capture boundaries for observations, analysis, harness output, and telemetry.
- Ensure Phase B cannot treat Codex as the migration implementor for scored Recipe migration slices.

**Non-Goals:**

- Add a new user-facing slash command as the primary workflow.
- Implement the Recipe authoring API cut.
- Rename Trellis to Framework.
- Implement the full Framework compiler.
- Implement `recipe.loop`.
- Redesign the whole packet protocol.
- Let Tend/OpenCode administer DB lifecycle.
- Add product-specific durable packet ledgers before using the framework observation spine.
- Provide a loophole for raw Codex implementation of the Recipe authoring migration.

## Decisions

### Preserve slash commands and add internal packet debug commands

The public command surface remains:

```text
/attune-fingerprint
/openspec-propose
/openspec-apply
/openspec-explore
/openspec-archive
/openspec-sync-specs
/openspec-status
/openspec-validate
```

The packetized path is a sidecar behind `/openspec-apply`. Internal CLI/debug commands may exist for tests and automation:

```bash
tend-opencode openspec apply-packetized --change <change> --mode shadow --format json
tend-opencode openspec apply-packetized --change <change> --mode preview --format json
tend-opencode openspec apply-packetized --change <change> --mode active --format json
tend-opencode openspec packet-status --change <change> --format json
tend-opencode openspec packet-loop --change <change> --until complete --format json
```

Rationale: Operators keep the known `/openspec-apply` workflow while tests and Tend/OpenCode harnesses get deterministic JSON surfaces.

Alternative considered: Introduce `/openspec-packet-apply`. That would fragment the workflow and make it easier for the Recipe migration to bypass the intended public command.

### Use Tend/OpenCode as the harness

The implementation extends the existing Tend/OpenCode harness and plugin suite. It should copy, wrap, or branch the current OpenSpec apply path rather than inventing a parallel tool.

Rationale: The repo already contains OpenSpec skills, OpenCode command docs, plugin packages, plugin config, Tend/OpenCode CLI code, benchmark/measurement surfaces, and tests.

Alternative considered: Build a generic OpenSpec packet runner. That would discard current plugin/harness proof and create a second workflow surface.

### Preserve the measured implementor boundary

Bootstrap implementation can be ordinary Codex work because it is building the harness. Recipe migration implementation cannot be ordinary Codex work because the program is measuring Tend/OpenCode packetized execution.

The harness must therefore make it possible to:

- Start bounded Tend/OpenCode packet slices.
- Capture Tend/OpenCode command, tool-call, token, validation, and exposed reasoning-trace telemetry.
- Emit Tend/OpenCode selected-target status and observations into the framework DB.
- Distinguish Tend/OpenCode-implemented clears from raw Codex edits.
- Mark any raw Codex migration edit as unscored contamination requiring replay before candidate or audit-promoted evidence.

Rationale: A 20x packetization result is only meaningful if the same implementor being benchmarked performs the migration work.

### Define precise packetized apply modes

`shadow`:

- Resolves the change.
- Reads normal OpenSpec apply context.
- Discovers packet candidates.
- Scores packet economy.
- Emits trace-rich, secret-redacted observations if possible.
- Performs no packet source edits.
- Is DB-independent unless an observation store is available.

`preview`:

- Performs everything in shadow.
- Computes repair plans and validation ladders.
- Performs no packet source edits.
- Reports whether active mode would be allowed and which gates are missing.

`active`:

- Requires fingerprint proof.
- Requires harness proof.
- Requires plugin proof.
- Requires packet sidecar self-test.
- Requires explicit active-mode capability.
- Requires framework store health.
- Applies eligible packet repairs.
- Runs selected-target checks.
- Runs validation ladders.
- Emits recipe observations/receipts.
- Updates task/progress projections from receipts.

Rationale: Mode semantics must be testable. Shadow and preview can safely improve visibility before live packet edits are trusted.

Alternative considered: A boolean `packetized` flag. That would blur edit behavior and proof requirements.

### Use bootstrapped packet contracts

This change introduces minimal contracts, separate from any later Framework packet redesign:

```ts
interface OpenSpecPacketCandidate {
  readonly schemaVersion: string
  readonly changeId: string
  readonly taskId?: string
  readonly packetFamilyCode: string
  readonly packetVariant?: string
  readonly optimizerIteration?: number
  readonly optimizationHypothesis?: string
  readonly optimizerPrerequisites?: readonly string[]
  readonly title: string
  readonly selectorSummary: string
  readonly targetEstimate: number
  readonly targetExamples: readonly PacketTargetPreview[]
  readonly repairability: "codeAction" | "astEdit" | "materialize" | "guided" | "agent" | "human" | "refuse"
  readonly risk: "safe" | "needs-review" | "unsafe"
  readonly staleRisk: "low" | "medium" | "high"
  readonly validationTargets: readonly string[]
  readonly allowedFiles: readonly string[]
  readonly forbiddenFiles: readonly string[]
  readonly economy: PacketEconomyEstimate
  readonly reason: string
  readonly optimizationStatus?: "unscored" | "exploratory" | "needs-oracle" | "rejected" | "candidate" | "audit-promoted"
  readonly optimizerAction?: string
}

interface PacketEconomyEstimate {
  readonly decision: "raw-task" | "shadow" | "preview" | "active"
  readonly targetCount: number
  readonly targetDensity: number
  readonly repeatedEditShape: boolean
  readonly safeFixDensity: number
  readonly validationCost: "cheap" | "medium" | "expensive"
  readonly staleRisk: "low" | "medium" | "high"
  readonly expectedSavings: "negative" | "low" | "medium" | "high"
  readonly reason: string
}

interface PacketLoopStatus {
  readonly mode: "shadow" | "preview" | "active"
  readonly state: PacketLoopState
  readonly selectedTotal: number
  readonly selectedRemaining: number
  readonly cleared: number
  readonly stale: number
  readonly flicker: number
  readonly refused: number
  readonly failedValidation: number
  readonly validationTargets: readonly string[]
  readonly observationIds: readonly string[]
  readonly nextAction: string
}
```

Rationale: The Recipe API cut needs candidate discovery, economy decisions, loop status, selected-target counts, validation targets, and observation IDs. It does not need a full packet protocol rewrite.

Alternative considered: Expand Trellis protocol broadly now. That would overfit the bootstrap and delay the first measured migration.

### Score packet variants inside the harness

The packet sidecar must support an optimizer loop, not just packet selection. A packet family can have multiple variants across iterations, each with a hypothesis, prerequisites, score, and next action. Tend/OpenCode owns the scoring path by joining selected-target observations and command observations through the framework SQL pipeline and emitting benchmark analysis back to `framework_event.recipe_observation`.

Score-only packet-loop passes may exist for timing-safe analysis when the observed implementation command is written after the packet run completes. Score-only passes must not apply source edits.

Rationale: External metrics scripts and post-hoc packet selection encourage gaming. The actual harness must own token efficiency, tool-call counts, selected-target deltas, validation status, and variant rejection or promotion.

Alternative considered: Pick the densest packet family and score it externally. The source-path slices showed that density can be misleading when selectors include non-removable targets or the repair path is not a true packet fastpath.

### Make packet economy conservative

Economy decisions use at least:

- Target count.
- Target density.
- Repeated edit shape.
- Safe/guided repairability.
- Stale/flicker risk.
- Validation target cost.
- Blast radius.
- Allowed/forbidden file scope.
- Human-review risk.
- Prior family and variant performance if available.

Default decisions are conservative:

- Tiny, unstable, ambiguous, human-review-heavy, high-blast-radius, or high-validation-cost candidates stay `raw-task` or `shadow`.
- High-density deterministic/guided families may move to `preview`.
- `active` is possible only after all proof, capability, store, and trace-capture gates pass.

Rationale: Packetization has fixed overhead; small slices can regress.

Alternative considered: Promote any repeated pattern to active mode. That would weaken the measurement claim and risk unsafe edits.

### Use one packet loop API instead of a separate goal abstraction

OpenCode does not need a Codex goal analog. Packet execution is expressed by loop state:

```ts
type PacketLoopState =
  | "not-started"
  | "shadow"
  | "preview"
  | "active"
  | "complete"
  | "blocked"
  | "failed-validation"
  | "budget-exhausted"
  | "needs-human"
  | "stale"
  | "unsafe"
```

The loop stops on:

- Selected targets clear.
- Validation failure.
- Stale/flicker over threshold.
- No safe repair.
- Human review required.
- Missing fingerprint, harness, or plugin proof.
- Missing framework store health for active mode.
- Privacy violation.
- Budget exhaustion.
- User interruption.

Every loop result includes `nextAction`.

Rationale: The packet loop itself provides the operational goal: selected targets clear and judge requirements pass.

Alternative considered: Add a generic goal tracker to OpenCode. That would be broader than the bootstrap need.

### Separate harness proof from store health

Fingerprint and harness self-test must be parseable JSON and DB-independent. They prove packaging, commands, skills, plugin visibility, hook exercise, packet sidecar installation, sidecar self-test, and trace completeness.

Live active packet mode separately requires framework store health.

Rationale: A developer should be able to prove the harness even when the local store is down, but active packet edits need receipt/observation durability.

Alternative considered: Require DB reachability for all proof. That would entangle packaging proof with local store lifecycle and tempt Tend/OpenCode to grow DB commands.

### Preserve framework DB/store ownership

Tend/OpenCode is the observation producer and harness. Framework runtime owns store lifecycle. Active packet observations use:

```text
framework_core
framework_event
framework_view
framework_event.recipe_observation
```

Rationale: This aligns with the existing recipe receipt spine and measurement projections.

Alternative considered: Add a Tend-specific packet ledger. That would create an unauthorized durable store path.

## Risks / Trade-offs

- [Risk] Packet sidecar contracts become a second public ontology. -> Mitigation: Keep them bootstrapped, JSON-contract-focused, and separate from the later Framework packet redesign.
- [Risk] Active mode begins without sufficient proof. -> Mitigation: Require external fingerprint/harness proof, plugin proof, sidecar self-test, explicit active capability, store health, and trace-capture checks.
- [Risk] Harness output is too thin to audit packet efficiency, or leaks secret-shaped values. -> Mitigation: persist rich exposed command, tool, token, validation, and reasoning-trace records in the framework observation spine while redacting obvious credentials and keys.
- [Risk] Low-density tasks regress. -> Mitigation: Conservative economy defaults keep them in raw task or shadow mode.
- [Risk] Store unavailability blocks useful planning. -> Mitigation: Shadow, preview, fingerprint, and harness proof stay DB-independent; only active mode needs store health.

## Migration Plan

1. Inventory existing OpenSpec skill directories, OpenCode command docs, plugin packages, plugin config, Tend/OpenCode implementation files, Tend/OpenCode tests, and framework runtime/store surfaces.
2. Add bootstrapped JSON contracts and validators for candidates, economy estimates, loop status, proof records, and sidecar self-test.
3. Extend the current OpenSpec apply path with a sidecar in shadow mode.
4. Add preview mode repair-plan and validation-ladder planning without source edits.
5. Add active-mode scaffolding behind explicit capability gates and framework store health.
6. Add fingerprint/harness fields and tests proving required command, skill, plugin, hook, sidecar, self-test, and trace-completeness conditions.
7. Add packet economy and loop terminal-state tests.
8. Add framework-store observation insertion/query tests for active mode.
9. Run strict OpenSpec and Tend/OpenCode validation.
10. Produce a handoff that states whether `compress-recipe-authoring-surface` remains blocked or may proceed through packetized apply with Tend/OpenCode as implementor.
11. Include the exact Tend/OpenCode shadow/preview/active commands needed for source-scoped slices and the exact DB observations/queries used to analyze them.

Rollback keeps ordinary OpenSpec apply available by disabling the sidecar or forcing `raw-task`/`shadow`.

## Open Questions

- Which explicit configuration flag should unlock active packet mode in Tend/OpenCode?
- What initial stale/flicker thresholds should Phase A enforce?
- Which exact store-health probe should active mode require: SQL route check, receipt-store write/read, observation insert/query, or all of them?
