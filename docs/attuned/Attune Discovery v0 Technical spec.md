**Status:** updated technical architecture spec  
**Primary stack:** Effect, Effect Experimental EventLog/EventGroup, Effect Experimental Reactivity, Drizzle/Postgres, `effect-atom`, Nx, CocoIndex, Pi, Joern, FoldKit
**Optional adapters:** FoldKit DevTools/OpenAPI/MCP adapters may inspect framework diagnostic/query projections, but they are not the core Attune Framework workflow surface.
**Purpose:** give an implementation agent enough structure to build the first real vertical slice without rediscovering the architecture.

---

## 0. One-sentence architecture

Attune Discovery is a durable Effect event-sourced application whose weirdest client is an LLM, whose semantic recall layer is CocoIndex, whose structural proof engine is Joern, whose freshness layer is Effect Reactivity, and whose server read side is an `effect-atom` projection graph indexed by run IDs.

Shortest operational mantra:

```txt
CocoIndex finds.
Pi proposes.
Effect validates.
Joern proves.
EventLog remembers.
Drizzle materializes.
Reactivity refreshes.
Atoms reason.
Workflow advances.
FoldKit explains.
Nx grows the app.
Humans promote.
```

The compact systems summary:

```txt
EventLog records facts.
Drizzle materializes base facts.
Reactivity announces which base facts changed.
Effect Atom derives reasoning state.
FoldKit exposes the reasoning state.
Pi emits bounded decisions.
Joern proves structural hypotheses.
Nx generators evolve the source-code grammar.
```

---


## 0.1 Sacred v0 milestone: first closed loop

Before Attune expands platform, UI, generators, Kubernetes, scheduler/admission, worker leases, budgets, worker safety, app-server exposure, or new product surfaces, v0 MUST prove one closed recall-to-proof-to-snapshot loop. The durable checklist lives in `docs/attuned/closed-loop-golden-slice-plan.md`.

The required slice is one search path, one proof path, one memory path, and one refreshed `DecisionPacket`/`WorkbenchSnapshot`:

```txt
RepoSnapshotCreated
→ CocoIndex search, or fake-CocoIndex test client
→ AnchorCards normalized
→ anchors.retrieved event
→ DecisionPacket derived
→ Pi/fixture optimizer chooses run_joern_template
→ DecisionValidator accepts
→ joern-effect runs one known template, or fake-Joern test client
→ EvidencePacket decoded/scored
→ evidence.scored event
→ WorkbenchSnapshot version increments
→ Dispatch/FoldKit renders refreshed state from projections
→ RunSummary reports duration/cache/evidence yield
```

Fake CocoIndex and fake Joern clients are valid for this proof as long as they honor the production packet contracts. This milestone explicitly excludes full CocoIndex SDK completion, full Joern DSL/proof-router catalog completion, Kubernetes apply/deploy behavior, scheduler/admission, leases, budgets, worker safety, app-server exposure, and new UI/product surfaces.

## 1. Core principles

### 1.1 The model is not the source of truth

Pi/local LLM is not allowed to directly mutate durable state.

It emits exactly one bounded command:

```ts
AgentDecision
```

The application validates that decision, routes it through exhaustive handlers, records semantic events, projects those events into durable read models, and rebuilds the next reasoning view from atoms.

The agent is a typed client of the runtime, not the runtime itself.

```txt
The agent proposes.
The runtime disposes.
```

### 1.2 Write side stays boring

The write side should be conservative and durable:

```txt
AgentDecision
  → DecisionValidator
  → AgentDecisionRouter
  → Match.discriminatorsExhaustive("kind")
  → DecisionHandler
  → DiscoveryEvents semantic facade
  → Effect EventLog
  → SqlEventJournal/Postgres
```

Rules:

- No raw EventLog writes outside `DiscoveryEventsLive`.
- No hidden writes inside atoms in v0.
- No arbitrary SQL from the agent.
- No arbitrary Joern query generation from the agent in v0.
- No rule promotion without human review.
- No direct Drizzle table imports outside `attune-discovery-memory`.
- No Pi imports inside projection/read-model packages.
- No FoldKit UI messages should mutate discovery state directly.

### 1.3 Read side is a server-side projection graph

The read side should not become a pile of imperative builders.

Use `effect-atom` server-side:

```txt
Drizzle durable read model
  → base atom families
  → derived atom graph
  → decision packets
  → score features
  → plateau state
  → FoldKit scenes
  → explanation views
```

Atoms are not a database. They are ephemeral, run-scoped derived views over durable Drizzle projections.

### 1.4 Reactivity invalidates base facts; atoms derive consequences

Manual cache invalidation should not exist in v0.

Use Effect Experimental `Reactivity` as the in-process freshness bus between durable Drizzle projections and server-side atom projections.

Projection handlers announce changed domain keys:

```txt
evidence changed for run_123
run metrics changed for run_123
hypotheses changed for run_123
families changed for run_123
```

Base atoms subscribe to the same domain keys:

```ts
recentEvidenceAtom(runId)
  .pipe(Atom.withReactivity(ViewKeys.evidence(runId)))

runMetricsAtom(runId)
  .pipe(Atom.withReactivity(ViewKeys.runMetrics(runId)))
```

Derived atoms do not subscribe to Reactivity directly. They compose base atoms:

```txt
recentEvidenceAtom
  → runScoreFeaturesAtom
  → plateauAtom
  → decisionPacketAtom
  → discoveryRunSceneAtom
  → recommendedNextActionAtom
```

The rule is:

```txt
Projection handlers announce changed domain keys.
Base atoms subscribe to domain keys.
Derived atoms compose base atoms.
No one manually invalidates derived views.
```

### 1.5 Nx generators are the source-code grammar

Nx generators should make the correct architecture easy to construct.

The agent should not manually infer all files needed for a new decision, event, projection, atom, score feature, FoldKit scene, or Joern template. It should run a generator, then fill in typed TODOs.

```txt
Effect gives runtime grammar.
Nx gives source-code grammar.
The agent fills implementation inside generated boundaries.
```

### 1.6 FoldKit is both human UI and optional agent inspection surface

FoldKit is not just rendering. It is the human-readable and agent-readable inspection surface over the same atom graph used by Pi.

In the final Attune Framework posture, TypeScript language-service diagnostics
and Nx check output are the primary agent-facing workflow. FoldKit DevTools,
OpenAPI, or MCP may provide optional inspection adapters over the same
diagnostic/query projections for:

```txt
current Model
historical Models
Message history
model diffs
runtime state
schema-validated Message dispatch
time travel / replay
```

So Attune can get development-time agent analysis interfaces when useful, as
long as the FoldKit Model is backed by the atom projection graph. These
adapters do not replace package contracts, language-service diagnostics, Nx
targets, or generated framework materialization.

---

## 2. Full discovery loop

The loop:

```txt
Codebase
  ↓ repo snapshot
CocoIndex incremental AST/semantic index
  ↓ anchor cards
Vector nearest-neighbor retrieval
  ↓ candidate anchor families
Drizzle durable read model
  ↓ base atom families
Derived atom graph projects current run state
  ↓ decisionPacketAtom(runId, iteration)
Pi emits one AgentDecision
  ↓ schema decode + validation
AgentDecisionRouter exhaustive route
  ↓ handler
CocoIndex search or Joern template execution
  ↓ anchors / evidence packet / hypothesis state
DiscoveryEvents semantic facade
  ↓ Effect EventLog
SqlEventJournal/Postgres
  ↓ EventLog.group projections
Drizzle durable read model
  ↓ Reactivity.mutation(ViewKeys.*) invalidates changed domain keys
Base atoms refresh through Atom.withReactivity(ViewKeys.*)
  ↓ derived atoms recompute
score features / plateau / FoldKit scene / next DecisionPacket
  ↓
repeat until plateau, budget exhaustion, or human review
```

Expanded pipeline:

```txt
1. Repo snapshot is created.
2. CocoIndex indexes code semantically and structurally.
3. Base anchor cards are loaded or searched.
4. Existing durable projections are read through Drizzle.
5. Run-scoped atom registry evaluates decisionPacketAtom(runId, iteration).
6. Pi receives the packet and emits exactly one AgentDecision.
7. Validator checks shape, IDs, state transitions, budget, and template compatibility.
8. Router uses exhaustive pattern matching on AgentDecision.kind.
9. Handler executes deterministic work:
   - request_more_anchors → CocoIndex search
   - update_family → family update event
   - create_hypothesis → hypothesis event
   - run_joern_template → Joern proof worker
   - discard_hypothesis → discard event
   - draft_rule_candidate → draft event requiring human review
   - request_human_review → review event
10. Handler records semantic events via DiscoveryEvents.
11. EventLog persists events to SQL journal.
12. EventLog.group projection handlers update Drizzle tables.
13. Projection handlers wrap durable writes in Reactivity.mutation(ViewKeys.*).
14. Base atoms subscribed with Atom.withReactivity(ViewKeys.*) refresh.
15. Derived atom graph recomputes score features, plateau, scenes, recommendations, and next packet.
16. Workflow decides whether to continue, stop, or wait for review.
```

---

## 3. Package layout

Recommended monorepo package layout:

```txt
packages/
  attune-discovery-core/
    src/
      ids.ts
      AgentDecision.ts
      DecisionPacket.ts
      AnchorCard.ts
      AnchorFamily.ts
      MotifHypothesis.ts
      EvidencePacket.ts
      ScoreFeatures.ts
      PlateauState.ts
      RuleCandidate.ts
      Errors.ts
      index.ts

  attune-discovery-events/
    src/
      DiscoveryEventGroup.ts
      DiscoveryEventLog.ts
      DiscoveryEvents.ts
      DiscoveryEventsLive.ts
      index.ts

  attune-discovery-memory/
    src/
      drizzle/
        schema.ts
        client.ts
        migrations/
      MotifReadModel.ts
      MotifReadModelDrizzle.ts
      ProjectionCursor.ts
      index.ts

  attune-discovery-views/
    src/
      ViewKeys.ts
      DiscoveryViewRuntime.ts
      DiscoveryViewWorkspace.ts
      RunAtoms.ts
      AnchorAtoms.ts
      FamilyAtoms.ts
      HypothesisAtoms.ts
      EvidenceAtoms.ts
      ScoreAtoms.ts
      PlateauAtoms.ts
      DecisionPacketAtoms.ts
      EvidenceGraphAtoms.ts
      FoldKitAtoms.ts
      ExplainAtoms.ts
      HigherOrderAtoms.ts
      index.ts

  attune-discovery-runner/
    src/
      DiscoveryWorkflow.ts
      AgentDecisionRouter.ts
      DecisionValidator.ts
      DecisionHandler.ts
      handlers/
        RequestMoreAnchors.ts
        UpdateFamily.ts
        CreateHypothesis.ts
        RunJoernTemplate.ts
        DiscardHypothesis.ts
        DraftRuleCandidate.ts
        RequestHumanReview.ts
      index.ts

  attune-discovery-agent-pi/
    src/
      PiDecisionAgent.ts
      EmitAgentDecisionTool.ts
      DecisionPrompt.ts
      PiDecisionAgentLive.ts
      index.ts

  cocoindex-effect/
    src/
      CocoIndexClient.ts
      CocoIndexClientLive.ts
      AnchorSearch.ts
      AnchorCardCodec.ts
      index.ts

  joern-effect/
    src/
      JoernLayer.ts
      JoernTemplateExecutor.ts
      generated/
        TemplateRegistry.generated.ts
        TemplateSchemas.generated.ts
        TemplateBindings.generated.ts
        TemplateEvidence.generated.ts
      templates/
        SourceToSinkFlow.ts
        WrapperAroundPrimitive.ts
        ValidationBeforeUse.ts
        BoundaryCrossing.ts
      index.ts

  attune-foldkit-scenes/
    src/
      DiscoveryInspectorModel.ts
      DiscoveryInspectorMessage.ts
      DiscoveryRunScene.ts
      DecisionPacketScene.ts
      EvidenceGraphScene.ts
      HypothesisLineageScene.ts
      HumanReviewScene.ts
      ScoreFeaturesScene.ts
      RuleCandidateScene.ts
      DevToolsAdapterNotes.md
      index.ts

  attune-nx/
    src/generators/
      effect-service/
      event/
      decision/
      projection/
      atom-family/
      derived-atom/
      score-feature/
      decision-packet-field/
      foldkit-scene-atom/
      joern-template/
      sync-effect-layers/
```

---

## 4. Domain model

### 4.1 Branded IDs

Use branded string IDs in `attune-discovery-core`.

```ts
import * as Brand from "effect/Brand"

export type RunId = string & Brand.Brand<"RunId">
export type RepoId = string & Brand.Brand<"RepoId">
export type RepoSnapshotId = string & Brand.Brand<"RepoSnapshotId">
export type AnchorId = string & Brand.Brand<"AnchorId">
export type FamilyId = string & Brand.Brand<"FamilyId">
export type HypothesisId = string & Brand.Brand<"HypothesisId">
export type EvidencePacketId = string & Brand.Brand<"EvidencePacketId">
export type RuleCandidateId = string & Brand.Brand<"RuleCandidateId">
export type AgentDecisionId = string & Brand.Brand<"AgentDecisionId">
export type TemplateId = string & Brand.Brand<"TemplateId">
```

### 4.2 AnchorCard

CocoIndex returns semantic code search results, but Attune normalizes them into `AnchorCard`.

```ts
export interface AnchorCard {
  readonly anchorId: AnchorId
  readonly repoSnapshotId: RepoSnapshotId
  readonly filePath: string
  readonly language: "typescript" | "tsx" | "javascript" | "jsx" | string
  readonly symbolName?: string
  readonly kind:
    | "function"
    | "method"
    | "component"
    | "hook"
    | "class"
    | "type"
    | "callsite"
    | "module"
    | "unknown"
  readonly code: string
  readonly startLine: number
  readonly endLine: number
  readonly embeddingText: string
  readonly semanticTags: ReadonlyArray<string>
  readonly structuralTags: ReadonlyArray<string>
}
```

Anchor cards are the shared boundary between CocoIndex, atom views, Pi packets, FoldKit scenes, and Joern template binding.

### 4.3 AnchorFamily

```ts
export interface AnchorFamily {
  readonly familyId: FamilyId
  readonly runId: RunId
  readonly name: string
  readonly description: string
  readonly anchorIds: ReadonlyArray<AnchorId>
  readonly roles: Readonly<Record<AnchorId, string>>
  readonly status: "candidate" | "active" | "discarded" | "promoted"
  readonly semanticCoherence: number
  readonly structuralCoherence: number
  readonly noveltyScore: number
}
```

### 4.4 MotifHypothesis

```ts
export type KnownTemplateId =
  | "source_to_sink_flow"
  | "wrapper_around_primitive"
  | "validation_before_use"
  | "boundary_crossing"

export interface MotifHypothesis {
  readonly hypothesisId: HypothesisId
  readonly runId: RunId
  readonly repoSnapshotId: RepoSnapshotId
  readonly name: string
  readonly templateId: KnownTemplateId
  readonly familyIds: ReadonlyArray<FamilyId>
  readonly bindings: Readonly<Record<string, FamilyId>>
  readonly status:
    | "queued"
    | "running"
    | "proven"
    | "weak"
    | "discarded"
    | "drafted"
    | "needs_review"
  readonly scoreFeatures: {
    readonly semanticCoherence: number
    readonly structuralCoherence: number
    readonly actionability: number
    readonly novelty: number
  }
}
```

### 4.5 EvidencePacket

```ts
export interface EvidencePacket {
  readonly evidencePacketId: EvidencePacketId
  readonly runId: RunId
  readonly hypothesisId: HypothesisId
  readonly templateId: KnownTemplateId
  readonly status: "useful" | "empty" | "weak" | "failed"
  readonly files: ReadonlyArray<string>
  readonly nodes: ReadonlyArray<{
    readonly nodeId: string
    readonly label: string
    readonly code: string
    readonly filePath: string
    readonly lineNumber?: number
  }>
  readonly edges: ReadonlyArray<{
    readonly from: string
    readonly to: string
    readonly kind: string
  }>
  readonly flows: ReadonlyArray<{
    readonly sourceNodeId: string
    readonly sinkNodeId: string
    readonly pathNodeIds: ReadonlyArray<string>
  }>
  readonly precisionEstimate: number
  readonly semanticScore: number
  readonly structuralScore: number
  readonly actionabilityScore: number
}
```

### 4.6 ScoreFeatures

The score object is a first-class projection, not an ad hoc calculation.

```ts
export interface ScoreFeatures {
  readonly support: number
  readonly precisionEstimate: number
  readonly semanticCoherence: number
  readonly structuralCoherence: number
  readonly actionability: number
  readonly novelty: number
}
```

Example:

```ts
scoreFeatures: {
  support: 12,
  precisionEstimate: 0.86,
  semanticCoherence: 0.91,
  structuralCoherence: 0.88,
  actionability: 0.79,
  novelty: 0.64,
}
```

### 4.7 AgentDecision

Pi emits exactly one of these.

```ts
export type AgentDecision =
  | RequestMoreAnchorsDecision
  | UpdateFamilyDecision
  | CreateHypothesisDecision
  | RunJoernTemplateDecision
  | DiscardHypothesisDecision
  | DraftRuleCandidateDecision
  | RequestHumanReviewDecision
```

Decision variants:

```ts
export interface RequestMoreAnchorsDecision {
  readonly kind: "request_more_anchors"
  readonly query: string
  readonly purpose:
    | "expand_family"
    | "find_counterexamples"
    | "find_validators"
    | "find_sources"
    | "find_sinks"
  readonly targetFamilyId?: FamilyId
  readonly targetHypothesisId?: HypothesisId
  readonly rationale: string
}

export interface UpdateFamilyDecision {
  readonly kind: "update_family"
  readonly familyId: FamilyId
  readonly operation:
    | "accept_anchors"
    | "reject_anchors"
    | "split"
    | "merge"
    | "assign_roles"
  readonly anchorIds?: ReadonlyArray<AnchorId>
  readonly roleAssignments?: Readonly<Record<AnchorId, string>>
  readonly rationale: string
}

export interface CreateHypothesisDecision {
  readonly kind: "create_hypothesis"
  readonly name: string
  readonly templateId: KnownTemplateId
  readonly bindings: Readonly<Record<string, {
    readonly familyId: FamilyId
    readonly role: string
  }>>
  readonly priority: "low" | "medium" | "high"
  readonly rationale: string
}

export interface RunJoernTemplateDecision {
  readonly kind: "run_joern_template"
  readonly hypothesisId: HypothesisId
  readonly templateId: KnownTemplateId
  readonly rationale: string
}

export interface DiscardHypothesisDecision {
  readonly kind: "discard_hypothesis"
  readonly hypothesisId: HypothesisId
  readonly reason:
    | "low_semantic_coherence"
    | "template_slot_mismatch"
    | "insufficient_support"
    | "duplicate"
    | "contradicted_by_evidence"
    | "out_of_scope"
  readonly rationale: string
}

export interface DraftRuleCandidateDecision {
  readonly kind: "draft_rule_candidate"
  readonly hypothesisId: HypothesisId
  readonly evidencePacketIds: ReadonlyArray<EvidencePacketId>
  readonly name: string
  readonly summary: string
  readonly proposedInvariant: string
  readonly developerMessage: string
  readonly rationale: string
}

export interface RequestHumanReviewDecision {
  readonly kind: "request_human_review"
  readonly targetType: "family" | "hypothesis" | "evidence" | "rule_candidate"
  readonly targetId: string
  readonly question: string
  readonly options: ReadonlyArray<string>
  readonly recommendedOption?: string
  readonly rationale: string
}
```

---

## 5. CocoIndex integration

### 5.1 Role

CocoIndex is Attune’s semantic recall layer.

It answers:

```txt
What code might matter?
What anchors are semantically near this motif?
What local wrappers, sources, sinks, validators, and call sites exist?
```

It does not prove structural truth. Joern proves structural truth.

### 5.2 `cocoindex-effect` service

```ts
export class CocoIndexClient extends Context.Tag("@attune/CocoIndexClient")<
  CocoIndexClient,
  {
    readonly ensureIndexed: (input: {
      readonly repoSnapshotId: RepoSnapshotId
      readonly repoPath: string
    }) => Effect.Effect<void>

    readonly searchAnchors: (input: {
      readonly repoSnapshotId: RepoSnapshotId
      readonly query: string
      readonly topK: number
      readonly filters?: {
        readonly language?: string
        readonly pathPrefix?: string
        readonly kind?: string
      }
    }) => Effect.Effect<ReadonlyArray<AnchorCard>>

    readonly searchSimilarAnchors: (input: {
      readonly repoSnapshotId: RepoSnapshotId
      readonly anchorId: AnchorId
      readonly topK: number
    }) => Effect.Effect<ReadonlyArray<AnchorCard>>

    readonly getAnchor: (input: {
      readonly repoSnapshotId: RepoSnapshotId
      readonly anchorId: AnchorId
    }) => Effect.Effect<AnchorCard>
  }
>() {}
```

### 5.3 Anchor retrieval strategy

CocoIndex searches are driven by the atom-projected decision packet and Pi decisions.

Typical search intents:

```txt
find request input sources
find process execution sinks
find validators around this family
find wrappers around child_process/spawn/exec
find similar React hook cleanup patterns
find examples of this motif in tests
find counterexamples for this family
find source/sink boundary crossing candidates
```

### 5.4 Anchor ingestion event

`request_more_anchors` handler should:

```txt
1. Call CocoIndex search.
2. Normalize results into AnchorCard.
3. Emit anchors.retrieved event.
4. Projection stores anchors/search result relation in Drizzle.
5. Projection wraps writes in Reactivity.mutation(ViewKeys.anchors/families/runMetrics).
6. Anchor/family base atoms refresh.
7. Derived packet and FoldKit scenes recompute.
```

Code sketch:

```ts
export const handleRequestMoreAnchors = (
  ctx: DecisionContext,
  decision: RequestMoreAnchorsDecision,
) =>
  Effect.gen(function* () {
    const cocoindex = yield* CocoIndexClient
    const run = yield* RunContext

    const anchors = yield* cocoindex.searchAnchors({
      repoSnapshotId: run.repoSnapshotId,
      query: decision.query,
      topK: 20,
    })

    yield* ctx.events.anchorsRetrieved({
      runId: ctx.runId,
      query: decision.query,
      anchorIds: anchors.map((a) => a.anchorId),
      anchors,
      purpose: decision.purpose,
      targetFamilyId: decision.targetFamilyId,
      targetHypothesisId: decision.targetHypothesisId,
    })
  })
```

### 5.5 CocoIndex is not agent memory

CocoIndex is a retrieval substrate over code. It should not own run semantics, motif family state, hypothesis state, or evidence scoring.

---

## 6. Joern integration and code generation

### 6.1 Role

Joern proves structural hypotheses.

CocoIndex says:

```txt
This code might matter.
```

Joern says:

```txt
This relationship structurally exists.
```

### 6.2 `joern-effect` service

```ts
export class JoernTemplateExecutor extends Context.Tag(
  "@attune/JoernTemplateExecutor",
)<
  JoernTemplateExecutor,
  {
    readonly runTemplate: (input: {
      readonly repoSnapshotId: RepoSnapshotId
      readonly hypothesisId: HypothesisId
      readonly templateId: KnownTemplateId
      readonly bindings: TemplateBindings
    }) => Effect.Effect<EvidencePacket>
  }
>() {}
```

### 6.3 Generated template registry

Joern-effect uses a code generation pipeline owned by Nx.

Generated files:

```txt
packages/joern-effect/src/generated/
  TemplateRegistry.generated.ts
  TemplateSchemas.generated.ts
  TemplateBindings.generated.ts
  TemplateEvidence.generated.ts
```

Template definition shape:

```ts
export interface JoernTemplateDefinition<Bindings, Evidence> {
  readonly templateId: KnownTemplateId
  readonly name: string
  readonly description: string
  readonly bindingSchema: Schema.Schema<Bindings>
  readonly evidenceSchema: Schema.Schema<Evidence>
  readonly renderQuery: (bindings: Bindings) => string
  readonly decodeRows: (rows: unknown) => Effect.Effect<Evidence>
}
```

Example template IDs:

```txt
source_to_sink_flow
wrapper_around_primitive
validation_before_use
boundary_crossing
```

### 6.4 V0 rule: no arbitrary Joern generated by Pi

Pi may choose a known template and bind known families to slots. It may not invent arbitrary Joern queries in v0.

Good:

```json
{
  "kind": "run_joern_template",
  "hypothesisId": "hyp_123",
  "templateId": "source_to_sink_flow"
}
```

Bad:

```txt
Agent writes arbitrary Scala/Joern query string.
```

### 6.5 Joern handler

```ts
export const handleRunJoernTemplate = (
  ctx: DecisionContext,
  decision: RunJoernTemplateDecision,
) =>
  Effect.gen(function* () {
    const joern = yield* JoernTemplateExecutor
    const scorer = yield* EvidenceScorer
    const readModel = yield* MotifReadModel

    const hypothesis = yield* readModel.getHypothesis(decision.hypothesisId)

    const evidence = yield* ctx.events.joernTemplateRun(
      {
        runId: ctx.runId,
        decisionId: ctx.decisionId,
        hypothesisId: decision.hypothesisId,
        templateId: decision.templateId,
      },
      joern.runTemplate({
        repoSnapshotId: hypothesis.repoSnapshotId,
        hypothesisId: decision.hypothesisId,
        templateId: decision.templateId,
        bindings: hypothesis.bindings,
      }).pipe(
        Effect.timeout("10 minutes"),
        Effect.retry(
          Schedule.exponential("1 second").pipe(
            Schedule.compose(Schedule.recurs(2)),
          ),
        ),
      ),
    )

    const score = yield* scorer.score(evidence)

    yield* ctx.events.evidenceScored({
      runId: ctx.runId,
      hypothesisId: decision.hypothesisId,
      evidencePacketId: evidence.evidencePacketId,
      supportScore: score.support,
      structuralScore: score.structural,
      semanticScore: score.semantic,
      actionabilityScore: score.actionability,
    })
  })
```

---

## 7. EventLog and DiscoveryEvents

### 7.1 Event vocabulary

Use Effect Experimental EventGroup as the domain event vocabulary.

Events:

```txt
discovery.run.started
agent.decision.accepted
agent.decision.rejected
anchors.retrieved
family.updated
hypothesis.created
hypothesis.discarded
joern.template.started
joern.template.completed
joern.template.failed
evidence.scored
rule_candidate.drafted
human_review.requested
discovery.run.plateau_detected
discovery.run.completed
```

### 7.2 EventGroup sketch

```ts
export const DiscoveryEventGroup = EventGroup.empty
  .add({
    tag: "discovery.run.started",
    primaryKey: (p) => p.runId,
    payload: Schema.Struct({
      runId: RunIdSchema,
      repoId: RepoIdSchema,
      repoSnapshotId: RepoSnapshotIdSchema,
      seed: Schema.String,
      maxIterations: Schema.Number,
    }),
  })
  .add({
    tag: "agent.decision.accepted",
    primaryKey: (p) => p.runId,
    payload: Schema.Struct({
      runId: RunIdSchema,
      iteration: Schema.Number,
      decisionId: AgentDecisionIdSchema,
      decisionSignature: Schema.String,
      decision: AgentDecisionSchema,
    }),
  })
  .add({
    tag: "evidence.scored",
    primaryKey: (p) => p.evidencePacketId,
    payload: Schema.Struct({
      runId: RunIdSchema,
      hypothesisId: HypothesisIdSchema,
      evidencePacketId: EvidencePacketIdSchema,
      supportScore: Schema.Number,
      structuralScore: Schema.Number,
      semanticScore: Schema.Number,
      actionabilityScore: Schema.Number,
    }),
  })
```

### 7.3 DiscoveryEvents facade

Domain code should use semantic methods:

```ts
export class DiscoveryEvents extends Context.Tag("@attune/DiscoveryEvents")<
  DiscoveryEvents,
  {
    readonly runStarted: (input: RunStartedInput) => Effect.Effect<void>

    readonly withAcceptedDecision: <A, E, R>(
      input: AcceptedDecisionInput,
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E, R>

    readonly decisionRejected: (input: DecisionRejectedInput) => Effect.Effect<void>
    readonly anchorsRetrieved: (input: AnchorsRetrievedInput) => Effect.Effect<void>
    readonly familyUpdated: (input: FamilyUpdatedInput) => Effect.Effect<void>
    readonly hypothesisCreated: (input: HypothesisCreatedInput) => Effect.Effect<void>
    readonly hypothesisDiscarded: (input: HypothesisDiscardedInput) => Effect.Effect<void>

    readonly joernTemplateRun: <A extends { evidencePacketId: EvidencePacketId }, E, R>(
      input: JoernTemplateRunInput,
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E, R>

    readonly evidenceScored: (input: EvidenceScoredInput) => Effect.Effect<void>
    readonly ruleCandidateDrafted: (input: RuleCandidateDraftedInput) => Effect.Effect<void>
    readonly humanReviewRequested: (input: HumanReviewRequestedInput) => Effect.Effect<void>
    readonly plateauDetected: (input: PlateauDetectedInput) => Effect.Effect<void>
    readonly runCompleted: (input: RunCompletedInput) => Effect.Effect<void>
  }
>() {}
```

### 7.4 Only one raw writer

`DiscoveryEventsLive.ts` is the only place that calls raw EventLog client methods.

```ts
export const DiscoveryEventsLive = Layer.effect(
  DiscoveryEvents,
  Effect.gen(function* () {
    const write = yield* EventLog.makeClient(DiscoveryEventLog)

    return DiscoveryEvents.of({
      evidenceScored: (input) =>
        write("evidence.scored", input).pipe(Effect.asVoid),

      joernTemplateRun: (input, effect) =>
        Effect.gen(function* () {
          const startedAt = Date.now()

          yield* write("joern.template.started", input)

          return yield* effect.pipe(
            Effect.tap((evidence) =>
              write("joern.template.completed", {
                runId: input.runId,
                hypothesisId: input.hypothesisId,
                templateId: input.templateId,
                evidencePacketId: evidence.evidencePacketId,
                durationMs: Date.now() - startedAt,
              }),
            ),
            Effect.tapErrorCause((cause) =>
              write("joern.template.failed", {
                runId: input.runId,
                hypothesisId: input.hypothesisId,
                templateId: input.templateId,
                durationMs: Date.now() - startedAt,
                cause: String(cause),
              }),
            ),
          )
        }),
    })
  }),
)
```

---

## 8. Drizzle/Postgres durable read model

### 8.1 Role

Drizzle/Postgres owns durable projections.

```txt
EventLog is truth.
Drizzle tables are durable materialized views.
Reactivity announces projected fact changes.
Atoms are ephemeral derived views over Drizzle.
```

### 8.2 Tables

Recommended initial tables:

```txt
discovery_runs
agent_decisions
anchor_cards
anchor_search_results
anchor_families
anchor_family_members
motif_hypotheses
evidence_packets
evidence_nodes
evidence_edges
evidence_flows
evidence_scores
rule_candidates
human_review_requests
run_metrics
projection_cursors
```

### 8.3 Read model service

