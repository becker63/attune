import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineObservationRecipe,
  defineRecipeHandler,
  type ProgramObservation,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { observationEvent, type ObservationContext } from "./observation-producer.js"
import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"

export type AtomGraphNodeKind =
  | "reactivity-key"
  | "base-atom"
  | "derived-atom"
  | "package-view-atom"

export type AtomGraphObservation = Readonly<{
  readonly reactivityKey?: string
  readonly baseAtom?: string
  readonly derivedAtom?: string
  readonly packageViewAtom?: string
  readonly viewEdgeId?: string
  readonly changed: boolean
  readonly before?: unknown
  readonly after?: unknown
  readonly diff?: unknown
  readonly metadata?: Readonly<Record<string, unknown>>
}>

export type AtomGraphObserverInput = Readonly<{
  readonly projectId: string
  readonly symbolId?: string
  readonly replay?: ObservationContext["replay"]
}>

export interface AtomGraphObserver {
  readonly observe: (input?: AtomGraphObserverInput) => readonly AtomGraphObservation[]
}

export const observedMovement = (
  observation: AtomGraphObservation,
): boolean => observation.changed

const observationIdentity = (
  observation: AtomGraphObservation,
): string =>
  [
    observation.reactivityKey ?? "",
    observation.baseAtom ?? "",
    observation.derivedAtom ?? "",
    observation.packageViewAtom ?? "",
    observation.viewEdgeId ?? "",
  ].join("\u0000")

export const mergeAtomGraphObservations = (
  observations: readonly AtomGraphObservation[],
): readonly AtomGraphObservation[] => {
  const byIdentity = new Map<string, AtomGraphObservation>()
  for (const observation of observations) {
    const key = observationIdentity(observation)
    const previous = byIdentity.get(key)
    byIdentity.set(key, previous === undefined
      ? observation
      : {
        ...previous,
        ...observation,
        changed: previous.changed || observation.changed,
      })
  }
  return [...byIdentity.values()].sort((left, right) =>
    observationIdentity(left).localeCompare(observationIdentity(right)),
  )
}

export const atomMovementEvidence = (
  context: ObservationContext,
  symbolId: string,
  observations: readonly AtomGraphObservation[],
): readonly ProgramObservation[] =>
  mergeAtomGraphObservations(observations)
    .filter(observedMovement)
    .map((observation, index) =>
      observationEvent(context, {
        kind: observation.reactivityKey === undefined ? "atom-movement" : "reactivity-key",
        symbolId,
        payload: {
          observation,
          replay: context.replay,
        },
        sequence: `${index}:${observationIdentity(observation)}`,
      }),
    )

export const FrameworkTestingAtomGraphObserverRecipeId = "framework-testing.atom-graph-observer" as const
export const FrameworkTestingAtomGraphObserverSourcePath =
  "packages/trellis/testing/src/atom-graph-observer.ts" as const

export const describeFrameworkTestingAtomGraphObserver = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "atom-graph-observer", {
    observationCount: input.symbolIds.length,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingAtomGraphObserverSourceResource = defineAlchemyResource({
  id: "framework-testing.atom-graph-observer.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingAtomGraphObserverSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingAtomGraphObserverRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingAtomGraphObservationResource = defineAlchemyResource({
  id: "framework-testing.atom-graph-observer.observations",
  kind: "observation-stream",
  alchemyType: "attune:resource:FrameworkTestingAtomGraphObservations",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["observe", "read"],
  ownerRecipeId: FrameworkTestingAtomGraphObserverRecipeId,
  producedBy: [FrameworkTestingAtomGraphObserverRecipeId],
})

export const FrameworkTestingAtomGraphObserverHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.atom-graph-observer.handler",
  recipeId: FrameworkTestingAtomGraphObserverRecipeId,
  sourcePath: FrameworkTestingAtomGraphObserverSourcePath,
  exportName: "describeFrameworkTestingAtomGraphObserver",
  emitsReceipts: ["framework-testing.atom-graph-observer.observations"],
  handler: (input) => Effect.succeed(describeFrameworkTestingAtomGraphObserver(input)),
})

export const FrameworkTestingAtomGraphObserverDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.atom-graph-observer.source",
  toRecipeId: FrameworkTestingAtomGraphObserverRecipeId,
  resource: FrameworkTestingAtomGraphObservationResource,
  kind: "observes",
  modes: ["read", "observe"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingAtomGraphObserverRecipes = [
  defineObservationRecipe({
    id: FrameworkTestingAtomGraphObserverRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own atom graph observation helpers",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingAtomGraphObserverSourceResource],
      outputResources: [FrameworkTestingAtomGraphObservationResource],
    },
    handler: FrameworkTestingAtomGraphObserverHandler,
    alchemyDag: [FrameworkTestingAtomGraphObserverDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    allowedFiles: [FrameworkTestingAtomGraphObserverSourcePath],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const
