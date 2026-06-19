import { Context, Effect, Layer, Ref, Schema as S } from "effect"

export const RunStatus = S.Literals([
  "initializing",
  "recalling",
  "proving",
  "reviewing",
  "plateaued",
  "completed",
])
export type RunStatus = typeof RunStatus.Type

export const HypothesisStatus = S.Literals([
  "candidate",
  "proving",
  "supported",
  "weak",
  "rejected",
  "promoted",
])
export type HypothesisStatus = typeof HypothesisStatus.Type

export const EvidenceConfidence = S.Literals([
  "empty",
  "weak",
  "medium",
  "strong",
])
export type EvidenceConfidence = typeof EvidenceConfidence.Type

export const AgentDecisionKind = S.Literals([
  "search_anchors",
  "create_hypothesis",
  "run_joern_template",
  "request_human_review",
  "promote_rule",
  "stop",
])
export type AgentDecisionKind = typeof AgentDecisionKind.Type

export const ReviewItemKind = S.Literals([
  "hypothesis",
  "evidence",
  "promotion",
])
export type ReviewItemKind = typeof ReviewItemKind.Type

export const ReportSectionTemplate = S.Literals([
  "finding-summary",
  "query-progress",
  "evidence-cluster",
  "narrative",
  "scene",
])
export type ReportSectionTemplate = typeof ReportSectionTemplate.Type

export const ReportSceneLayout = S.Literals([
  "river",
  "funnel",
  "timeline",
  "evidence-grid",
])
export type ReportSceneLayout = typeof ReportSceneLayout.Type

export const DiscoveryBudget = S.Struct({
  joernRunsRemaining: S.Number,
  anchorSearchesRemaining: S.Number,
  optimizerTurnsRemaining: S.Number,
})
export type DiscoveryBudget = typeof DiscoveryBudget.Type

export const DiscoveryRun = S.Struct({
  runId: S.String,
  repo: S.String,
  repoSnapshotId: S.String,
  status: RunStatus,
  budget: DiscoveryBudget,
  startedAt: S.String,
  updatedAt: S.String,
})
export type DiscoveryRun = typeof DiscoveryRun.Type

export const SourceLocation = S.Struct({
  path: S.String,
  startLine: S.Number,
  endLine: S.Number,
})
export type SourceLocation = typeof SourceLocation.Type

export const AnchorCard = S.Struct({
  anchorId: S.String,
  runId: S.String,
  title: S.String,
  vocabulary: S.Array(S.String),
  score: S.Number,
  excerpt: S.String,
  locations: S.Array(SourceLocation),
})
export type AnchorCard = typeof AnchorCard.Type

export const MotifHypothesis = S.Struct({
  hypothesisId: S.String,
  runId: S.String,
  anchorIds: S.Array(S.String),
  title: S.String,
  summary: S.String,
  status: HypothesisStatus,
  score: S.Number,
})
export type MotifHypothesis = typeof MotifHypothesis.Type

export const EvidencePacket = S.Struct({
  evidenceId: S.String,
  runId: S.String,
  hypothesisId: S.String,
  templateId: S.String,
  confidence: EvidenceConfidence,
  summary: S.String,
  durationMs: S.Number,
  excerpts: S.Array(S.String),
  createdAt: S.String,
})
export type EvidencePacket = typeof EvidencePacket.Type

export const DiscoveryMetric = S.Struct({
  metricId: S.String,
  runId: S.String,
  name: S.String,
  value: S.Number,
  unit: S.String,
  recordedAt: S.String,
})
export type DiscoveryMetric = typeof DiscoveryMetric.Type

export const MotifFamily = S.Struct({
  familyId: S.String,
  runId: S.String,
  title: S.String,
  hypothesisIds: S.Array(S.String),
  status: S.Literals(["open", "stable", "promoted"]),
  updatedAt: S.String,
})
export type MotifFamily = typeof MotifFamily.Type

export const AgentDecision = S.Struct({
  decisionId: S.String,
  runId: S.String,
  kind: AgentDecisionKind,
  targetId: S.String,
  templateId: S.String,
  rationale: S.String,
  createdAt: S.String,
})
export type AgentDecision = typeof AgentDecision.Type

export const ReviewItem = S.Struct({
  reviewId: S.String,
  runId: S.String,
  kind: ReviewItemKind,
  title: S.String,
  summary: S.String,
  targetId: S.String,
  requiredAction: S.String,
})
export type ReviewItem = typeof ReviewItem.Type

export const FoldSceneNode = S.Struct({
  id: S.String,
  label: S.String,
  kind: S.String,
  status: S.String,
})
export type FoldSceneNode = typeof FoldSceneNode.Type

export const FoldScene = S.Struct({
  sceneId: S.String,
  title: S.String,
  nodes: S.Array(FoldSceneNode),
})
export type FoldScene = typeof FoldScene.Type

export const ReportProp = S.Struct({
  name: S.String,
  value: S.String,
})
export type ReportProp = typeof ReportProp.Type

export const AppendReportSection = S.Struct({
  _tag: S.Literal("AppendReportSection"),
  actionId: S.String,
  runId: S.String,
  sectionId: S.String,
  template: ReportSectionTemplate,
  title: S.String,
  props: S.Array(ReportProp),
})
export type AppendReportSection = typeof AppendReportSection.Type

export const PinEvidence = S.Struct({
  _tag: S.Literal("PinEvidence"),
  actionId: S.String,
  runId: S.String,
  sectionId: S.String,
  evidenceId: S.String,
  reason: S.String,
})
export type PinEvidence = typeof PinEvidence.Type

export const UpdateNarrative = S.Struct({
  _tag: S.Literal("UpdateNarrative"),
  actionId: S.String,
  runId: S.String,
  sectionId: S.String,
  markdown: S.String,
})
export type UpdateNarrative = typeof UpdateNarrative.Type

export const ComposeScene = S.Struct({
  _tag: S.Literal("ComposeScene"),
  actionId: S.String,
  runId: S.String,
  sceneId: S.String,
  layout: ReportSceneLayout,
  focus: S.String,
})
export type ComposeScene = typeof ComposeScene.Type

export const ReportAction = S.Union([
  AppendReportSection,
  PinEvidence,
  UpdateNarrative,
  ComposeScene,
])
export type ReportAction = typeof ReportAction.Type

