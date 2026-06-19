import {
  type DiscoveryEvent,
  type DiscoveryEventLogClient,
  type WorkbenchSnapshot,
  deriveWorkbenchSnapshot,
  fixtureDiscoveryEvents,
  fixtureReportEvents,
  makeInMemoryDiscoveryEventLog,
  replayDiscoveryEvents,
  replayReportEvents,
} from "@attune/attuned-discovery"
import { Effect } from "effect"

import type {
  AppliedWorkbenchFixture,
  FoldkitWorkbenchFixture,
} from "../fixture-types.js"

export const workbenchAtomFixture = {
  fixtureId: "foldkit-closed-loop-workbench",
  runId: "run-attuned-semantic-workbench",
  title: "FoldKit closed loop through server-side atom snapshot",
  steps: [
    {
      stepId: "semantic-events",
      title: "Append discovery facts at the event/atom boundary",
      events: fixtureDiscoveryEvents satisfies ReadonlyArray<DiscoveryEvent>,
    },
  ],
  reportEvents: fixtureReportEvents,
} satisfies FoldkitWorkbenchFixture

export type DiscoveryAtomWorkspace = Readonly<{
  readonly eventLog: DiscoveryEventLogClient
  readonly appendedEvents: Effect.Effect<ReadonlyArray<DiscoveryEvent>>
  readonly getWorkbenchSnapshot: (runId: string) => Effect.Effect<WorkbenchSnapshot>
  readonly runSummaryAtom: (runId: string) => Effect.Effect<AppliedWorkbenchFixture["runSummary"]>
}>

export const makeDiscoveryAtomWorkspace = (
  eventLog: DiscoveryEventLogClient,
  reportEvents = workbenchAtomFixture.reportEvents,
): DiscoveryAtomWorkspace => {
  const appendedEvents = eventLog.readAll
  const getWorkbenchSnapshot = (runId: string) =>
    appendedEvents.pipe(
      Effect.map((events) => {
        const projection = replayDiscoveryEvents(events)
        const base = deriveWorkbenchSnapshot(projection, runId)
        const reportProjection = replayReportEvents(base, reportEvents)
        return deriveWorkbenchSnapshot(projection, runId, reportProjection)
      }),
    )

  return {
    eventLog,
    appendedEvents,
    getWorkbenchSnapshot,
    runSummaryAtom: (runId) =>
      getWorkbenchSnapshot(runId).pipe(
        Effect.flatMap((snapshot) =>
          appendedEvents.pipe(
            Effect.map((events) => ({
              runId,
              status: snapshot.decisionPacket.run.status,
              appendedEventCount: events.length,
              snapshotVersion: snapshot.version,
              bestNextAction: snapshot.decisionPacket.bestNextAction.label,
            })),
          ),
        ),
      ),
  }
}

export const applyWorkbenchFixture = (
  fixture: FoldkitWorkbenchFixture = workbenchAtomFixture,
): AppliedWorkbenchFixture =>
  Effect.runSync(
    Effect.gen(function* () {
      const eventLog = yield* makeInMemoryDiscoveryEventLog()
      const trace: Array<string> = []

      for (const step of fixture.steps) {
        for (const event of step.events) {
          yield* eventLog.append(event)
          trace.push(`append:${event._tag}:${event.eventId}`)
        }
      }

      const workspace = makeDiscoveryAtomWorkspace(eventLog, fixture.reportEvents)
      const appendedEvents = yield* workspace.appendedEvents
      const snapshot = yield* workspace.getWorkbenchSnapshot(fixture.runId)
      const runSummary = yield* workspace.runSummaryAtom(fixture.runId)

      return { fixture, appendedEvents, trace, snapshot, runSummary }
    }),
  )

export const appliedWorkbenchAtomFixture = applyWorkbenchFixture()
