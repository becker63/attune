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

export const defineOperationRegistry = <Handler>(
  registry: OperationRegistry<Handler>,
): OperationRegistry<Handler> => registry

export const defineEvidenceProducer = <Event>(
  producer: EvidenceProducer<Event>,
): EvidenceProducer<Event> => producer

export const observedMovement = (
  observation: AtomGraphObservation,
): boolean => observation.changed
