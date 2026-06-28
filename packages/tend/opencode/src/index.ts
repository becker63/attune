import { Schema } from "effect"
import {
  RecipeObservationSchema,
  RecipeReceiptSchema,
  defineRecipe,
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
  type TendValidationObservation,
} from "@attune/tend-core"
import { compressWithOpenRtk, evaluateForcedToolPolicy, selectMagicContext } from "@attune/tend-policies"

export { opencodeSessionLogFixture } from "./fixtures/opencode-session-log.js"

export const OpenCodeRawEventSchema = Schema.Struct({
  type: Schema.Literals(["session", "tool", "command", "validation"] as const),
  occurredAt: Schema.String,
  status: Schema.optional(Schema.Literals(["started", "succeeded", "failed", "blocked"] as const)),
  recipeId: Schema.optional(Schema.String),
  toolCallId: Schema.optional(Schema.String),
  toolName: Schema.optional(Schema.String),
  commandObservationId: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
  outputClass: Schema.optional(Schema.String),
  validationObservationId: Schema.optional(Schema.String),
  validationTarget: Schema.optional(Schema.String),
  tokens: Schema.optional(Schema.Struct({ totalTokens: Schema.Number })),
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

export const decodeOpenCodeSessionLog = (
  input: OpenCodeSessionLog,
): TendOpenCodeDecodedSession => {
  const sessionRecipeId = input.events.find((event) => event.recipeId !== undefined)?.recipeId
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
    const eventKind = event.type === "tool" ? "tool-call" : event.type
    const observationIdFor = (kind: TendEventEnvelope["kind"]): string | undefined =>
      eventRecipeId === undefined
        ? undefined
        : recipeObservationId(eventRecipeId, `tend.${kind}:${eventId}`, event.occurredAt)
    const eventObservationId = observationIdFor(eventKind)
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
      payload: event,
    })
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
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
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
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
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
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
      }
      validations.push(validation)
      receipts.push(recipeReceiptFromOpenCodeValidation(input.sessionId, validation))
    }
  }

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

export const TendOpenCodeRecipes = [
  defineRecipe({
    id: "tend-opencode.decode-session",
    projectId: "tend-opencode",
    title: "Decode OpenCode logs into Tend events, receipts, Magic Context, and OpenRTK packets",
    inputSchema: OpenCodeSessionLogSchema,
    outputSchema: TendOpenCodeDecodedSessionSchema,
    nxTarget: "tend-opencode:test",
    sourcePath: "packages/tend/opencode/src/index.ts",
    allowedFiles: ["packages/tend/opencode/**"],
    validationEvidence: ["tend-opencode:test", "tend-opencode:typecheck"],
  }),
] as const
