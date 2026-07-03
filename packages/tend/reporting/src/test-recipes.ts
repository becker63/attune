import { defineRecipeHandler, defineTestRecipe } from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  TendReportingAddress,
  TendReportingMarkdownViewRecipeId,
  TendReportingPackageResource,
  TendReportingTestSuiteRecipeId,
  TendReportingTestReport,
  TendReportingTestReportResource,
} from "./index.js"

const tendReportingTestValidationTargets = ["tend-reporting:test"] as const
const tendReportingTestSuiteHandlerId = "tend-reporting.test-suite.handler" as const

// @attune-packet-target generated-runtime-projection eligible
export const tendReportingTestSuiteRecipe = defineTestRecipe({
  id: TendReportingTestSuiteRecipeId,
  title: "Own Tend reporting tests",
  inputSchema: TendReportingAddress,
  outputSchema: TendReportingTestReport,
  allowedFiles: [
    "packages/tend/reporting/src/test-recipes.ts",
    "packages/tend/reporting/test/**",
  ],
  validationEvidence: ["tend-reporting:test", "tend-reporting:typecheck"],
  io: {
    inputSchema: TendReportingAddress,
    outputSchema: TendReportingTestReport,
    inputResources: [TendReportingPackageResource],
    outputResources: [TendReportingTestReportResource],
  },
  handler: defineRecipeHandler<TendReportingAddress, TendReportingTestReport>({
    id: tendReportingTestSuiteHandlerId,
    recipeId: TendReportingTestSuiteRecipeId,
    sourcePath: "packages/tend/reporting/src/test-recipes.ts",
    exportName: "tendReportingTestSuiteRecipe",
    handler: (input) =>
      Effect.succeed({
        recipeId: input.recipeId,
        receiptId: "tend-reporting:test",
        receiptDerived: true,
      }),
    emitsReceipts: ["tend-reporting.test-report"],
  }),
  alchemyDag: [{
    fromRecipeId: TendReportingMarkdownViewRecipeId,
    toRecipeId: TendReportingTestSuiteRecipeId,
    resource: "tend-reporting.test-report",
    kind: "validates",
    modes: ["check", "observe"],
    validationTargets: tendReportingTestValidationTargets,
  }],
})

export const TendReportingTestRecipes = [tendReportingTestSuiteRecipe] as const