```ts
export class MotifReadModel extends Context.Tag("@attune/MotifReadModel")<
  MotifReadModel,
  {
    readonly getRun: (runId: RunId) => Effect.Effect<RunRow>
    readonly getRunMetrics: (runId: RunId) => Effect.Effect<RunMetrics>

    readonly listAnchorsForRun: (runId: RunId) => Effect.Effect<ReadonlyArray<AnchorCard>>
    readonly listActiveFamilies: (runId: RunId) => Effect.Effect<ReadonlyArray<AnchorFamily>>
    readonly listQueuedHypotheses: (runId: RunId) => Effect.Effect<ReadonlyArray<MotifHypothesis>>
    readonly listActiveHypotheses: (runId: RunId) => Effect.Effect<ReadonlyArray<MotifHypothesis>>
    readonly listRecentEvidence: (input: {
      readonly runId: RunId
      readonly limit: number
    }) => Effect.Effect<ReadonlyArray<EvidencePacket>>

    readonly upsertRunStarted: (input: RunStartedProjection) => Effect.Effect<void>
    readonly insertAcceptedDecision: (input: AcceptedDecisionProjection) => Effect.Effect<void>
    readonly upsertAnchorCards: (input: ReadonlyArray<AnchorCard>) => Effect.Effect<void>
    readonly recordAnchorSearch: (input: AnchorSearchProjection) => Effect.Effect<void>
    readonly upsertFamily: (input: FamilyProjection) => Effect.Effect<void>
    readonly upsertHypothesis: (input: HypothesisProjection) => Effect.Effect<void>
    readonly markHypothesisDiscarded: (input: HypothesisDiscardedProjection) => Effect.Effect<void>
    readonly insertEvidencePacket: (input: EvidencePacketProjection) => Effect.Effect<void>
    readonly insertEvidenceScore: (input: EvidenceScoreProjection) => Effect.Effect<void>
    readonly updateRunMetrics: (input: RunMetricsProjection) => Effect.Effect<void>
  }
>() {}
```

### 8.4 Projection handlers

Use `EventLog.group` handlers to update Drizzle. Wrap durable writes in `Reactivity.mutation(...)` so relevant atom base leaves refresh automatically.

```ts
import * as Reactivity from "@effect/experimental/Reactivity"

export const DiscoveryProjectionLive = EventLog.group(
  DiscoveryEventGroup,
  (handlers) =>
    handlers
      .handle("evidence.scored", ({ payload, entry }) =>
        Reactivity.mutation({
          ...ViewKeys.evidence(payload.runId),
          ...ViewKeys.runMetrics(payload.runId),
          ...ViewKeys.evidenceForHypothesis({
            runId: payload.runId,
            hypothesisId: payload.hypothesisId,
          }),
        })(
          Effect.gen(function* () {
            const readModel = yield* MotifReadModel

            yield* readModel.insertEvidenceScore({
              runId: payload.runId,
              hypothesisId: payload.hypothesisId,
              evidencePacketId: payload.evidencePacketId,
              supportScore: payload.supportScore,
              structuralScore: payload.structuralScore,
              semanticScore: payload.semanticScore,
              actionabilityScore: payload.actionabilityScore,
              createdAt: new Date(entry.createdAtMillis),
            })

            yield* readModel.updateRunMetricsFromEvidence({
              runId: payload.runId,
              evidencePacketId: payload.evidencePacketId,
            })
          }),
        ),
      ),
)
```

Projection handlers should not call `views.refreshAfterProjection`; that method should not exist in the Reactivity design.

### 8.5 Projection cursor for asynchronous projection

If EventLog projection is asynchronous, enforce a projection barrier before reading atoms in the next iteration.

```ts
export class ProjectionCursor extends Context.Tag("@attune/ProjectionCursor")<
  ProjectionCursor,
  {
    readonly awaitAtLeast: (input: {
      readonly runId: RunId
      readonly sequence: number
    }) => Effect.Effect<void>
  }
>() {}
```

Workflow rule:

```txt
If projections are async:
  event write returns sequence N
  wait until projection cursor >= N
  ensure Drizzle projection is visible
  then evaluate next decisionPacketAtom
```

Manual atom refresh is not part of this rule. Freshness is signaled by Reactivity keys during projection.

---

## 9. Effect Reactivity as the freshness layer

### 9.1 Role

Effect Experimental `Reactivity` is the in-process invalidation service between durable projection writes and atom refresh.

It is not the event log, not durable storage, not a queue, and not the source of truth.

Its role is narrow:

```txt
This projection mutated these domain keys.
Every reactive query/atom subscribed to those keys should refresh.
```

Attune uses it like this:

```txt
EventLog projection handler
  → Reactivity.mutation(ViewKeys.evidence(runId))(
      Drizzle write
    )

Base atom
  → Atom.withReactivity(ViewKeys.evidence(runId))

Derived atom
  → get(recentEvidenceAtom(runId))
```

### 9.2 Reactivity keys

Define shared domain keys in `attune-discovery-views/src/ViewKeys.ts`.

```ts
export const ViewKeys = {
  run: (runId: RunId) => ({
    run: [runId],
  }),

  runMetrics: (runId: RunId) => ({
    runMetrics: [runId],
  }),

  anchors: (runId: RunId) => ({
    anchors: [runId],
  }),

  families: (runId: RunId) => ({
    families: [runId],
  }),

  hypotheses: (runId: RunId) => ({
    hypotheses: [runId],
  }),

  hypothesis: (hypothesisId: HypothesisId) => ({
    hypothesis: [hypothesisId],
  }),

  evidence: (runId: RunId) => ({
    evidence: [runId],
  }),

  evidenceForHypothesis: (input: {
    readonly runId: RunId
    readonly hypothesisId: HypothesisId
  }) => ({
    evidenceForHypothesis: [input.runId, input.hypothesisId],
  }),

  reviewQueue: (runId: RunId) => ({
    reviewQueue: [runId],
  }),

  ruleCandidates: (runId: RunId) => ({
    ruleCandidates: [runId],
  }),
} as const
```

Keys should describe durable facts, not atom names.

Good:

```txt
ViewKeys.evidence(runId)
ViewKeys.hypotheses(runId)
ViewKeys.families(runId)
```

Avoid:

```txt
"atom:recentEvidence:run_123"
"refresh:decisionPacket"
```

The projection layer should not know which atoms exist.

### 9.3 Projection handlers use `Reactivity.mutation`

Projection handlers should wrap Drizzle writes in `Reactivity.mutation(keys)(effect)`.

```ts
export const projectHypothesisCreated = ({ payload, entry }: ProjectionInput) =>
  Reactivity.mutation({
    ...ViewKeys.hypotheses(payload.runId),
    ...ViewKeys.runMetrics(payload.runId),
  })(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel

      yield* readModel.upsertHypothesis({
        runId: payload.runId,
        hypothesisId: payload.hypothesisId,
        name: payload.name,
        templateId: payload.templateId,
        familyIds: payload.familyIds,
        priority: payload.priority,
        createdAt: new Date(entry.createdAtMillis),
      })

      yield* readModel.incrementHypothesisCount(payload.runId)
    }),
  )
```

The ordering matters:

```txt
Drizzle write succeeds
  → Reactivity invalidates keys
  → atoms refresh from updated Drizzle state
```

Avoid this:

```ts
yield* Reactivity.invalidate(ViewKeys.evidence(runId))
yield* readModel.insertEvidenceScore(...)
```

because atoms might refresh before durable state changes.

### 9.4 Base atoms use `Atom.withReactivity`

Base atoms subscribe to Reactivity keys.

```ts
export const recentEvidenceAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listRecentEvidence({ runId, limit: 50 })
    }),
  ).pipe(
    Atom.withLabel(`recentEvidence:${runId}`),
    Atom.withReactivity(ViewKeys.evidence(runId)),
  ),
)
```

Metrics:

```ts
export const runMetricsAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.getRunMetrics(runId)
    }),
  ).pipe(
    Atom.withLabel(`runMetrics:${runId}`),
    Atom.withReactivity(ViewKeys.runMetrics(runId)),
  ),
)
```

Hypotheses:

```ts
export const activeHypothesesAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listActiveHypotheses(runId)
    }),
  ).pipe(
    Atom.withLabel(`activeHypotheses:${runId}`),
    Atom.withReactivity(ViewKeys.hypotheses(runId)),
  ),
)
```

### 9.5 Derived atoms do not use Reactivity directly

Derived atoms compose base atoms.

```ts
export const runScoreFeaturesAtom = Atom.family((runId: RunId) =>
  Atom.make((get) => {
    const families = get(activeFamiliesAtom(runId))
    const hypotheses = get(queuedHypothesesAtom(runId))
    const evidence = get(recentEvidenceAtom(runId))

    return Result.all({ families, hypotheses, evidence }).pipe(
      Result.map(({ families, hypotheses, evidence }) =>
        computeScoreFeatures({ families, hypotheses, evidence }),
      ),
    )
  }).pipe(Atom.withLabel(`runScoreFeatures:${runId}`)),
)
```

Do not add `Atom.withReactivity` to every derived node. The dependency graph already carries invalidation.

### 9.6 Shared Reactivity service instance

Projection handlers and atom runtimes must share the same `Reactivity` service instance.

Bad:

```txt
Projection layer gets Reactivity.layer A.
Atom runtime gets Reactivity.layer B.
Projection invalidates A.
Atoms listen to B.
Nothing refreshes.
```

Good:

```ts
export const AppLive = Layer.mergeAll(
  Reactivity.layer,
  EventSourcingLive,
  MemoryLive,
  DiscoveryViewsLive,
  DiscoveryRunnerLive,
)
```

The app root provides one Reactivity layer to both projection code and atom evaluation.

### 9.7 Multi-process caveat

Effect Reactivity is in-process.

If projection worker A writes Drizzle and atom registry worker B owns the run view, worker B will not see the invalidation unless Attune bridges it.

V0 rule:

```txt
Keep the projection consumer and run-scoped atom registry in the same worker for active runs.
```

Later bridges:

```txt
Postgres LISTEN/NOTIFY
Effect Cluster message
EventLog projection subscription
Redis pub/sub
```

---

## 10. `effect-atom` server-side views

### 10.1 Role

Use `effect-atom` to define a server-side read/reasoning DAG.

This is not primarily client state and not UI cache.

It is the server projection layer used by:

```txt
Pi packets
FoldKit scenes
plateau detection
run summaries
score panels
human review queues
debug explanation views
external analysis agents
higher-order batch analysis
```

### 10.2 Run-scoped registry

Use one registry per active discovery run.

```ts
export class DiscoveryViewWorkspace extends Context.Tag(
  "@attune/DiscoveryViewWorkspace",
)<
  DiscoveryViewWorkspace,
  {
    readonly getDecisionPacket: (input: {
      readonly runId: RunId
      readonly iteration: number
    }) => Effect.Effect<DecisionPacket>

    readonly getPlateauState: (runId: RunId) => Effect.Effect<PlateauState>

    readonly getDiscoveryRunScene: (input: {
      readonly runId: RunId
      readonly iteration: number
    }) => Effect.Effect<FoldKitScene>

    readonly getRecommendedNextAction: (runId: RunId) => Effect.Effect<RecommendedNextAction>

    readonly inspectGraph: (runId: RunId) => Effect.Effect<ReadonlyArray<AtomGraphNode>>

    readonly disposeRun: (runId: RunId) => Effect.Effect<void>
  }
>() {}
```

There is intentionally no `refreshAfterProjection`.

