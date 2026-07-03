import {
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  TendTokenAuditAddress,
  TendTokenAuditCompressionRecipeId,
  TendTokenAuditPackageResource,
  TendTokenAuditTestSuiteRecipeId,
  TendTokenAuditTestReport,
  TendTokenAuditTestReportResource,
} from "./index.js"

const tendTokenAuditTestValidationTargets = ["tend-token-audit:test"] as const
const tendTokenAuditTestSuiteHandlerId = "tend-token-audit.test-suite.handler" as const

// @attune-packet-target generated-runtime-projection eligible
export const tendTokenAuditTestSuiteRecipe = defineTestRecipe({
  id: TendTokenAuditTestSuiteRecipeId,
  title: "Own Tend token audit tests",
  inputSchema: TendTokenAuditAddress,
  outputSchema: TendTokenAuditTestReport,
  allowedFiles: [
    "packages/tend/token-audit/src/test-recipes.ts",
    "packages/tend/token-audit/test/**",
  ],
  validationEvidence: ["tend-token-audit:test", "tend-token-audit:typecheck"],
  io: {
    inputSchema: TendTokenAuditAddress,
    outputSchema: TendTokenAuditTestReport,
    inputResources: [TendTokenAuditPackageResource],
    outputResources: [TendTokenAuditTestReportResource],
  },
  handler: defineRecipeHandler<TendTokenAuditAddress, typeof TendTokenAuditTestReport.Type>({
    id: tendTokenAuditTestSuiteHandlerId,
    recipeId: TendTokenAuditTestSuiteRecipeId,
    sourcePath: "packages/tend/token-audit/src/test-recipes.ts",
    exportName: "tendTokenAuditTestSuiteRecipe",
    handler: (input) =>
      Effect.succeed({
        recipeId: input.recipeId,
        receiptLinked: true,
      }),
    emitsReceipts: ["tend-token-audit.test-report"],
  }),
  alchemyDag: [{
    fromRecipeId: TendTokenAuditCompressionRecipeId,
    toRecipeId: TendTokenAuditTestSuiteRecipeId,
    resource: "tend-token-audit.test-report",
    kind: "validates",
    modes: ["check", "observe"],
    validationTargets: tendTokenAuditTestValidationTargets,
  }],
})

export const TendTokenAuditTestRecipes = [tendTokenAuditTestSuiteRecipe] as const
