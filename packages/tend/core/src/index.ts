import { Schema } from "effect"
import {
  RecipeObservationSchema,
  RecipeReceiptSchema,
  defineRecipe,
  recipeObservationId,
  type RecipeObservation,
} from "@attune/framework-protocol"

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

export const TendCoreRecipes = [
  defineRecipe({
    id: "tend-core.event-envelope",
    projectId: "tend-core",
    title: "Normalize Tend session, tool, command, policy, OpenRTK, and wakeup events",
    inputSchema: Schema.Array(TendEventEnvelopeSchema),
    outputSchema: TendReceiptProjectionSchema,
    nxTarget: "tend-core:test",
    sourcePath: "packages/tend/core/src/index.ts",
    allowedFiles: ["packages/tend/core/**"],
    validationEvidence: ["tend-core:test", "tend-core:typecheck"],
  }),
] as const
