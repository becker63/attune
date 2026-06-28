import { Schema } from "effect"
import { RecipeReceiptSchema, defineRecipe, type RecipeReceipt } from "@attune/framework-protocol"
import { TendEventEnvelopeSchema, type TendEventEnvelope } from "@attune/tend-core"
import { TendTokenMetricsSchema, type TendTokenMetrics } from "@attune/tend-token-audit"

export const TendTokenReportSchema = Schema.Struct({
  reportId: Schema.String,
  sessionId: Schema.String,
  receipts: Schema.Array(RecipeReceiptSchema),
  events: Schema.Array(TendEventEnvelopeSchema),
  tokenMetrics: TendTokenMetricsSchema,
  markdown: Schema.String,
})
export type TendTokenReport = typeof TendTokenReportSchema.Type

export const renderTendTokenReport = (input: {
  readonly sessionId: string
  readonly receipts: readonly RecipeReceipt[]
  readonly events: readonly TendEventEnvelope[]
  readonly tokenMetrics: TendTokenMetrics
}): TendTokenReport => {
  const lines = [
    `# Tend Token Report`,
    ``,
    `Session: ${input.sessionId}`,
    `Receipts: ${input.receipts.length}`,
    `Events: ${input.events.length}`,
    `Tokens per accepted repair: ${input.tokenMetrics.tokensPerAcceptedRepair}`,
    `Tokens per valid diff: ${input.tokenMetrics.tokensPerValidDiff}`,
    `Search calls per repair: ${input.tokenMetrics.searchCallsPerRepair}`,
    `Broad searches: ${input.tokenMetrics.broadSearchCount}`,
    `Validation attempts per accepted diff: ${input.tokenMetrics.validationAttemptsPerAcceptedDiff}`,
    `Long-job polling tokens: ${input.tokenMetrics.longJobPollingTokens}`,
    `OpenRTK saved tokens: ${input.tokenMetrics.openRtkCompressionEstimate}`,
    `Magic Context retained tokens: ${input.tokenMetrics.magicContextRetainedTokenEstimate}`,
    `Magic Context dropped tokens: ${input.tokenMetrics.magicContextDroppedTokenEstimate}`,
  ]
  return {
    reportId: `tend-report:${input.sessionId}`,
    sessionId: input.sessionId,
    receipts: [...input.receipts],
    events: [...input.events],
    tokenMetrics: input.tokenMetrics,
    markdown: lines.join("\n"),
  }
}

export const TendReportRecipes = [
  defineRecipe({
    id: "tend-reporting.token-report",
    projectId: "tend-reporting",
    title: "Render Tend token audit report from receipts and events",
    inputSchema: Schema.Struct({
      sessionId: Schema.String,
      receipts: Schema.Array(RecipeReceiptSchema),
      events: Schema.Array(TendEventEnvelopeSchema),
      tokenMetrics: TendTokenMetricsSchema,
    }),
    outputSchema: TendTokenReportSchema,
    nxTarget: "tend-reporting:test",
    sourcePath: "tend/packages/reporting/src/index.ts",
    allowedFiles: ["tend/packages/reporting/**"],
    validationEvidence: ["tend-reporting:test", "tend-reporting:typecheck"],
  }),
] as const