export const ReportSection = S.Struct({
  sectionId: S.String,
  template: ReportSectionTemplate,
  title: S.String,
  narrative: S.String,
  pinnedEvidenceIds: S.Array(S.String),
  props: S.Array(ReportProp),
})
export type ReportSection = typeof ReportSection.Type

export const ReportSnapshot = S.Struct({
  runId: S.String,
  version: S.Number,
  sections: S.Array(ReportSection),
  selectedSceneId: S.String,
  selectedLayout: ReportSceneLayout,
})
export type ReportSnapshot = typeof ReportSnapshot.Type

export const AvailableDecision = S.Struct({
  kind: AgentDecisionKind,
  label: S.String,
  targetId: S.String,
  templateId: S.String,
})
export type AvailableDecision = typeof AvailableDecision.Type

export const DecisionPacket = S.Struct({
  packetId: S.String,
  run: DiscoveryRun,
  anchors: S.Array(AnchorCard),
  hypotheses: S.Array(MotifHypothesis),
  evidence: S.Array(EvidencePacket),
  budget: DiscoveryBudget,
  availableDecisions: S.Array(AvailableDecision),
  bestNextAction: AvailableDecision,
})
export type DecisionPacket = typeof DecisionPacket.Type

export const WorkbenchSnapshot = S.Struct({
  runId: S.String,
  version: S.Number,
  decisionPacket: DecisionPacket,
  scene: FoldScene,
  reviewQueue: S.Array(ReviewItem),
  report: ReportSnapshot,
})
export type WorkbenchSnapshot = typeof WorkbenchSnapshot.Type

export const DiscoveryRunStarted = S.Struct({
  _tag: S.Literal("DiscoveryRunStarted"),
  eventId: S.String,
  occurredAt: S.String,
  run: DiscoveryRun,
})
export type DiscoveryRunStarted = typeof DiscoveryRunStarted.Type

export const AnchorsRecalled = S.Struct({
  _tag: S.Literal("AnchorsRecalled"),
  eventId: S.String,
  occurredAt: S.String,
  runId: S.String,
  anchors: S.Array(AnchorCard),
})
export type AnchorsRecalled = typeof AnchorsRecalled.Type

export const MotifHypothesisCreated = S.Struct({
  _tag: S.Literal("MotifHypothesisCreated"),
  eventId: S.String,
  occurredAt: S.String,
  hypothesis: MotifHypothesis,
})
export type MotifHypothesisCreated = typeof MotifHypothesisCreated.Type

export const JoernEvidenceScored = S.Struct({
  _tag: S.Literal("JoernEvidenceScored"),
  eventId: S.String,
  occurredAt: S.String,
  evidence: EvidencePacket,
})
export type JoernEvidenceScored = typeof JoernEvidenceScored.Type

export const AgentDecisionRecorded = S.Struct({
  _tag: S.Literal("AgentDecisionRecorded"),
  eventId: S.String,
  occurredAt: S.String,
  decision: AgentDecision,
})
export type AgentDecisionRecorded = typeof AgentDecisionRecorded.Type

export const HumanReviewRequested = S.Struct({
  _tag: S.Literal("HumanReviewRequested"),
  eventId: S.String,
  occurredAt: S.String,
  item: ReviewItem,
})
export type HumanReviewRequested = typeof HumanReviewRequested.Type

export const RulePromotionRequested = S.Struct({
  _tag: S.Literal("RulePromotionRequested"),
  eventId: S.String,
  occurredAt: S.String,
  runId: S.String,
  hypothesisId: S.String,
  requestedBy: S.String,
})
export type RulePromotionRequested = typeof RulePromotionRequested.Type

export const FamilyUpdated = S.Struct({
  _tag: S.Literal("FamilyUpdated"),
  eventId: S.String,
  occurredAt: S.String,
  family: MotifFamily,
})
export type FamilyUpdated = typeof FamilyUpdated.Type

export const MetricRecorded = S.Struct({
  _tag: S.Literal("MetricRecorded"),
  eventId: S.String,
  occurredAt: S.String,
  metric: DiscoveryMetric,
})
export type MetricRecorded = typeof MetricRecorded.Type

export const AgentDecisionRejected = S.Struct({
  _tag: S.Literal("AgentDecisionRejected"),
  eventId: S.String,
  occurredAt: S.String,
  decision: AgentDecision,
  reason: S.String,
})
export type AgentDecisionRejected = typeof AgentDecisionRejected.Type

export const DiscoveryRunCompleted = S.Struct({
  _tag: S.Literal("DiscoveryRunCompleted"),
  eventId: S.String,
  occurredAt: S.String,
  runId: S.String,
  status: S.Literals(["plateaued", "completed"]),
  summary: S.String,
})
export type DiscoveryRunCompleted = typeof DiscoveryRunCompleted.Type

export const ReportActionRecorded = S.Struct({
  _tag: S.Literal("ReportActionRecorded"),
  eventId: S.String,
  occurredAt: S.String,
  action: ReportAction,
})
export type ReportActionRecorded = typeof ReportActionRecorded.Type

export const ReportEvent = S.Union([ReportActionRecorded])
export type ReportEvent = typeof ReportEvent.Type

export const DiscoveryEvent = S.Union([
  DiscoveryRunStarted,
  AnchorsRecalled,
  MotifHypothesisCreated,
  JoernEvidenceScored,
  AgentDecisionRecorded,
  AgentDecisionRejected,
  FamilyUpdated,
  MetricRecorded,
  HumanReviewRequested,
  RulePromotionRequested,
  DiscoveryRunCompleted,
])
export type DiscoveryEvent = typeof DiscoveryEvent.Type

export type ReportProjection = Readonly<{
  version: number
  runId: string
  sections: ReadonlyMap<string, ReportSection>
  selectedSceneId: string
  selectedLayout: ReportSceneLayout
}>

type MutableReportProjection = {
  version: number
  runId: string
  sections: Map<string, ReportSection>
  selectedSceneId: string
  selectedLayout: ReportSceneLayout
}

export type DiscoveryProjection = Readonly<{
  version: number
  runs: ReadonlyMap<string, DiscoveryRun>
  anchors: ReadonlyMap<string, AnchorCard>
  hypotheses: ReadonlyMap<string, MotifHypothesis>
  evidence: ReadonlyMap<string, EvidencePacket>
  families: ReadonlyMap<string, MotifFamily>
  metrics: ReadonlyArray<DiscoveryMetric>
  rejectedDecisions: ReadonlyArray<AgentDecisionRejected>
  decisions: ReadonlyArray<AgentDecision>
  reviewQueue: ReadonlyArray<ReviewItem>
  promotions: ReadonlyArray<RulePromotionRequested>
}>

type MutableProjection = {
  version: number
  runs: Map<string, DiscoveryRun>
  anchors: Map<string, AnchorCard>
  hypotheses: Map<string, MotifHypothesis>
  evidence: Map<string, EvidencePacket>
  families: Map<string, MotifFamily>
  metrics: Array<DiscoveryMetric>
  rejectedDecisions: Array<AgentDecisionRejected>
  decisions: Array<AgentDecision>
  reviewQueue: Array<ReviewItem>
  promotions: Array<RulePromotionRequested>
}

export type SemanticRecallRequest = Readonly<{
  run: DiscoveryRun
  query: string
}>

export type JoernProofRequest = Readonly<{
  run: DiscoveryRun
  hypothesis: MotifHypothesis
  templateId: string
}>

export type OptimizerTurnRequest = Readonly<{
  packet: DecisionPacket
}>

export type SemanticRecallService = Readonly<{
  searchAnchors: (request: SemanticRecallRequest) => ReadonlyArray<AnchorCard>
}>

export type JoernProofService = Readonly<{
  runTemplate: (request: JoernProofRequest) => EvidencePacket
}>

export type OptimizerService = Readonly<{
  decide: (request: OptimizerTurnRequest) => AgentDecision
}>

export type WorkbenchScribeService = Readonly<{
  compose: (snapshot: WorkbenchSnapshot) => ReadonlyArray<ReportAction>
}>

export type DiscoveryEventLogClient = Readonly<{
  append: (event: DiscoveryEvent) => Effect.Effect<void>
  readAll: Effect.Effect<ReadonlyArray<DiscoveryEvent>>
}>

export type DiscoveryEventsService = Readonly<{
  runStarted: (run: DiscoveryRun) => Effect.Effect<void>
  anchorsRecalled: (
    runId: string,
    anchors: ReadonlyArray<AnchorCard>,
  ) => Effect.Effect<void>
  familyUpdated: (family: MotifFamily) => Effect.Effect<void>
  hypothesisCreated: (hypothesis: MotifHypothesis) => Effect.Effect<void>
  evidenceScored: (evidence: EvidencePacket) => Effect.Effect<void>
  metricRecorded: (metric: DiscoveryMetric) => Effect.Effect<void>
  decisionRecorded: (decision: AgentDecision) => Effect.Effect<void>
  decisionRejected: (
    decision: AgentDecision,
    reason: string,
  ) => Effect.Effect<void>
  humanReviewRequested: (item: ReviewItem) => Effect.Effect<void>
  rulePromotionRequested: (
    runId: string,
    hypothesisId: string,
    requestedBy: string,
  ) => Effect.Effect<void>
  runCompleted: (
    runId: string,
    status: "plateaued" | "completed",
    summary: string,
  ) => Effect.Effect<void>
  replay: Effect.Effect<DiscoveryProjection>
}>

export const DiscoveryEvents = Context.Service<DiscoveryEventsService>(
  "@attune/DiscoveryEvents",
)

export const DiscoveryEventLog = Context.Service<DiscoveryEventLogClient>(
  "@attune/DiscoveryEventLog",
)

export const makeInMemoryDiscoveryEventLog = (
  seed: ReadonlyArray<DiscoveryEvent> = [],
): Effect.Effect<DiscoveryEventLogClient> =>
  Ref.make<ReadonlyArray<DiscoveryEvent>>(seed).pipe(
    Effect.map((events) => ({
      append: (event) => Ref.update(events, (current) => [...current, event]),
      readAll: Ref.get(events),
    })),
  )

export const DiscoveryEventsLive = Layer.effect(
  DiscoveryEvents,
  Effect.map(DiscoveryEventLog, (log) => {
    const write = (event: DiscoveryEvent): Effect.Effect<void> =>
      log.append(event)

    return {
      runStarted: (run) => write(runStarted(run)),
      anchorsRecalled: (runId, anchors) =>
        write(anchorsRecalled(runId, anchors)),
      familyUpdated: (family) => write(familyUpdated(family)),
      hypothesisCreated: (hypothesis) => write(hypothesisCreated(hypothesis)),
      evidenceScored: (evidence) => write(evidenceScored(evidence)),
      metricRecorded: (metric) => write(metricRecorded(metric)),
      decisionRecorded: (decision) => write(decisionRecorded(decision)),
      decisionRejected: (decision, reason) =>
        write(decisionRejected(decision, reason)),
      humanReviewRequested: (item) => write(humanReviewRequested(item)),
      rulePromotionRequested: (runId, hypothesisId, requestedBy) =>
        write(rulePromotionRequested(runId, hypothesisId, requestedBy)),
      runCompleted: (runId, status, summary) =>
        write(runCompleted(runId, status, summary)),
      replay: log.readAll.pipe(Effect.map(replayDiscoveryEvents)),
    } satisfies DiscoveryEventsService
  }),
)

export const InMemoryDiscoveryEventLogLive = (
  seed: ReadonlyArray<DiscoveryEvent> = [],
) =>
  Layer.effect(DiscoveryEventLog, makeInMemoryDiscoveryEventLog(seed))

export const decodeReportActions = (
  snapshot: WorkbenchSnapshot,
  output: unknown,
): ReadonlyArray<ReportAction> => {
  assertRawReportActionShapes(output)
  const rawActions = S.decodeUnknownSync(S.Array(ReportAction))(output)

  for (const action of rawActions) {
    assertReportActionGrammar(snapshot, action)
  }

  return rawActions
}

export const recordReportActions = (
  snapshot: WorkbenchSnapshot,
  output: unknown,
): ReadonlyArray<ReportEvent> =>
  decodeReportActions(snapshot, output).map(reportActionRecorded)

export const appendDiscoveryEvent = (
  events: ReadonlyArray<DiscoveryEvent>,
  event: DiscoveryEvent,
): ReadonlyArray<DiscoveryEvent> => [...events, event]

