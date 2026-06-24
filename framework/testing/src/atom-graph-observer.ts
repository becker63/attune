import type { ProgramObservation } from "@attune/framework-protocol"

import { observationEvent, type ObservationContext } from "./observation-producer.js"

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
