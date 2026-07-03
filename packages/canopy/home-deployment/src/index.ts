import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

import { canopyHomeDeploymentRecipeId } from "./model.ts"

const homeDeploymentPublicApiRecipeId = "canopy.home-deployment.public-api" as const
const homeDeploymentPublicApiSourcePath = "packages/canopy/home-deployment/src/index.ts" as const
const homeDeploymentPublicApiLayerId = "canopy.home-deployment.public-api.layer" as const
const homeDeploymentPublicApiValidationEvidence = ["home-deployment:typecheck"] as const

export const HomeDeploymentPublicApiInput = Schema.Struct({
  packageId: Schema.Literal("home-deployment"),
})
export type HomeDeploymentPublicApiInput = typeof HomeDeploymentPublicApiInput.Type

export const HomeDeploymentPublicApiOutput = Schema.Struct({
  packageId: Schema.Literal("home-deployment"),
  exportedRecipeApi: Schema.Boolean,
  managedRecipeId: Schema.Literal(canopyHomeDeploymentRecipeId),
})
export type HomeDeploymentPublicApiOutput = typeof HomeDeploymentPublicApiOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentPublicApiResource = defineAlchemyResource({
  id: "canopy.home-deployment.public-api.resource",
  kind: "package-metadata",
  alchemyType: "attune:canopy:HomeDeploymentPublicApi",
  ownerRecipeId: homeDeploymentPublicApiRecipeId,
  producedBy: [homeDeploymentPublicApiRecipeId],
  consumedBy: [homeDeploymentPublicApiRecipeId, canopyHomeDeploymentRecipeId],
  addressFields: ["packageId"],
  addressSchema: HomeDeploymentPublicApiInput as never,
  stateSchema: HomeDeploymentPublicApiOutput as never,
  modes: ["read", "project", "check"],
  programmaticResourceExport: "describeHomeDeploymentPublicApi",
  programmaticBridgeSourcePath: homeDeploymentPublicApiSourcePath,
})

export const describeHomeDeploymentPublicApi = (): Effect.Effect<HomeDeploymentPublicApiOutput> =>
  Effect.succeed({
    packageId: "home-deployment",
    exportedRecipeApi: true,
    managedRecipeId: canopyHomeDeploymentRecipeId,
  })

export const HomeDeploymentPublicApiLayer = defineRecipeLayer({
  id: homeDeploymentPublicApiLayerId,
  sourcePath: homeDeploymentPublicApiSourcePath,
  exportName: "describeHomeDeploymentPublicApi",
  layer: Layer.empty as never,
  provides: [],
})

export const HomeDeploymentPublicApiHandler = defineRecipeHandler<
  HomeDeploymentPublicApiInput,
  HomeDeploymentPublicApiOutput
>({
  id: "canopy.home-deployment.public-api.handler",
  recipeId: homeDeploymentPublicApiRecipeId,
  sourcePath: homeDeploymentPublicApiSourcePath,
  exportName: "describeHomeDeploymentPublicApi",
  handler: () => describeHomeDeploymentPublicApi() as never,
  layer: HomeDeploymentPublicApiLayer,
  emitsReceipts: ["canopy.home-deployment.public-api.projected"],
})

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentPublicApiRecipe = defineProjectionRecipe({
  id: homeDeploymentPublicApiRecipeId,
  projectId: "home-deployment",
  title: "Describe the Canopy home-deployment public API barrel",
  inputSchema: HomeDeploymentPublicApiInput as never,
  outputSchema: HomeDeploymentPublicApiOutput as never,
  allowedFiles: [homeDeploymentPublicApiSourcePath],
  validationEvidence: homeDeploymentPublicApiValidationEvidence,
  io: {
    inputSchema: HomeDeploymentPublicApiInput as never,
    outputSchema: HomeDeploymentPublicApiOutput as never,
    inputResources: [HomeDeploymentPublicApiResource],
    outputResources: [HomeDeploymentPublicApiResource],
  },
  handler: HomeDeploymentPublicApiHandler,
  alchemyDag: [{
    fromRecipeId: homeDeploymentPublicApiRecipeId,
    toRecipeId: canopyHomeDeploymentRecipeId,
    resource: HomeDeploymentPublicApiResource,
    kind: "projects",
    modes: ["read", "project", "check"],
  }],
})

export const HomeDeploymentPublicApiRecipes = [HomeDeploymentPublicApiRecipe] as const

export * from "./model.ts"
export * from "./state.ts"

export * from "./alchemy.ts"
export * from "./lifecycle.ts"
export * from "./providers.ts"
export * from "./recipes.ts"