export const replayDiscoveryEvents = (
  events: ReadonlyArray<DiscoveryEvent>,
): DiscoveryProjection => {
  const projection = emptyProjection()

  for (const event of events) {
    applyEvent(projection, event)
  }

  return freezeProjection(projection)
}

export const replayReportEvents = (
  snapshot: WorkbenchSnapshot,
  events: ReadonlyArray<ReportEvent>,
): ReportProjection => {
  const projection = emptyReportProjection(snapshot.runId)

  for (const event of events) {
    applyReportEvent(projection, snapshot, event)
  }

  return freezeReportProjection(projection)
}

export const deriveReportSnapshot = (
  projection: ReportProjection,
): ReportSnapshot => ({
  runId: projection.runId,
  version: projection.version,
  sections: [...projection.sections.values()],
  selectedSceneId: projection.selectedSceneId,
  selectedLayout: projection.selectedLayout,
})

export const deriveDecisionPacket = (
  projection: DiscoveryProjection,
  runId: string,
): DecisionPacket => {
  const run = requireRun(projection, runId)
  const anchors = valuesForRun(projection.anchors, runId)
  const hypotheses = valuesForRun(projection.hypotheses, runId)
  const evidence = valuesForRun(projection.evidence, runId)
  const availableDecisions = deriveAvailableDecisions(run, anchors, hypotheses)
  const bestNextAction = availableDecisions[0] ?? stopDecision(run.runId)

  return {
    packetId: `${runId}:packet:${projection.version}`,
    run,
    anchors: anchors.slice(0, 8),
    hypotheses: hypotheses.slice(0, 8),
    evidence: evidence.slice(0, 8),
    budget: run.budget,
    availableDecisions,
    bestNextAction,
  }
}

export const deriveFoldScene = (
  packet: DecisionPacket,
): FoldScene => ({
  sceneId: `${packet.run.runId}:scene:${packet.packetId}`,
  title: `${packet.run.repo} semantic workbench`,
  nodes: [
    ...packet.anchors.map((anchor: AnchorCard) => ({
      id: anchor.anchorId,
      label: anchor.title,
      kind: "anchor",
      status: `score ${anchor.score.toFixed(2)}`,
    })),
    ...packet.hypotheses.map((hypothesis: MotifHypothesis) => ({
      id: hypothesis.hypothesisId,
      label: hypothesis.title,
      kind: "hypothesis",
      status: hypothesis.status,
    })),
    ...packet.evidence.map((evidence: EvidencePacket) => ({
      id: evidence.evidenceId,
      label: evidence.templateId,
      kind: "evidence",
      status: evidence.confidence,
    })),
  ],
})

export const deriveWorkbenchSnapshot = (
  projection: DiscoveryProjection,
  runId: string,
  reportProjection?: ReportProjection,
): WorkbenchSnapshot => {
  const decisionPacket = deriveDecisionPacket(projection, runId)
  const scene = deriveFoldScene(decisionPacket)

  return {
    runId,
    version: projection.version + (reportProjection?.version ?? 0),
    decisionPacket,
    scene,
    reviewQueue: projection.reviewQueue
      .filter((item) => item.runId === runId)
      .slice(0, 6),
    report: deriveReportSnapshot(
      reportProjection ?? emptyFrozenReportProjection(runId, scene.sceneId),
    ),
  }
}

export const buildFixtureWorkbenchSnapshot = (): WorkbenchSnapshot => {
  const domainProjection = replayDiscoveryEvents(fixtureDiscoveryEvents)
  const baseSnapshot = deriveWorkbenchSnapshot(
    domainProjection,
    fixtureRun.runId,
  )
  const reportProjection = replayReportEvents(baseSnapshot, fixtureReportEvents)

  return deriveWorkbenchSnapshot(
    domainProjection,
    fixtureRun.runId,
    reportProjection,
  )
}

export const fixtureSemanticRecallService: SemanticRecallService = {
  searchAnchors: ({ run }) =>
    fixtureAnchorCards.map((anchor) => ({ ...anchor, runId: run.runId })),
}

export const fixtureJoernProofService: JoernProofService = {
  runTemplate: ({ run, hypothesis, templateId }) => ({
    evidenceId: `${hypothesis.hypothesisId}:evidence:${templateId}`,
    runId: run.runId,
    hypothesisId: hypothesis.hypothesisId,
    templateId,
    confidence: "strong",
    summary:
      "Known Joern template found repeated component-level style policy evidence.",
    durationMs: 184,
    excerpts: [
      "CodePanel and ActionBar usage co-locate deterministic rule affordances.",
      "FoldKit route data preserves the same primitive names as the v0 mockup.",
    ],
    createdAt: "2026-06-19T05:00:30.000Z",
  }),
}

export const fixtureOptimizerService: OptimizerService = {
  decide: ({ packet }) => ({
    decisionId: `${packet.run.runId}:decision:${packet.availableDecisions.length}`,
    runId: packet.run.runId,
    kind: packet.bestNextAction.kind,
    targetId: packet.bestNextAction.targetId,
    templateId: packet.bestNextAction.templateId,
    rationale: `Select ${packet.bestNextAction.label} from the current bounded DecisionPacket.`,
    createdAt: "2026-06-19T05:00:45.000Z",
  }),
}

export const fixtureWorkbenchScribeService: WorkbenchScribeService = {
  compose: (snapshot) => [
    appendReportSection({
      actionId: "scribe-section-boundary",
      runId: snapshot.runId,
      sectionId: "section-server-truth-frontend-lens",
      template: "finding-summary",
      title: "Server truth, frontend lens",
      props: [{ name: "tone", value: "live-briefing" }],
    }),
    pinEvidence({
      actionId: "scribe-pin-evidence",
      runId: snapshot.runId,
      sectionId: "section-server-truth-frontend-lens",
      evidenceId: snapshot.decisionPacket.evidence[0]?.evidenceId ?? "",
      reason: "This evidence supports the server atom/FoldKit boundary.",
    }),
    updateNarrative({
      actionId: "scribe-narrative",
      runId: snapshot.runId,
      sectionId: "section-server-truth-frontend-lens",
      markdown:
        "Effect Reactivity invalidates server meaning; FoldKit deterministically steers the frontend lens.",
    }),
    composeScene({
      actionId: "scribe-scene",
      runId: snapshot.runId,
      sceneId: snapshot.scene.sceneId,
      layout: "evidence-grid",
      focus: "supported boundary hypothesis",
    }),
  ],
}

export const buildFixtureHarnessEvents = (): ReadonlyArray<DiscoveryEvent> => {
  const anchors = fixtureSemanticRecallService.searchAnchors({
    run: fixtureRun,
    query: "FoldKit server atoms semantic workbench",
  })
  const hypothesis = fixtureHypothesis
  const evidence = fixtureJoernProofService.runTemplate({
    run: fixtureRun,
    hypothesis,
    templateId: "component-primitive-policy",
  })
  const projection = replayDiscoveryEvents([
    runStarted(fixtureRun),
    anchorsRecalled(fixtureRun.runId, anchors),
    hypothesisCreated(hypothesis),
    evidenceScored(evidence),
  ])
  const decision = fixtureOptimizerService.decide({
    packet: deriveDecisionPacket(projection, fixtureRun.runId),
  })

  return [
    runStarted(fixtureRun),
    anchorsRecalled(fixtureRun.runId, anchors),
    hypothesisCreated(hypothesis),
    evidenceScored(evidence),
    decisionRecorded(decision),
  ]
}

export const fixtureRun: DiscoveryRun = {
  runId: "run-attuned-semantic-workbench",
  repo: "attune",
  repoSnapshotId: "workspace-20260619",
  status: "reviewing",
  budget: {
    joernRunsRemaining: 2,
    anchorSearchesRemaining: 1,
    optimizerTurnsRemaining: 3,
  },
  startedAt: "2026-06-19T04:58:00.000Z",
  updatedAt: "2026-06-19T05:00:45.000Z",
}

export const fixtureAnchorCards: ReadonlyArray<AnchorCard> = [
  {
    anchorId: "anchor-foldkit-snapshot-bridge",
    runId: fixtureRun.runId,
    title: "FoldKit consumes typed WorkbenchSnapshot packets",
    vocabulary: ["FoldKit", "WorkbenchSnapshot", "ServerSnapshotChanged"],
    score: 0.94,
    excerpt:
      "FoldKit owns interaction state while server atoms derive durable meaning.",
    locations: [
      {
        path: "docs/attuned/Attune Atom, Reactivity, and State Philosophy.md",
        startLine: 1,
        endLine: 40,
      },
    ],
  },
  {
    anchorId: "anchor-effect-reactivity-dag",
    runId: fixtureRun.runId,
    title: "Effect Reactivity invalidates server meaning",
    vocabulary: ["Effect Reactivity", "atom DAG", "DecisionPacket"],
    score: 0.9,
    excerpt:
      "Projection writes announce run-scoped keys; derived atoms recompute snapshots.",
    locations: [
      {
        path: "docs/attuned/Attune Discovery v0 Architecture Model.md",
        startLine: 190,
        endLine: 250,
      },
    ],
  },
]

export const fixtureHypothesis: MotifHypothesis = {
  hypothesisId: "hypothesis-server-atoms-foldkit-lens",
  runId: fixtureRun.runId,
  anchorIds: fixtureAnchorCards.map((anchor) => anchor.anchorId),
  title: "Server atoms derive meaning; FoldKit steers the lens",
  summary:
    "The clean architecture keeps Effect Reactivity and expensive invalidation on the server, while FoldKit stays Elm-shaped.",
  status: "supported",
  score: 0.88,
}

export const fixtureEvidence: EvidencePacket =
  fixtureJoernProofService.runTemplate({
    run: fixtureRun,
    hypothesis: fixtureHypothesis,
    templateId: "component-primitive-policy",
  })

export const fixtureReviewItem: ReviewItem = {
  reviewId: "review-promote-server-atom-boundary",
  runId: fixtureRun.runId,
  kind: "promotion",
  title: "Promote the server atom/FoldKit boundary",
  summary:
    "The boundary is strong enough to encode as the first semantic workbench invariant.",
  targetId: fixtureHypothesis.hypothesisId,
  requiredAction: "Review and promote as an architecture rule.",
}

export const fixtureDecision: AgentDecision = {
  decisionId: "decision-request-human-promotion",
  runId: fixtureRun.runId,
  kind: "request_human_review",
  targetId: fixtureHypothesis.hypothesisId,
  templateId: "",
  rationale:
    "The hypothesis has strong evidence and should move to human promotion review.",
  createdAt: "2026-06-19T05:00:45.000Z",
}

export const fixtureDiscoveryEvents: ReadonlyArray<DiscoveryEvent> = [
  runStarted(fixtureRun),
  anchorsRecalled(fixtureRun.runId, fixtureAnchorCards),
  hypothesisCreated(fixtureHypothesis),
  evidenceScored(fixtureEvidence),
  decisionRecorded(fixtureDecision),
  humanReviewRequested(fixtureReviewItem),
]

export const fixtureReportEvents: ReadonlyArray<ReportEvent> = [
  reportActionRecorded(
    appendReportSection({
      actionId: "scribe-section-boundary",
      runId: fixtureRun.runId,
      sectionId: "section-server-truth-frontend-lens",
      template: "finding-summary",
      title: "Server truth, frontend lens",
      props: [{ name: "tone", value: "live-briefing" }],
    }),
  ),
  reportActionRecorded(
    pinEvidence({
      actionId: "scribe-pin-evidence",
      runId: fixtureRun.runId,
      sectionId: "section-server-truth-frontend-lens",
      evidenceId: fixtureEvidence.evidenceId,
      reason: "This evidence supports the server atom/FoldKit boundary.",
    }),
  ),
  reportActionRecorded(
    updateNarrative({
      actionId: "scribe-narrative",
      runId: fixtureRun.runId,
      sectionId: "section-server-truth-frontend-lens",
      markdown:
        "Effect Reactivity invalidates server meaning; FoldKit deterministically steers the frontend lens.",
    }),
  ),
  reportActionRecorded(
    composeScene({
      actionId: "scribe-scene",
      runId: fixtureRun.runId,
      sceneId: `${fixtureRun.runId}:scene:${fixtureRun.runId}:packet:${fixtureDiscoveryEvents.length}`,
      layout: "evidence-grid",
      focus: "supported boundary hypothesis",
    }),
  ),
]

export function runStarted(run: DiscoveryRun): DiscoveryRunStarted {
  return {
    _tag: "DiscoveryRunStarted",
    eventId: `${run.runId}:started`,
    occurredAt: run.startedAt,
    run,
  }
}

