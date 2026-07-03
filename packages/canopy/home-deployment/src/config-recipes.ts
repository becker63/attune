import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { canopyHomeDeploymentTestSuiteRecipeId } from "./model.ts"

const homeDeploymentConfigRecipeId = "canopy.home-deployment.config-surface" as const
const homeDeploymentConfigSourcePath = "packages/canopy/home-deployment/src/config-recipes.ts" as const
const homeDeploymentConfigTypecheckTarget = "home-deployment:typecheck" as const

export const HomeDeploymentConfigInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/canopy/home-deployment"),
  configPaths: Schema.Array(Schema.String),
})
export type HomeDeploymentConfigInput = typeof HomeDeploymentConfigInput.Type

export const HomeDeploymentConfigReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/canopy/home-deployment"),
  configCount: Schema.Number,
  validationTarget: Schema.Literal(homeDeploymentConfigTypecheckTarget),
})
export type HomeDeploymentConfigReport = typeof HomeDeploymentConfigReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentConfigSourceResource = defineAlchemyResource({
  id: "canopy.home-deployment.config-surface.source",
  kind: "configuration",
  alchemyType: "attune:canopy:HomeDeploymentConfigSurface",
  ownerRecipeId: homeDeploymentConfigRecipeId,
  consumedBy: [homeDeploymentConfigRecipeId],
  addressSchema: HomeDeploymentConfigInput as never,
  stateSchema: HomeDeploymentConfigInput as never,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentConfigReportResource = defineAlchemyResource({
  id: "canopy.home-deployment.config-surface.report",
  kind: "report",
  alchemyType: "attune:canopy:HomeDeploymentConfigReport",
  ownerRecipeId: homeDeploymentConfigRecipeId,
  producedBy: [homeDeploymentConfigRecipeId],
  consumedBy: [canopyHomeDeploymentTestSuiteRecipeId],
  addressSchema: HomeDeploymentConfigInput as never,
  stateSchema: HomeDeploymentConfigReport as never,
  modes: ["check", "observe"],
  programmaticResourceExport: "summarizeHomeDeploymentConfig",
  programmaticBridgeSourcePath: homeDeploymentConfigSourcePath,
})

export const summarizeHomeDeploymentConfig = (
  input: HomeDeploymentConfigInput,
): HomeDeploymentConfigReport => ({
  packageRoot: input.packageRoot,
  configCount: input.configPaths.length,
  validationTarget: homeDeploymentConfigTypecheckTarget,
})

export const HomeDeploymentConfigHandler = defineRecipeHandler<
  HomeDeploymentConfigInput,
  HomeDeploymentConfigReport
>({
  id: "canopy.home-deployment.config-surface.handler",
  recipeId: homeDeploymentConfigRecipeId,
  sourcePath: homeDeploymentConfigSourcePath,
  exportName: "summarizeHomeDeploymentConfig",
  handler: (input) => Effect.succeed(summarizeHomeDeploymentConfig(input)) as never,
  emitsReceipts: ["canopy.home-deployment.config-surface.checked"],
})

export const HomeDeploymentConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: homeDeploymentConfigRecipeId,
  toRecipeId: canopyHomeDeploymentTestSuiteRecipeId,
  resource: HomeDeploymentConfigReportResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentConfigRecipe = defineConfigRecipe({
  id: homeDeploymentConfigRecipeId,
  projectId: "home-deployment",
  title: "Own Canopy home-deployment package configuration surfaces",
  inputSchema: HomeDeploymentConfigInput as never,
  outputSchema: HomeDeploymentConfigReport as never,
  allowedFiles: [
    homeDeploymentConfigSourcePath,
    "packages/canopy/home-deployment/package.json",
    "packages/canopy/home-deployment/project.json",
    "packages/canopy/home-deployment/tsconfig.json",
    "packages/canopy/home-deployment/vitest.config.ts",
  ],
  validationEvidence: [homeDeploymentConfigTypecheckTarget],
  io: {
    inputSchema: HomeDeploymentConfigInput as never,
    outputSchema: HomeDeploymentConfigReport as never,
    inputResources: [HomeDeploymentConfigSourceResource],
    outputResources: [HomeDeploymentConfigReportResource],
  },
  handler: HomeDeploymentConfigHandler,
  alchemyDag: [HomeDeploymentConfigDagEdge],
})

export const HomeDeploymentConfigRecipes = [HomeDeploymentConfigRecipe] as const
