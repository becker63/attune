import type {
  AttuneProtocolEvidenceEvent,
  ProtocolEvidenceKind,
} from "@attune/framework-protocol"

import type { PropertyTier, ReplayMetadata } from "./replay-metadata.js"

export type EvidenceProducerContext = Readonly<{
  readonly protocolId: string
  readonly packageId: string
  readonly runId: string
  readonly observedAt: string
  readonly tier?: PropertyTier
  readonly propertyId?: string
  readonly replay?: ReplayMetadata
}>

export type EvidenceEventInput = Readonly<{
  readonly operationId?: string
  readonly kind: ProtocolEvidenceKind
  readonly payload?: unknown
  readonly sequence?: number | string
}>

export type EvidenceProducer = Readonly<{
  readonly id: string
  readonly operationId?: string
  readonly produce: (context: EvidenceProducerContext) => readonly AttuneProtocolEvidenceEvent[]
}>

export const evidenceEventId = (
  context: EvidenceProducerContext,
  input: EvidenceEventInput,
): string =>
  [
    context.packageId,
    input.operationId ?? "package",
    input.kind,
    context.runId,
    context.propertyId ?? "property",
    input.sequence ?? "0",
  ].join(":")

export const evidenceEvent = (
  context: EvidenceProducerContext,
  operationIdOrInput: string | undefined | EvidenceEventInput,
  kind?: ProtocolEvidenceKind,
  payload?: unknown,
): AttuneProtocolEvidenceEvent => {
  const input = typeof operationIdOrInput === "object"
    ? operationIdOrInput
    : {
      kind: kind as ProtocolEvidenceKind,
      payload,
      ...(operationIdOrInput === undefined ? {} : { operationId: operationIdOrInput }),
    }

  return {
    eventId: evidenceEventId(context, input),
    runId: context.runId,
    protocolId: context.protocolId,
    packageId: context.packageId,
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
    kind: input.kind,
    observedAt: context.observedAt,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  }
}

export const defineEvidenceProducer = (
  producer: EvidenceProducer,
): EvidenceProducer => producer

export const collectEvidence = (
  context: EvidenceProducerContext,
  producers: readonly EvidenceProducer[],
): readonly AttuneProtocolEvidenceEvent[] =>
  producers.flatMap((producer) => producer.produce(context))

export const propertyRunEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  payload?: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, {
    kind: "property-run",
    operationId,
    payload: {
      replay: context.replay,
      tier: context.tier,
      ...(payload === undefined ? {} : { payload }),
    },
  })

export const lawObservedEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  lawId: string,
  payload?: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, {
    kind: "law-observed",
    operationId,
    payload: {
      lawId,
      replay: context.replay,
      ...(payload === undefined ? {} : { payload }),
    },
    sequence: lawId,
  })

export const counterexampleEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, {
    kind: "counterexample",
    operationId,
    payload: {
      replay: context.replay,
      ...(
        payload && typeof payload === "object"
          ? payload as Readonly<Record<string, unknown>>
          : { value: payload }
      ),
    },
  })