export function anchorsRecalled(
  runId: string,
  anchors: ReadonlyArray<AnchorCard>,
): AnchorsRecalled {
  return {
    _tag: "AnchorsRecalled",
    eventId: `${runId}:anchors:${anchors.length}`,
    occurredAt: "2026-06-19T04:59:00.000Z",
    runId,
    anchors: [...anchors],
  }
}

export function hypothesisCreated(
  hypothesis: MotifHypothesis,
): MotifHypothesisCreated {
  return {
    _tag: "MotifHypothesisCreated",
    eventId: `${hypothesis.runId}:${hypothesis.hypothesisId}:created`,
    occurredAt: "2026-06-19T05:00:00.000Z",
    hypothesis,
  }
}

export function evidenceScored(
  evidence: EvidencePacket,
): JoernEvidenceScored {
  return {
    _tag: "JoernEvidenceScored",
    eventId: `${evidence.runId}:${evidence.evidenceId}:scored`,
    occurredAt: evidence.createdAt,
    evidence,
  }
}

export function decisionRecorded(
  decision: AgentDecision,
): AgentDecisionRecorded {
  return {
    _tag: "AgentDecisionRecorded",
    eventId: `${decision.runId}:${decision.decisionId}:recorded`,
    occurredAt: decision.createdAt,
    decision,
  }
}

export function humanReviewRequested(
  item: ReviewItem,
): HumanReviewRequested {
  return {
    _tag: "HumanReviewRequested",
    eventId: `${item.runId}:${item.reviewId}:requested`,
    occurredAt: "2026-06-19T05:01:00.000Z",
    item,
  }
}

export function rulePromotionRequested(
  runId: string,
  hypothesisId: string,
  requestedBy: string,
): RulePromotionRequested {
  return {
    _tag: "RulePromotionRequested",
    eventId: `${runId}:${hypothesisId}:promotion-requested`,
    occurredAt: "2026-06-19T05:02:00.000Z",
    runId,
    hypothesisId,
    requestedBy,
  }
}

export function familyUpdated(family: MotifFamily): FamilyUpdated {
  return {
    _tag: "FamilyUpdated",
    eventId: `${family.runId}:${family.familyId}:updated`,
    occurredAt: family.updatedAt,
    family,
  }
}

export function metricRecorded(metric: DiscoveryMetric): MetricRecorded {
  return {
    _tag: "MetricRecorded",
    eventId: `${metric.runId}:${metric.metricId}:recorded`,
    occurredAt: metric.recordedAt,
    metric,
  }
}

export function decisionRejected(
  decision: AgentDecision,
  reason: string,
): AgentDecisionRejected {
  return {
    _tag: "AgentDecisionRejected",
    eventId: `${decision.runId}:${decision.decisionId}:rejected`,
    occurredAt: decision.createdAt,
    decision,
    reason,
  }
}

export function runCompleted(
  runId: string,
  status: "plateaued" | "completed",
  summary: string,
): DiscoveryRunCompleted {
  return {
    _tag: "DiscoveryRunCompleted",
    eventId: `${runId}:${status}`,
    occurredAt: "2026-06-19T05:03:00.000Z",
    runId,
    status,
    summary,
  }
}

export function appendReportSection(
  action: Omit<AppendReportSection, "_tag">,
): AppendReportSection {
  return {
    _tag: "AppendReportSection",
    ...action,
  }
}

export function pinEvidence(
  action: Omit<PinEvidence, "_tag">,
): PinEvidence {
  return {
    _tag: "PinEvidence",
    ...action,
  }
}

export function updateNarrative(
  action: Omit<UpdateNarrative, "_tag">,
): UpdateNarrative {
  return {
    _tag: "UpdateNarrative",
    ...action,
  }
}

export function composeScene(
  action: Omit<ComposeScene, "_tag">,
): ComposeScene {
  return {
    _tag: "ComposeScene",
    ...action,
  }
}

export function reportActionRecorded(
  action: ReportAction,
): ReportActionRecorded {
  return {
    _tag: "ReportActionRecorded",
    eventId: `${action.runId}:${action.actionId}:recorded`,
    occurredAt: "2026-06-19T05:01:30.000Z",
    action,
  }
}

const emptyProjection = (): MutableProjection => ({
  version: 0,
  runs: new Map(),
  anchors: new Map(),
  hypotheses: new Map(),
  evidence: new Map(),
  families: new Map(),
  metrics: [],
  rejectedDecisions: [],
  decisions: [],
  reviewQueue: [],
  promotions: [],
})

const applyEvent = (
  projection: MutableProjection,
  event: DiscoveryEvent,
): void => {
  projection.version += 1

  switch (event._tag) {
    case "DiscoveryRunStarted":
      projection.runs.set(event.run.runId, event.run)
      return
    case "AnchorsRecalled":
      for (const anchor of event.anchors) {
        projection.anchors.set(anchor.anchorId, anchor)
      }
      updateRunTimestamp(projection, event.runId, event.occurredAt)
      return
    case "MotifHypothesisCreated":
      projection.hypotheses.set(
        event.hypothesis.hypothesisId,
        event.hypothesis,
      )
      updateRunTimestamp(projection, event.hypothesis.runId, event.occurredAt)
      return
    case "JoernEvidenceScored":
      projection.evidence.set(event.evidence.evidenceId, event.evidence)
      projection.hypotheses.set(
        event.evidence.hypothesisId,
        updateHypothesisFromEvidence(projection, event.evidence),
      )
      updateRunBudget(projection, event.evidence.runId, {
        joernRunsRemaining: -1,
      })
      updateRunTimestamp(projection, event.evidence.runId, event.occurredAt)
      return
    case "FamilyUpdated":
      projection.families.set(event.family.familyId, event.family)
      updateRunTimestamp(projection, event.family.runId, event.occurredAt)
      return
    case "MetricRecorded":
      projection.metrics.push(event.metric)
      updateRunTimestamp(projection, event.metric.runId, event.occurredAt)
      return
    case "AgentDecisionRecorded":
      projection.decisions.push(event.decision)
      updateRunBudget(projection, event.decision.runId, {
        optimizerTurnsRemaining: -1,
      })
      updateRunTimestamp(projection, event.decision.runId, event.occurredAt)
      return
    case "AgentDecisionRejected":
      projection.rejectedDecisions.push(event)
      updateRunTimestamp(projection, event.decision.runId, event.occurredAt)
      return
    case "HumanReviewRequested":
      projection.reviewQueue.push(event.item)
      updateRunTimestamp(projection, event.item.runId, event.occurredAt)
      return
    case "RulePromotionRequested":
      projection.promotions.push(event)
      projection.hypotheses.set(
        event.hypothesisId,
        promoteHypothesis(projection, event.hypothesisId),
      )
      updateRunTimestamp(projection, event.runId, event.occurredAt)
      return
    case "DiscoveryRunCompleted":
      updateRunStatus(projection, event.runId, event.status, event.occurredAt)
      return
  }
}

