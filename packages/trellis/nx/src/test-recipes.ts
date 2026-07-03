import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  FrameworkNxMaterializationPlanRecipeId,
  FrameworkNxMaterializationPlanResource,
  FrameworkNxPackageSourceResource,
  FrameworkNxProjectId,
  FrameworkNxRecipeProjectionInput,
  FrameworkNxTestTarget,
} from "./index.js"

export const FrameworkNxTestSuiteRecipeId = "framework-nx.test-suite" as const
export const FrameworkNxTestRecipesSourcePath = "packages/trellis/nx/src/test-recipes.ts" as const

export const FrameworkNxTestReport = Schema.Struct({
  projectId: Schema.String,
  recipeCount: Schema.Number,
  testTarget: Schema.String,
})
export type FrameworkNxTestReport = typeof FrameworkNxTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkNxTestReportResource = defineAlchemyResource({
  id: "framework-nx.test-suite.report",
  kind: "report",
  alchemyType: "attune:resource:FrameworkNxTestReport",
  ownerRecipeId: FrameworkNxTestSuiteRecipeId,
  producedBy: [FrameworkNxTestSuiteRecipeId],
  addressFields: ["projectId", "sourcePath"],
  addressSchema: FrameworkNxRecipeProjectionInput,
  stateSchema: FrameworkNxTestReport,
  modes: ["check", "observe"],
})

export const summarizeFrameworkNxTestSuite = (
  input: FrameworkNxRecipeProjectionInput,
): Effect.Effect<FrameworkNxTestReport> =>
  Effect.succeed({
    projectId: input.projectId,
    recipeCount: 4,
    testTarget: FrameworkNxTestTarget,
  })

export const FrameworkNxTestSuiteHandler = defineRecipeHandler<
  FrameworkNxRecipeProjectionInput,
  FrameworkNxTestReport
>({
  id: "framework-nx.test-suite.handler",
  recipeId: FrameworkNxTestSuiteRecipeId,
  sourcePath: FrameworkNxTestRecipesSourcePath,
  exportName: "summarizeFrameworkNxTestSuite",
  emitsReceipts: ["framework-nx.test-suite.reported"],
  handler: summarizeFrameworkNxTestSuite,
})

export const FrameworkNxMaterializationToTestDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FrameworkNxMaterializationPlanRecipeId,
  toRecipeId: FrameworkNxTestSuiteRecipeId,
  resource: FrameworkNxMaterializationPlanResource,
  kind: "validates",
  modes: ["plan", "check"],
  validationTargets: [FrameworkNxTestTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkNxTestSuiteRecipe = defineTestRecipe({
  id: FrameworkNxTestSuiteRecipeId,
  projectId: FrameworkNxProjectId,
  title: "Own framework Nx projection tests",
  inputSchema: FrameworkNxRecipeProjectionInput,
  outputSchema: FrameworkNxTestReport,
  nxTarget: FrameworkNxTestTarget,
  allowedFiles: [
    FrameworkNxTestRecipesSourcePath,
    "packages/trellis/nx/test/**",
  ],
  validationEvidence: [FrameworkNxTestTarget, "framework-nx:typecheck"],
  io: {
    inputSchema: FrameworkNxRecipeProjectionInput,
    outputSchema: FrameworkNxTestReport,
    inputResources: [
      FrameworkNxPackageSourceResource,
      FrameworkNxMaterializationPlanResource,
    ],
    outputResources: [FrameworkNxTestReportResource],
  },
  handler: FrameworkNxTestSuiteHandler,
  alchemyDag: [FrameworkNxMaterializationToTestDagEdge],
})

export const FrameworkNxTestRecipes = [
  FrameworkNxTestSuiteRecipe,
] as const
