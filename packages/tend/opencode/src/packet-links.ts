import { Effect, Schema } from "effect"
import {
  MigrationJudgmentSchema,
  PacketReceiptPayloadSchema,
  PacketSchema,
  PacketStatusSchema,
  RecipeObservationSchema,
  RecipeReceiptSchema,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  packetReceiptPayloadFromObservation,
  type MigrationJudgment,
  type Packet,
  type PacketReceiptPayload,
  type RecipeObservation,
  type RecipeReceipt,
} from "@attune/framework-protocol"

export const TendPacketProtocolTypecheckValidationTargets = ["tend-opencode:typecheck"] as const
export const TendPacketProtocolLinkRecipeId = "tend-opencode.packet-protocol-linker" as const
const tendPacketProtocolLinkHandlerId = "tend-opencode.packet-protocol-linker.handler" as const
const tendPacketProtocolLinkSourcePath = "packages/tend/opencode/src/packet-links.ts" as const

export const TendPacketProtocolLinkedSummarySchema = Schema.Struct({
  packetId: Schema.String,
  linkedPacketIds: Schema.Array(Schema.String),
  recipeId: Schema.optional(Schema.String),
  sourceSnapshotId: Schema.optional(Schema.String),
  ruleIds: Schema.Array(Schema.String),
  targetIds: Schema.Array(Schema.String),
  packetStatus: Schema.optional(PacketStatusSchema),
  judgmentId: Schema.optional(Schema.String),
  judgmentStatus: Schema.optional(MigrationJudgmentSchema.fields.status),
  promotionAllowed: Schema.optional(Schema.Boolean),
  receiptIds: Schema.Array(Schema.String),
  observationIds: Schema.Array(Schema.String),
  benchmarkRunId: Schema.optional(Schema.String),
  measurementSessionId: Schema.optional(Schema.String),
  sessionId: Schema.optional(Schema.String),
})
export type TendPacketProtocolLinkedSummary = typeof TendPacketProtocolLinkedSummarySchema.Type