const freezeProjection = (
  projection: MutableProjection,
): DiscoveryProjection => ({
  version: projection.version,
  runs: new Map(projection.runs),
  anchors: new Map(projection.anchors),
  hypotheses: new Map(projection.hypotheses),
  evidence: new Map(projection.evidence),
  families: new Map(projection.families),
  metrics: [...projection.metrics],
  rejectedDecisions: [...projection.rejectedDecisions],
  decisions: [...projection.decisions],
  reviewQueue: [...projection.reviewQueue],
  promotions: [...projection.promotions],
})

const emptyReportProjection = (runId: string): MutableReportProjection => ({
  version: 0,
  runId,
  sections: new Map(),
  selectedSceneId: "",
  selectedLayout: "river",
})

const emptyFrozenReportProjection = (
  runId: string,
  sceneId: string,
): ReportProjection => ({
  version: 0,
  runId,
  sections: new Map(),
  selectedSceneId: sceneId,
  selectedLayout: "river",
})

const applyReportEvent = (
  projection: MutableReportProjection,
  snapshot: WorkbenchSnapshot,
  event: ReportEvent,
): void => {
  projection.version += 1
  applyReportAction(projection, snapshot, event.action)
}

const applyReportAction = (
  projection: MutableReportProjection,
  snapshot: WorkbenchSnapshot,
  action: ReportAction,
): void => {
  assertReportActionGrammar(snapshot, action)

  if (action.runId !== snapshot.runId) {
    throw new Error(`Report action run mismatch: ${action.runId}`)
  }

  switch (action._tag) {
    case "AppendReportSection":
      projection.sections.set(action.sectionId, {
        sectionId: action.sectionId,
        template: action.template,
        title: action.title,
        narrative: "",
        pinnedEvidenceIds: [],
        props: [...action.props],
      })
      return
    case "PinEvidence":
      assertEvidenceExists(snapshot, action.evidenceId)
      projection.sections.set(
        action.sectionId,
        pinEvidenceOnSection(projection, action),
      )
      return
    case "UpdateNarrative":
      projection.sections.set(
        action.sectionId,
        updateNarrativeOnSection(projection, action),
      )
      return
    case "ComposeScene":
      assertSceneExists(snapshot, action.sceneId)
      projection.selectedSceneId = action.sceneId
      projection.selectedLayout = action.layout
      return
  }
}

const assertReportActionGrammar = (
  snapshot: WorkbenchSnapshot,
  action: ReportAction,
): void => {
  if (action.runId !== snapshot.runId) {
    throw new Error(`Report action run mismatch: ${action.runId}`)
  }

  switch (action._tag) {
    case "AppendReportSection":
      assertAllowedReportProps(action.template, action.props)
      assertNoExecutableReportText(action.title)
      return
    case "PinEvidence":
      assertEvidenceExists(snapshot, action.evidenceId)
      assertNoExecutableReportText(action.reason)
      return
    case "UpdateNarrative":
      assertNoExecutableReportText(action.markdown)
      return
    case "ComposeScene":
      assertSceneExists(snapshot, action.sceneId)
      assertNoExecutableReportText(action.focus)
      return
  }
}

const allowedReportProps: Readonly<Record<ReportSectionTemplate, ReadonlySet<string>>> =
  {
    "finding-summary": new Set(["tone", "severity"]),
    "query-progress": new Set(["queryId", "status"]),
    "evidence-cluster": new Set(["clusterId", "confidence"]),
    narrative: new Set(["tone"]),
    scene: new Set(["caption"]),
  }

const assertAllowedReportProps = (
  template: ReportSectionTemplate,
  props: ReadonlyArray<ReportProp>,
): void => {
  const allowed = allowedReportProps[template]

  for (const prop of props) {
    if (!allowed.has(prop.name)) {
      throw new Error(
        `Report action prop '${prop.name}' is not allowed for template '${template}'`,
      )
    }
    assertNoExecutableReportText(prop.value)
  }
}

const executableReportTextPatterns: ReadonlyArray<RegExp> = [
  /<\s*script\b/i,
  /<\s*[A-Z][A-Za-z0-9.]*\b/,
  /\bimport\s+.+\bfrom\b/,
  /\bexport\s+(const|function|default|class)\b/,
  /\bfunction\s+[A-Za-z0-9_]+\s*\(/,
  /=>/,
]

const assertNoExecutableReportText = (value: string): void => {
  for (const pattern of executableReportTextPatterns) {
    if (pattern.test(value)) {
      throw new Error("Report action contains executable UI text")
    }
  }
}

const reportActionKeys: Readonly<Record<string, ReadonlySet<string>>> = {
  AppendReportSection: new Set([
    "_tag",
    "actionId",
    "runId",
    "sectionId",
    "template",
    "title",
    "props",
  ]),
  PinEvidence: new Set([
    "_tag",
    "actionId",
    "runId",
    "sectionId",
    "evidenceId",
    "reason",
  ]),
  UpdateNarrative: new Set([
    "_tag",
    "actionId",
    "runId",
    "sectionId",
    "markdown",
  ]),
  ComposeScene: new Set([
    "_tag",
    "actionId",
    "runId",
    "sceneId",
    "layout",
    "focus",
  ]),
}

const assertRawReportActionShapes = (output: unknown): void => {
  if (!Array.isArray(output)) {
    throw new Error("Report agent output must be an array of ReportAction objects")
  }

  for (const item of output) {
    assertRawReportActionShape(item)
  }
}

const assertRawReportActionShape = (item: unknown): void => {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("ReportAction must be an object")
  }

  const tag = "_tag" in item ? item._tag : undefined
  if (typeof tag !== "string") {
    throw new Error("ReportAction is missing a string _tag")
  }

  const allowed = reportActionKeys[tag]
  if (allowed === undefined) {
    throw new Error(`Unknown ReportAction tag: ${tag}`)
  }

  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) {
      throw new Error(`ReportAction contains unsupported key: ${key}`)
    }
  }
}

