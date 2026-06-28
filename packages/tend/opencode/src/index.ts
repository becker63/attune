import { Schema } from "effect"
import {
  RecipeReceiptSchema,
  defineRecipe,
  type RecipeReceipt,
} from "@attune/framework-protocol"
import {
  TendCommandObservationSchema,
  TendEventEnvelopeSchema,
  TendSessionSchema,
  TendToolCallSchema,
  TendValidationObservationSchema,
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
})
export type TendOpenCodeDecodedSession = typeof TendOpenCodeDecodedSessionSchema.Type

export const decodeOpenCodeSessionLog = (
  input: OpenCodeSessionLog,
): TendOpenCodeDecodedSession => {
  const session: TendSession = {
    sessionId: input.sessionId,
    agentKind: "opencode",
    startedAt: input.startedAt,
    workspaceRoot: input.workspaceRoot,
    recipeId: input.events.find((event) => event.recipeId !== undefined)?.recipeId,
  }
  const toolCalls: TendToolCall[] = []
  const commands: TendCommandObservation[] = []
  const validations: TendValidationObservation[] = []
  const events: TendEventEnvelope[] = []
  const receipts: RecipeReceipt[] = []

  for (const [index, event] of input.events.entries()) {
    const eventId = `opencode:${input.sessionId}:${index}`
    events.push({
      eventId,
      sessionId: input.sessionId,
      kind: event.type === "tool" ? "tool-call" : event.type,
      occurredAt: event.occurredAt,
      ...(event.recipeId === undefined ? {} : { recipeId: event.recipeId }),
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
        ...(event.recipeId === undefined ? {} : { recipeId: event.recipeId }),
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
      })
      const policy = evaluateForcedToolPolicy({ sessionId: input.sessionId, requestedTool: tool })
      events.push({
        eventId: `${eventId}:policy`,
        sessionId: input.sessionId,
        kind: "policy-decision",
        occurredAt: event.occurredAt,
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
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
      }
      commands.push(command)
      const policy = evaluateForcedToolPolicy({ sessionId: input.sessionId, requestedTool: "openrtk.compress" })
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
      })
      events.push(
        {
          eventId: `${eventId}:openrtk`,
          sessionId: input.sessionId,
          kind: "openrtk-action",
          occurredAt: event.occurredAt,
          payload: openrtk,
        },
        {
          eventId: `${eventId}:magic-context`,
          sessionId: input.sessionId,
          kind: "magic-context-decision",
          occurredAt: event.occurredAt,
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
        ...(event.recipeId === undefined ? {} : { recipeId: event.recipeId }),
        ...(event.tokens === undefined ? {} : { tokens: event.tokens }),
      }
      validations.push(validation)
      receipts.push(recipeReceiptFromOpenCodeValidation(input.sessionId, validation))
    }
  }

  return { session, events, toolCalls, commands, validations, receipts }
}

export const recipeReceiptFromOpenCodeValidation = (
  sessionId: string,
  observation: TendValidationObservation,
): RecipeReceipt => ({
  receiptId: `opencode-receipt:${observation.validationObservationId}`,
  recipeId: observation.recipeId ?? observation.validationTarget,
  runId: `opencode-run:${sessionId}`,
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
