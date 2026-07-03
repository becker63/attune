import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
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

export const TendTokenAuditTypecheckValidationTargets = ["tend-token-audit:typecheck"] as const
export const TendTokenAuditMetricsRecipeId = "tend-token-audit.metrics" as const
export const TendTokenAuditCompressionRecipeId = "tend-token-audit.compression" as const
export const TendTokenAuditTestSuiteRecipeId = "tend-token-audit.test-suite" as const
const tendTokenAuditMetricsHandlerId = "tend-token-audit.metrics.handler" as const
const tendTokenAuditCompressionHandlerId = "tend-token-audit.compression.handler" as const

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


const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator

export const TendTokenAuditAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/token-audit"),
  recipeId: Schema.String,
})
export type TendTokenAuditAddress = typeof TendTokenAuditAddress.Type

export const TendTokenAuditTestReport = Schema.Struct({
  recipeId: Schema.String,
  receiptLinked: Schema.Boolean,
})
export type TendTokenAuditTestReport = typeof TendTokenAuditTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenAuditPackageResource = defineAlchemyResource({
  id: "tend-token-audit.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendTokenAuditMetricsRecipeId,
    TendTokenAuditCompressionRecipeId,
    TendTokenAuditTestSuiteRecipeId,
  ],
  addressSchema: TendTokenAuditAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/tend/token-audit/src"),
    packageId: Schema.Literal("tend-token-audit"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenAuditEventBundleResource = defineAlchemyResource({
  id: "tend-token-audit.event-bundle",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  consumedBy: [TendTokenAuditMetricsRecipeId, TendTokenAuditCompressionRecipeId],
  addressSchema: TendTokenAuditAddress,
  stateSchema: TendTokenAuditInputSchema,
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenMetricsResource = defineAlchemyResource({
  id: "tend-token-audit.metrics-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendTokenAuditMetricsRecipeId, TendTokenAuditCompressionRecipeId],
  addressSchema: TendTokenAuditAddress,
  stateSchema: TendTokenMetricsSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenAuditTestReportResource = defineAlchemyResource({
  id: "tend-token-audit.test-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendTokenAuditTestSuiteRecipeId],
  addressSchema: TendTokenAuditAddress,
  stateSchema: TendTokenAuditTestReport,
  modes: ["check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendTokenAuditMetricsRecipe = defineProjectionRecipe({
  id: TendTokenAuditMetricsRecipeId,
  title: "Summarize Tend token metrics with recipe receipt linkage",
  inputSchema: TendTokenAuditInputSchema,
  outputSchema: TendTokenMetricsSchema,
  allowedFiles: [
    "packages/tend/token-audit/src/index.ts",
    "packages/tend/token-audit/vitest.config.ts",
  ],
  validationEvidence: ["tend-token-audit:typecheck"],
  io: {
    inputSchema: TendTokenAuditInputSchema,
    outputSchema: TendTokenMetricsSchema,
    inputResources: [TendTokenAuditEventBundleResource],
    outputResources: [TendTokenMetricsResource],
  },
  handler: defineRecipeHandler<typeof TendTokenAuditInputSchema.Type, typeof TendTokenMetricsSchema.Type>({
    id: tendTokenAuditMetricsHandlerId,
    recipeId: TendTokenAuditMetricsRecipeId,
    sourcePath: "packages/tend/token-audit/src/index.ts",
    exportName: "computeTendTokenMetrics",
    handler: (input) => Effect.succeed(computeTendTokenMetrics(input)),
    emitsReceipts: ["tend-token-audit.metrics-report"],
  }),
  alchemyDag: [{
    fromRecipeId: TendTokenAuditMetricsRecipeId,
    toRecipeId: TendTokenAuditCompressionRecipeId,
    resource: TendTokenMetricsResource,
    kind: "projects",
    modes: ["project", "observe"],
    validationTargets: TendTokenAuditTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendTokenAuditCompressionRecipe = defineProjectionRecipe({
  id: TendTokenAuditCompressionRecipeId,
  title: "Project Tend compression metrics from receipt-linked token audits",
  inputSchema: TendTokenAuditInputSchema,
  outputSchema: TendTokenMetricsSchema,
  allowedFiles: ["packages/tend/token-audit/src/index.ts"],
  validationEvidence: ["tend-token-audit:typecheck"],
  io: {
    inputSchema: TendTokenAuditInputSchema,
    outputSchema: TendTokenMetricsSchema,
    inputResources: [TendTokenAuditEventBundleResource],
    outputResources: [TendTokenMetricsResource],
  },
  handler: defineRecipeHandler<typeof TendTokenAuditInputSchema.Type, typeof TendTokenMetricsSchema.Type>({
    id: tendTokenAuditCompressionHandlerId,
    recipeId: TendTokenAuditCompressionRecipeId,
    sourcePath: "packages/tend/token-audit/src/index.ts",
    exportName: "computeTendTokenMetrics",
    handler: (input) => Effect.succeed(computeTendTokenMetrics(input)),
    emitsReceipts: ["tend-token-audit.compression-report"],
  }),
})

export const TendTokenAuditProductionRecipes = [
  tendTokenAuditMetricsRecipe,
  tendTokenAuditCompressionRecipe,
] as const
