import type {
  AttuneProtocolEvidenceEvent,
} from "@attune/framework-protocol"
import {
  AttuneProtocolEvidenceEventSchema,
  type ProtocolEvidenceKind,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import { defineExactSymbolMap } from "./symbol-map.js"
import type { PropertyTier, ReplayMetadata } from "./replay-metadata.js"

export type ObservationContext = Readonly<{
  readonly protocolId: string
  readonly packageId: string
  readonly runId: string
  readonly observedAt: string
  readonly tier?: PropertyTier
  readonly propertyId?: string
  readonly replay?: ReplayMetadata
}>

export type ObservationInput = Readonly<{
  readonly operationId?: string
  readonly kind: ProtocolEvidenceKind
  readonly payload?: unknown
  readonly sequence?: number | string
}>

export type ObservationProducer = Readonly<{
  readonly id: string
  readonly operationId?: string
  readonly produce: (context: ObservationContext) => readonly AttuneProtocolEvidenceEvent[]
}>

export type ObservationProducerMap<SymbolId extends string = string> =
  Readonly<Record<SymbolId, ObservationProducer>>

export const observationEventId = (
  context: ObservationContext,
  input: ObservationInput,
): string =>
  [
    context.packageId,
    input.operationId ?? "package",
    input.kind,
    context.runId,
    context.propertyId ?? "property",
    input.sequence ?? "0",
  ].join(":")

export const observationEvent = (
  context: ObservationContext,
  operationIdOrInput: string | undefined | ObservationInput,
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

  return Schema.decodeUnknownSync(AttuneProtocolEvidenceEventSchema)({
    eventId: observationEventId(context, input),
    runId: context.runId,
    protocolId: context.protocolId,
    packageId: context.packageId,
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
    kind: input.kind,
    observedAt: context.observedAt,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  }) as AttuneProtocolEvidenceEvent
}

export const defineObservationProducer = (
  producer: ObservationProducer,
): ObservationProducer => producer

export const collectObservations = (
  context: ObservationContext,
  producers: readonly ObservationProducer[],
): readonly AttuneProtocolEvidenceEvent[] =>
  producers.flatMap((producer) => producer.produce(context))

export const defineObservationProducerMap = <
  const SymbolIds extends readonly string[],
  const Producers extends ObservationProducerMap<SymbolIds[number]>,
>(
  input: Readonly<{
    readonly projectId: string
    readonly symbolIds: SymbolIds
    readonly producers: Producers
  }>,
): Producers =>
  defineExactSymbolMap({
    projectId: input.projectId,
    mapKind: "observation-producer-map",
    symbolIds: input.symbolIds,
    map: input.producers,
  })

export const collectObservationsFromMap = (
  context: ObservationContext,
  producers: ObservationProducerMap,
): readonly AttuneProtocolEvidenceEvent[] =>
  collectObservations(context, Object.values(producers))

export const propertyRunObservation = (
  context: ObservationContext,
  operationId: string,
  payload?: unknown,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
    kind: "property-run",
    operationId,
    payload: {
      replay: context.replay,
      tier: context.tier,
      ...(payload === undefined ? {} : { payload }),
    },
  })

export type TypeGuidancePartitionEvidenceStatus =
  | "hit"
  | "miss"
  | "filtered"
  | "unreachable"

export const schemaPartitionObservation = (
  context: ObservationContext,
  operationId: string,
  input: Readonly<{
    readonly partitionId: string
    readonly status: TypeGuidancePartitionEvidenceStatus
    readonly corpusSeedId?: string
    readonly filterId?: string
    readonly partitionKind?: string
    readonly reason?: string
    readonly source?: string
  }>,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
    kind: "type-guidance",
    operationId,
    payload: {
      corpusSeedId: input.corpusSeedId,
      filterId: input.filterId,
      partitionId: input.partitionId,
      partitionKind: input.partitionKind,
      reason: input.reason,
      replay: context.replay,
      source: input.source,
      status: input.status,
    },
    sequence: [
      "type-guidance",
      input.partitionKind ?? "partition",
      input.partitionId,
      input.status,
      input.filterId ?? "",
      input.corpusSeedId ?? "",
    ].join(":"),
  })

export const diagnosticRuleObservation = (
  context: ObservationContext,
  operationId: string,
  lawId: string,
  payload?: unknown,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
    kind: "law-observed",
    operationId,
    payload: {
      lawId,
      replay: context.replay,
      ...(payload === undefined ? {} : { payload }),
    },
    sequence: lawId,
  })

export const counterexampleObservation = (
  context: ObservationContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
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

export const coveragePointObservation = (
  context: ObservationContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
    kind: "coverage-point",
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

export const weakOracleObservation = (
  context: ObservationContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  observationEvent(context, {
    kind: "weak-oracle",
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
