import * as crypto from "node:crypto"

import { Effect, Schema } from "effect"
import {
  RecipeObservationSchema,
  RecipeReceiptSchema,
  defineAlchemyResource,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  recipeObservationId,
  type RecipeReceipt,
} from "@attune/framework-protocol"
import {
  TendCommandObservationSchema,
  TendEventEnvelopeSchema,
  TendSessionSchema,
  TendToolCallSchema,
  TendValidationObservationSchema,
  recipeObservationsFromTendEvents,
  type TendCommandObservation,
  type TendEventEnvelope,
  type TendSession,
  type TendToolCall,
  type TendTokenUsage,
  type TendValidationObservation,
} from "@attune/tend-core"
import { compressWithOpenRtk, evaluateForcedToolPolicy, selectMagicContext } from "@attune/tend-policies"
import {
  TendPacketProtocolLinkedSummarySchema,
  normalizeTendPacketProtocolLinkedSummary,
} from "./packet-links.js"

export const TendOpenCodeSessionTypecheckValidationTargets = ["tend-opencode:typecheck"] as const
export const TendOpenCodeSessionDecoderRecipeId = "tend-opencode.session-decoder" as const
export const TendOpenCodeReceiptProjectionRecipeId = "tend-opencode.receipt-projection" as const
export const TendOpenCodePolicyForcingRecipeId = "tend-opencode.policy-forcing" as const
const tendOpenCodeIndexSourcePath = "packages/tend/opencode/src/index.ts" as const
const tendOpenCodeSessionDecoderHandlerId = "tend-opencode.session-decoder.handler" as const
const tendOpenCodeReceiptProjectionHandlerId = "tend-opencode.receipt-projection.handler" as const
const tendOpenCodePolicyForcingHandlerId = "tend-opencode.policy-forcing.handler" as const

export { opencodeSessionLogFixture } from "./fixtures/opencode-session-log.js"
export * from "./packet-links.js"

export const OpenCodeTokenUsageSchema = Schema.Struct({
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cachedTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  totalTokens: Schema.optional(Schema.Number),
})
export type OpenCodeTokenUsage = typeof OpenCodeTokenUsageSchema.Type

export const OpenCodeRawEventSchema = Schema.Struct({
  type: Schema.Literals(["session", "tool", "command", "validation", "reasoning"] as const),
  occurredAt: Schema.String,
  status: Schema.optional(Schema.Literals(["started", "succeeded", "failed", "blocked"] as const)),
  recipeId: Schema.optional(Schema.String),
  toolCallId: Schema.optional(Schema.String),
  toolName: Schema.optional(Schema.String),
  toolInputSummary: Schema.optional(Schema.String),
  toolInputHash: Schema.optional(Schema.String),
  toolResultSummary: Schema.optional(Schema.String),
  toolResultHash: Schema.optional(Schema.String),
  commandObservationId: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
  outputClass: Schema.optional(Schema.String),
  validationObservationId: Schema.optional(Schema.String),
  validationTarget: Schema.optional(Schema.String),
  reasoningTraceId: Schema.optional(Schema.String),
  reasoningPhase: Schema.optional(Schema.String),
  reasoningSummary: Schema.optional(Schema.String),
  reasoningSummaryHash: Schema.optional(Schema.String),
  durationMs: Schema.optional(Schema.Number),
  tokens: Schema.optional(OpenCodeTokenUsageSchema),
  input: Schema.optional(Schema.Unknown),
  arguments: Schema.optional(Schema.Unknown),
  output: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
  payload: Schema.optional(Schema.Unknown),
  metadata: Schema.optional(Schema.Unknown),
  raw: Schema.optional(Schema.Unknown),
})
export type OpenCodeRawEvent = typeof OpenCodeRawEventSchema.Type

export const OpenCodeSessionLogSchema = Schema.Struct({
  sessionId: Schema.String,
  startedAt: Schema.String,
  workspaceRoot: Schema.String,
  events: Schema.Array(OpenCodeRawEventSchema),
})
export type OpenCodeSessionLog = typeof OpenCodeSessionLogSchema.Type

