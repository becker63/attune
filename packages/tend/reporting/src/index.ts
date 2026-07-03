import {
  RecipeReceiptSchema,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  type RecipeReceipt,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { TendEventEnvelopeSchema, type TendEventEnvelope } from "@attune/tend-core"
import { TendTokenMetricsSchema, type TendTokenMetrics } from "@attune/tend-token-audit"

export const TendReportingTypecheckValidationTargets = ["tend-reporting:typecheck"] as const
export const TendReportingTokenReportRendererRecipeId = "tend-reporting.token-report-renderer" as const
export const TendReportingMarkdownViewRecipeId = "tend-reporting.markdown-view" as const
export const TendReportingTestSuiteRecipeId = "tend-reporting.test-suite" as const
const tendReportingTokenReportRendererHandlerId = "tend-reporting.token-report-renderer.handler" as const
const tendReportingMarkdownViewHandlerId = "tend-reporting.markdown-view.handler" as const

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

export const TendReportingAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/reporting"),
  recipeId: Schema.String,
})
export type TendReportingAddress = typeof TendReportingAddress.Type

export const TendTokenReportInput = Schema.Struct({
  sessionId: Schema.String,
  receipts: Schema.Array(RecipeReceiptSchema),
  events: Schema.Array(TendEventEnvelopeSchema),
  tokenMetrics: TendTokenMetricsSchema,
})
export type TendTokenReportInput = typeof TendTokenReportInput.Type

export const TendMarkdownReport = Schema.Struct({
  reportId: Schema.String,
  markdown: Schema.String,
})
export type TendMarkdownReport = typeof TendMarkdownReport.Type

export const TendReportingTestReport = Schema.Struct({
  recipeId: Schema.String,
  receiptId: Schema.String,
  receiptDerived: Schema.Boolean,
})
export type TendReportingTestReport = typeof TendReportingTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendReportingPackageResource = defineAlchemyResource({
  id: "tend-reporting.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendReportingTokenReportRendererRecipeId,
    TendReportingMarkdownViewRecipeId,
    TendReportingTestSuiteRecipeId,
  ],
  addressSchema: TendReportingAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/tend/reporting/src"),
    packageId: Schema.Literal("tend-reporting"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendReportInputResource = defineAlchemyResource({
  id: "tend-reporting.receipt-event-token-input",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  consumedBy: [TendReportingTokenReportRendererRecipeId],
  addressSchema: TendReportingAddress,
  stateSchema: TendTokenReportInput,
  modes: ["read", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenReportResource = defineAlchemyResource({
  id: "tend-reporting.token-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendReportingTokenReportRendererRecipeId],
  consumedBy: [TendReportingMarkdownViewRecipeId],
  addressSchema: TendReportingAddress,
  stateSchema: TendTokenReportSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendMarkdownReportResource = defineAlchemyResource({
  id: "tend-reporting.markdown-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendReportingMarkdownViewRecipeId],
  addressSchema: TendReportingAddress,
  stateSchema: TendMarkdownReport,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendReportingTestReportResource = defineAlchemyResource({
  id: "tend-reporting.test-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendReportingTestSuiteRecipeId],
  addressSchema: TendReportingAddress,
  stateSchema: TendReportingTestReport,
  modes: ["check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendReportingTokenReportRendererRecipe = defineProjectionRecipe({
  id: TendReportingTokenReportRendererRecipeId,
  title: "Render Tend token reports from recipe receipt summaries",
  inputSchema: TendTokenReportInput,
  outputSchema: TendTokenReportSchema,
  allowedFiles: [
    "packages/tend/reporting/src/index.ts",
    "packages/tend/reporting/vitest.config.ts",
  ],
  validationEvidence: ["tend-reporting:typecheck"],
  io: {
    inputSchema: TendTokenReportInput,
    outputSchema: TendTokenReportSchema,
    inputResources: [TendReportInputResource],
    outputResources: [TendTokenReportResource],
  },
  handler: defineRecipeHandler<TendTokenReportInput, typeof TendTokenReportSchema.Type>({
    id: tendReportingTokenReportRendererHandlerId,
    recipeId: TendReportingTokenReportRendererRecipeId,
    sourcePath: "packages/tend/reporting/src/index.ts",
    exportName: "renderTendTokenReport",
    handler: (input) => Effect.succeed(renderTendTokenReport(input)),
    emitsReceipts: ["tend-reporting.token-report"],
  }),
  alchemyDag: [{
    fromRecipeId: TendReportingTokenReportRendererRecipeId,
    toRecipeId: TendReportingMarkdownViewRecipeId,
    resource: TendMarkdownReportResource,
    kind: "projects",
    modes: ["project", "observe"],
    validationTargets: TendReportingTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendReportingMarkdownViewRecipe = defineProjectionRecipe({
  id: TendReportingMarkdownViewRecipeId,
  title: "Project Tend reporting markdown from receipt-linked state",
  inputSchema: TendTokenReportSchema,
  outputSchema: TendMarkdownReport,
  allowedFiles: ["packages/tend/reporting/src/index.ts"],
  validationEvidence: ["tend-reporting:typecheck"],
  io: {
    inputSchema: TendTokenReportSchema,
    outputSchema: TendMarkdownReport,
    inputResources: [TendTokenReportResource],
    outputResources: [TendMarkdownReportResource],
  },
  handler: defineRecipeHandler<typeof TendTokenReportSchema.Type, TendMarkdownReport>({
    id: tendReportingMarkdownViewHandlerId,
    recipeId: TendReportingMarkdownViewRecipeId,
    sourcePath: "packages/tend/reporting/src/index.ts",
    exportName: "renderTendTokenReport",
    handler: (input) =>
      Effect.succeed({
        reportId: input.reportId,
        markdown: input.markdown,
      }),
    emitsReceipts: ["tend-reporting.markdown-report"],
  }),
})

export const TendReportingProductionRecipes = [
  tendReportingTokenReportRendererRecipe,
  tendReportingMarkdownViewRecipe,
] as const
