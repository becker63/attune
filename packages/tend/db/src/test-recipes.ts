import {
  defineAlchemyRecipeDagEdge,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  TendDbAddress,
  TendDbPackageResource,
  TendDbSqlValidationRouteRecipeId,
  TendDbTestReport,
  TendDbTestSuiteRecipeId,
  TendDbTypecheckTarget,
  TendDbValidationReportResource,
} from "./index.js"

export const TendDbTestRecipesSourcePath = "packages/tend/db/src/test-recipes.ts" as const
export const TendDbTestTarget = "tend-db:test" as const

export const summarizeTendDbTestSuite = (
  input: TendDbAddress,
): TendDbTestReport => ({
  recipeId: input.recipeId,
  runtimeBoundary: TendDbTestTarget,
})

export const TendDbTestSuiteHandler = defineRecipeHandler<TendDbAddress, TendDbTestReport>({
  id: "tend-db.test-suite.handler",
  recipeId: TendDbTestSuiteRecipeId,
  sourcePath: TendDbTestRecipesSourcePath,
  exportName: "summarizeTendDbTestSuite",
  handler: (input) => Effect.succeed(summarizeTendDbTestSuite(input)),
  emitsReceipts: ["tend-db.test-report"],
})

export const TendDbTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendDbSqlValidationRouteRecipeId,
  toRecipeId: TendDbTestSuiteRecipeId,
  resource: TendDbValidationReportResource,
  kind: "validates",
  modes: ["check", "observe"],
  validationTargets: [TendDbTestTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendDbTestSuiteRecipe = defineTestRecipe({
  id: TendDbTestSuiteRecipeId,
  title: "Own Tend DB tests",
  inputSchema: TendDbAddress,
  outputSchema: TendDbTestReport,
  allowedFiles: [
    TendDbTestRecipesSourcePath,
    "packages/tend/db/test/**",
  ],
  validationEvidence: [TendDbTestTarget, TendDbTypecheckTarget],
  io: {
    inputSchema: TendDbAddress,
    outputSchema: TendDbTestReport,
    inputResources: [TendDbPackageResource],
    outputResources: [TendDbValidationReportResource],
  },
  handler: TendDbTestSuiteHandler,
  alchemyDag: [TendDbTestSuiteDagEdge],
})

export const TendDbTestRecipes = [tendDbTestSuiteRecipe] as const