export const TendOpenCodeDecodedSessionSchema = Schema.Struct({
  session: TendSessionSchema,
  events: Schema.Array(TendEventEnvelopeSchema),
  toolCalls: Schema.Array(TendToolCallSchema),
  commands: Schema.Array(TendCommandObservationSchema),
  validations: Schema.Array(TendValidationObservationSchema),
  receipts: Schema.Array(RecipeReceiptSchema),
  observations: Schema.Array(RecipeObservationSchema),
})
export type TendOpenCodeDecodedSession = typeof TendOpenCodeDecodedSessionSchema.Type

export const TendOpenCodeReceiptProjectionOutput = Schema.Struct({
  receipts: Schema.Array(RecipeReceiptSchema),
  linkedSummary: TendPacketProtocolLinkedSummarySchema,
})
export type TendOpenCodeReceiptProjectionOutput = typeof TendOpenCodeReceiptProjectionOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeSessionLogResource = defineAlchemyResource({
  id: "tend-opencode.session-log.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendOpenCodeSessionDecoderRecipeId,
  consumedBy: [
    TendOpenCodeSessionDecoderRecipeId,
    TendOpenCodeReceiptProjectionRecipeId,
    TendOpenCodePolicyForcingRecipeId,
  ],
  addressFields: ["sessionId"],
  addressSchema: OpenCodeSessionLogSchema,
  stateSchema: OpenCodeSessionLogSchema,
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeDecodedSessionResource = defineAlchemyResource({
  id: "tend-opencode.decoded-session.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: TendOpenCodeSessionDecoderRecipeId,
  producedBy: [
    TendOpenCodeSessionDecoderRecipeId,
    TendOpenCodePolicyForcingRecipeId,
  ],
  consumedBy: [TendOpenCodeReceiptProjectionRecipeId],
  addressFields: ["session.sessionId"],
  addressSchema: Schema.String,
  stateSchema: TendOpenCodeDecodedSessionSchema,
  modes: ["project", "observe", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeReceiptProjectionResource = defineAlchemyResource({
  id: "tend-opencode.receipt-projection.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendOpenCodeReceiptProjectionRecipeId,
  producedBy: [TendOpenCodeReceiptProjectionRecipeId],
  consumedBy: [TendOpenCodePolicyForcingRecipeId],
  addressSchema: Schema.String,
  stateSchema: TendOpenCodeReceiptProjectionOutput,
  modes: ["project", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodePolicyEvidenceResource = defineAlchemyResource({
  id: "tend-opencode.policy-evidence.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendOpenCodePolicyForcingRecipeId,
  producedBy: [TendOpenCodePolicyForcingRecipeId],
  addressSchema: Schema.String,
  stateSchema: TendOpenCodeDecodedSessionSchema,
  modes: ["project", "read"],
})

export const decodeOpenCodeSessionLog = (
  input: OpenCodeSessionLog,
): TendOpenCodeDecodedSession => {
  const sessionRecipeId = input.events.find((event) => event.recipeId !== undefined)?.recipeId
    ?? TendOpenCodeSessionDecoderRecipeId
  const runId = `opencode-run:${input.sessionId}`
  const session: TendSession = {
    sessionId: input.sessionId,
    agentKind: "opencode",
    startedAt: input.startedAt,
    workspaceRoot: input.workspaceRoot,
    ...(sessionRecipeId === undefined ? {} : { recipeId: sessionRecipeId }),
    runId,
  }
  const toolCalls: TendToolCall[] = []
  const commands: TendCommandObservation[] = []
  const validations: TendValidationObservation[] = []
  const events: TendEventEnvelope[] = []
  const receipts: RecipeReceipt[] = []

  for (const [index, event] of input.events.entries()) {
    const eventId = `opencode:${input.sessionId}:${index}`
    const eventRecipeId = event.recipeId ?? sessionRecipeId
    const eventKind = event.type === "tool"
      ? "tool-call"
      : event.type === "reasoning"
      ? "reasoning-trace"
      : event.type
    const observationIdFor = (kind: TendEventEnvelope["kind"]): string | undefined =>
      eventRecipeId === undefined
        ? undefined
        : recipeObservationId(eventRecipeId, `tend.${kind}:${eventId}`, event.occurredAt)
    const eventObservationId = observationIdFor(eventKind)
    const tokenUsage = tendTokenUsageFromOpenCodeEvent(event)
    const validationReceiptId = event.type === "validation"
      ? `opencode-receipt:${event.validationObservationId ?? eventId}`
      : undefined
    events.push({
      eventId,
      sessionId: input.sessionId,
      kind: eventKind,
      occurredAt: event.occurredAt,
      ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
      runId,
      ...(validationReceiptId === undefined ? {} : { receiptId: validationReceiptId }),
      ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
      payload: richOpenCodeEventPayload(event, tokenUsage),
    })
    if (tokenUsage !== undefined) {
      const tokenUsageObservationId = observationIdFor("token-usage")
      events.push({
        eventId: `${eventId}:token-usage`,
        sessionId: input.sessionId,
        kind: "token-usage",
        occurredAt: event.occurredAt,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(tokenUsageObservationId === undefined ? {} : { observationId: tokenUsageObservationId }),
        payload: {
          schemaVersion: 1,
          source: "opencode-session-decoder",
          sourceEventId: eventId,
          sourceEventType: event.type,
          tokens: tokenUsage,
          rawEvent: sanitizeTraceValue(event.raw ?? event),
        },
      })
    }
    if (event.type === "tool") {
      const tool = event.toolName ?? "unknown-tool"
      toolCalls.push({
        toolCallId: event.toolCallId ?? eventId,
        sessionId: input.sessionId,
        toolName: tool,
        status: event.status ?? "succeeded",
        occurredAt: event.occurredAt,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
        ...(tokenUsage === undefined ? {} : { tokens: tokenUsage }),
        payload: richToolCallPayload(event, tokenUsage),
      })
      const policyObservationId = observationIdFor("policy-decision")
      const policy = evaluateForcedToolPolicy({
        sessionId: input.sessionId,
        requestedTool: tool,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(policyObservationId === undefined ? {} : { observationId: policyObservationId }),
      })
      events.push({
        eventId: `${eventId}:policy`,
        sessionId: input.sessionId,
        kind: "policy-decision",
        occurredAt: event.occurredAt,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(policyObservationId === undefined ? {} : { observationId: policyObservationId }),
        payload: policy,
      })
    }
    if (event.type === "command") {
      const command: TendCommandObservation = {
        commandObservationId: event.commandObservationId ?? eventId,
        sessionId: input.sessionId,
        command: event.command ?? "",
        status: event.status ?? "succeeded",
        occurredAt: event.occurredAt,
        ...(event.outputClass === undefined ? {} : { outputClass: event.outputClass }),
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
        ...(tokenUsage === undefined ? {} : { tokens: tokenUsage }),
      }
      commands.push(command)
      const policy = evaluateForcedToolPolicy({
        sessionId: input.sessionId,
        requestedTool: "openrtk.compress",
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
      })
      const openrtk = compressWithOpenRtk({
        sessionId: input.sessionId,
        command,
        policyDecisionId: policy.decisionId,
      })
      const magicContext = selectMagicContext({
        sessionId: input.sessionId,
        policyDecisionId: policy.decisionId,
        contextRefs: [`command:${command.commandObservationId}`, "recipe:framework-runtime.local-timescaledb"],
        maxRetained: 1,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
      })
      const openRtkObservationId = observationIdFor("openrtk-action")
      const magicContextObservationId = observationIdFor("magic-context-decision")
      events.push(
        {
          eventId: `${eventId}:openrtk`,
          sessionId: input.sessionId,
          kind: "openrtk-action",
          occurredAt: event.occurredAt,
          ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
          runId,
          ...(openRtkObservationId === undefined ? {} : { observationId: openRtkObservationId }),
          payload: openrtk,
        },
        {
          eventId: `${eventId}:magic-context`,
          sessionId: input.sessionId,
          kind: "magic-context-decision",
          occurredAt: event.occurredAt,
          ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
          runId,
          ...(magicContextObservationId === undefined ? {} : { observationId: magicContextObservationId }),
          payload: magicContext,
        },
      )
    }
    if (event.type === "validation") {
      const validation: TendValidationObservation = {
        validationObservationId: event.validationObservationId ?? eventId,
        sessionId: input.sessionId,
        validationTarget: event.validationTarget ?? "unknown-validation",
        status: event.status ?? "succeeded",
        occurredAt: event.occurredAt,
        ...(eventRecipeId === undefined ? {} : { recipeId: eventRecipeId }),
        runId,
        ...(validationReceiptId === undefined ? {} : { receiptId: validationReceiptId }),
        ...(eventObservationId === undefined ? {} : { observationId: eventObservationId }),
        ...(tokenUsage === undefined ? {} : { tokens: tokenUsage }),
      }
      validations.push(validation)
      receipts.push(recipeReceiptFromOpenCodeValidation(input.sessionId, validation))
    }
  }

  const efficiencyObservedAt = input.events.at(-1)?.occurredAt ?? input.startedAt
  const tokenEfficiencyObservationId = recipeObservationId(
    sessionRecipeId,
    `tend.token-efficiency:opencode:${input.sessionId}`,
    efficiencyObservedAt,
  )
  events.push({
    eventId: `opencode:${input.sessionId}:token-efficiency`,
    sessionId: input.sessionId,
    kind: "token-efficiency",
    occurredAt: efficiencyObservedAt,
    recipeId: sessionRecipeId,
    runId,
    observationId: tokenEfficiencyObservationId,
    payload: tokenEfficiencyPayload({
      sessionId: input.sessionId,
      toolCallCount: toolCalls.length,
      commandCount: commands.length,
      validationCount: validations.length,
      tokenUsages: input.events.flatMap((event) => {
        const usage = tendTokenUsageFromOpenCodeEvent(event)
        return usage === undefined ? [] : [usage]
      }),
    }),
  })

  return {
    session,
    events,
    toolCalls,
    commands,
    validations,
    receipts,
    observations: [...recipeObservationsFromTendEvents(events)],
  }
}

const tendTokenUsageFromOpenCodeEvent = (
  event: OpenCodeRawEvent,
): TendTokenUsage | undefined => {
  if (event.tokens === undefined) return undefined
  const inputTokens = finiteNonNegative(event.tokens.inputTokens)
  const outputTokens = finiteNonNegative(event.tokens.outputTokens)
  const cachedTokens = finiteNonNegative(event.tokens.cachedTokens)
  const reasoningTokens = finiteNonNegative(event.tokens.reasoningTokens)
  const totalTokens = finiteNonNegative(event.tokens.totalTokens)
    ?? sumDefined([inputTokens, outputTokens])
  if (totalTokens === undefined) return undefined
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(cachedTokens === undefined ? {} : { cachedTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    totalTokens,
  }
}

const richOpenCodeEventPayload = (
  event: OpenCodeRawEvent,
  tokens: TendTokenUsage | undefined,
): Record<string, unknown> => ({
  schemaVersion: 1,
  type: event.type,
  occurredAt: event.occurredAt,
  ...(event.status === undefined ? {} : { status: event.status }),
  ...(event.recipeId === undefined ? {} : { recipeId: event.recipeId }),
  ...(event.toolCallId === undefined ? {} : { toolCallId: event.toolCallId }),
  ...(event.toolName === undefined ? {} : { toolName: event.toolName }),
  ...(event.toolInputSummary === undefined ? {} : {
    toolInputSummary: event.toolInputSummary,
    toolInputHash: event.toolInputHash ?? stableTraceHash(event.toolInputSummary),
  }),
  ...(event.toolResultSummary === undefined ? {} : {
    toolResultSummary: event.toolResultSummary,
    toolResultHash: event.toolResultHash ?? stableTraceHash(event.toolResultSummary),
  }),
  ...(event.input === undefined ? {} : { input: sanitizeTraceValue(event.input) }),
  ...(event.arguments === undefined ? {} : { arguments: sanitizeTraceValue(event.arguments) }),
  ...(event.output === undefined ? {} : { output: sanitizeTraceValue(event.output) }),
  ...(event.result === undefined ? {} : { result: sanitizeTraceValue(event.result) }),
  ...(event.payload === undefined ? {} : { payload: sanitizeTraceValue(event.payload) }),
  ...(event.metadata === undefined ? {} : { metadata: sanitizeTraceValue(event.metadata) }),
  ...(event.commandObservationId === undefined ? {} : { commandObservationId: event.commandObservationId }),
  ...(event.command === undefined ? {} : {
    command: event.command,
    commandHash: stableTraceHash(event.command),
  }),
  ...(event.outputClass === undefined ? {} : { outputClass: event.outputClass }),
  ...(event.validationObservationId === undefined ? {} : {
    validationObservationId: event.validationObservationId,
  }),
  ...(event.validationTarget === undefined ? {} : { validationTarget: event.validationTarget }),
  ...(event.reasoningTraceId === undefined ? {} : { reasoningTraceId: event.reasoningTraceId }),
  ...(event.reasoningPhase === undefined ? {} : { reasoningPhase: event.reasoningPhase }),
  ...(event.reasoningSummary === undefined ? {} : {
    reasoningSummary: event.reasoningSummary,
    reasoningSummaryHash: event.reasoningSummaryHash ?? stableTraceHash(event.reasoningSummary),
  }),
  ...(event.durationMs === undefined ? {} : { durationMs: finiteNonNegative(event.durationMs) ?? 0 }),
  ...(tokens === undefined ? {} : { tokens }),
  rawEvent: sanitizeTraceValue(event.raw ?? event),
})

const richToolCallPayload = (
  event: OpenCodeRawEvent,
  tokens: TendTokenUsage | undefined,
): Record<string, unknown> => ({
  schemaVersion: 1,
  toolCallId: event.toolCallId,
  toolName: event.toolName ?? "unknown-tool",
  status: event.status ?? "succeeded",
  ...(event.toolInputSummary === undefined ? {} : {
    inputSummary: event.toolInputSummary,
    inputHash: event.toolInputHash ?? stableTraceHash(event.toolInputSummary),
  }),
  ...(event.toolResultSummary === undefined ? {} : {
    resultSummary: event.toolResultSummary,
    resultHash: event.toolResultHash ?? stableTraceHash(event.toolResultSummary),
  }),
  ...(event.input === undefined ? {} : { input: sanitizeTraceValue(event.input) }),
  ...(event.arguments === undefined ? {} : { arguments: sanitizeTraceValue(event.arguments) }),
  ...(event.output === undefined ? {} : { output: sanitizeTraceValue(event.output) }),
  ...(event.result === undefined ? {} : { result: sanitizeTraceValue(event.result) }),
  ...(event.payload === undefined ? {} : { payload: sanitizeTraceValue(event.payload) }),
  ...(event.metadata === undefined ? {} : { metadata: sanitizeTraceValue(event.metadata) }),
  ...(tokens === undefined ? {} : { tokens }),
  rawEvent: sanitizeTraceValue(event.raw ?? event),
})

const tokenEfficiencyPayload = (input: {
  readonly sessionId: string
  readonly toolCallCount: number
  readonly commandCount: number
  readonly validationCount: number
  readonly tokenUsages: readonly TendTokenUsage[]
}): Record<string, unknown> => {
  const totalTokens = sumNumbers(input.tokenUsages.map((usage) => usage.totalTokens))
  const inputTokens = sumNumbers(input.tokenUsages.map((usage) => usage.inputTokens))
  const outputTokens = sumNumbers(input.tokenUsages.map((usage) => usage.outputTokens))
  const cachedTokens = sumNumbers(input.tokenUsages.map((usage) => usage.cachedTokens))
  const reasoningTokens = sumNumbers(input.tokenUsages.map((usage) => usage.reasoningTokens))
  const effectiveTokens = Math.max(0, totalTokens - cachedTokens)
  return {
    schemaVersion: 1,
    source: "opencode-session-decoder",
    sessionId: input.sessionId,
    tokenTotal: totalTokens,
    inputTokens,
    outputTokens,
    cachedTokens,
    reasoningTokens,
    effectiveTokens,
    toolCallCount: input.toolCallCount,
    commandCount: input.commandCount,
    validationCount: input.validationCount,
    tokensPerToolCall: ratio(totalTokens, input.toolCallCount),
    effectiveTokensPerToolCall: ratio(effectiveTokens, input.toolCallCount),
    tokensPerCommand: ratio(totalTokens, input.commandCount),
    tokensPerValidation: ratio(totalTokens, input.validationCount),
    reasoningTokenRatio: ratio(reasoningTokens, totalTokens),
    cacheTokenRatio: ratio(cachedTokens, totalTokens),
  }
}

const stableTraceHash = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)

const sanitizeTraceValue = (value: unknown): unknown => {
  if (typeof value === "string") return redactTraceSecrets(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeTraceValue(item))
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    secretTraceKeyPattern.test(key) ? "[REDACTED]" : sanitizeTraceValue(child),
  ]))
}

const secretTraceKeyPattern = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|secret|password|passwd|auth|credential|cookie|bearer)/iu

const redactTraceSecrets = (value: string): string =>
  value
    .replaceAll(/((?:api[_-]?key|token|secret|password|passwd|auth|credential|cookie)\s*=\s*)[^\s]+/giu, "$1[REDACTED]")
    .replaceAll(/\b(?:authorization|bearer):\s*[^\s]+/giu, "authorization: [REDACTED]")
    .replaceAll(/\bsk-[A-Za-z0-9_-]{12,}\b/gu, "sk-[REDACTED]")

const finiteNonNegative = (value: number | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined

const sumDefined = (values: readonly (number | undefined)[]): number | undefined => {
  let total = 0
  let hasValue = false
  for (const value of values) {
    if (value === undefined) continue
    total += value
    hasValue = true
  }
  return hasValue ? total : undefined
}

const sumNumbers = (values: readonly (number | undefined)[]): number =>
  values.reduce<number>((sum, value) => sum + (value ?? 0), 0)

const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null

export const recipeReceiptFromOpenCodeValidation = (
  sessionId: string,
  observation: TendValidationObservation,
): RecipeReceipt => ({
  receiptId: observation.receiptId ?? `opencode-receipt:${observation.validationObservationId}`,
  recipeId: observation.recipeId ?? observation.validationTarget,
  runId: observation.runId ?? `opencode-run:${sessionId}`,
  status: observation.status === "succeeded" ? "passed" : observation.status === "started" ? "running" : observation.status,
  startedAt: observation.occurredAt,
  ...(observation.status === "started" ? {} : { completedAt: observation.occurredAt }),
  command: observation.validationTarget,
  validationEvidence: [observation.validationTarget],
  payload: { source: "opencode", observation },
})

export const TendOpenCodeSessionDecoderRecipe = defineObservationRecipe({
  id: TendOpenCodeSessionDecoderRecipeId,
  projectId: "tend-opencode",
  title: "Decode OpenCode session logs into recipe-linked observations",
  inputSchema: OpenCodeSessionLogSchema,
  outputSchema: TendOpenCodeDecodedSessionSchema,
  allowedFiles: [
    "packages/tend/opencode/src/contracts.ts",
    "packages/tend/opencode/src/index.ts",
    "packages/tend/opencode/src/fixtures/**",
  ],
  validationEvidence: ["tend-opencode:typecheck"],
  io: {
    inputSchema: OpenCodeSessionLogSchema,
    outputSchema: TendOpenCodeDecodedSessionSchema,
    inputResources: [TendOpenCodeSessionLogResource],
    outputResources: [TendOpenCodeDecodedSessionResource],
  },
  handler: defineRecipeHandler<typeof OpenCodeSessionLogSchema.Type, TendOpenCodeDecodedSession>({
    id: tendOpenCodeSessionDecoderHandlerId,
    recipeId: TendOpenCodeSessionDecoderRecipeId,
    sourcePath: tendOpenCodeIndexSourcePath,
    exportName: "decodeOpenCodeSessionLog",
    emitsReceipts: ["opencode.session.decoded"],
    handler: (input) => Effect.succeed(decodeOpenCodeSessionLog(input)),
  }),
  alchemyDag: [{
    fromRecipeId: TendOpenCodeSessionDecoderRecipeId,
    toRecipeId: TendOpenCodeReceiptProjectionRecipeId,
    resource: TendOpenCodeDecodedSessionResource,
    kind: "observes",
    modes: ["project", "observe", "read"],
    validationTargets: TendOpenCodeSessionTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeReceiptProjectionRecipe = defineProjectionRecipe({
  id: TendOpenCodeReceiptProjectionRecipeId,
  title: "Project OpenCode validation receipts from framework packet receipts",
  inputSchema: OpenCodeSessionLogSchema,
  outputSchema: TendOpenCodeReceiptProjectionOutput,
  outputs: ["reports/tend-opencode-codex-measurement/**"],
  allowedFiles: [
    "packages/tend/opencode/src/index.ts",
    "packages/tend/opencode/src/packet-links.ts",
  ],
  validationEvidence: ["tend-opencode:typecheck"],
  io: {
    inputSchema: OpenCodeSessionLogSchema,
    outputSchema: TendOpenCodeReceiptProjectionOutput,
    inputResources: [TendOpenCodeSessionLogResource, TendOpenCodeDecodedSessionResource],
    outputResources: [TendOpenCodeReceiptProjectionResource],
  },
  handler: defineRecipeHandler<typeof OpenCodeSessionLogSchema.Type, TendOpenCodeReceiptProjectionOutput>({
    id: tendOpenCodeReceiptProjectionHandlerId,
    recipeId: TendOpenCodeReceiptProjectionRecipeId,
    sourcePath: tendOpenCodeIndexSourcePath,
    exportName: "decodeOpenCodeSessionLog",
    emitsReceipts: ["opencode.receipts.projected"],
    handler: (input) =>
      Effect.sync(() => {
        const decoded = decodeOpenCodeSessionLog(input)
        return {
          receipts: decoded.receipts,
          linkedSummary: normalizeTendPacketProtocolLinkedSummary({
            packetId: `opencode-session:${input.sessionId}:receipt-projection`,
            receiptIds: decoded.receipts.map((receipt) => receipt.receiptId),
            observations: decoded.observations,
            sessionId: input.sessionId,
          }),
        }
      }),
  }),
  alchemyDag: [{
    fromRecipeId: TendOpenCodeReceiptProjectionRecipeId,
    toRecipeId: TendOpenCodePolicyForcingRecipeId,
    resource: TendOpenCodeReceiptProjectionResource,
    kind: "projects",
    modes: ["project", "read"],
    validationTargets: TendOpenCodeSessionTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodePolicyForcingRecipe = defineProjectionRecipe({
  id: TendOpenCodePolicyForcingRecipeId,
  title: "Route OpenCode Tend forcing policy through recipe evidence",
  inputSchema: OpenCodeSessionLogSchema,
  outputSchema: TendOpenCodeDecodedSessionSchema,
  allowedFiles: [
    "packages/tend/opencode/src/index.ts",
    "packages/tend/policies/src/**",
  ],
  validationEvidence: ["tend-opencode:typecheck"],
  io: {
    inputSchema: OpenCodeSessionLogSchema,
    outputSchema: TendOpenCodeDecodedSessionSchema,
    inputResources: [TendOpenCodeSessionLogResource, TendOpenCodeReceiptProjectionResource],
    outputResources: [TendOpenCodePolicyEvidenceResource],
  },
  handler: defineRecipeHandler<typeof OpenCodeSessionLogSchema.Type, TendOpenCodeDecodedSession>({
    id: tendOpenCodePolicyForcingHandlerId,
    recipeId: TendOpenCodePolicyForcingRecipeId,
    sourcePath: tendOpenCodeIndexSourcePath,
    exportName: "decodeOpenCodeSessionLog",
    emitsReceipts: ["opencode.policy.projected"],
    handler: (input) => Effect.succeed(decodeOpenCodeSessionLog(input)),
  }),
})

export const TendOpenCodeSessionRecipes = [
  TendOpenCodeSessionDecoderRecipe,
  TendOpenCodeReceiptProjectionRecipe,
  TendOpenCodePolicyForcingRecipe,
] as const
