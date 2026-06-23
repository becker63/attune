import type {
  AttuneProtocolEvidenceEvent,
} from "@attune/framework-protocol"
import {
  AttuneProtocolEvidenceEventSchema,
  type ProtocolEvidenceKind,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import { defineExactOperationMap } from "./operation-registry.js"
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

export type EvidenceProducerMap<OperationId extends string = string> =
  Readonly<Record<OperationId, EvidenceProducer>>

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

  return Schema.decodeUnknownSync(AttuneProtocolEvidenceEventSchema)({
    eventId: evidenceEventId(context, input),
    runId: context.runId,
    protocolId: context.protocolId,
    packageId: context.packageId,
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
    kind: input.kind,
    observedAt: context.observedAt,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  }) as AttuneProtocolEvidenceEvent
}

export const defineEvidenceProducer = (
  producer: EvidenceProducer,
): EvidenceProducer => producer

export const collectEvidence = (
  context: EvidenceProducerContext,
  producers: readonly EvidenceProducer[],
): readonly AttuneProtocolEvidenceEvent[] =>
  producers.flatMap((producer) => producer.produce(context))

export const defineEvidenceProducerMap = <
  const OperationIds extends readonly string[],
  const Producers extends EvidenceProducerMap<OperationIds[number]>,
>(
  input: Readonly<{
    readonly packageId: string
    readonly operationIds: OperationIds
    readonly producers: Producers
  }>,
): Producers =>
  defineExactOperationMap({
    packageId: input.packageId,
    mapKind: "evidence-producer-map",
    operationIds: input.operationIds,
    map: input.producers,
  })

export const collectEvidenceFromMap = (
  context: EvidenceProducerContext,
  producers: EvidenceProducerMap,
): readonly AttuneProtocolEvidenceEvent[] =>
  collectEvidence(context, Object.values(producers))

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

export type TypeGuidancePartitionEvidenceStatus =
  | "hit"
  | "miss"
  | "filtered"
  | "unreachable"

export const typeGuidancePartitionEvidence = (
  context: EvidenceProducerContext,
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
  evidenceEvent(context, {
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

export const coveragePointEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, {
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

export const weakOracleEvidence = (
  context: EvidenceProducerContext,
  operationId: string,
  payload: unknown,
): AttuneProtocolEvidenceEvent =>
  evidenceEvent(context, {
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
