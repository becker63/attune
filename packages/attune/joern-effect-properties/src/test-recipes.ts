import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"

export const JoernEffectPropertiesTestRecipesSourcePath =
  "packages/attune/joern-effect-properties/src/test-recipes.ts" as const
const joernPropertyTestSuiteRecipeId = "joern-effect-properties.test-suite" as const
const joernPropertyTestSuiteResourceId = "joern-effect-properties.test-suite.resource" as const
const joernPropertyTestSuiteHandlerId = "joern-effect-properties.test-suite.handler" as const
const propertyValidationWorkerRecipeId = "joern-effect-properties.property-validation-worker" as const

export const JoernPropertyTestSuiteInput = Schema.Struct({
  target: Schema.Literal("joern-effect-properties:test"),
})
export type JoernPropertyTestSuiteInput = typeof JoernPropertyTestSuiteInput.Type

export const JoernPropertyTestSuiteOutput = Schema.Struct({
  target: Schema.Literal("joern-effect-properties:test"),
  owned: Schema.Boolean,
})
export type JoernPropertyTestSuiteOutput = typeof JoernPropertyTestSuiteOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernPropertyTestSuiteResource = defineAlchemyResource({
  id: joernPropertyTestSuiteResourceId,
  kind: "nx-target",
  alchemyType: "attune:resource:NxTarget",
  ownerRecipeId: joernPropertyTestSuiteRecipeId,
  producedBy: [joernPropertyTestSuiteRecipeId],
  consumedBy: [joernPropertyTestSuiteRecipeId],
  addressFields: ["target"],
  addressSchema: JoernPropertyTestSuiteInput as never,
  stateSchema: JoernPropertyTestSuiteOutput as never,
  modes: ["check", "invoke"],
  programmaticResourceExport: "JoernEffectPropertiesTestRecipes",
  programmaticBridgeSourcePath: JoernEffectPropertiesTestRecipesSourcePath,
})

export const JoernPropertyTestSuiteHandler = defineRecipeHandler<
  JoernPropertyTestSuiteInput,
  JoernPropertyTestSuiteOutput
>({
  id: joernPropertyTestSuiteHandlerId,
  recipeId: joernPropertyTestSuiteRecipeId,
  sourcePath: JoernEffectPropertiesTestRecipesSourcePath,
  exportName: "JoernEffectPropertiesTestRecipes",
  emitsReceipts: ["joern-effect-properties.test-suite.owned"],
  handler: (input) =>
    Effect.succeed({
      target: input.target,
      owned: true,
    }) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernPropertyTestSuiteRecipe = defineTestRecipe({
  id: joernPropertyTestSuiteRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern property, fuzzer, and worker tests",
  inputSchema: JoernPropertyTestSuiteInput as never,
  outputSchema: JoernPropertyTestSuiteOutput as never,
  nxTarget: "joern-effect-properties:test",
  allowedFiles: [
    JoernEffectPropertiesTestRecipesSourcePath,
    "packages/attune/joern-effect-properties/test/**",
  ],
  validationEvidence: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
  io: {
    inputSchema: JoernPropertyTestSuiteInput as never,
    outputSchema: JoernPropertyTestSuiteOutput as never,
    inputResources: [JoernPropertyTestSuiteResource],
    outputResources: [JoernPropertyTestSuiteResource],
  },
  handler: JoernPropertyTestSuiteHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernPropertyTestSuiteRecipeId,
      toRecipeId: propertyValidationWorkerRecipeId,
      resource: JoernPropertyTestSuiteResource,
      kind: "validates",
      modes: ["check", "invoke"],
    }),
  ],
})

export const JoernEffectPropertiesTestRecipes = [JoernPropertyTestSuiteRecipe] as const
