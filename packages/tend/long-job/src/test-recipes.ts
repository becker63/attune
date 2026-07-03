import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  TendLongJobAddress,
  TendLongJobTestSuiteRecipeId,
  TendLongJobTestTarget,
  TendLongJobPackageResource,
  TendLongJobTypecheckTarget,
  TendLongJobWakeupPacketRecipeId,
} from "./index.js"

export const TendLongJobTestRecipesSourcePath = "packages/tend/long-job/src/test-recipes.ts" as const

export const TendLongJobTestReport = Schema.Struct({
  recipeId: Schema.String,
  observationLinked: Schema.Boolean,
})
export type TendLongJobTestReport = typeof TendLongJobTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobTestReportResource = defineAlchemyResource({
  id: "tend-long-job.test-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendLongJobTestSuiteRecipeId,
  producedBy: [TendLongJobTestSuiteRecipeId],
  addressSchema: TendLongJobAddress,
  stateSchema: TendLongJobTestReport,
  modes: ["check", "observe"],
})

export const summarizeTendLongJobTestSuite = (
  input: TendLongJobAddress,
): TendLongJobTestReport => ({
  recipeId: input.recipeId,
  observationLinked: true,
})

export const TendLongJobTestSuiteHandler = defineRecipeHandler<TendLongJobAddress, TendLongJobTestReport>({
  id: "tend-long-job.test-suite.handler",
  recipeId: TendLongJobTestSuiteRecipeId,
  sourcePath: TendLongJobTestRecipesSourcePath,
  exportName: "summarizeTendLongJobTestSuite",
  handler: (input) => Effect.succeed(summarizeTendLongJobTestSuite(input)),
  emitsReceipts: ["tend-long-job.test-report"],
})

export const TendLongJobTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendLongJobWakeupPacketRecipeId,
  toRecipeId: TendLongJobTestSuiteRecipeId,
  resource: TendLongJobTestReportResource,
  kind: "validates",
  modes: ["check", "observe"],
  validationTargets: [TendLongJobTestTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendLongJobTestSuiteRecipe = defineTestRecipe({
  id: TendLongJobTestSuiteRecipeId,
  title: "Own Tend long-job tests",
  inputSchema: TendLongJobAddress,
  outputSchema: TendLongJobTestReport,
  allowedFiles: [
    TendLongJobTestRecipesSourcePath,
    "packages/tend/long-job/test/**",
  ],
  validationEvidence: [TendLongJobTestTarget, TendLongJobTypecheckTarget],
  io: {
    inputSchema: TendLongJobAddress,
    outputSchema: TendLongJobTestReport,
    inputResources: [TendLongJobPackageResource],
    outputResources: [TendLongJobTestReportResource],
  },
  handler: TendLongJobTestSuiteHandler,
  alchemyDag: [TendLongJobTestSuiteDagEdge],
})

export const TendLongJobTestRecipes = [tendLongJobTestSuiteRecipe] as const