```txt
Workspace owns registry lifecycle.
Reactivity owns freshness.
Atoms own dependency semantics.
```

### 10.3 Runtime

```ts
export const DiscoveryViewLayer = Layer.mergeAll(
  MotifReadModelDrizzleLive,
  ScoreModelLive,
  FoldKitSceneRendererLive,
)

export const DiscoveryRuntime = Atom.runtime(DiscoveryViewLayer)
```

### 10.4 Base atom families

Base atoms read Drizzle and subscribe to Reactivity keys.

```ts
export const runAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.getRun(runId)
    }),
  ).pipe(
    Atom.withLabel(`run:${runId}`),
    Atom.withReactivity(ViewKeys.run(runId)),
  ),
)

export const runMetricsAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.getRunMetrics(runId)
    }),
  ).pipe(
    Atom.withLabel(`runMetrics:${runId}`),
    Atom.withReactivity(ViewKeys.runMetrics(runId)),
  ),
)

export const activeFamiliesAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listActiveFamilies(runId)
    }),
  ).pipe(
    Atom.withLabel(`activeFamilies:${runId}`),
    Atom.withReactivity(ViewKeys.families(runId)),
  ),
)

export const activeHypothesesAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listActiveHypotheses(runId)
    }),
  ).pipe(
    Atom.withLabel(`activeHypotheses:${runId}`),
    Atom.withReactivity(ViewKeys.hypotheses(runId)),
  ),
)

export const recentEvidenceAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listRecentEvidence({ runId, limit: 50 })
    }),
  ).pipe(
    Atom.withLabel(`recentEvidence:${runId}`),
    Atom.withReactivity(ViewKeys.evidence(runId)),
  ),
)
```

### 10.5 Derived atoms

Derived atoms encode dependencies.

```ts
export const queuedHypothesesAtom = Atom.family((runId: RunId) =>
  Atom.make((get) => {
    const hypotheses = get(activeHypothesesAtom(runId))

    return Result.map(hypotheses, (items) =>
      items.filter((h) => h.status === "queued"),
    )
  }).pipe(Atom.withLabel(`queuedHypotheses:${runId}`)),
)
```

### 10.6 Score features atom

```ts
export const runScoreFeaturesAtom = Atom.family((runId: RunId) =>
  Atom.make((get) => {
    const families = get(activeFamiliesAtom(runId))
    const hypotheses = get(queuedHypothesesAtom(runId))
    const evidence = get(recentEvidenceAtom(runId))

    return Result.all({ families, hypotheses, evidence }).pipe(
      Result.map(({ families, hypotheses, evidence }) => {
        const usefulEvidence = evidence.filter((e) => e.status === "useful")

        return {
          support: usefulEvidence.length,
          precisionEstimate: average(usefulEvidence.map((e) => e.precisionEstimate)),
          semanticCoherence: average(hypotheses.map((h) => h.scoreFeatures.semanticCoherence)),
          structuralCoherence: average(usefulEvidence.map((e) => e.structuralScore)),
          actionability: average(usefulEvidence.map((e) => e.actionabilityScore)),
          novelty: average(families.map((f) => f.noveltyScore)),
        } satisfies ScoreFeatures
      }),
    )
  }).pipe(Atom.withLabel(`runScoreFeatures:${runId}`)),
)
```

### 10.7 Plateau atom

```ts
export const plateauAtom = Atom.family((runId: RunId) =>
  Atom.make((get) => {
    const metrics = get(runMetricsAtom(runId))
    const scoreFeatures = get(runScoreFeaturesAtom(runId))
    const evidence = get(recentEvidenceAtom(runId))

    return Result.all({ metrics, scoreFeatures, evidence }).pipe(
      Result.map(({ metrics, scoreFeatures, evidence }) => {
        const useful = evidence.filter((e) => e.actionabilityScore >= 0.7)

        const lowYield = metrics.iterations >= 30 && useful.length < 3
        const repeated = metrics.repeatedDecisionCount >= 5
        const saturated = scoreFeatures.support >= 10 && scoreFeatures.novelty < 0.2

        return {
          isPlateau: lowYield || repeated || saturated,
          reasons: [
            lowYield ? "low useful evidence yield" : undefined,
            repeated ? "repeated decision loop" : undefined,
            saturated ? "motif family saturated" : undefined,
          ].filter(Boolean),
          features: {
            support: scoreFeatures.support,
            novelty: scoreFeatures.novelty,
            usefulEvidence: useful.length,
            repeatedDecisionCount: metrics.repeatedDecisionCount,
          },
        } satisfies PlateauState
      }),
    )
  }).pipe(Atom.withLabel(`plateau:${runId}`)),
)
```

### 10.8 Decision packet atom

This is the central read-side consolidation.

```ts
export const decisionPacketAtom = Atom.family(
  (input: { runId: RunId; iteration: number }) =>
    Atom.make((get) => {
      const run = get(runAtom(input.runId))
      const families = get(activeFamiliesAtom(input.runId))
      const hypotheses = get(queuedHypothesesAtom(input.runId))
      const evidence = get(recentEvidenceAtom(input.runId))
      const scoreFeatures = get(runScoreFeaturesAtom(input.runId))
      const plateau = get(plateauAtom(input.runId))
      const recommendation = get(recommendedNextActionAtom(input.runId))

      return Result.all({
        run,
        families,
        hypotheses,
        evidence,
        scoreFeatures,
        plateau,
        recommendation,
      }).pipe(
        Result.map((state) => ({
          runId: input.runId,
          iteration: input.iteration,
          repoSnapshotId: state.run.repoSnapshotId,
          families: state.families,
          queuedHypotheses: state.hypotheses,
          recentEvidence: state.evidence,
          scoreFeatures: state.scoreFeatures,
          plateau: state.plateau,
          deterministicRecommendation: state.recommendation,
          availableActions: [
            "request_more_anchors",
            "update_family",
            "create_hypothesis",
            "run_joern_template",
            "discard_hypothesis",
            "draft_rule_candidate",
            "request_human_review",
          ] as const,
          instruction: state.plateau.isPlateau
            ? "The run may be plateauing. Prefer draft_rule_candidate or request_human_review if evidence is strong."
            : "Choose exactly one safe next action.",
        } satisfies DecisionPacket)),
      )
    }).pipe(
      Atom.withLabel(`decisionPacket:${input.runId}:${input.iteration}`),
    ),
)
```

### 10.9 FoldKit scene atom

FoldKit scenes are server-side projections over the same DAG.

```ts
export const discoveryRunSceneAtom = Atom.family(
  (input: { runId: RunId; iteration: number }) =>
    Atom.make((get) => {
      const packet = get(decisionPacketAtom(input))
      const graph = get(evidenceGraphAtom(input.runId))
      const explanation = get(recommendedNextActionAtom(input.runId))

      return Result.all({ packet, graph, explanation }).pipe(
        Result.map(({ packet, graph, explanation }) => ({
          kind: "foldkit.scene.discovery_run",
          title: `Discovery Run ${input.runId}`,
          panels: [
            { kind: "metric_strip", title: "Score features", data: packet.scoreFeatures },
            { kind: "hypothesis_queue", title: "Queued hypotheses", data: packet.queuedHypotheses },
            { kind: "recent_evidence", title: "Recent evidence", data: packet.recentEvidence },
            { kind: "evidence_graph", title: "Evidence graph", data: graph },
            { kind: "explanation", title: "Recommended next action", data: explanation },
          ],
        } satisfies FoldKitScene)),
      )
    }).pipe(Atom.withLabel(`foldkit.discoveryRun:${input.runId}`)),
)
```

### 10.10 DiscoveryViewWorkspace implementation

```ts
export const DiscoveryViewWorkspaceLive = Layer.effect(
  DiscoveryViewWorkspace,
  Effect.gen(function* () {
    const registries = new Map<RunId, Registry.Registry>()

    const registryFor = (runId: RunId): Registry.Registry => {
      let registry = registries.get(runId)
      if (!registry) {
        registry = Registry.make({ defaultIdleTTL: 60_000 })
        registries.set(runId, registry)
      }
      return registry
    }

    const getWithRegistry = <A>(runId: RunId, atom: Atom.Atom<A>) =>
      Atom.getResult(atom, { suspendOnWaiting: true }).pipe(
        Effect.provideService(Atom.AtomRegistry, registryFor(runId)),
      )

    return DiscoveryViewWorkspace.of({
      getDecisionPacket: (input) =>
        getWithRegistry(input.runId, decisionPacketAtom(input)),

      getPlateauState: (runId) =>
        getWithRegistry(runId, plateauAtom(runId)),

      getDiscoveryRunScene: (input) =>
        getWithRegistry(input.runId, discoveryRunSceneAtom(input)),

      getRecommendedNextAction: (runId) =>
        getWithRegistry(runId, recommendedNextActionAtom(runId)),

      inspectGraph: (runId) =>
        Effect.sync(() => {
          const registry = registryFor(runId)
          return Array.from(registry.getNodes().values()).map((node) => ({
            label: String(node),
          }))
        }),

      disposeRun: (runId) =>
        Effect.sync(() => {
          const registry = registries.get(runId)
          if (registry) {
            registry.dispose()
            registries.delete(runId)
          }
        }),
    })
  }),
)
```

Key rule:

```txt
Workspace owns registry lifecycle.
Reactivity owns freshness.
Atoms own derived dependencies.
```

---

## 11. Pi agent integration

### 11.1 Role

Pi is the bounded decision client.

It receives `DecisionPacket` and emits exactly one `AgentDecision` through a tool.

### 11.2 Tool shape

```ts
export const emitAgentDecisionTool: AgentTool<typeof EmitAgentDecisionParams> = {
  name: "emit_agent_decision",
  label: "Emit Agent Decision",
  description: "Emit exactly one safe Attune Discovery state transition.",
  parameters: EmitAgentDecisionParams,
  execute: async (_toolCallId, params) => {
    return {
      terminate: true,
      content: [
        { type: "text", text: "AgentDecision accepted for validation." },
      ],
      details: params,
    }
  },
}
```

### 11.3 PiDecisionAgent service

```ts
export class PiDecisionAgent extends Context.Tag("@attune/PiDecisionAgent")<
  PiDecisionAgent,
  {
    readonly decide: (packet: DecisionPacket) => Effect.Effect<AgentDecision>
  }
>() {}
```

### 11.4 Validation sandwich

Even if Pi/tool schemas validate, still validate the final `AgentDecision` with Effect Schema.

```txt
model/tool output
  → schema decode
  → domain validator
  → budget validator
  → state transition validator
  → router
```

Retry at most 1–2 times if schema validation fails.

---

## 12. AgentDecisionRouter

### 12.1 Exhaustive routing

