import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"

import { frameworkRuntimeRecipeKernelRecipeId } from "./RecipeKernel.js"

const frameworkRuntimePublicApiRecipeId = "framework-runtime.public-api-barrel" as const
const frameworkRuntimePublicApiSourcePath = "packages/trellis/runtime/src/index.ts" as const

export const FrameworkRuntimePublicApiInput = Schema.Struct({
  packageId: Schema.String,
})
export type FrameworkRuntimePublicApiInput = typeof FrameworkRuntimePublicApiInput.Type

export const FrameworkRuntimePublicApiOutput = Schema.Struct({
  packageId: Schema.String,
  exportCount: Schema.Number,
  kernelRecipeId: Schema.String,
})
export type FrameworkRuntimePublicApiOutput = typeof FrameworkRuntimePublicApiOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimePublicApiResource = defineAlchemyResource({
  id: "framework-runtime.public-api.resource",
  kind: "package-metadata",
  alchemyType: "attune:resource:RuntimePublicApi",
  ownerRecipeId: frameworkRuntimePublicApiRecipeId,
  producedBy: [frameworkRuntimePublicApiRecipeId],
  consumedBy: [frameworkRuntimePublicApiRecipeId, frameworkRuntimeRecipeKernelRecipeId],
  addressFields: ["packageId"],
  addressSchema: FrameworkRuntimePublicApiInput as never,
  stateSchema: FrameworkRuntimePublicApiOutput as never,
  modes: ["read", "project", "check"],
  programmaticResourceExport: "describeFrameworkRuntimePublicApi",
  programmaticBridgeSourcePath: frameworkRuntimePublicApiSourcePath,
})

export const describeFrameworkRuntimePublicApi = (
  input: FrameworkRuntimePublicApiInput,
): Effect.Effect<FrameworkRuntimePublicApiOutput> =>
  Effect.succeed({
    packageId: input.packageId,
    exportCount: 12,
    kernelRecipeId: frameworkRuntimeRecipeKernelRecipeId,
  })

export const FrameworkRuntimePublicApiHandler = defineRecipeHandler<
  FrameworkRuntimePublicApiInput,
  FrameworkRuntimePublicApiOutput
>({
  id: "framework-runtime.public-api-barrel.handler",
  recipeId: frameworkRuntimePublicApiRecipeId,
  sourcePath: frameworkRuntimePublicApiSourcePath,
  exportName: "describeFrameworkRuntimePublicApi",
  emitsReceipts: ["framework-runtime.public-api.described"],
  handler: describeFrameworkRuntimePublicApi,
})

export const FrameworkRuntimePublicApiRecipe = defineRuntimeRecipe({
  id: frameworkRuntimePublicApiRecipeId,
  projectId: "framework-runtime",
  title: "Describe the framework runtime public API barrel",
  inputSchema: FrameworkRuntimePublicApiInput,
  outputSchema: FrameworkRuntimePublicApiOutput,
  allowedFiles: [frameworkRuntimePublicApiSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: FrameworkRuntimePublicApiInput,
    outputSchema: FrameworkRuntimePublicApiOutput,
    inputResources: [FrameworkRuntimePublicApiResource],
    outputResources: [FrameworkRuntimePublicApiResource],
  },
  handler: FrameworkRuntimePublicApiHandler,
  alchemyDag: [{
    fromRecipeId: frameworkRuntimePublicApiRecipeId,
    toRecipeId: frameworkRuntimeRecipeKernelRecipeId,
    resource: FrameworkRuntimePublicApiResource,
    kind: "projects",
    modes: ["read", "project", "check"],
  }],
})

export const FrameworkRuntimePublicApiRecipes = [
  FrameworkRuntimePublicApiRecipe,
] as const

export * from "./ProgramDiagnostics.js"
export * from "./ProgramFactProjection.js"
export * from "./ProgramFactQuery.js"
export * from "./ProgramFactRuntime.js"
export * from "./ProgramFactStore.js"
export * from "./LocalTimescaleRecipe.js"
export * from "./MeasurementObservation.js"
export * from "./PostgresRecipeReceiptStore.js"
export * from "./recipes.js"
export * from "./RecipeKernel.js"
export * from "./RecipeReceiptStore.js"
export * from "./SqlRoute.js"
