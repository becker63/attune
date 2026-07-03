import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineToolchainRecipe,
} from "@attune/framework-protocol"

export const JoernEffectPropertiesToolchainRecipesSourcePath =
  "packages/attune/joern-effect-properties/src/toolchain-recipes.ts" as const
const joernFuzzerToolchainRecipeId = "joern-effect-properties.nix-runtime-toolchain" as const
const joernFuzzerToolchainResourceId = "joern-effect-properties.nix-runtime-toolchain.resource" as const
const joernFuzzerToolchainHandlerId = "joern-effect-properties.nix-runtime-toolchain.handler" as const
const workerFuzzerRecipeId = "joern-effect-properties.worker-fuzzer" as const

export const JoernFuzzerToolchainInput = Schema.Struct({
  packageRoot: Schema.optional(Schema.String),
})
export type JoernFuzzerToolchainInput = typeof JoernFuzzerToolchainInput.Type

export const JoernFuzzerToolchainOutput = Schema.Struct({
  nixOwned: Schema.Boolean,
})
export type JoernFuzzerToolchainOutput = typeof JoernFuzzerToolchainOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernFuzzerToolchainResource = defineAlchemyResource({
  id: joernFuzzerToolchainResourceId,
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: joernFuzzerToolchainRecipeId,
  producedBy: [joernFuzzerToolchainRecipeId],
  consumedBy: [joernFuzzerToolchainRecipeId],
  addressFields: ["packageRoot"],
  addressSchema: JoernFuzzerToolchainInput as never,
  stateSchema: JoernFuzzerToolchainOutput as never,
  modes: ["read", "check"],
  programmaticResourceExport: "JoernFuzzerToolchainRecipes",
  programmaticBridgeSourcePath: JoernEffectPropertiesToolchainRecipesSourcePath,
})

export const JoernFuzzerToolchainHandler = defineRecipeHandler<
  JoernFuzzerToolchainInput,
  JoernFuzzerToolchainOutput
>({
  id: joernFuzzerToolchainHandlerId,
  recipeId: joernFuzzerToolchainRecipeId,
  sourcePath: JoernEffectPropertiesToolchainRecipesSourcePath,
  exportName: "JoernFuzzerToolchainRecipes",
  emitsReceipts: ["joern-effect-properties.nix-runtime-toolchain.checked"],
  handler: () => Effect.succeed({ nixOwned: true }) as never,
})

export const JoernFuzzerToolchainRecipe = defineToolchainRecipe({
  id: joernFuzzerToolchainRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern fuzzer Arion and Nix runtime toolchain files",
  inputSchema: JoernFuzzerToolchainInput as never,
  outputSchema: JoernFuzzerToolchainOutput as never,
  nxTarget: "joern-effect-properties:test",
  allowedFiles: [
    JoernEffectPropertiesToolchainRecipesSourcePath,
    "packages/attune/joern-effect-properties/nix/**",
  ],
  validationEvidence: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
  io: {
    inputSchema: JoernFuzzerToolchainInput as never,
    outputSchema: JoernFuzzerToolchainOutput as never,
    inputResources: [JoernFuzzerToolchainResource],
    outputResources: [JoernFuzzerToolchainResource],
  },
  handler: JoernFuzzerToolchainHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernFuzzerToolchainRecipeId,
      toRecipeId: workerFuzzerRecipeId,
      resource: JoernFuzzerToolchainResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernFuzzerToolchainRecipes = [JoernFuzzerToolchainRecipe] as const
