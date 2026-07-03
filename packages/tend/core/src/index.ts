import { Effect, Schema } from "effect"
import {
  RecipeObservationSchema,
  RecipeReceiptSchema,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  recipeObservationId,
  type RecipeObservation,
} from "@attune/framework-protocol"

export const TendCoreEventEnvelopeRecipeId = "tend-core.event-envelope" as const
export const TendCoreReceiptProjectionRecipeId = "tend-core.receipt-projection" as const
export const TendCoreTestSuiteRecipeId = "tend-core.test-suite" as const
export const TendCoreConfigRecipeId = "tend-core.config-surface" as const
export const TendCoreSourcePath = "packages/tend/core/src/index.ts" as const
export const TendCoreTypecheckTarget = "tend-core:typecheck" as const

export const TendObservationStatusSchema = Schema.Literals([
  "started",
  "succeeded",
  "failed",
  "blocked",
] as const)
export type TendObservationStatus = typeof TendObservationStatusSchema.Type

export const TendTokenUsageSchema = Schema.Struct({
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cachedTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  totalTokens: Schema.Number,
})
export type TendTokenUsage = typeof TendTokenUsageSchema.Type

export const TendSessionSchema = Schema.Struct({
  sessionId: Schema.String,
  agentKind: Schema.Literals(["opencode", "codex", "other"] as const),
  startedAt: Schema.String,
  workspaceRoot: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
})
export type TendSession = typeof TendSessionSchema.Type

export const TendToolCallSchema = Schema.Struct({
  toolCallId: Schema.String,
  sessionId: Schema.String,
  toolName: Schema.String,
  status: TendObservationStatusSchema,
  occurredAt: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  tokens: Schema.optional(TendTokenUsageSchema),
  payload: Schema.optional(Schema.Unknown),
})
export type TendToolCall = typeof TendToolCallSchema.Type

export const TendCommandObservationSchema = Schema.Struct({
  commandObservationId: Schema.String,
  sessionId: Schema.String,
  command: Schema.String,
  status: TendObservationStatusSchema,
  occurredAt: Schema.String,
  outputClass: Schema.optional(Schema.String),
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  tokens: Schema.optional(TendTokenUsageSchema),
})
export type TendCommandObservation = typeof TendCommandObservationSchema.Type

export const TendValidationObservationSchema = Schema.Struct({
  validationObservationId: Schema.String,
  sessionId: Schema.String,
  validationTarget: Schema.String,
  status: TendObservationStatusSchema,
  occurredAt: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  tokens: Schema.optional(TendTokenUsageSchema),
})
export type TendValidationObservation = typeof TendValidationObservationSchema.Type

export const TendCommandOutputSampleSchema = Schema.Struct({
  sampleId: Schema.String,
  sessionId: Schema.String,
  commandObservationId: Schema.String,
  outputClass: Schema.String,
  sample: Schema.String,
  truncated: Schema.Boolean,
  tokenEstimate: Schema.Number,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
})
export type TendCommandOutputSample = typeof TendCommandOutputSampleSchema.Type

export const TendArtifactRefSchema = Schema.Struct({
  artifactRefId: Schema.String,
  sessionId: Schema.String,
  kind: Schema.Literals(["blob", "object", "file"] as const),
  uri: Schema.String,
  contentHash: Schema.optional(Schema.String),
})
export type TendArtifactRef = typeof TendArtifactRefSchema.Type

export const TendEventKindSchema = Schema.Literals([
  "session",
  "tool-call",
  "command",
  "validation",
  "token-usage",
  "token-efficiency",
  "reasoning-trace",
  "command-output-sample",
  "long-job-observation",
  "policy-decision",
  "magic-context-decision",
  "openrtk-action",
  "wakeup",
] as const)
export type TendEventKind = typeof TendEventKindSchema.Type

export const TendEventEnvelopeSchema = Schema.Struct({
  eventId: Schema.String,
  sessionId: Schema.String,
  kind: TendEventKindSchema,
  occurredAt: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  payload: Schema.Unknown,
})
export type TendEventEnvelope = typeof TendEventEnvelopeSchema.Type

export const TendLongJobSchema = Schema.Struct({
  jobId: Schema.String,
  sessionId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  registeredAt: Schema.String,
  wakeAfter: Schema.optional(Schema.String),
  pollTarget: Schema.String,
  status: Schema.Literals(["registered", "running", "ready", "failed", "cancelled"] as const),
})
export type TendLongJob = typeof TendLongJobSchema.Type

export const TendWakeupPacketSchema = Schema.Struct({
  wakeupId: Schema.String,
  sessionId: Schema.String,
  jobId: Schema.String,
  wakeAfter: Schema.String,
  targetRecipeId: Schema.String,
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  targetCommand: Schema.String,
})
export type TendWakeupPacket = typeof TendWakeupPacketSchema.Type

