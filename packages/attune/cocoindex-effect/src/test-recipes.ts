import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { CocoIndexAnchorCardResource } from "./model.js"
import { CocoIndexSearchSimilarAnchorsRecipeId } from "./CocoIndexClientLive.js"

export const CocoIndexTestSuiteRecipeId = "cocoindex-effect.test-suite" as const
const CocoIndexTestSuiteReportResourceId = "cocoindex-effect.test-report" as const
const CocoIndexTestSuiteHandlerId = "cocoindex-effect.test-suite.handler" as const
const CocoIndexTestRecipeSourcePath =
  "packages/attune/cocoindex-effect/src/test-recipes.ts" as const

export const CocoIndexTestSuiteAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  recipeId: Schema.Literal(CocoIndexTestSuiteRecipeId),
})
export type CocoIndexTestSuiteAddress = typeof CocoIndexTestSuiteAddress.Type

export const CocoIndexTestSuiteReport = Schema.Struct({
  recipeId: Schema.Literal(CocoIndexTestSuiteRecipeId),
  fixtureRecallCovered: Schema.Boolean,
  generatedSurfaceCovered: Schema.Boolean,
})
export type CocoIndexTestSuiteReport = typeof CocoIndexTestSuiteReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexTestSuiteReportResource = defineAlchemyResource({
  id: CocoIndexTestSuiteReportResourceId,
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: CocoIndexTestSuiteRecipeId,
  producedBy: [CocoIndexTestSuiteRecipeId],
  addressFields: ["packageRoot", "recipeId"],
  addressSchema: CocoIndexTestSuiteAddress,
  stateSchema: CocoIndexTestSuiteReport,
  modes: ["check", "observe"],
})

export const CocoIndexTestSuiteHandler = defineRecipeHandler<
  CocoIndexTestSuiteAddress,
  CocoIndexTestSuiteReport
>({
  id: CocoIndexTestSuiteHandlerId,
  recipeId: CocoIndexTestSuiteRecipeId,
  sourcePath: CocoIndexTestRecipeSourcePath,
  exportName: "CocoIndexTestSuiteRecipe",
  handler: () =>
    Effect.succeed({
      recipeId: CocoIndexTestSuiteRecipeId,
      fixtureRecallCovered: true,
      generatedSurfaceCovered: true,
    }),
  emitsReceipts: ["cocoindex-effect.test-report"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexTestSuiteRecipe = defineTestRecipe({
  id: CocoIndexTestSuiteRecipeId,
  projectId: "cocoindex-effect",
  title: "Own CocoIndex Effect service tests",
  inputSchema: CocoIndexTestSuiteAddress,
  outputSchema: CocoIndexTestSuiteReport,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [
    CocoIndexTestRecipeSourcePath,
    "packages/attune/cocoindex-effect/test/**",
    "packages/attune/cocoindex-effect/vitest.config.ts",
  ],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  io: {
    inputSchema: CocoIndexTestSuiteAddress,
    outputSchema: CocoIndexTestSuiteReport,
    inputResources: [CocoIndexAnchorCardResource],
    outputResources: [CocoIndexTestSuiteReportResource],
  },
  handler: CocoIndexTestSuiteHandler,
  alchemyDag: [{
    fromRecipeId: CocoIndexSearchSimilarAnchorsRecipeId,
    toRecipeId: CocoIndexTestSuiteRecipeId,
    resource: CocoIndexTestSuiteReportResource,
    kind: "validates",
    modes: ["check", "observe"],
  }],
})

export const CocoIndexTestRecipes = [CocoIndexTestSuiteRecipe] as const
