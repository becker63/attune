import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"

export const FrameworkTestingTestSuiteRecipeId = "framework-testing.test-suite" as const
export const FrameworkTestingTestRecipesSourcePath = "packages/trellis/testing/src/test-recipes.ts" as const
export const FrameworkTestingVitestConfigPath = "packages/trellis/testing/vitest.config.ts" as const

export const describeFrameworkTestingTestSuite = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "test-suite", {
    observationCount: input.symbolIds.length,
    coveragePointCount: input.symbolIds.length,
    replayMetadataCount: input.symbolIds.length,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingTestSuiteSourceResource = defineAlchemyResource({
  id: "framework-testing.test-suite.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingTestSuiteSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingTestSuiteRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingTestSuiteReportResource = defineAlchemyResource({
  id: "framework-testing.test-suite.report",
  kind: "report",
  alchemyType: "attune:resource:FrameworkTestingTestSuiteReport",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["check", "read"],
  ownerRecipeId: FrameworkTestingTestSuiteRecipeId,
  producedBy: [FrameworkTestingTestSuiteRecipeId],
})

export const FrameworkTestingTestSuiteHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.test-suite.handler",
  recipeId: FrameworkTestingTestSuiteRecipeId,
  sourcePath: FrameworkTestingTestRecipesSourcePath,
  exportName: "describeFrameworkTestingTestSuite",
  emitsReceipts: ["framework-testing.test-suite.report"],
  handler: (input) => Effect.succeed(describeFrameworkTestingTestSuite(input)),
})

export const FrameworkTestingTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.test-suite.source",
  toRecipeId: FrameworkTestingTestSuiteRecipeId,
  resource: FrameworkTestingTestSuiteReportResource,
  kind: "validates",
  modes: ["read", "check"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingTestRecipes = [
// @attune-packet-target generated-runtime-projection eligible
  defineTestRecipe({
    id: FrameworkTestingTestSuiteRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own framework testing harness tests",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingTestSuiteSourceResource],
      outputResources: [FrameworkTestingTestSuiteReportResource],
    },
    handler: FrameworkTestingTestSuiteHandler,
    alchemyDag: [FrameworkTestingTestSuiteDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    allowedFiles: [
      FrameworkTestingTestRecipesSourcePath,
      "packages/trellis/testing/test/**",
      FrameworkTestingVitestConfigPath,
    ],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const
