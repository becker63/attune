import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  WorkbenchSnapshot,
  appendDiscoveryEvent,
  appendReportSection,
  buildFixtureHarnessEvents,
  buildFixtureWorkbenchSnapshot,
  deriveDecisionPacket,
  deriveWorkbenchSnapshot,
  decodeReportActions,
  fixtureDiscoveryEvents,
  fixtureReportEvents,
  fixtureRun,
  pinEvidence,
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
