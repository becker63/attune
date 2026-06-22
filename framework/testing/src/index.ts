import type {
  AttuneProtocolEvidenceEvent,
  ProtocolEvidenceKind,
} from "@attune/framework-protocol"

export interface OperationRegistry<Handler> {
  readonly packageId: string
  readonly handlers: Readonly<Record<string, Handler>>
}

export interface EvidenceProducer<Event> {
  readonly id: string
  readonly operationId: string
  readonly produce: () => readonly Event[]
}

export interface AtomGraphObservation {
  readonly reactivityKey?: string
  readonly baseAtom?: string
  readonly derivedAtom?: string
  readonly packageViewAtom?: string
  readonly changed: boolean
}

export interface ReplayMetadata {
  readonly seed: number
  readonly path?: string
  readonly workerId?: string
  readonly shardId?: string
}

export interface EvidenceProducerContext {
  readonly protocolId: string
  readonly packageId: string
  readonly runId: string
  readonly observedAt: string
  readonly replay?: ReplayMetadata
}

export interface AtomGraphObserver {
  readonly observe: () => readonly AtomGraphObservation[]
}

export const defineOperationRegistry = <Handler>(
  registry: OperationRegistry<Handler>,
): OperationRegistry<Handler> => registry

export const defineEvidenceProducer = <Event>(
  producer: EvidenceProducer<Event>,
): EvidenceProducer<Event> => producer

export const observedMovement = (
  observation: AtomGraphObservation,
): boolean => observation.changed

export const evidenceEvent = (
  context: EvidenceProducerContext,
  operationId: string | undefined,
  kind: ProtocolEvidenceKind,
  payload?: unknown,
): AttuneProtocolEvidenceEvent => ({
  eventId: [
    context.packageId,
    operationId ?? "package",
    kind,
    context.runId,
  ].join(":"),
  runId: context.runId,
  protocolId: context.protocolId,
  packageId: context.packageId,
  ...(operationId === undefined ? {} : { operationId }),
  kind,
  observedAt: context.observedAt,
  ...(payload === undefined ? {} : { payload }),
})

export const atomMovementEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  observations: readonly AtomGraphObservation[],
): readonly AttuneProtocolEvidenceEvent[] =>
  observations
    .filter(observedMovement)
    .map((observation, index) =>
      evidenceEvent(context, operationId, "atom-movement", {
        index,
        observation,
        replay: context.replay,
      }),
    )

export const propertyRunEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  payload?: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, operationId, "property-run", {
    replay: context.replay,
    ...(payload === undefined ? {} : { payload }),
  })
