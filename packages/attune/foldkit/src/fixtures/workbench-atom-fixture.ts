import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import {
  type DiscoveryAtomWorkspaceService,
  type DiscoveryEvent,
  type DiscoveryProjection,
  type DiscoveryRunAtomWorkspace,
  type ReactivityRuntime,
  type ReactivityService,
  type WorkbenchSnapshot,
  appendProjectedDiscoveryEvent,
  fixtureDiscoveryEvents,
  fixtureReportEvents,
  makeDiscoveryAtomWorkspaceService,
  makeInMemoryReactivity,
  makeReactivityRuntime,
  readModelFromProjection,
  replayDiscoveryEvents,
  viewKeysForDiscoveryEvent,
} from "@attune/attuned-discovery"
import { Effect } from "effect"

import type {
  AppliedWorkbenchFixture,
  FoldkitWorkbenchFixture,
} from "../fixture-types.js"
import { FoldKitFixtureTypesResource } from "../fixture-types.js"
import {
  FoldKitMdxViewFixtureRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  FoldKitWorkbenchAtomFixtureRecipeId,
  foldKitSourceReport,
} from "../schema.js"

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
  readonly appendedEvents: ReadonlyArray<DiscoveryEvent>
  readonly projectionReactivity: ReactivityRuntime
  readonly atomReactivity: ReactivityService
  readonly service: DiscoveryAtomWorkspaceService
  readonly registryFor: (runId: string) => DiscoveryRunAtomWorkspace
  readonly getWorkbenchSnapshot: (
    runId: string,
    iteration?: number,
  ) => WorkbenchSnapshot
  readonly runSummaryAtom: (
    runId: string,
  ) => AppliedWorkbenchFixture["runSummary"]
}>

export const makeDiscoveryAtomWorkspace = (
  events: ReadonlyArray<DiscoveryEvent>,
): DiscoveryAtomWorkspace => {
  const projectionReactivity = makeReactivityRuntime()
  const atomReactivity = makeInMemoryReactivity()
  const appendedEvents: Array<DiscoveryEvent> = []
  let projection: DiscoveryProjection = replayDiscoveryEvents([])
  const service = makeDiscoveryAtomWorkspaceService({
    readModel: readModelFromProjection(() => projection),
    reactivity: atomReactivity,
  })

  for (const event of events) {
    const write = appendProjectedDiscoveryEvent(
      projection,
      event,
      projectionReactivity,
    )
    projection = write.projection
    appendedEvents.push(event)
    atomReactivity.mutation(
      viewKeysForDiscoveryEvent(event).map((key) => [key]),
      () => undefined,
    )
  }

  const registryFor = (runId: string) => service.registryFor(runId)
  const getWorkbenchSnapshot = (runId: string, iteration = appendedEvents.length) =>
    registryFor(runId).getWorkbenchSnapshot(iteration)

  return {
    appendedEvents,
    projectionReactivity,
    atomReactivity,
    service,
    registryFor,
    getWorkbenchSnapshot,
    runSummaryAtom: (runId) => {
      const snapshot = getWorkbenchSnapshot(runId)

      return {
        runId,
        status: snapshot.decisionPacket.run.status,
        appendedEventCount: appendedEvents.length,
        snapshotVersion: snapshot.version,
        bestNextAction: snapshot.decisionPacket.bestNextAction.label,
      }
    },
  }
}

export const applyWorkbenchFixture = (
  fixture: FoldkitWorkbenchFixture = workbenchAtomFixture,
): AppliedWorkbenchFixture => {
  const trace: Array<string> = []
  const events = fixture.steps.flatMap((step) => step.events)

  for (const event of events) {
    trace.push(`append:${event._tag}:${event.eventId}`)
  }

  const workspace = makeDiscoveryAtomWorkspace(events)
  const snapshot = workspace.getWorkbenchSnapshot(fixture.runId)
  const runSummary = workspace.runSummaryAtom(fixture.runId)

  return {
    fixture,
    appendedEvents: workspace.appendedEvents,
    trace,
    snapshot,
    runSummary,
  }
}

export const appliedWorkbenchAtomFixture = applyWorkbenchFixture()

export const FoldKitWorkbenchAtomFixtureSourcePath =
  "packages/attune/foldkit/src/fixtures/workbench-atom-fixture.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitWorkbenchAtomFixtureResource = defineAlchemyResource({
  id: "attune-foldkit.workbench-atom-fixture.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitWorkbenchAtomFixtureRecipeId,
  producedBy: [FoldKitWorkbenchAtomFixtureRecipeId],
  consumedBy: [FoldKitMdxViewFixtureRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitWorkbenchAtomFixture = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitWorkbenchAtomFixtureRecipeId,
    sourcePath: FoldKitWorkbenchAtomFixtureSourcePath,
    surface:
      "Workbench atom fixture projection from discovery events into FoldKit snapshots",
    exportedSymbols: [
      "workbenchAtomFixture",
      "makeDiscoveryAtomWorkspace",
      "applyWorkbenchFixture",
      "appliedWorkbenchAtomFixture",
    ],
  })

export const FoldKitWorkbenchAtomFixtureHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.workbench-atom-fixture.handler",
  recipeId: FoldKitWorkbenchAtomFixtureRecipeId,
  sourcePath: FoldKitWorkbenchAtomFixtureSourcePath,
  exportName: "describeFoldKitWorkbenchAtomFixture",
  handler: () => Effect.succeed(describeFoldKitWorkbenchAtomFixture()),
  emitsReceipts: ["attune-foldkit.workbench-atom-fixture.report"],
})

export const FoldKitWorkbenchAtomFixtureDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitWorkbenchAtomFixtureRecipeId,
  toRecipeId: FoldKitMdxViewFixtureRecipeId,
  resource: FoldKitWorkbenchAtomFixtureResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitWorkbenchAtomFixtureRecipe = defineProjectionRecipe({
  id: FoldKitWorkbenchAtomFixtureRecipeId,
  projectId: FoldKitProjectId,
  title: "Project discovery atom fixtures into FoldKit snapshots",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitWorkbenchAtomFixtureSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitFixtureTypesResource,
    ],
    outputResources: [FoldKitWorkbenchAtomFixtureResource],
  },
  handler: FoldKitWorkbenchAtomFixtureHandler,
  alchemyDag: [FoldKitWorkbenchAtomFixtureDagEdge],
})

export const FoldKitWorkbenchAtomFixtureRecipes = [
  FoldKitWorkbenchAtomFixtureRecipe,
] as const