export const TendPolicyDecisionSchema = Schema.Struct({
  decisionId: Schema.String,
  sessionId: Schema.String,
  policyName: Schema.String,
  decision: Schema.Literals(["allow", "force-tool", "compress", "drop-context", "block"] as const),
  reason: Schema.String,
  requiredTool: Schema.optional(Schema.String),
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
})
export type TendPolicyDecision = typeof TendPolicyDecisionSchema.Type

export const TendMagicContextDecisionSchema = Schema.Struct({
  decisionId: Schema.String,
  sessionId: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  retainedContextRefs: Schema.Array(Schema.String),
  droppedContextRefs: Schema.Array(Schema.String),
  retainedTokenEstimate: Schema.Number,
  droppedTokenEstimate: Schema.Number,
  policyDecisionId: Schema.String,
})
export type TendMagicContextDecision = typeof TendMagicContextDecisionSchema.Type

export const TendOpenRtkCompressionActionSchema = Schema.Struct({
  actionId: Schema.String,
  sessionId: Schema.String,
  sourceObservationIds: Schema.Array(Schema.String),
  codec: Schema.Literals(["openrtk.command-output-v1", "openrtk.context-packet-v1"] as const),
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  summary: Schema.String,
  originalTokenEstimate: Schema.Number,
  compressedTokenEstimate: Schema.Number,
  droppedTokenEstimate: Schema.Number,
  policyDecisionId: Schema.optional(Schema.String),
})
export type TendOpenRtkCompressionAction =
  typeof TendOpenRtkCompressionActionSchema.Type

export const TendResumePacketSchema = Schema.Struct({
  packetId: Schema.String,
  sessionId: Schema.String,
  recipeId: Schema.String,
  latestReceiptId: Schema.optional(Schema.String),
  nextTarget: Schema.String,
  contextRefs: Schema.Array(Schema.String),
  wakeupId: Schema.optional(Schema.String),
})
export type TendResumePacket = typeof TendResumePacketSchema.Type

export const TendReceiptProjectionSchema = Schema.Struct({
  sessionId: Schema.String,
  receipts: Schema.Array(RecipeReceiptSchema),
  observations: Schema.Array(RecipeObservationSchema),
  events: Schema.Array(TendEventEnvelopeSchema),
})
export type TendReceiptProjection = typeof TendReceiptProjectionSchema.Type

export const TendRecipeObservationProjectionSchema = Schema.Struct({
  sessionId: Schema.String,
  observations: Schema.Array(RecipeObservationSchema),
  events: Schema.Array(TendEventEnvelopeSchema),
})
export type TendRecipeObservationProjection =
  typeof TendRecipeObservationProjectionSchema.Type

export const recipeObservationFromTendEvent = (
  event: TendEventEnvelope,
): RecipeObservation | undefined => {
  if (event.recipeId === undefined) return undefined

  const observationKind = `tend.${event.kind}`

  return {
    observationId: event.observationId
      ?? recipeObservationId(event.recipeId, `${observationKind}:${event.eventId}`, event.occurredAt),
    recipeId: event.recipeId,
    ...(event.runId === undefined ? {} : { runId: event.runId }),
    ...(event.receiptId === undefined ? {} : { receiptId: event.receiptId }),
    observationKind,
    observedAt: event.occurredAt,
    source: "tend",
    payload: {
      tend: {
        eventId: event.eventId,
        sessionId: event.sessionId,
        kind: event.kind,
      },
      payload: event.payload,
    },
  }
}

export const recipeObservationsFromTendEvents = (
  events: readonly TendEventEnvelope[],
): readonly RecipeObservation[] =>
  events.flatMap((event) => {
    const observation = recipeObservationFromTendEvent(event)
    return observation === undefined ? [] : [observation]
  })

export const TendCoreAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/core"),
  recipeId: Schema.String,
})
export type TendCoreAddress = typeof TendCoreAddress.Type

