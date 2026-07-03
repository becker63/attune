import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { FoldKitEntryResource } from "./entry.js"
import {
  FoldKitEntryRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestSuiteRecipeId,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"

export const FoldKitTestRecipesSourcePath =
  "packages/attune/foldkit/src/test-recipes.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitTestReportResource = defineAlchemyResource({
  id: "attune-foldkit.test-and-fixture-suite.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitTestSuiteRecipeId,
  producedBy: [FoldKitTestSuiteRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "check", "observe"],
})

export const describeFoldKitTestSuite = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitTestSuiteRecipeId,
    sourcePath: FoldKitTestRecipesSourcePath,
    surface: "FoldKit activity, scene, and route fixture test evidence",
    exportedSymbols: ["FoldKitTestSuiteRecipe"],
  })

export const FoldKitTestSuiteHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.test-and-fixture-suite.handler",
  recipeId: FoldKitTestSuiteRecipeId,
  sourcePath: FoldKitTestRecipesSourcePath,
  exportName: "describeFoldKitTestSuite",
  handler: () => Effect.succeed(describeFoldKitTestSuite()),
  emitsReceipts: ["attune-foldkit.test-and-fixture-suite.report"],
})

export const FoldKitTestSuiteDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitEntryRecipeId,
  toRecipeId: FoldKitTestSuiteRecipeId,
  resource: FoldKitTestReportResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitTestSuiteRecipe = defineTestRecipe({
  id: FoldKitTestSuiteRecipeId,
  projectId: FoldKitProjectId,
  title: "Own FoldKit tests and fixture evidence",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [
    FoldKitTestRecipesSourcePath,
    "packages/attune/foldkit/src/fixtures/**",
    "packages/attune/foldkit/test/**",
  ],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitEntryResource,
    ],
    outputResources: [FoldKitTestReportResource],
  },
  handler: FoldKitTestSuiteHandler,
  alchemyDag: [FoldKitTestSuiteDagEdge],
})

export const FoldKitTestRecipes = [FoldKitTestSuiteRecipe] as const
