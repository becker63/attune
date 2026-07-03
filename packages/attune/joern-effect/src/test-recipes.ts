import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"

export const JoernTestRecipesSourcePath = "packages/attune/joern-effect/src/test-recipes.ts" as const
const joernTestSuiteRecipeId = "joern-effect.test-suite" as const
const joernSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernTestSuiteInput = Schema.Struct({
  target: Schema.Literal("joern-effect:test"),
})
export type JoernTestSuiteInput = typeof JoernTestSuiteInput.Type

export const JoernTestSuiteOutput = Schema.Struct({
  target: Schema.Literal("joern-effect:test"),
  owned: Schema.Boolean,
})
export type JoernTestSuiteOutput = typeof JoernTestSuiteOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernTestSuiteResource = defineAlchemyResource({
  id: "joern-effect.test-suite.resource",
  kind: "nx-target",
  alchemyType: "attune:resource:NxTarget",
  ownerRecipeId: joernTestSuiteRecipeId,
  producedBy: [joernTestSuiteRecipeId],
  consumedBy: [joernTestSuiteRecipeId],
  addressFields: ["target"],
  addressSchema: JoernTestSuiteInput as never,
  stateSchema: JoernTestSuiteOutput as never,
  modes: ["check", "invoke"],
  programmaticResourceExport: "JoernTestRecipes",
  programmaticBridgeSourcePath: JoernTestRecipesSourcePath,
})

export const JoernTestSuiteHandler = defineRecipeHandler<
  JoernTestSuiteInput,
  JoernTestSuiteOutput
>({
  id: "joern-effect.test-suite.handler",
  recipeId: joernTestSuiteRecipeId,
  sourcePath: JoernTestRecipesSourcePath,
  exportName: "JoernTestRecipes",
  emitsReceipts: ["joern.test-suite.owned"],
  handler: (input) =>
    Effect.succeed({
      target: input.target,
      owned: true,
    }) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernTestSuiteRecipe = defineTestRecipe({
  id: joernTestSuiteRecipeId,
  projectId: "joern-effect",
  title: "Own Joern Effect schema, runtime, template, and generated-surface tests",
  inputSchema: JoernTestSuiteInput as never,
  outputSchema: JoernTestSuiteOutput as never,
  nxTarget: "joern-effect:test",
  allowedFiles: [
    JoernTestRecipesSourcePath,
    "packages/attune/joern-effect/test/**",
  ],
  validationEvidence: ["joern-effect:test"],
  io: {
    inputSchema: JoernTestSuiteInput as never,
    outputSchema: JoernTestSuiteOutput as never,
    inputResources: [JoernTestSuiteResource],
    outputResources: [JoernTestSuiteResource],
  },
  handler: JoernTestSuiteHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernTestSuiteRecipeId,
      toRecipeId: joernSourceSurfaceRecipeId,
      resource: JoernTestSuiteResource,
      kind: "validates",
      modes: ["check", "invoke"],
    }),
  ],
})

export const JoernTestRecipes = [JoernTestSuiteRecipe] as const