```ts
export const AgentDecisionRouterLive = Layer.effect(
  AgentDecisionRouter,
  Effect.gen(function* () {
    const validator = yield* DecisionValidator
    const events = yield* DiscoveryEvents

    const routeAcceptedDecision = (ctx: {
      runId: RunId
      iteration: number
      decisionId: AgentDecisionId
      decision: AgentDecision
    }) =>
      pipe(
        Match.value(ctx.decision),
        Match.discriminatorsExhaustive("kind")({
          request_more_anchors: (decision) =>
            handleRequestMoreAnchors({ ...ctx, events }, decision),

          update_family: (decision) =>
            handleUpdateFamily({ ...ctx, events }, decision),

          create_hypothesis: (decision) =>
            handleCreateHypothesis({ ...ctx, events }, decision),

          run_joern_template: (decision) =>
            handleRunJoernTemplate({ ...ctx, events }, decision),

          discard_hypothesis: (decision) =>
            handleDiscardHypothesis({ ...ctx, events }, decision),

          draft_rule_candidate: (decision) =>
            handleDraftRuleCandidate({ ...ctx, events }, decision),

          request_human_review: (decision) =>
            handleRequestHumanReview({ ...ctx, events }, decision),
        }),
      )

    return AgentDecisionRouter.of({
      route: ({ runId, iteration, decision }) =>
        Effect.gen(function* () {
          yield* validator.validate({ runId, iteration, decision })

          const decisionId = newId("decision")
          const decisionSignature = makeDecisionSignature(decision)

          yield* events.withAcceptedDecision(
            { runId, iteration, decisionId, decisionSignature, decision },
            routeAcceptedDecision({ runId, iteration, decisionId, decision }),
          )
        }),
    })
  }),
)
```

### 12.2 Validation rules

Validate:

```txt
- decision kind exists
- referenced run exists
- referenced family/hypothesis/evidence IDs exist
- target is in valid status
- template ID is known
- template bindings are compatible
- action is within budget
- decision signature is not repeated too often
- draft_rule_candidate has enough evidence
- request_human_review has a concrete target
- human-gated actions do not auto-promote
```

---

## 13. Workflow

### 13.1 Long-running run loop

```ts
export const runDiscovery = (input: {
  runId: RunId
  repoId: RepoId
  repoSnapshotId: RepoSnapshotId
  seed: string
  maxIterations: number
}) =>
  Effect.gen(function* () {
    const events = yield* DiscoveryEvents
    const cocoindex = yield* CocoIndexClient
    const views = yield* DiscoveryViewWorkspace
    const agent = yield* PiDecisionAgent
    const router = yield* AgentDecisionRouter

    yield* events.runStarted(input)

    yield* cocoindex.ensureIndexed({
      repoSnapshotId: input.repoSnapshotId,
      repoPath: yield* resolveRepoPath(input.repoSnapshotId),
    })

    let reason: "plateau" | "budget_exhausted" | "completed" | "failed" = "completed"
    let finalIteration = 0

    for (let iteration = 1; iteration <= input.maxIterations; iteration++) {
      finalIteration = iteration

      const packet = yield* views.getDecisionPacket({
        runId: input.runId,
        iteration,
      })

      const decision = yield* agent.decide(packet)

      yield* router.route({
        runId: input.runId,
        iteration,
        decision,
      })

      const plateau = yield* views.getPlateauState(input.runId)

      if (plateau.isPlateau) {
        reason = "plateau"
        yield* events.plateauDetected({
          runId: input.runId,
          iteration,
          reason: plateau.reasons.join(", "),
        })
        break
      }
    }

    yield* events.runCompleted({
      runId: input.runId,
      iterations: finalIteration,
      reason,
    })

    yield* views.disposeRun(input.runId)

    return { runId: input.runId, iterations: finalIteration, reason }
  })
```

### 13.2 Iteration composition

```txt
get decisionPacketAtom
  → Pi decide
  → router.route
  → events persisted
  → projections update Drizzle inside Reactivity.mutation(keys)
  → base atoms refresh through Atom.withReactivity(keys)
  → plateauAtom / score atoms recompute
  → continue/stop
```

---

## 14. FoldKit

### 14.1 Role

FoldKit is not just a client-side renderer.

It is the explanation surface for server-side projection views.

Server atom graph produces FoldKit scene data:

```txt
decisionPacketAtom
scoreFeaturesAtom
plateauAtom
evidenceGraphAtom
recommendedNextActionAtom
  → discoveryRunSceneAtom
  → FoldKit
```

### 14.2 Scene types

Initial scenes:

```txt
discovery_run_scene
hypothesis_detail_scene
evidence_graph_scene
human_review_scene
score_features_scene
decision_packet_scene
rule_candidate_scene
batch_comparison_scene
```

### 14.3 FoldKit scene should be derived, not imperative

Do not build scenes by manually querying Drizzle again.

Use atom dependencies.

---

## 15. FoldKit DevTools as an optional analysis adapter

### 15.1 Product insight

FoldKit can expose a running app to AI agents through DevTools, OpenAPI, or a
future MCP adapter.

That adapter path is not the core Attune Framework workflow for v0. Agents
start from language-service diagnostics and Nx output, then repair
`src/attune.package.ts`, generated framework source, Effect Schema metadata,
and package atom/Reactivity views.

If the FoldKit Model is backed by the atom projection graph and framework
diagnostic/query projections, external agents can inspect Attune runs through
the running app without reading protocol store internals or checked-in report
artifacts.

```txt
EventLog
  → Drizzle
  → Reactivity
  → Atom graph
  → FoldKit Model
  → FoldKit DevTools
  → optional DevTools/OpenAPI/MCP adapter
  → external AI agent
```

### 15.2 What external agents get

Through an optional FoldKit inspection adapter, agents can inspect and interact
with the running app:

```txt
foldkit_list_runtimes
foldkit_get_model
foldkit_get_model_at
foldkit_get_init
foldkit_get_runtime_state
foldkit_list_messages
foldkit_count_messages_by_tag
foldkit_diff_models
foldkit_get_message
foldkit_list_keyframes
foldkit_replay_to_keyframe
foldkit_resume
foldkit_get_message_schema
foldkit_dispatch_message
```

This gives agents:

```txt
current run model
historical model snapshots
message history
model diffs
time-travel
schema-validated message dispatch
```

### 15.3 FoldKit Model should be an inspector model

Do not let the FoldKit `Model` become arbitrary UI state only.

It should be an inspection model over the discovery run.

```ts
export interface DiscoveryInspectorModel {
  readonly selectedRunId: RunId | null
  readonly selectedIteration: number | null
  readonly selectedHypothesisId: HypothesisId | null
  readonly selectedEvidencePacketId: EvidencePacketId | null

  readonly runOverview: Result.Result<RunOverview, ViewError>
  readonly decisionPacket: Result.Result<DecisionPacket, ViewError>
  readonly scoreFeatures: Result.Result<ScoreFeatures, ViewError>
  readonly plateau: Result.Result<PlateauState, ViewError>
  readonly hypothesisQueue: Result.Result<ReadonlyArray<MotifHypothesis>, ViewError>
  readonly evidenceGraph: Result.Result<EvidenceGraph, ViewError>
  readonly lineage: Result.Result<LineageView, ViewError>

  readonly inspector: {
    readonly mode:
      | "live"
      | "replay"
      | "compare"
      | "hypothesis"
      | "evidence"
      | "rule_candidate"

    readonly expandedPanels: ReadonlyArray<string>
    readonly filters: {
      readonly minActionability: number
      readonly showDiscarded: boolean
      readonly templateIds: ReadonlyArray<KnownTemplateId>
    }
  }
}
```

### 15.4 FoldKit Messages should be safe inspector commands

FoldKit messages are not discovery `AgentDecision`s.

They are UI/inspection messages.

```ts
export const DiscoveryInspectorMessage = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("SelectedRun"),
    runId: RunIdSchema,
  }),

  Schema.Struct({
    _tag: Schema.Literal("SelectedIteration"),
    iteration: Schema.Number,
  }),

  Schema.Struct({
    _tag: Schema.Literal("SelectedHypothesis"),
    hypothesisId: HypothesisIdSchema,
  }),

  Schema.Struct({
    _tag: Schema.Literal("SelectedEvidencePacket"),
    evidencePacketId: EvidencePacketIdSchema,
  }),

  Schema.Struct({
    _tag: Schema.Literal("ChangedScoreFilter"),
    minActionability: Schema.Number,
  }),

  Schema.Struct({
    _tag: Schema.Literal("ExpandedPanel"),
    panelId: Schema.String,
  }),

  Schema.Struct({
    _tag: Schema.Literal("RequestedRefresh"),
  }),

  Schema.Struct({
    _tag: Schema.Literal("LoadedProjection"),
    runOverview: RunOverviewSchema,
    decisionPacket: DecisionPacketSchema,
    scoreFeatures: ScoreFeaturesSchema,
    plateau: PlateauStateSchema,
  }),
)
```

External agents can dispatch safe messages like:

```txt
SelectedRun
SelectedIteration
SelectedHypothesis
ExpandedPanel
ChangedScoreFilter
RequestedRefresh
```

They should not dispatch discovery mutations unless explicitly given a separate write capability.

### 15.5 Capability split

There are two agent surfaces:

```txt
Pi / local discovery agent:
  acts inside the run through AgentDecision

FoldKit DevTools/OpenAPI/MCP adapter / external analysis agent:
  inspects and navigates the FoldKit runtime
```

Rule:

```txt
Pi is an actor.
External inspection adapters are inspectors.
```

Do not collapse these APIs.

### 15.6 OpenAPI is just another adapter

Once the atom graph exposes named projections, HTTP/OpenAPI is easy:

```txt
GET /api/runs/:runId/summary
  → views.getRunOverview(runId)

GET /api/runs/:runId/decision-packet/:iteration
  → views.getDecisionPacket({ runId, iteration })

GET /api/runs/:runId/score-features
  → views.getScoreFeatures(runId)

GET /api/hypotheses/:hypothesisId/lineage
  → views.getHypothesisLineage(hypothesisId)

GET /api/evidence/:evidencePacketId/graph
  → views.getEvidenceGraph(evidencePacketId)
```

The important point:

```txt
The hard part is not the API.
The hard part is having coherent projections to expose.
```

Attune gets those projections from atoms.

---

## 16. Nx generators

Nx generators are central. They replace much of the need for Fork in v0.

### 16.1 Generator philosophy

```txt
Without generators:
  Agent must infer architecture.

With generators:
  Agent runs repo-native verbs and fills typed TODOs.
```

### 16.2 Initial generator set

```txt
@attune/nx:effect-service
@attune/nx:event
@attune/nx:decision
@attune/nx:projection
@attune/nx:atom-family
@attune/nx:derived-atom
@attune/nx:score-feature
@attune/nx:decision-packet-field
@attune/nx:foldkit-scene-atom
@attune/nx:joern-template
@attune/nx:sync-effect-layers
```