export const TendPacketProtocolLinkInputSchema = Schema.Struct({
  packet: Schema.optional(Schema.Unknown),
  packetId: Schema.optional(Schema.String),
  packetIds: Schema.optional(Schema.Array(Schema.String)),
  linkedPacketIds: Schema.optional(Schema.Array(Schema.String)),
  judgment: Schema.optional(Schema.Unknown),
  judgmentId: Schema.optional(Schema.String),
  receiptPayloads: Schema.optional(Schema.Array(Schema.Unknown)),
  receipts: Schema.optional(Schema.Array(Schema.Unknown)),
  receiptIds: Schema.optional(Schema.Array(Schema.String)),
  observations: Schema.optional(Schema.Array(Schema.Unknown)),
  observationIds: Schema.optional(Schema.Array(Schema.String)),
  benchmarkRunId: Schema.optional(Schema.String),
  measurementSessionId: Schema.optional(Schema.String),
  sessionId: Schema.optional(Schema.String),
})
export type TendPacketProtocolLinkInput = typeof TendPacketProtocolLinkInputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendPacketProtocolLinkInputResource = defineAlchemyResource({
  id: "tend-opencode.packet-protocol-link-input.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendPacketProtocolLinkRecipeId,
  consumedBy: [TendPacketProtocolLinkRecipeId],
  addressFields: ["packetId", "sessionId"],
  addressSchema: TendPacketProtocolLinkInputSchema,
  stateSchema: TendPacketProtocolLinkInputSchema,
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendPacketProtocolLinkedSummaryResource = defineAlchemyResource({
  id: "tend-opencode.packet-protocol-linked-summary.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendPacketProtocolLinkRecipeId,
  producedBy: [TendPacketProtocolLinkRecipeId],
  consumedBy: ["tend-opencode.receipt-projection"],
  addressFields: ["packetId"],
  addressSchema: Schema.String,
  stateSchema: TendPacketProtocolLinkedSummarySchema,
  modes: ["project", "read"],
})

export const decodeTendProtocolPacket = (input: unknown): Packet =>
  Schema.decodeUnknownSync(PacketSchema)(input)

export const decodeTendProtocolMigrationJudgment = (input: unknown): MigrationJudgment =>
  Schema.decodeUnknownSync(MigrationJudgmentSchema)(input)

export const decodeTendProtocolPacketReceiptPayload = (input: unknown): PacketReceiptPayload =>
  Schema.decodeUnknownSync(PacketReceiptPayloadSchema)(input)

export const decodeTendProtocolRecipeReceipt = (input: unknown): RecipeReceipt =>
  Schema.decodeUnknownSync(RecipeReceiptSchema)(input)

export const decodeTendProtocolRecipeObservation = (input: unknown): RecipeObservation =>
  Schema.decodeUnknownSync(RecipeObservationSchema)(input)

export const decodeTendPacketProtocolLinkedSummary = (input: unknown): TendPacketProtocolLinkedSummary =>
  Schema.decodeUnknownSync(TendPacketProtocolLinkedSummarySchema)(input)

export const tendPacketReceiptPayloadsFromObservations = (
  observations: readonly unknown[],
): readonly PacketReceiptPayload[] =>
  observations
    .map(decodeTendProtocolRecipeObservation)
    .flatMap(packetReceiptPayloadsFromObservation)

export const normalizeTendPacketProtocolLinkedSummary = (
  input: TendPacketProtocolLinkInput,
): TendPacketProtocolLinkedSummary => {
  const packet = input.packet === undefined ? undefined : decodeTendProtocolPacket(input.packet)
  const observations = (input.observations ?? []).map(decodeTendProtocolRecipeObservation)
  const observationJudgments = observations.flatMap(migrationJudgmentsFromObservation)
  const judgment = input.judgment === undefined
    ? observationJudgments[0]
    : decodeTendProtocolMigrationJudgment(input.judgment)
  const receiptPayloads = [
    ...(input.receiptPayloads ?? []).map(decodeTendProtocolPacketReceiptPayload),
    ...observations.flatMap(packetReceiptPayloadsFromObservation),
  ]
  const receipts = (input.receipts ?? []).map(decodeTendProtocolRecipeReceipt)
  const payloadRecords = [
    ...receiptPayloads.flatMap((receiptPayload) => recordOrEmpty(receiptPayload.payload)),
    ...observations.flatMap((observation) => recordOrEmpty(observation.payload)),
  ]
  const packetIds = uniqueStrings([
    ...(input.packetIds ?? []),
    ...(input.linkedPacketIds ?? []),
    ...(packet === undefined ? [] : [packet.id]),
    ...receiptPayloads.map((receiptPayload) => receiptPayload.packetId),
    ...(judgment?.blockerPacketIds ?? []),
  ])
  const packetId = input.packetId ?? packet?.id ?? packetIds[0]

  if (packetId === undefined) {
    throw new Error("Cannot normalize Tend packet protocol links without a packet ID")
  }

  return decodeTendPacketProtocolLinkedSummary({
    packetId,
    linkedPacketIds: packetIds.filter((id) => id !== packetId),
    ...(packet?.recipeId === undefined && receiptPayloads[0]?.recipeId === undefined
      ? {}
      : { recipeId: packet?.recipeId ?? receiptPayloads[0]?.recipeId }),
    ...(packet?.sourceSnapshotId === undefined && receiptPayloads[0]?.sourceSnapshotId === undefined
      ? {}
      : { sourceSnapshotId: packet?.sourceSnapshotId ?? receiptPayloads[0]?.sourceSnapshotId }),
    ruleIds: uniqueStrings([
      ...(packet?.ruleIds ?? []),
      ...receiptPayloads.flatMap((receiptPayload) => receiptPayload.ruleIds),
    ]),
    targetIds: uniqueStrings([
      ...(packet?.targets.map((target) => target.id) ?? []),
      ...receiptPayloads.flatMap((receiptPayload) => receiptPayload.targetIds),
    ]),
    ...(packet?.status === undefined && receiptPayloads[0]?.status === undefined
      ? {}
      : { packetStatus: packet?.status ?? receiptPayloads[0]?.status }),
    ...(input.judgmentId === undefined && judgment?.judgmentId === undefined && firstReceiptJudgmentId(receiptPayloads) === undefined
      ? {}
      : { judgmentId: input.judgmentId ?? judgment?.judgmentId ?? firstReceiptJudgmentId(receiptPayloads) }),
    ...(judgment?.status === undefined ? {} : { judgmentStatus: judgment.status }),
    ...(judgment?.promotionAllowed === undefined ? {} : { promotionAllowed: judgment.promotionAllowed }),
    receiptIds: uniqueStrings([
      ...(input.receiptIds ?? []),
      ...receipts.map((receipt) => receipt.receiptId),
      ...(judgment?.receiptIds ?? []),
      ...observations.flatMap((observation) => observation.receiptId === undefined ? [] : [observation.receiptId]),
    ]),
    observationIds: uniqueStrings([
      ...(input.observationIds ?? []),
      ...observations.map((observation) => observation.observationId),
    ]),
    ...(input.benchmarkRunId === undefined && firstRecordString(payloadRecords, "benchmarkRunId") === undefined
      ? {}
      : { benchmarkRunId: input.benchmarkRunId ?? firstRecordString(payloadRecords, "benchmarkRunId") }),
    ...(input.measurementSessionId === undefined && firstRecordString(payloadRecords, "measurementSessionId") === undefined
      ? {}
      : { measurementSessionId: input.measurementSessionId ?? firstRecordString(payloadRecords, "measurementSessionId") }),
    ...(input.sessionId === undefined && firstRecordString(payloadRecords, "sessionId") === undefined
      ? {}
      : { sessionId: input.sessionId ?? firstRecordString(payloadRecords, "sessionId") }),
  })
}

// @attune-packet-target generated-runtime-projection eligible
export const TendPacketProtocolLinkRecipe = defineProjectionRecipe({
  id: TendPacketProtocolLinkRecipeId,
  title: "Project framework packet protocol links into Tend OpenCode summaries",
  inputSchema: TendPacketProtocolLinkInputSchema,
  outputSchema: TendPacketProtocolLinkedSummarySchema,
  allowedFiles: [tendPacketProtocolLinkSourcePath],
  validationEvidence: ["tend-opencode:typecheck", "tend-opencode:test"],
  io: {
    inputSchema: TendPacketProtocolLinkInputSchema,
    outputSchema: TendPacketProtocolLinkedSummarySchema,
    inputResources: [TendPacketProtocolLinkInputResource],
    outputResources: [TendPacketProtocolLinkedSummaryResource],
  },
  handler: defineRecipeHandler<TendPacketProtocolLinkInput, TendPacketProtocolLinkedSummary>({
    id: tendPacketProtocolLinkHandlerId,
    recipeId: TendPacketProtocolLinkRecipeId,
    sourcePath: tendPacketProtocolLinkSourcePath,
    exportName: "normalizeTendPacketProtocolLinkedSummary",
    emitsReceipts: ["opencode.packet-links.projected"],
    handler: (input) => Effect.sync(() => normalizeTendPacketProtocolLinkedSummary(input)),
  }),
  alchemyDag: [{
    fromRecipeId: TendPacketProtocolLinkRecipeId,
    toRecipeId: "tend-opencode.receipt-projection",
    resource: TendPacketProtocolLinkedSummaryResource,
    kind: "projects",
    modes: ["project", "read"],
    validationTargets: TendPacketProtocolTypecheckValidationTargets,
  }],
})

export const TendPacketProtocolRecipes = [TendPacketProtocolLinkRecipe] as const

const packetReceiptPayloadsFromObservation = (
  observation: RecipeObservation,
): readonly PacketReceiptPayload[] => {
  const directPayload = packetReceiptPayloadFromObservation(observation)
  return uniquePacketReceiptPayloads([
    ...(directPayload === undefined ? [] : [directPayload]),
    ...packetReceiptPayloadsFromValue(observation.payload),
  ])
}

const packetReceiptPayloadsFromValue = (value: unknown): readonly PacketReceiptPayload[] =>
  recordOrEmpty(value).flatMap((record) =>
    [
      record["protocolReceipt"],
      record["protocolPacketReceipt"],
      record["packetReceiptPayload"],
      record["packetReceipt"],
      ...recordOrEmpty(record["protocol"]).flatMap((protocol) => [
        protocol["receipt"],
        protocol["packetReceipt"],
        protocol["packetReceiptPayload"],
      ]),
    ].flatMap(decodeOptionalPacketReceiptPayload)
  )

const migrationJudgmentsFromObservation = (
  observation: RecipeObservation,
): readonly MigrationJudgment[] =>
  migrationJudgmentsFromValue(observation.payload)

const migrationJudgmentsFromValue = (value: unknown): readonly MigrationJudgment[] =>
  recordOrEmpty(value).flatMap((record) =>
    [
      record["protocolJudgment"],
      record["migrationJudgment"],
      ...recordOrEmpty(record["protocol"]).flatMap((protocol) => [
        protocol["judgment"],
        protocol["migrationJudgment"],
      ]),
    ].flatMap(decodeOptionalMigrationJudgment)
  )

const decodeOptionalPacketReceiptPayload = (value: unknown): readonly PacketReceiptPayload[] => {
  if (value === undefined) return []
  try {
    return [decodeTendProtocolPacketReceiptPayload(value)]
  } catch {
    return []
  }
}

const decodeOptionalMigrationJudgment = (value: unknown): readonly MigrationJudgment[] => {
  if (value === undefined) return []
  try {
    return [decodeTendProtocolMigrationJudgment(value)]
  } catch {
    return []
  }
}

const uniquePacketReceiptPayloads = (
  payloads: readonly PacketReceiptPayload[],
): readonly PacketReceiptPayload[] => {
  const seen = new Set<string>()
  const unique: PacketReceiptPayload[] = []
  for (const payload of payloads) {
    const key = [
      payload.packetId,
      payload.recipeId,
      payload.sourceSnapshotId,
      payload.kind,
      payload.status,
      payload.judgmentId ?? "",
    ].join("\0")
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(payload)
  }
  return unique
}

const firstReceiptJudgmentId = (
  receiptPayloads: readonly PacketReceiptPayload[],
): string | undefined =>
  receiptPayloads.find((receiptPayload) => receiptPayload.judgmentId !== undefined)?.judgmentId

const firstRecordString = (
  records: readonly Record<string, unknown>[],
  key: string,
): string | undefined =>
  records.find((record) => typeof record[key] === "string" && record[key].length > 0)?.[key] as string | undefined

const recordOrEmpty = (value: unknown): readonly Record<string, unknown>[] =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? [value as Record<string, unknown>]
    : []

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values.filter((value) => value.length > 0))]
