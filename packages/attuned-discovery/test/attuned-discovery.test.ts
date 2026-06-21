import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  DiscoveryEvents,
  DiscoveryEventsLive,
  InMemoryDiscoveryEventLogLive,
  ViewKeys,
  WorkbenchSnapshot,
  anchorsRecalled,
  appendDiscoveryEvent,
  appendReportSection,
  buildFixtureHarnessEvents,
  buildFixtureWorkbenchSnapshot,
  deriveDecisionPacket,
  appendProjectedDiscoveryEvent,
  deriveDecisionPacketFromAtoms,
  makeDiscoveryAtomWorkspace,
  makeDiscoveryAtomWorkspaceService,
  makeInMemoryReactivity,
  makeReactivityRuntime,
  deriveWorkbenchSnapshot,
  decodeReportActions,
  fixtureAnchorCards,
  fixtureDiscoveryEvents,
  fixtureEvidence,
  fixtureHypothesis,
  fixtureReportEvents,
  fixtureRun,
  familyUpdated,
  makeInMemoryMotifReadModel,
  makeProjectionReactivityRecorder,
  metricRecorded,
  pinEvidence,
  evidenceScored,
  projectDiscoveryEventsToReadModel,
  readModelFromProjection,
  runCompleted,
  replayReportEvents,
  replayDiscoveryEvents,
  viewKeysForDiscoveryEvent,
  reportActionRecorded,
  rulePromotionRequested,
} from "../src/index.js"

