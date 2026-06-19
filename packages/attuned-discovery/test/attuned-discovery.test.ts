import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  WorkbenchSnapshot,
  ViewKeys,
  anchorsRecalled,
  appendDiscoveryEvent,
  appendReportSection,
  buildFixtureHarnessEvents,
  buildFixtureWorkbenchSnapshot,
  deriveDecisionPacket,
  deriveWorkbenchSnapshot,
  decodeReportActions,
  fixtureAnchorCards,
  fixtureDiscoveryEvents,
  fixtureReportEvents,
  fixtureRun,
  makeDiscoveryAtomWorkspaceService,
  makeInMemoryReactivity,
  pinEvidence,
  readModelFromProjection,
  replayReportEvents,
  replayDiscoveryEvents,
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

    expect(() => replayReportEvents(base, events)).toThrow(
      "unknown evidence",
    )
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
          markdown: "<RuleCandidatePanel evidenceId=\"invented\" />",
        },
      ]),
    ).toThrow("executable UI text")
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
})