const freezeReportProjection = (
  projection: MutableReportProjection,
): ReportProjection => ({
  version: projection.version,
  runId: projection.runId,
  sections: new Map(projection.sections),
  selectedSceneId: projection.selectedSceneId,
  selectedLayout: projection.selectedLayout,
})

const assertEvidenceExists = (
  snapshot: WorkbenchSnapshot,
  evidenceId: string,
): void => {
  const exists = snapshot.decisionPacket.evidence.some(
    (evidence: EvidencePacket) => evidence.evidenceId === evidenceId,
  )

  if (!exists) {
    throw new Error(`Report action referenced unknown evidence: ${evidenceId}`)
  }
}

const assertSceneExists = (
  snapshot: WorkbenchSnapshot,
  sceneId: string,
): void => {
  if (snapshot.scene.sceneId !== sceneId) {
    throw new Error(`Report action referenced unknown scene: ${sceneId}`)
  }
}

const requireReportSection = (
  projection: MutableReportProjection,
  sectionId: string,
): ReportSection => {
  const section = projection.sections.get(sectionId)

  if (section === undefined) {
    throw new Error(`Missing report section: ${sectionId}`)
  }

  return section
}

const pinEvidenceOnSection = (
  projection: MutableReportProjection,
  action: PinEvidence,
): ReportSection => {
  const section = requireReportSection(projection, action.sectionId)

  return {
    ...section,
    pinnedEvidenceIds: [
      ...new Set([...section.pinnedEvidenceIds, action.evidenceId]),
    ],
  }
}

const updateNarrativeOnSection = (
  projection: MutableReportProjection,
  action: UpdateNarrative,
): ReportSection => {
  const section = requireReportSection(projection, action.sectionId)

  return {
    ...section,
    narrative: action.markdown,
  }
}

const requireRun = (
  projection: DiscoveryProjection,
  runId: string,
): DiscoveryRun => {
  const run = projection.runs.get(runId)

  if (run === undefined) {
    throw new Error(`Missing discovery run: ${runId}`)
  }

  return run
}

const valuesForRun = <T extends Readonly<{ runId: string }>>(
  values: ReadonlyMap<string, T>,
  runId: string,
): ReadonlyArray<T> =>
  [...values.values()].filter((value) => value.runId === runId)

const deriveAvailableDecisions = (
  run: DiscoveryRun,
  anchors: ReadonlyArray<AnchorCard>,
  hypotheses: ReadonlyArray<MotifHypothesis>,
): ReadonlyArray<AvailableDecision> => {
  const decisions: Array<AvailableDecision> = []
  const topHypothesis = hypotheses[0]

  if (run.budget.anchorSearchesRemaining > 0) {
    decisions.push({
      kind: "search_anchors",
      label: "Search semantic anchors",
      targetId: run.repoSnapshotId,
      templateId: "",
    })
  }

  if (anchors.length > 0) {
    decisions.push({
      kind: "create_hypothesis",
      label: "Create motif hypothesis",
      targetId: anchors[0]!.anchorId,
      templateId: "",
    })
  }

  if (topHypothesis !== undefined && run.budget.joernRunsRemaining > 0) {
    decisions.push({
      kind: "run_joern_template",
      label: "Run Joern proof template",
      targetId: topHypothesis.hypothesisId,
      templateId: "component-primitive-policy",
    })
  }

  if (topHypothesis !== undefined) {
    decisions.push({
      kind: "request_human_review",
      label: "Request human review",
      targetId: topHypothesis.hypothesisId,
      templateId: "",
    })
  }

  decisions.push(stopDecision(run.runId))
  return decisions
}

const stopDecision = (runId: string): AvailableDecision => ({
  kind: "stop",
  label: "Stop run",
  targetId: runId,
  templateId: "",
})

const updateRunTimestamp = (
  projection: MutableProjection,
  runId: string,
  updatedAt: string,
): void => {
  const run = projection.runs.get(runId)

  if (run !== undefined) {
    projection.runs.set(runId, { ...run, updatedAt })
  }
}

const updateRunStatus = (
  projection: MutableProjection,
  runId: string,
  status: "plateaued" | "completed",
  updatedAt: string,
): void => {
  const run = projection.runs.get(runId)

  if (run !== undefined) {
    projection.runs.set(runId, { ...run, status, updatedAt })
  }
}

const updateRunBudget = (
  projection: MutableProjection,
  runId: string,
  delta: Partial<DiscoveryBudget>,
): void => {
  const run = projection.runs.get(runId)

  if (run === undefined) {
    return
  }

  projection.runs.set(runId, {
    ...run,
    budget: {
      joernRunsRemaining: Math.max(
        0,
        run.budget.joernRunsRemaining + (delta.joernRunsRemaining ?? 0),
      ),
      anchorSearchesRemaining: Math.max(
        0,
        run.budget.anchorSearchesRemaining +
          (delta.anchorSearchesRemaining ?? 0),
      ),
      optimizerTurnsRemaining: Math.max(
        0,
        run.budget.optimizerTurnsRemaining +
          (delta.optimizerTurnsRemaining ?? 0),
      ),
    },
  })
}

const updateHypothesisFromEvidence = (
  projection: MutableProjection,
  evidence: EvidencePacket,
): MotifHypothesis => {
  const hypothesis = projection.hypotheses.get(evidence.hypothesisId)

  if (hypothesis === undefined) {
    throw new Error(`Missing hypothesis: ${evidence.hypothesisId}`)
  }

  return {
    ...hypothesis,
    status:
      evidence.confidence === "strong" || evidence.confidence === "medium"
        ? "supported"
        : "weak",
    score:
      evidence.confidence === "strong"
        ? Math.max(hypothesis.score, 0.88)
        : hypothesis.score,
  }
}

const promoteHypothesis = (
  projection: MutableProjection,
  hypothesisId: string,
): MotifHypothesis => {
  const hypothesis = projection.hypotheses.get(hypothesisId)

  if (hypothesis === undefined) {
    throw new Error(`Missing hypothesis: ${hypothesisId}`)
  }

  return { ...hypothesis, status: "promoted" }
}