export const TendReceiptProjectionInput = Schema.Struct({
  sessionId: Schema.String,
  receipts: Schema.Array(RecipeReceiptSchema),
  events: Schema.Array(TendEventEnvelopeSchema),
})
export type TendReceiptProjectionInput = typeof TendReceiptProjectionInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendCorePackageResource = defineAlchemyResource({
  id: "tend-core.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendCoreEventEnvelopeRecipeId,
    TendCoreReceiptProjectionRecipeId,
    TendCoreTestSuiteRecipeId,
  ],
  addressSchema: TendCoreAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/tend/core/src"),
    packageId: Schema.Literal("tend-core"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendEventEnvelopeStreamResource = defineAlchemyResource({
  id: "tend-core.event-envelope-stream",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendCoreEventEnvelopeRecipeId,
  consumedBy: [TendCoreEventEnvelopeRecipeId, TendCoreReceiptProjectionRecipeId],
  addressSchema: TendCoreAddress,
  stateSchema: Schema.Array(TendEventEnvelopeSchema),
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendRecipeObservationProjectionResource = defineAlchemyResource({
  id: "tend-core.recipe-observation-projection",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendCoreEventEnvelopeRecipeId,
  producedBy: [TendCoreEventEnvelopeRecipeId, TendCoreReceiptProjectionRecipeId],
  consumedBy: [TendCoreReceiptProjectionRecipeId],
  addressSchema: TendCoreAddress,
  stateSchema: TendRecipeObservationProjectionSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendReceiptProjectionResource = defineAlchemyResource({
  id: "tend-core.receipt-projection",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendCoreReceiptProjectionRecipeId,
  producedBy: [TendCoreReceiptProjectionRecipeId],
  addressSchema: TendCoreAddress,
  stateSchema: TendReceiptProjectionSchema,
  modes: ["project", "observe"],
})

export const projectTendRecipeObservationProjection = (
  events: readonly TendEventEnvelope[],
): TendRecipeObservationProjection => ({
  sessionId: events[0]?.sessionId ?? "unknown-session",
  observations: [...recipeObservationsFromTendEvents(events)],
  events: [...events],
})

export const projectTendReceiptProjection = (
  input: TendReceiptProjectionInput,
): TendReceiptProjection => ({
  sessionId: input.sessionId,
  receipts: input.receipts,
  observations: [...recipeObservationsFromTendEvents(input.events)],
  events: input.events,
})

export const TendCoreEventEnvelopeHandler = defineRecipeHandler<readonly TendEventEnvelope[], TendRecipeObservationProjection>({
  id: "tend-core.event-envelope.handler",
  recipeId: TendCoreEventEnvelopeRecipeId,
  sourcePath: TendCoreSourcePath,
  exportName: "projectTendRecipeObservationProjection",
  handler: (events) => Effect.succeed(projectTendRecipeObservationProjection(events)),
  emitsReceipts: ["tend-core.recipe-observation-projection"],
})

export const TendCoreReceiptProjectionHandler = defineRecipeHandler<TendReceiptProjectionInput, TendReceiptProjection>({
  id: "tend-core.receipt-projection.handler",
  recipeId: TendCoreReceiptProjectionRecipeId,
  sourcePath: TendCoreSourcePath,
  exportName: "projectTendReceiptProjection",
  handler: (input) => Effect.succeed(projectTendReceiptProjection(input)),
  emitsReceipts: ["tend-core.receipt-projection"],
})

export const TendCoreEventEnvelopeDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendCoreEventEnvelopeRecipeId,
  toRecipeId: TendCoreReceiptProjectionRecipeId,
  resource: TendRecipeObservationProjectionResource,
  kind: "projects",
  modes: ["project", "observe"],
})

export const tendCoreEventEnvelopeRecipe = defineObservationRecipe({
  id: TendCoreEventEnvelopeRecipeId,
  projectId: "tend-core",
  title: "Decode Tend event envelopes as recipe-linked receipt inputs",
  inputSchema: Schema.Array(TendEventEnvelopeSchema),
  outputSchema: TendRecipeObservationProjectionSchema,
  allowedFiles: [
    TendCoreSourcePath,
  ],
  validationEvidence: [TendCoreTypecheckTarget],
  io: {
    inputSchema: Schema.Array(TendEventEnvelopeSchema),
    outputSchema: TendRecipeObservationProjectionSchema,
    inputResources: [TendEventEnvelopeStreamResource],
    outputResources: [TendRecipeObservationProjectionResource],
  },
  handler: TendCoreEventEnvelopeHandler,
  alchemyDag: [TendCoreEventEnvelopeDagEdge],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendCoreReceiptProjectionRecipe = defineProjectionRecipe({
  id: TendCoreReceiptProjectionRecipeId,
  title: "Project Tend core state from recipe receipts",
  inputSchema: TendReceiptProjectionInput,
  outputSchema: TendReceiptProjectionSchema,
  allowedFiles: [TendCoreSourcePath],
  validationEvidence: [TendCoreTypecheckTarget],
  io: {
    inputSchema: TendReceiptProjectionInput,
    outputSchema: TendReceiptProjectionSchema,
    inputResources: [
      TendEventEnvelopeStreamResource,
      TendRecipeObservationProjectionResource,
    ],
    outputResources: [TendReceiptProjectionResource],
  },
  handler: TendCoreReceiptProjectionHandler,
})

export const TendCoreProductionRecipes = [
  tendCoreEventEnvelopeRecipe,
  tendCoreReceiptProjectionRecipe,
] as const
