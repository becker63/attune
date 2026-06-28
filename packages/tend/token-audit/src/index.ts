import { Schema } from "effect"
import { defineRecipe } from "@attune/framework-protocol"
import {
  TendCommandObservationSchema,
  TendMagicContextDecisionSchema,
  TendOpenRtkCompressionActionSchema,
  TendToolCallSchema,
  TendValidationObservationSchema,
  type TendCommandObservation,
  type TendMagicContextDecision,
  type TendOpenRtkCompressionAction,
  type TendToolCall,
  type TendValidationObservation,
} from "@attune/tend-core"

export const TendTokenMetricsSchema = Schema.Struct({
  tokensPerAcceptedRepair: Schema.Number,
  tokensPerValidDiff: Schema.Number,
  searchCallsPerRepair: Schema.Number,
  broadSearchCount: Schema.Number,
  validationAttemptsPerAcceptedDiff: Schema.Number,
  longJobPollingTokens: Schema.Number,
  openRtkCompressionEstimate: Schema.Number,
  magicContextRetainedTokenEstimate: Schema.Number,
  magicContextDroppedTokenEstimate: Schema.Number,
})
export type TendTokenMetrics = typeof TendTokenMetricsSchema.Type

export const TendTokenAuditInputSchema = Schema.Struct({
  toolCalls: Schema.Array(TendToolCallSchema),
  commands: Schema.Array(TendCommandObservationSchema),
  validations: Schema.Array(TendValidationObservationSchema),
  openRtkActions: Schema.Array(TendOpenRtkCompressionActionSchema),
  magicContextDecisions: Schema.Array(TendMagicContextDecisionSchema),
  acceptedRepairs: Schema.Number,
  validDiffs: Schema.Number,
  acceptedDiffs: Schema.Number,
})
export type TendTokenAuditInput = typeof TendTokenAuditInputSchema.Type

export const computeTendTokenMetrics = (
  input: TendTokenAuditInput,
): TendTokenMetrics => {
  const totalTokens = [
    ...input.toolCalls.map((item) => item.tokens?.totalTokens ?? 0),
    ...input.commands.map((item) => item.tokens?.totalTokens ?? 0),
    ...input.validations.map((item) => item.tokens?.totalTokens ?? 0),
  ].reduce((sum, value) => sum + value, 0)
  const searchCalls = input.toolCalls.filter((call) => /search|grep|rg/u.test(call.toolName)).length
  const broadSearchCount = input.commands.filter((command) => /^rg\s+\.?$/u.test(command.command)).length
  const longJobPollingTokens = input.toolCalls
    .filter((call) => call.toolName === "tend.long-job.poll")
    .reduce((sum, call) => sum + (call.tokens?.totalTokens ?? 0), 0)

  return {
    tokensPerAcceptedRepair: ratio(totalTokens, input.acceptedRepairs),
    tokensPerValidDiff: ratio(totalTokens, input.validDiffs),
    searchCallsPerRepair: ratio(searchCalls, input.acceptedRepairs),
    broadSearchCount,
    validationAttemptsPerAcceptedDiff: ratio(input.validations.length, input.acceptedDiffs),
    longJobPollingTokens,
    openRtkCompressionEstimate: input.openRtkActions.reduce((sum, action) => sum + action.droppedTokenEstimate, 0),
    magicContextRetainedTokenEstimate: input.magicContextDecisions.reduce((sum, decision) => sum + decision.retainedTokenEstimate, 0),
    magicContextDroppedTokenEstimate: input.magicContextDecisions.reduce((sum, decision) => sum + decision.droppedTokenEstimate, 0),
  }
}

export const TendTokenAuditRecipes = [
  defineRecipe({
    id: "tend-token-audit.metrics",
    projectId: "tend-token-audit",
    title: "Compute Tend token and compression metrics",
    inputSchema: TendTokenAuditInputSchema,
    outputSchema: TendTokenMetricsSchema,
    nxTarget: "tend-token-audit:test",
    sourcePath: "packages/tend/token-audit/src/index.ts",
    allowedFiles: ["packages/tend/token-audit/**"],
    validationEvidence: ["tend-token-audit:test", "tend-token-audit:typecheck"],
  }),
] as const

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator
