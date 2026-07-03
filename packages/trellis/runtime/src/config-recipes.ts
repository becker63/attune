import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

const frameworkRuntimeConfigRecipeId = "framework-runtime.config-surface" as const
const frameworkRuntimeTestSuiteRecipeId = "framework-runtime.test-suite" as const
const frameworkRuntimeConfigSourcePath = "packages/trellis/runtime/src/config-recipes.ts" as const
const frameworkRuntimeConfigValidationTarget = "framework-runtime:test" as const

export const FrameworkRuntimeConfigInput = Schema.Struct({
  packageId: Schema.String,
  configPath: Schema.String,
})
export type FrameworkRuntimeConfigInput = typeof FrameworkRuntimeConfigInput.Type

export const FrameworkRuntimeConfigOutput = Schema.Struct({
  packageId: Schema.String,
  configPath: Schema.String,
  validationTarget: Schema.String,
})
export type FrameworkRuntimeConfigOutput = typeof FrameworkRuntimeConfigOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeConfigResource = defineAlchemyResource({
  id: "framework-runtime.config.resource",
  kind: "configuration",
  alchemyType: "attune:resource:RuntimeConfig",
  ownerRecipeId: frameworkRuntimeConfigRecipeId,
  producedBy: [frameworkRuntimeConfigRecipeId],
  consumedBy: [frameworkRuntimeConfigRecipeId, frameworkRuntimeTestSuiteRecipeId],
  addressFields: ["packageId", "configPath"],
  addressSchema: FrameworkRuntimeConfigInput,
  stateSchema: FrameworkRuntimeConfigOutput,
  modes: ["read", "check"],
  programmaticResourceExport: "summarizeFrameworkRuntimeConfig",
  programmaticBridgeSourcePath: frameworkRuntimeConfigSourcePath,
})

export const summarizeFrameworkRuntimeConfig = (
  input: FrameworkRuntimeConfigInput,
): Effect.Effect<FrameworkRuntimeConfigOutput> =>
  Effect.succeed({
    packageId: input.packageId,
    configPath: input.configPath,
    validationTarget: frameworkRuntimeConfigValidationTarget,
  })

export const FrameworkRuntimeConfigHandler = defineRecipeHandler<
  FrameworkRuntimeConfigInput,
  FrameworkRuntimeConfigOutput
>({
  id: "framework-runtime.config-surface.handler",
  recipeId: frameworkRuntimeConfigRecipeId,
  sourcePath: frameworkRuntimeConfigSourcePath,
  exportName: "summarizeFrameworkRuntimeConfig",
  emitsReceipts: ["framework-runtime.config.checked"],
  handler: summarizeFrameworkRuntimeConfig,
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeConfigRecipe = defineConfigRecipe({
  id: frameworkRuntimeConfigRecipeId,
  projectId: "framework-runtime",
  title: "Own framework runtime package configuration",
  inputSchema: FrameworkRuntimeConfigInput,
  outputSchema: FrameworkRuntimeConfigOutput,
  allowedFiles: [
    frameworkRuntimeConfigSourcePath,
    "packages/trellis/runtime/vitest.config.ts",
  ],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: FrameworkRuntimeConfigInput,
    outputSchema: FrameworkRuntimeConfigOutput,
    inputResources: [FrameworkRuntimeConfigResource],
    outputResources: [FrameworkRuntimeConfigResource],
  },
  handler: FrameworkRuntimeConfigHandler,
  alchemyDag: [{
    fromRecipeId: frameworkRuntimeConfigRecipeId,
    toRecipeId: frameworkRuntimeTestSuiteRecipeId,
    resource: FrameworkRuntimeConfigResource,
    kind: "validates",
    modes: ["read", "check"],
  }],
})

export const FrameworkRuntimeConfigRecipes = [
  FrameworkRuntimeConfigRecipe,
] as const