describe("attuned discovery", () => {
  it("decodes fixture WorkbenchSnapshot packets", () => {
    const snapshot = buildFixtureWorkbenchSnapshot()
    const decoded = Schema.decodeUnknownSync(WorkbenchSnapshot)(snapshot)

    expect(decoded.runId).toBe(fixtureRun.runId)
    expect(decoded.decisionPacket.hypotheses).toHaveLength(1)
    expect(decoded.reviewQueue).toHaveLength(1)
    expect(decoded.report.sections).toHaveLength(1)
    expect(decoded.report.sections[0]?.pinnedEvidenceIds).toHaveLength(1)
  })

  it("rejects invalid boundary packets before rendering", () => {
    expect(() =>
      Schema.decodeUnknownSync(WorkbenchSnapshot)({
        runId: fixtureRun.runId,
        version: "not-a-number",
      }),
    ).toThrow()
  })

  it("announces run-scoped ViewKeys after representative projection writes", () => {
    const reactivity = makeProjectionReactivityRecorder()
    replayDiscoveryEvents(fixtureDiscoveryEvents, reactivity)

    expect(reactivity.mutations).toHaveLength(fixtureDiscoveryEvents.length)
    expect(
      reactivity.mutations.every((mutation) => mutation.writeSucceeded),
    ).toBe(true)

    const anchorMutation = reactivity.mutations.find((mutation) =>
      mutation.keys.includes(ViewKeys.anchors(fixtureRun.runId)[0]!),
    )
    expect(anchorMutation?.keys).toEqual(
      expect.arrayContaining([
        ...ViewKeys.anchors(fixtureRun.runId),
        ...ViewKeys.run(fixtureRun.runId),
      ]),
    )

    const evidenceMutation = reactivity.mutations.find((mutation) =>
      mutation.keys.includes(ViewKeys.evidence(fixtureRun.runId)[0]!),
    )
    expect(evidenceMutation?.keys).toEqual(
      expect.arrayContaining([
        ...ViewKeys.evidence(fixtureRun.runId),
        ...ViewKeys.evidenceForHypothesis({
          runId: fixtureRun.runId,
          hypothesisId: "hypothesis-server-atoms-foldkit-lens",
        }),
        ...ViewKeys.hypotheses(fixtureRun.runId),
        ...ViewKeys.hypothesis("hypothesis-server-atoms-foldkit-lens"),
        ...ViewKeys.runMetrics(fixtureRun.runId),
      ]),
    )
  })

  it("does not announce Reactivity keys when a projection write fails", () => {
    const reactivity = makeProjectionReactivityRecorder()
    const invalidPromotion = rulePromotionRequested(
      fixtureRun.runId,
      "missing-hypothesis",
      "human",
    )

    expect(() => replayDiscoveryEvents([invalidPromotion], reactivity)).toThrow(
      "Missing hypothesis: missing-hypothesis",
    )
    expect(viewKeysForDiscoveryEvent(invalidPromotion)).toEqual(
      expect.arrayContaining([
        ...ViewKeys.hypotheses(fixtureRun.runId),
        ...ViewKeys.hypothesis("missing-hypothesis"),
        ...ViewKeys.reviewQueue(fixtureRun.runId),
      ]),
    )
    expect(reactivity.mutations).toHaveLength(0)
  })

  it("replays discovery events deterministically", () => {
    const first = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )
    const second = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )

    expect(first).toEqual(second)
    expect(first.version).toBe(fixtureDiscoveryEvents.length)
  })

  it("increments snapshot version after durable semantic events", () => {
    const before = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )
    const after = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(
        appendDiscoveryEvent(
          fixtureDiscoveryEvents,
          rulePromotionRequested(
            fixtureRun.runId,
            "hypothesis-server-atoms-foldkit-lens",
            "human",
          ),
        ),
      ),
      fixtureRun.runId,
    )

    expect(after.version).toBe(before.version + 1)
    expect(after.decisionPacket.hypotheses[0]?.status).toBe("promoted")
  })

  it("replays report events independently from discovery events", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )
    const report = replayReportEvents(base, fixtureReportEvents)

    expect(report.version).toBe(fixtureReportEvents.length)
    expect([...report.sections.values()][0]?.narrative).toContain(
      "Effect Reactivity",
    )
  })

  it("rejects report actions that invent evidence IDs", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )
    const events = [
      reportActionRecorded(
        appendReportSection({
          actionId: "section",
          runId: fixtureRun.runId,
          sectionId: "section",
          template: "evidence-cluster",
          title: "Evidence",
          props: [],
        }),
      ),
      reportActionRecorded(
        pinEvidence({
          actionId: "pin",
          runId: fixtureRun.runId,
          sectionId: "section",
          evidenceId: "invented-evidence",
          reason: "This should fail.",
        }),
      ),
    ]

    expect(() => replayReportEvents(base, events)).toThrow("unknown evidence")
  })

  it("decodes validated local report-agent output", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )
    const actions = decodeReportActions(base, [
      {
        _tag: "AppendReportSection",
        actionId: "section",
        runId: fixtureRun.runId,
        sectionId: "section",
        template: "finding-summary",
        title: "Bounded report composition",
        props: [{ name: "tone", value: "live-briefing" }],
      },
    ])

    expect(actions).toHaveLength(1)
  })

  it("rejects hidden runtime payload keys in report-agent output", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )

    expect(() =>
      decodeReportActions(base, [
        {
          _tag: "AppendReportSection",
          actionId: "section",
          runId: fixtureRun.runId,
          sectionId: "section",
          template: "finding-summary",
          title: "Unsafe",
          props: [],
          react: "function Component() {}",
        },
      ]),
    ).toThrow("unsupported key")
  })

  it("rejects unregistered report props", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )

    expect(() =>
      decodeReportActions(base, [
        {
          _tag: "AppendReportSection",
          actionId: "section",
          runId: fixtureRun.runId,
          sectionId: "section",
          template: "finding-summary",
          title: "Unsafe",
          props: [{ name: "componentFactory", value: "new-ui" }],
        },
      ]),
    ).toThrow("not allowed")
  })

  it("rejects executable MDX or React-shaped narrative", () => {
    const base = deriveWorkbenchSnapshot(
      replayDiscoveryEvents(fixtureDiscoveryEvents),
      fixtureRun.runId,
    )

    expect(() =>
      decodeReportActions(base, [
        {
          _tag: "UpdateNarrative",
          actionId: "narrative",
          runId: fixtureRun.runId,
          sectionId: "section",
          markdown: '<RuleCandidatePanel evidenceId="invented" />',
        },
      ]),
    ).toThrow("executable UI text")
  })

  it("replays the ATT-12 projection-input vocabulary", () => {
    const family = {
      familyId: "family-server-view-boundary",
      runId: fixtureRun.runId,
      title: "Server view boundary",
      hypothesisIds: ["hypothesis-server-atoms-foldkit-lens"],
      status: "stable" as const,
      updatedAt: "2026-06-19T05:02:15.000Z",
    }
    const metric = {
      metricId: "metric-run-score",
      runId: fixtureRun.runId,
      name: "decision_packet_score",
      value: 0.88,
      unit: "score",
      recordedAt: "2026-06-19T05:02:30.000Z",
    }

    const projection = replayDiscoveryEvents([
      ...fixtureDiscoveryEvents,
      familyUpdated(family),
      metricRecorded(metric),
      runCompleted(fixtureRun.runId, "completed", "Golden slice accepted."),
    ])

    expect(projection.runs.get(fixtureRun.runId)?.status).toBe("completed")
    expect(projection.families.get(family.familyId)).toEqual(family)
    expect(projection.metrics).toEqual([metric])
    expect(projection.decisions).toHaveLength(1)
    expect(projection.reviewQueue).toHaveLength(1)
    expect(projection.anchors.size).toBeGreaterThan(0)
    expect(projection.hypotheses.size).toBeGreaterThan(0)
    expect(projection.evidence.size).toBeGreaterThan(0)
  })

  it("writes semantic events only through the DiscoveryEvents live facade", () => {
    const program = Effect.gen(function* () {
      const events = yield* DiscoveryEvents
      yield* events.runStarted(fixtureRun)
      yield* events.anchorsRecalled(fixtureRun.runId, [])
      return yield* events.replay
    }).pipe(
      Effect.provide(DiscoveryEventsLive),
      Effect.provide(InMemoryDiscoveryEventLogLive()),
    )

    const projection = Effect.runSync(
      program as Effect.Effect<
        ReturnType<typeof replayDiscoveryEvents>,
        never,
        never
      >,
    )

    expect(projection.version).toBe(2)
    expect(projection.runs.get(fixtureRun.runId)?.runId).toBe(fixtureRun.runId)
  })

  it("materializes representative events into durable read-model rows", () => {
    const readModel = makeInMemoryMotifReadModel()

    projectDiscoveryEventsToReadModel(readModel, fixtureDiscoveryEvents)

    expect(readModel.getRun(fixtureRun.runId)).toEqual(fixtureRun)
    expect(readModel.listAnchorsForRun(fixtureRun.runId)).toHaveLength(2)
    expect(readModel.listActiveFamilies(fixtureRun.runId)).toHaveLength(1)
    expect(readModel.listActiveHypotheses(fixtureRun.runId)).toHaveLength(1)
    expect(
      readModel.listRecentEvidence({ runId: fixtureRun.runId, limit: 10 }),
    ).toHaveLength(1)
    expect(readModel.listReviewQueue(fixtureRun.runId)).toHaveLength(1)
    expect(readModel.getRunMetrics(fixtureRun.runId)).toMatchObject({
      anchorsCount: 2,
      hypothesesCount: 1,
      evidenceCount: 1,
      reviewQueueCount: 1,
    })
  })

  it("filters read-model rows by run, status, and evidence recency", () => {
    const readModel = makeInMemoryMotifReadModel()
    const otherRun = {
      ...fixtureRun,
      runId: "run-other",
      repoSnapshotId: "workspace-other",
    }
    const candidateHypothesis = {
      ...fixtureHypothesis,
      hypothesisId: "hypothesis-candidate",
      status: "candidate" as const,
      score: 0.42,
    }
    const rejectedHypothesis = {
      ...fixtureHypothesis,
      hypothesisId: "hypothesis-rejected",
      status: "rejected" as const,
      score: 0.12,
    }
    const evidence = [1, 2, 3].map((index) => ({
      ...fixtureEvidence,
      evidenceId: `evidence-${index}`,
      createdAt: `2026-06-19T05:0${index}:00.000Z`,
    }))

    readModel.upsertRunStarted(fixtureRun)
    readModel.upsertRunStarted(otherRun)
    readModel.upsertAnchorCards([
      ...fixtureAnchorCards,
      {
        ...fixtureAnchorCards[0]!,
        anchorId: "anchor-other",
        runId: otherRun.runId,
      },
    ])
    readModel.upsertFamily({
      familyId: "family-active",
      runId: fixtureRun.runId,
      title: "Active family",
      summary: "Included in active-family reads.",
      status: "active",
      anchorIds: [fixtureAnchorCards[0]!.anchorId],
    })
    readModel.upsertFamily({
      familyId: "family-merged",
      runId: fixtureRun.runId,
      title: "Merged family",
      summary: "Excluded from active-family reads.",
      status: "merged",
      anchorIds: [fixtureAnchorCards[1]!.anchorId],
    })
    readModel.upsertHypothesis(candidateHypothesis)
    readModel.upsertHypothesis(rejectedHypothesis)
    evidence.forEach((packet) => readModel.insertEvidencePacket(packet))
    readModel.insertEvidencePacket({
      ...fixtureEvidence,
      evidenceId: "evidence-other",
      runId: otherRun.runId,
    })
    readModel.insertReviewRequest({
      reviewId: "review-run",
      runId: fixtureRun.runId,
      kind: "hypothesis",
      title: "Review run hypothesis",
      summary: "Only this run should be returned.",
      targetId: candidateHypothesis.hypothesisId,
      requiredAction: "Review candidate.",
    })
    readModel.refreshRunMetrics({
      runId: fixtureRun.runId,
      updatedAt: "2026-06-19T05:04:00.000Z",
    })

    expect(readModel.listAnchorsForRun(fixtureRun.runId)).toHaveLength(2)
    expect(
      readModel
        .listActiveFamilies(fixtureRun.runId)
        .map((family) => family.familyId),
    ).toEqual(["family-active"])
    expect(
      readModel
        .listQueuedHypotheses(fixtureRun.runId)
        .map((hypothesis) => hypothesis.hypothesisId),
    ).toEqual([candidateHypothesis.hypothesisId])
    expect(
      readModel
        .listActiveHypotheses(fixtureRun.runId)
        .map((hypothesis) => hypothesis.hypothesisId),
    ).toEqual([candidateHypothesis.hypothesisId])
    expect(
      readModel
        .listRecentEvidence({ runId: fixtureRun.runId, limit: 2 })
        .map((packet) => packet.evidenceId),
    ).toEqual(["evidence-2", "evidence-3"])
    expect(readModel.listReviewQueue(fixtureRun.runId)).toHaveLength(1)
    expect(readModel.getRunMetrics(fixtureRun.runId)).toMatchObject({
      anchorsCount: 2,
      hypothesesCount: 2,
      evidenceCount: 3,
      reviewQueueCount: 1,
    })
    expect(readModel.snapshot().runs.map((run) => run.runId)).toEqual([
      fixtureRun.runId,
      otherRun.runId,
    ])
  })

  it("throws explicit read-model missing-row errors", () => {
    const readModel = makeInMemoryMotifReadModel()

    expect(() => readModel.getRun("missing-run")).toThrow(
      "Missing read-model row: discovery_runs/missing-run",
    )
    expect(() =>
      readModel.markHypothesisDiscarded({
        runId: fixtureRun.runId,
        hypothesisId: "missing-hypothesis",
      }),
    ).toThrow("Missing read-model row: motif_hypotheses/missing-hypothesis")
  })

  it("announces run-scoped ViewKeys after successful projection writes", () => {
    const reactivity = makeReactivityRuntime()
    const before = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const scored = evidenceScored({
      evidenceId: "evidence-reactive-refresh",
      runId: fixtureRun.runId,
      hypothesisId: "hypothesis-server-atoms-foldkit-lens",
      templateId: "reactivity-refresh",
      confidence: "medium",
      summary: "Fresh evidence should refresh evidence and hypothesis views.",
      durationMs: 42,
      excerpts: ["projection write completed"],
      createdAt: "2026-06-19T05:02:45.000Z",
    })

    const { projection, announcedKeys } = appendProjectedDiscoveryEvent(
      before,
      scored,
      reactivity,
    )

    expect(projection.evidence.has("evidence-reactive-refresh")).toBe(true)
    expect(reactivity.mutations.at(-1)?.keys).toEqual(announcedKeys)
    expect(announcedKeys).toEqual(
      expect.arrayContaining([
        ...ViewKeys.evidence(fixtureRun.runId),
        ...ViewKeys.hypotheses(fixtureRun.runId),
        ...ViewKeys.runMetrics(fixtureRun.runId),
      ]),
    )
  })

  it("refreshes base atoms through ViewKeys and recomputes packet and FoldKit scene", () => {
    const reactivity = makeReactivityRuntime()
    let projection = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const workspace = makeDiscoveryAtomWorkspace({
      runId: fixtureRun.runId,
      getProjection: () => projection,
      reactivity,
    })
    const beforePacket = workspace.decisionPacketAtom(1).read()
    const beforeScene = workspace.foldSceneAtom(1).read()

    projection = appendProjectedDiscoveryEvent(
      projection,
      evidenceScored({
        evidenceId: "evidence-new-scene-node",
        runId: fixtureRun.runId,
        hypothesisId: "hypothesis-server-atoms-foldkit-lens",
        templateId: "scene-refresh",
        confidence: "strong",
        summary: "New evidence should appear in the shared atom-derived views.",
        durationMs: 51,
        excerpts: ["atom view refreshed"],
        createdAt: "2026-06-19T05:02:50.000Z",
      }),
      reactivity,
    ).projection

    const afterPacket = deriveDecisionPacketFromAtoms(workspace, 2)
    const afterScene = workspace.foldSceneAtom(2).read()

    expect(workspace.evidenceAtom.keys).toEqual(
      ViewKeys.evidence(fixtureRun.runId),
    )
    expect(workspace.decisionPacketAtom(2).keys).toEqual([])
    expect(afterPacket.evidence.length).toBe(beforePacket.evidence.length + 1)
    expect(afterScene.nodes.length).toBe(beforeScene.nodes.length + 1)
    expect(afterScene.nodes.at(-1)?.id).toBe("evidence-new-scene-node")
    workspace.dispose()
  })

  it("keeps one run-scoped atom registry per active run", () => {
    const projection = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const workspaceService = makeDiscoveryAtomWorkspaceService({
      readModel: readModelFromProjection(() => projection),
      reactivity: makeInMemoryReactivity(),
    })

    const first = workspaceService.registryFor(fixtureRun.runId)
    const second = workspaceService.registryFor(fixtureRun.runId)

    expect(first).toBe(second)
    expect(workspaceService.activeRunIds()).toEqual([fixtureRun.runId])

    workspaceService.disposeRun(fixtureRun.runId)

    expect(workspaceService.activeRunIds()).toEqual([])
    expect(() => first.getRun()).toThrow("disposed")
  })

  it("base atoms read projected state through read-model services", () => {
    const projection = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const workspace = makeDiscoveryAtomWorkspaceService({
      readModel: readModelFromProjection(() => projection),
      reactivity: makeInMemoryReactivity(),
    }).registryFor(fixtureRun.runId)

    expect(workspace.getRun().runId).toBe(fixtureRun.runId)
    expect(workspace.getRunMetrics()).toMatchObject({
      runId: fixtureRun.runId,
      anchorCount: 2,
      hypothesisCount: 1,
      evidenceCount: 1,
      reviewQueueCount: 1,
    })
    expect(workspace.getAnchors()).toHaveLength(2)
    expect(workspace.getActiveFamilies()).toHaveLength(2)
    expect(workspace.getActiveHypotheses()).toHaveLength(1)
    expect(workspace.getRecentEvidence()).toHaveLength(1)
    expect(workspace.getReviewQueue()).toHaveLength(1)
  })

  it("refreshes representative base atoms through Reactivity ViewKeys", () => {
    let projection = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const reactivity = makeInMemoryReactivity()
    const workspace = makeDiscoveryAtomWorkspaceService({
      readModel: readModelFromProjection(() => projection),
      reactivity,
    }).registryFor(fixtureRun.runId)

    expect(workspace.getAnchors()).toHaveLength(2)

    projection = replayDiscoveryEvents([
      ...fixtureDiscoveryEvents,
      anchorsRecalled(fixtureRun.runId, [
        {
          ...fixtureAnchorCards[0]!,
          anchorId: "anchor-fresh-reactivity",
          title: "Fresh Reactivity key refreshes server atoms",
        },
      ]),
    ])

    expect(workspace.getAnchors()).toHaveLength(2)

    reactivity.mutation([ViewKeys.anchors(fixtureRun.runId)], () => undefined)

    expect(workspace.getAnchors()).toHaveLength(3)
    expect(workspace.inspect()).toContainEqual({
      label: `anchors:${fixtureRun.runId}`,
      key: ViewKeys.anchors(fixtureRun.runId),
      version: 1,
    })
  })

  it("refreshes atom-derived WorkbenchSnapshot through read-model Reactivity", () => {
    let projection = replayDiscoveryEvents(fixtureDiscoveryEvents)
    const projectionReactivity = makeReactivityRuntime()
    const atomReactivity = makeInMemoryReactivity()
    const workspace = makeDiscoveryAtomWorkspaceService({
      readModel: readModelFromProjection(() => projection),
      reactivity: atomReactivity,
    }).registryFor(fixtureRun.runId)
    const before = workspace.getWorkbenchSnapshot(1)
    const scored = evidenceScored({
      ...fixtureEvidence,
      evidenceId: "evidence-read-model-snapshot-refresh",
      templateId: "read-model-refresh",
      createdAt: "2026-06-19T05:04:30.000Z",
    })

    const write = appendProjectedDiscoveryEvent(
      projection,
      scored,
      projectionReactivity,
    )
    projection = write.projection
    atomReactivity.mutation(
      viewKeysForDiscoveryEvent(scored).map((key) => [key]),
      () => undefined,
    )

    const after = workspace.getWorkbenchSnapshot(2)

    expect(write.announcedKeys).toEqual(
      expect.arrayContaining([
        ...ViewKeys.evidence(fixtureRun.runId),
        ...ViewKeys.runMetrics(fixtureRun.runId),
      ]),
    )
    expect(after.version).toBe(before.version + 1)
    expect(after.decisionPacket.evidence).toHaveLength(
      before.decisionPacket.evidence.length + 1,
    )
    expect(after.scene.nodes.at(-1)?.id).toBe(
      "evidence-read-model-snapshot-refresh",
    )
    expect(workspace.inspect()).toContainEqual({
      label: `recentEvidence:${fixtureRun.runId}`,
      key: ViewKeys.evidence(fixtureRun.runId),
      version: 1,
    })
  })

  it("removes Joern decisions when Joern budget is exhausted", () => {
    const exhaustedRun = {
      ...fixtureRun,
      budget: {
        ...fixtureRun.budget,
        joernRunsRemaining: 0,
      },
    }
    const projection = replayDiscoveryEvents([
      {
        _tag: "DiscoveryRunStarted",
        eventId: "run-exhausted:started",
        occurredAt: exhaustedRun.startedAt,
        run: exhaustedRun,
      },
      ...buildFixtureHarnessEvents().slice(1, 3),
    ])
    const packet = deriveDecisionPacket(projection, exhaustedRun.runId)

    expect(
      packet.availableDecisions.some(
        (decision: { readonly kind: string }) =>
          decision.kind === "run_joern_template",
      ),
    ).toBe(false)
  })

  it("removes anchor search decisions when anchor budget is exhausted", () => {
    const exhaustedRun = {
      ...fixtureRun,
      budget: {
        ...fixtureRun.budget,
        anchorSearchesRemaining: 0,
      },
    }
    const projection = replayDiscoveryEvents([
      {
        _tag: "DiscoveryRunStarted",
        eventId: "run-anchor-exhausted:started",
        occurredAt: exhaustedRun.startedAt,
        run: exhaustedRun,
      },
      ...buildFixtureHarnessEvents().slice(1, 3),
    ])
    const packet = deriveDecisionPacket(projection, exhaustedRun.runId)

    expect(
      packet.availableDecisions.map((decision) => decision.kind),
    ).not.toContain("search_anchors")
    expect(packet.bestNextAction.kind).toBe("create_hypothesis")
  })

  it("decrements budgets on evidence and accepted decisions without going below zero", () => {
    const nearlyExhaustedRun = {
      ...fixtureRun,
      budget: {
        joernRunsRemaining: 1,
        anchorSearchesRemaining: 1,
        optimizerTurnsRemaining: 0,
      },
    }
    const projection = replayDiscoveryEvents([
      {
        _tag: "DiscoveryRunStarted",
        eventId: "run-budget-clamp:started",
        occurredAt: nearlyExhaustedRun.startedAt,
        run: nearlyExhaustedRun,
      },
      ...buildFixtureHarnessEvents().slice(1, 3),
      evidenceScored({
        ...fixtureEvidence,
        evidenceId: "evidence-budget-clamp",
        createdAt: "2026-06-19T05:03:00.000Z",
      }),
      {
        _tag: "AgentDecisionRecorded",
        eventId: "decision-budget-clamp:recorded",
        occurredAt: "2026-06-19T05:03:30.000Z",
        decision: {
          decisionId: "decision-budget-clamp",
          runId: nearlyExhaustedRun.runId,
          kind: "request_human_review",
          targetId: fixtureHypothesis.hypothesisId,
          templateId: "",
          rationale: "Exercise optimizer budget clamping.",
          createdAt: "2026-06-19T05:03:30.000Z",
        },
      },
    ])
    const packet = deriveDecisionPacket(projection, nearlyExhaustedRun.runId)

    expect(packet.budget).toEqual({
      joernRunsRemaining: 0,
      anchorSearchesRemaining: 1,
      optimizerTurnsRemaining: 0,
    })
    expect(
      packet.availableDecisions.map((decision) => decision.kind),
    ).not.toContain("run_joern_template")
  })
})
