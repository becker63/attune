import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  TendCoreAddress,
  TendCorePackageResource,
  TendCoreReceiptProjectionRecipeId,
  TendCoreTestSuiteRecipeId,
} from "./index.js"

export const TendCoreTestRecipesSourcePath = "packages/tend/core/src/test-recipes.ts" as const
export const TendCoreTestTarget = "tend-core:test" as const

export const TendCoreTestReport = Schema.Struct({
  recipeId: Schema.String,
  receiptLinked: Schema.Boolean,
})
export type TendCoreTestReport = typeof TendCoreTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendCoreTestReportResource = defineAlchemyResource({
  id: "tend-core.test-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendCoreTestSuiteRecipeId,
  producedBy: [TendCoreTestSuiteRecipeId],
  addressSchema: TendCoreAddress,
  stateSchema: TendCoreTestReport,
  modes: ["check", "observe"],
})

export const summarizeTendCoreTestSuite = (
  input: TendCoreAddress,
): TendCoreTestReport => ({
  recipeId: input.recipeId,
  receiptLinked: true,
})

export const TendCoreTestSuiteHandler = defineRecipeHandler<TendCoreAddress, TendCoreTestReport>({
  id: "tend-core.test-suite.handler",
  recipeId: TendCoreTestSuiteRecipeId,
  sourcePath: TendCoreTestRecipesSourcePath,
  exportName: "summarizeTendCoreTestSuite",
  handler: (input) => Effect.succeed(summarizeTendCoreTestSuite(input)),
  emitsReceipts: ["tend-core.test-report"],
})

export const TendCoreTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendCoreReceiptProjectionRecipeId,
  toRecipeId: TendCoreTestSuiteRecipeId,
  resource: TendCoreTestReportResource,
  kind: "validates",
  modes: ["check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendCoreTestSuiteRecipe = defineTestRecipe({
  id: TendCoreTestSuiteRecipeId,
  title: "Own Tend core tests",
  inputSchema: TendCoreAddress,
  outputSchema: TendCoreTestReport,
  allowedFiles: [
    TendCoreTestRecipesSourcePath,
    "packages/tend/core/test/**",
  ],
  validationEvidence: [TendCoreTestTarget, "tend-core:typecheck"],
  io: {
    inputSchema: TendCoreAddress,
    outputSchema: TendCoreTestReport,
    inputResources: [TendCorePackageResource],
    outputResources: [TendCoreTestReportResource],
  },
  handler: TendCoreTestSuiteHandler,
  alchemyDag: [TendCoreTestSuiteDagEdge],
})

export const TendCoreTestRecipes = [tendCoreTestSuiteRecipe] as const
