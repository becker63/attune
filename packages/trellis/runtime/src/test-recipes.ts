import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeModule,
  defineTestRecipe,
  lowerRecipeAuthoringFact,
  projectRecipeAuthoringRuntime,
} from "@attune/framework-protocol"

import {
  FrameworkRuntimeRecipeKernelResource,
  frameworkRuntimeRecipeKernelRecipeId,
} from "./RecipeKernel.js"

const frameworkRuntimeTestSuiteRecipeId = "framework-runtime.test-suite" as const
const frameworkRuntimeTestRecipesSourcePath =
  "packages/trellis/runtime/src/test-recipes.ts" as const

export const FrameworkRuntimeTestInput = Schema.Struct({
  packageId: Schema.String,
  sourceRoot: Schema.String,
})
export type FrameworkRuntimeTestInput = typeof FrameworkRuntimeTestInput.Type

export const FrameworkRuntimeTestReport = Schema.Struct({
  packageId: Schema.String,
  kernelRecipeId: Schema.String,
  testTarget: Schema.String,
})
export type FrameworkRuntimeTestReport = typeof FrameworkRuntimeTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeTestReportResource = defineAlchemyResource({
  id: "framework-runtime.test-suite.report",
  kind: "report",
  alchemyType: "attune:resource:RuntimeTestReport",
  ownerRecipeId: frameworkRuntimeTestSuiteRecipeId,
  producedBy: [frameworkRuntimeTestSuiteRecipeId],
  consumedBy: [frameworkRuntimeTestSuiteRecipeId],
  addressFields: ["packageId", "sourceRoot"],
  addressSchema: FrameworkRuntimeTestInput,
  stateSchema: FrameworkRuntimeTestReport,
  modes: ["check", "observe"],
})

export const summarizeFrameworkRuntimeTests = (
  input: FrameworkRuntimeTestInput,
): Effect.Effect<FrameworkRuntimeTestReport> =>
  Effect.succeed({
    packageId: input.packageId,
    kernelRecipeId: frameworkRuntimeRecipeKernelRecipeId,
    testTarget: "framework-runtime:test",
  })

const recipe = defineRecipeModule(import.meta.url)

export const frameworkRuntimeTestSuite = recipe({
  modes: ["check"],
  input: FrameworkRuntimeTestInput,
  output: FrameworkRuntimeTestReport,
  title: "Own framework runtime recipe, measurement, and kernel tests",
  allowedFiles: [
    frameworkRuntimeTestRecipesSourcePath,
    "packages/trellis/runtime/test/**",
  ],
  validationEvidence: ["framework-runtime:test", "framework-runtime:typecheck"],
  run: summarizeFrameworkRuntimeTests,
})

const frameworkRuntimeTestSuiteLoweringContext = {
  packageId: "framework-runtime",
  projectId: "framework-runtime",
  exportName: "frameworkRuntimeTestSuite",
  validationEvidence: ["framework-runtime:test", "framework-runtime:typecheck"],
} as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeTestSuiteGeneratedProjection = projectRecipeAuthoringRuntime(
  frameworkRuntimeTestSuite,
  frameworkRuntimeTestSuiteLoweringContext,
)

// @attune-packet-target generated-runtime-projection eligible
const FrameworkRuntimeTestSuiteLoweredRecipe = lowerRecipeAuthoringFact(
  frameworkRuntimeTestSuite,
  frameworkRuntimeTestSuiteLoweringContext,
)

export const FrameworkRuntimeTestSuiteHandler = {
  ...FrameworkRuntimeTestSuiteLoweredRecipe.handler,
  id: "framework-runtime.test-suite.handler",
  recipeId: frameworkRuntimeTestSuiteRecipeId,
  sourcePath: frameworkRuntimeTestRecipesSourcePath,
  exportName: "summarizeFrameworkRuntimeTests",
  emitsReceipts: ["framework-runtime.test-suite.reported"],
  handler: summarizeFrameworkRuntimeTests,
} as const

export const FrameworkRuntimeTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: frameworkRuntimeRecipeKernelRecipeId,
  toRecipeId: frameworkRuntimeTestSuiteRecipeId,
  resource: FrameworkRuntimeTestReportResource,
  kind: "validates",
  modes: ["check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeTestSuiteRecipe = defineTestRecipe({
  ...FrameworkRuntimeTestSuiteLoweredRecipe,
  id: frameworkRuntimeTestSuiteRecipeId,
  nxTarget: "framework-runtime:test",
  io: {
    inputSchema: FrameworkRuntimeTestInput,
    outputSchema: FrameworkRuntimeTestReport,
    inputResources: [FrameworkRuntimeRecipeKernelResource],
    outputResources: [FrameworkRuntimeTestReportResource],
  },
  handler: FrameworkRuntimeTestSuiteHandler,
  alchemyDag: [FrameworkRuntimeTestSuiteDagEdge],
})

export const FrameworkRuntimeTestRecipes = [
  FrameworkRuntimeTestSuiteRecipe,
] as const

export const FrameworkRuntimeTestSuiteRecipeAuthoringMetrics = {
  schemaVersion: 1,
  packageId: "framework-runtime",
  packetFamily: "recipe-authoring/manual-source-path-inferable",
  authoredExport: "frameworkRuntimeTestSuite",
  loweredRecipeId: FrameworkRuntimeTestSuiteGeneratedProjection.recipeId,
  compatibilityRecipeId: frameworkRuntimeTestSuiteRecipeId,
  authoredBoilerplateDelta: 4,
  claimStatus: "insufficient-evidence",
  rawPromptStored: false,
  rawDiffStored: false,
  patchTextStored: false,
  fullSourceStored: false,
} as const