### 16.3 `effect-service`

Command:

```bash
nx g @attune/nx:effect-service discovery-memory MotifReadModel
```

Generates:

```txt
src/MotifReadModel.ts
src/MotifReadModelLive.ts
src/MotifReadModel.test.ts
src/index.ts
```

### 16.4 `event`

Command:

```bash
nx g @attune/nx:event discovery evidence.scored --runScoped --primaryKey evidencePacketId
```

Updates:

```txt
DiscoveryEventGroup.ts
DiscoveryEvents.ts
DiscoveryEventsLive.ts
DiscoveryProjection.ts
projection test
ViewKeys.ts if needed
```

### 16.5 `decision`

Command:

```bash
nx g @attune/nx:decision discovery run_joern_template
```

Generates/updates:

```txt
AgentDecision.ts variant
handlers/RunJoernTemplate.ts
AgentDecisionRouter.ts exhaustive Match case
DecisionValidator.ts stub
handler test
```

### 16.6 `atom-family`

Command:

```bash
nx g @attune/nx:atom-family discovery-views recentEvidence \
  --key runId \
  --reactivity evidence \
  --service MotifReadModel \
  --method listRecentEvidence
```

Generates:

```ts
export const recentEvidenceAtom = Atom.family((runId: RunId) =>
  DiscoveryRuntime.atom(
    Effect.gen(function* () {
      const readModel = yield* MotifReadModel
      return yield* readModel.listRecentEvidence({ runId, limit: 50 })
    }),
  ).pipe(
    Atom.withLabel(`recentEvidence:${runId}`),
    Atom.withReactivity(ViewKeys.evidence(runId)),
  ),
)
```

### 16.7 `derived-atom`

Command:

```bash
nx g @attune/nx:derived-atom discovery-views runScoreFeatures \
  --key runId \
  --depends activeFamilies,queuedHypotheses,recentEvidence
```

Generates a file with dependency skeleton and TODO calculation. It should not add `Atom.withReactivity` unless explicitly generating a base atom.

### 16.8 `decision-packet-field`

Command:

```bash
nx g @attune/nx:decision-packet-field deterministicRecommendation \
  --depends recommendedNextActionAtom
```

Updates `DecisionPacket` type and `decisionPacketAtom`.

### 16.9 `joern-template`

Command:

```bash
nx g @attune/nx:joern-template source_to_sink_flow
```

Generates:

```txt
templates/SourceToSinkFlow.ts
generated schema updates
template registry update
template fixture test
evidence decoder test
```

### 16.10 Sync generators

Use sync generators for generated barrels and registry files:

```txt
AllDecisionHandlers.generated.ts
TemplateRegistry.generated.ts
AllAtoms.generated.ts
AppLive.generated.ts
```

Rules:

- Sync generators must be idempotent.
- They should only rewrite files when content changes.
- They should be fast enough to run before `build` and `test`.

---

## 17. Fork status

Fork is not required for v0.

Reason:

```txt
Nx generators construct the correct shape.
TypeScript checks it.
Effect Match enforces exhaustive routing.
Effect Schema validates boundaries.
EventLog/Drizzle/Reactivity/atoms separate write/read/freshness semantics.
```

Possible future tiny Fork rule pack:

```txt
no raw EventLog writes outside events/DiscoveryEventsLive.ts
no Drizzle table imports outside discovery-memory
no Joern imports outside joern-effect and run_joern_template handler
no Pi imports outside discovery-agent-pi and workflow boundary
no manual edits to generated files
no switch for AgentDecision routing
no Reactivity.invalidate before durable writes
no writes inside atoms
```

But this is optional later, not core v0.

---

## 18. Testing strategy

### 18.1 Golden vertical slice

First hand-write one perfect slice:

```txt
request_more_anchors
anchors.retrieved
drizzle projection
Reactivity.mutation(ViewKeys.anchors/runMetrics)
anchor atoms with Atom.withReactivity(...)
DecisionPacketAtom includes new anchors
FoldKit scene shows anchors
```

Then extract Nx generators.

### 18.2 Unit tests

Test:

```txt
AgentDecision schema decoding
DecisionValidator rules
DiscoveryEvents facade writes expected events
Drizzle projection handlers
Reactivity mutation key usage
Base atom Drizzle reads
Base atom withReactivity subscriptions
Derived atoms
DecisionPacketAtom
PlateauAtom
FoldKit scene atoms
FoldKit Message schema
```

### 18.3 Atom graph tests

Example:

```ts
it("decision packet reuses score features projection", async () => {
  const registry = Registry.make()

  const packet = await Effect.runPromise(
    Atom.getResult(
      decisionPacketAtom({ runId: RunId.make("run_1"), iteration: 7 }),
      { suspendOnWaiting: true },
    ).pipe(
      Effect.provideService(Atom.AtomRegistry, registry),
      Effect.provide(TestDiscoveryViewLayer),
    ),
  )

  expect(packet.scoreFeatures.support).toBe(12)
})
```

### 18.4 Reactivity refresh tests

Test scenario:

```txt
1. Registry evaluates decisionPacketAtom.
2. Projection inserts evidence into Drizzle inside Reactivity.mutation(ViewKeys.evidence(runId)).
3. recentEvidenceAtom(runId) is subscribed with Atom.withReactivity(ViewKeys.evidence(runId)).
4. decisionPacketAtom re-evaluates with updated score features.
```

### 18.5 Replay tests

Replay EventLog into empty Drizzle projections and verify atom views match expected snapshots.

### 18.6 Joern integration tests

Use small fixture repos and generated Joern templates.

Test:

```txt
template binding schema
template query rendering
evidence decoding
evidence packet scoring
handler event writes
```

### 18.7 Property tests

Use FastCheck for:

```txt
AgentDecision validation
Event projection idempotency
Score feature invariants
Plateau thresholds
Atom dependency invariants
Reactivity ordering: mutation writes before refresh
Joern evidence decoder robustness
```

### 18.8 FoldKit inspection adapter smoke tests

In dev mode, if an inspection adapter is enabled:

```txt
start FoldKit app
connect foldkit-devtools adapter
foldkit_list_runtimes finds runtime
foldkit_get_model returns DiscoveryInspectorModel
foldkit_get_message_schema returns Message schema
foldkit_dispatch_message SelectedRun changes selectedRunId
foldkit_diff_models shows expected path-level diff
```

---

## 19. Observability

Emit OpenTelemetry spans around:

```txt
discovery.run
iteration
PiDecisionAgent.decide
AgentDecisionRouter.route
CocoIndexClient.searchAnchors
JoernTemplateExecutor.runTemplate
DiscoveryEvents writes
projection handlers
Reactivity.mutation keys
atom evaluation
atom refresh
FoldKit scene generation
FoldKit DevTools inspection
```

Useful metrics:

```txt
iterations per run
agent decision kind counts
schema validation failures
Joern template runtime
CocoIndex search latency
anchors returned per query
evidence packets per Joern run
useful evidence yield
score feature trends
plateau reasons
Reactivity invalidation count per run
atom graph size per run
atom refresh count per run
FoldKit adapter inspection calls
```

Axiom can consume OTEL traces/logs later.

---

## 20. Performance and lifecycle

### 20.1 Run-scoped registry lifecycle

```txt
run started
  → create registry lazily on first atom evaluation
run active
  → reuse registry across iterations
run completed/failed/cancelled
  → dispose registry
```

### 20.2 Memory guardrails

```txt
max active run registries
idle TTL per registry
node count warning threshold
registry disposal on run completion
coarse Reactivity keys in v0
fine-grained Reactivity keys later
```

### 20.3 Joern pool

Joern is the likely bottleneck.

V0:

```txt
single Joern executor per repo snapshot
bounded timeout
retry small number of times
cache evidence by hypothesis/template signature
```

Later:

```txt
Joern worker pool
separate JVM/process pool
template-level concurrency
Effect Cluster entity per run/repo snapshot
```

### 20.4 CocoIndex freshness

V0:

```txt
ensure index exists at run start
refresh/index before search when needed
store repoSnapshotId with anchor cards
```

Later:

```txt
live indexing
incremental branch-aware updates
shared index cache across runs
```

### 20.5 Reactivity caveat at scale

Reactivity is in-process. If active runs become distributed, introduce a distributed invalidation bridge.

Recommended order:

```txt
v0:
  projection and registry in same process

v1:
  Postgres LISTEN/NOTIFY bridge for ViewKeys

v2:
  Effect Cluster messages for run-owned entities
```

---

## 21. Higher-order autonomous refinement loop

### 21.1 Motivation

The long-term dream is not merely to run local agents overnight.

The dream is to let a stronger frontier-level agent inspect many cheap local runs, identify weaknesses in the discovery machinery, generate new pattern machinery with Nx generators, and then let local agents test those improvements overnight.

This is continuous codebase-specific pattern refinement.

```txt
Batch runs complete overnight
  ↓
EventLog contains run histories
  ↓
Drizzle projects durable run state
  ↓
Atoms derive higher-order metrics
  ↓
FoldKit DevTools or another optional inspection adapter exposes run analysis
  ↓
Frontier agent inspects successes and failures
  ↓
Frontier agent proposes new pattern machinery
  ↓
Nx generators create the correct source shape
  ↓
Frontier agent fills implementation TODOs
  ↓
Tests/property tests/fixtures run
  ↓
New templates/atoms/packet fields become available
  ↓
Local agents run another cheap batch
  ↓
Compare yield before/after
```

### 21.2 Two-level agent architecture

Level 1: cheap local run agent.

```txt
DecisionPacketAtom
  → Pi/local model emits AgentDecision
  → Router validates
  → CocoIndex / Joern execute
  → EventLog records
  → Drizzle projects
  → Reactivity invalidates
  → Atoms recompute
  → next DecisionPacketAtom
```

Job:

```txt
Given this run state, choose one safe next action.
```

Level 2: frontier steering agent.

```txt
FoldKit DevTools or optional inspection adapter
  → inspect many runs
  → compare yield
  → identify missing templates/fields/views
  → invoke Nx generators
  → write implementation inside generated boundaries
  → run tests
  → schedule/evaluate new batches
```

Job:

```txt
Improve the machinery that the local agent operates inside.
```

### 21.3 What improves over time

The system should not rely on model-weight improvement.

It improves its runtime vocabulary:

```txt
new CocoIndex anchor search strategies
new Joern templates
new motif families
new template binding schemas
new evidence decoders
new score features
new plateau rules
new DecisionPacket fields
new FoldKit scenes
new counterexample checks
new rule candidate generators
```

This lets cheaper/local models perform better because the runtime context becomes better.

### 21.4 Higher-order metrics as atoms

Meta-analysis should itself be atomized.

Examples:

```txt
templateYieldAtom(templateId)
  useful evidence / Joern runs

hypothesisSurvivalAtom(runId)
  created → tested → supported → drafted

anchorFamilyCoherenceAtom(familyId)
  semantic similarity + structural evidence agreement

decisionLoopAtom(runId)
  repeated action signatures / low novelty

packetFieldValueAtom(fieldName)
  whether adding this field improved decisions

motifPromotionRateAtom(repoId)
  candidates drafted → human approved

counterexamplePressureAtom(hypothesisId)
  near misses / contradictory examples

runEfficiencyAtom(runId)
  useful evidence per dollar / per hour / per Joern call
```

These can feed FoldKit scenes and frontier-agent analysis.

### 21.5 Human gates remain

The system may autonomously explore, evaluate, and draft improvements.

It should not autonomously do everything.

Human gates:

```txt
rule promotion
new write capabilities
customer-facing exports
major generator capability changes
```

The correct claim is:

```txt
The system can autonomously explore and draft.
Humans promote and authorize capability expansion.
```

### 21.6 Product framing

Attune becomes:

```txt
continuous autonomous cheap refinement of codebase-specific engineering policy
```

Not merely:

```txt
AI code review
security scanning
linter generation
```

The strongest product sentence:

```txt
Every rule candidate comes with a replayable, agent-readable lineage:
anchors, hypotheses, Joern evidence, score features, decision history, and human review.
```

---

## 22. Implementation phases

### Phase 0: Golden slice

Build by hand:

```txt
attune-discovery-core minimal types
DiscoveryEventGroup minimal events
DiscoveryEvents facade
Drizzle read model minimal tables
ViewKeys
request_more_anchors handler
CocoIndexClient stub/live wrapper
base atoms: runAtom, anchor atoms
DecisionPacketAtom minimal
DiscoveryWorkflow one iteration
FoldKit inspector model minimal
```

Acceptance:

```txt
A run can request anchors from CocoIndex.
EventLog records decision and anchors.
Projection writes Drizzle inside Reactivity.mutation.
Base atoms with Atom.withReactivity refresh.
Next DecisionPacket includes anchors.
FoldKit model exposes the run.
```

### Phase 1: Nx generators

Extract:

```txt
effect-service
event
decision
projection
atom-family
derived-atom
```

Acceptance:

```txt
Agent can add a new decision/event/atom by running generators.
Generated code typechecks.
Generated tests fail only at TODO implementation points.
Atom-family generator supports Reactivity keys.
```

### Phase 2: Joern template vertical slice

Build:

```txt
joern-effect template registry
run_joern_template decision
source_to_sink_flow template
evidence packet schema
evidence scoring
evidence.scored projection
ScoreAtoms
PlateauAtoms
```

Acceptance:

```txt
A hypothesis can be proven or weakened by Joern.
Evidence updates score features through Reactivity + atoms.
Plateau atom changes after evidence.
```

### Phase 3: DecisionPacket consolidation

Build full:

```txt
DecisionPacketAtom
recommendedNextActionAtom
FoldKit scene atoms
Pi prompt/tool integration
DecisionValidator full rules
```

Acceptance:

```txt
Pi receives deterministic packet with score features and recommended action.
Pi emits AgentDecision.
Router validates and handles.
FoldKit scene explains run state.
```

### Phase 4: FoldKit DevTools analysis adapter loop

Build:

```txt
DiscoveryInspectorModel
DiscoveryInspectorMessage
FoldKit DevTools config with Message schema
DevTools adapter smoke test
run overview scene
decision packet scene
hypothesis lineage scene
```

Acceptance:

```txt
External AI agent can inspect run through an optional FoldKit adapter.
Agent can select run/iteration/hypothesis by dispatching typed FoldKit Messages.
Agent can diff models before/after runtime messages.
```

### Phase 5: Replay and observability

Build:

```txt
EventLog replay tests
projection cursor
OTEL spans
Axiom export
registry inspect graph
run summary scene
batch comparison scene
```

Acceptance:

```txt
Runs are replayable.
Atom views match replayed Drizzle state.
Long runs are observable.
FoldKit adapters can inspect replayed/debug states.
```

### Phase 6: Higher-order batch steering

Build:

```txt
templateYieldAtom
hypothesisSurvivalAtom
decisionLoopAtom
batchComparisonScene
frontier-agent analysis prompt
Nx generator workflow for new templates/views
```

Acceptance:

```txt
A frontier agent can inspect batch run outcomes through an optional FoldKit adapter,
generate a new Joern template or DecisionPacket field through Nx,
run tests,
and trigger/compare a new local batch.
```

---

## 23. Agent implementation instructions

When implementing this architecture, the agent should follow these rules:

```txt
1. Do not manually invent package structure.
2. Use Nx generators wherever a generator exists.
3. Do not call EventLog.write outside DiscoveryEventsLive.
4. Do not import Drizzle tables outside attune-discovery-memory.
5. Do not put writes inside atoms.
6. Do not make Pi mutate state directly.
7. Do not let Pi emit arbitrary Joern queries.
8. Use Match.discriminatorsExhaustive for AgentDecision routing.
9. Use atom families for run/hypothesis/evidence indexed views.
10. Wrap projection writes in Reactivity.mutation keys.
11. Subscribe base atoms with Atom.withReactivity.
12. Do not manually invalidate derived views.
13. Keep Workflow thin: it asks views for packets and plateau state.
14. Keep FoldKit scene generation derived from atoms, not direct queries.
15. Treat language-service diagnostics and Nx output as the default agent inspection interface; FoldKit DevTools/OpenAPI/MCP adapters are optional.
16. Keep FoldKit inspector messages separate from discovery AgentDecision commands.
17. Require human review for rule promotion and capability expansion.
```

Suggested first prompt to an implementation agent:

```txt
Implement the Phase 0 golden slice of Attune Discovery.

Use the architecture in docs/attune-discovery-reactive-runtime-architecture-spec.md.

Scope:
- Create attune-discovery-core minimal domain types.
- Create attune-discovery-events with DiscoveryEventGroup, DiscoveryEventLog, DiscoveryEvents facade, and DiscoveryEventsLive.
- Create attune-discovery-memory with Drizzle schemas and MotifReadModel for runs, accepted decisions, anchors, and anchor search results.
- Create attune-discovery-views with ViewKeys, a run-scoped effect-atom registry, runAtom, anchor atoms, and minimal decisionPacketAtom.
- Base atoms must use Atom.withReactivity(ViewKeys.*).
- Projection handlers must wrap Drizzle writes in Reactivity.mutation(ViewKeys.*).
- Create cocoindex-effect CocoIndexClient interface and stub live implementation.
- Create attune-discovery-runner with AgentDecisionRouter, DecisionValidator, RequestMoreAnchors handler, and one-iteration DiscoveryWorkflow.
- Create attune-foldkit-scenes with minimal DiscoveryInspectorModel and DiscoveryInspectorMessage.

Rules:
- No raw EventLog writes except DiscoveryEventsLive.
- No writes inside atoms.
- No views.refreshAfterProjection service.
- Projection writes Drizzle inside Reactivity.mutation.
- Workflow consumes DecisionPacketAtom through DiscoveryViewWorkspace.
- Add tests for Reactivity-triggered atom refresh and decision packet recomputation.
```

---

## 24. External reference notes

These are the external projects this spec is aligned with:

- `effect-atom`: reactive state management for Effect, including `Atom.make`, derived state, effectful atoms returning `Result`, `Atom.runtime(layer)`, `Atom.family`, functions, streams, registry semantics, and Reactivity integration through `Atom.withReactivity`.
- Effect Experimental Reactivity: in-process invalidation service that can associate queries/streams/atoms with keys and invalidate those keys after mutations.
- Nx local generators and sync generators: used to encode Attune’s source-code grammar and keep generated files/layers/registries synchronized.
- CocoIndex Code: AST-based semantic code search over codebases, usable through CLI/agent integrations and appropriate as Attune’s recall layer.
- Effect Experimental EventLog/EventGroup and SQL EventJournal: used as the durable event-sourcing substrate.
- Pi agent core: stateful TS agent loop with tool execution and event streaming; used only as a bounded decision client.
- FoldKit DevTools/OpenAPI/MCP adapters: optional inspection adapters exposing running FoldKit apps or framework diagnostic/query projections to AI agents via model snapshots, message history, diffs, schemas, dispatch, and time travel. They are not the core framework workflow surface.

---

## 25. Runtime safety summary

This architecture buys runtime safety because it prevents the two most dangerous things in agent systems:

```txt
1. The model becoming the state manager.
2. Derived state becoming invisible, stale, and manually invalidated.
```

Instead:

```txt
The model emits bounded commands.
The event log records facts.
Drizzle materializes facts.
Reactivity announces changed fact keys.
Atoms derive current reasoning state.
Workflow advances from that state.
```

Safety stack:

```txt
Untrusted:
  Pi / local model

Boundary:
  AgentDecision Schema
  DecisionValidator
  exhaustive router

Durable write:
  DiscoveryEvents
  EventLog
  SqlEventJournal

Durable read:
  EventLog.group projections
  Drizzle tables

Freshness:
  Reactivity.mutation(keys)
  Atom.withReactivity(keys)

Derived reasoning:
  runScoreFeaturesAtom
  plateauAtom
  decisionPacketAtom
  foldKitSceneAtom

Control:
  Effect Workflow
  timeouts/retries/budgets/human gates

Inspection:
  FoldKit Model
  Optional FoldKit inspection adapter
```

---

## 26. Final architecture summary

```txt
Write side:
  Pi → AgentDecision → Validator → Router → Handler → DiscoveryEvents → EventLog → SQL journal

Durable read side:
  EventLog.group → Drizzle projections

Freshness side:
  Drizzle projection writes → Reactivity.mutation(ViewKeys.*) → Atom.withReactivity(ViewKeys.*)

Reasoning read side:
  Drizzle projections → run-scoped Atom registry → DecisionPacketAtom / ScoreAtoms / PlateauAtoms / FoldKitAtoms

Proof side:
  Joern templates → EvidencePacket → evidence.scored

Recall side:
  CocoIndex search → AnchorCard → anchors.retrieved

Inspection side:
  Atom graph → FoldKit Model → DevTools → optional OpenAPI/MCP adapter

Growth side:
  Nx generators → services/events/decisions/projections/atoms/templates
```

Final sentence:

```txt
Attune Discovery is an Effect event-sourced write system with Effect Reactivity as its freshness layer, a server-side effect-atom projection graph as its reasoning layer, CocoIndex as semantic recall, Joern as structural proof, Pi as bounded decision client, FoldKit plus framework diagnostics as its explanation and inspection surface, optional DevTools/OpenAPI/MCP adapters over those projections, and Nx generators as its source-code grammar.
```
