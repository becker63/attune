import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineObservationRecipe,
  defineRecipeHandler,
  ProgramObservationSchema,
  type ProgramObservation,
  type ProgramObservationKind,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { defineExactSymbolMap } from "./symbol-map.js"
import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"
import type { PropertyTier, ReplayMetadata } from "./replay-metadata.js"

export type ObservationContext = Readonly<{
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly runId: string
  readonly observedAt: string
  readonly tier?: PropertyTier
  readonly propertyId?: string
  readonly replay?: ReplayMetadata
}>

export type ObservationInput = Readonly<{
  readonly symbolId?: string
  readonly kind: ProgramObservationKind
  readonly payload?: unknown
  readonly sequence?: number | string
}>

export type ObservationProducer = Readonly<{
  readonly id: string
  readonly symbolId?: string
  readonly produce: (context: ObservationContext) => readonly ProgramObservation[]
}>

export type ObservationProducerMap<SymbolId extends string = string> =
  Readonly<Record<SymbolId, ObservationProducer>>

export const observationEventId = (
  context: ObservationContext,
  input: ObservationInput,
): string =>
  [
    context.projectId,
    input.symbolId ?? "package",
    input.kind,
    context.runId,
    context.propertyId ?? "property",
    input.sequence ?? "0",
  ].join(":")

export const observationEvent = (
  context: ObservationContext,
  symbolIdOrInput: string | undefined | ObservationInput,
  kind?: ProgramObservationKind,
  payload?: unknown,
): ProgramObservation => {
  const input = typeof symbolIdOrInput === "object"
    ? symbolIdOrInput
    : {
      kind: kind as ProgramObservationKind,
      payload,
      ...(symbolIdOrInput === undefined ? {} : { symbolId: symbolIdOrInput }),
    }

  return Schema.decodeUnknownSync(ProgramObservationSchema)({
    eventId: observationEventId(context, input),
    runId: context.runId,
    schemaDescriptorId: context.schemaDescriptorId,
    projectId: context.projectId,
    ...(input.symbolId === undefined ? {} : { symbolId: input.symbolId }),
    kind: input.kind,
    observedAt: context.observedAt,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  }) as ProgramObservation
}

export const defineObservationProducer = (
  producer: ObservationProducer,
): ObservationProducer => producer

export const collectObservations = (
  context: ObservationContext,
  producers: readonly ObservationProducer[],
): readonly ProgramObservation[] =>
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
): readonly ProgramObservation[] =>
  collectObservations(context, Object.values(producers))

export const propertyRunObservation = (
  context: ObservationContext,
  symbolId: string,
  payload?: unknown,
): ProgramObservation =>
  observationEvent(context, {
    kind: "property-run",
    symbolId,
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
  symbolId: string,
  input: Readonly<{
    readonly partitionId: string
    readonly status: TypeGuidancePartitionEvidenceStatus
    readonly corpusSeedId?: string
    readonly filterId?: string
    readonly partitionKind?: string
    readonly reason?: string
    readonly source?: string
  }>,
): ProgramObservation =>
  observationEvent(context, {
    kind: "type-guidance",
    symbolId,
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
  symbolId: string,
  lawId: string,
  payload?: unknown,
): ProgramObservation =>
  observationEvent(context, {
    kind: "law-observed",
    symbolId,
    payload: {
      lawId,
      replay: context.replay,
      ...(payload === undefined ? {} : { payload }),
    },
    sequence: lawId,
  })

export const counterexampleObservation = (
  context: ObservationContext,
  symbolId: string,
  payload: unknown,
): ProgramObservation =>
  observationEvent(context, {
    kind: "counterexample",
    symbolId,
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
  symbolId: string,
  payload: unknown,
): ProgramObservation =>
  observationEvent(context, {
    kind: "coverage-point",
    symbolId,
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
  symbolId: string,
  payload: unknown,
): ProgramObservation =>
  observationEvent(context, {
    kind: "weak-oracle",
    symbolId,
    payload: {
      replay: context.replay,
      ...(
        payload && typeof payload === "object"
          ? payload as Readonly<Record<string, unknown>>
          : { value: payload }
      ),
    },
  })

export const FrameworkTestingObservationProducerRecipeId = "framework-testing.observation-producer" as const
export const FrameworkTestingObservationProducerSourcePath =
  "packages/trellis/testing/src/observation-producer.ts" as const

export const describeFrameworkTestingObservationProducer = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "observation-producer", {
    observationCount: input.symbolIds.length + 1,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingObservationProducerSourceResource = defineAlchemyResource({
  id: "framework-testing.observation-producer.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingObservationProducerSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingObservationProducerRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingObservationProducerStreamResource = defineAlchemyResource({
  id: "framework-testing.observation-producer.stream",
  kind: "observation-stream",
  alchemyType: "attune:resource:FrameworkTestingObservationProducerStream",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["observe", "read"],
  ownerRecipeId: FrameworkTestingObservationProducerRecipeId,
  producedBy: [FrameworkTestingObservationProducerRecipeId],
})

export const FrameworkTestingObservationProducerHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.observation-producer.handler",
  recipeId: FrameworkTestingObservationProducerRecipeId,
  sourcePath: FrameworkTestingObservationProducerSourcePath,
  exportName: "describeFrameworkTestingObservationProducer",
  emitsReceipts: ["framework-testing.observation-producer.summary"],
  handler: (input) => Effect.succeed(describeFrameworkTestingObservationProducer(input)),
})

export const FrameworkTestingObservationProducerDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.observation-producer.source",
  toRecipeId: FrameworkTestingObservationProducerRecipeId,
  resource: FrameworkTestingObservationProducerStreamResource,
  kind: "observes",
  modes: ["read", "observe"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingObservationProducerRecipes = [
  defineObservationRecipe({
    id: FrameworkTestingObservationProducerRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own framework testing observation producer",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingObservationProducerSourceResource],
      outputResources: [FrameworkTestingObservationProducerStreamResource],
    },
    handler: FrameworkTestingObservationProducerHandler,
    alchemyDag: [FrameworkTestingObservationProducerDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    observedFiles: [FrameworkTestingObservationProducerSourcePath],
    allowedFiles: [FrameworkTestingObservationProducerSourcePath],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const
