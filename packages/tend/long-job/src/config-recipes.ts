import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  TendLongJobConfigRecipeId,
  TendLongJobRegistrationRecipeId,
  TendLongJobTypecheckTarget,
} from "./index.js"

export const TendLongJobConfigRecipesSourcePath = "packages/tend/long-job/src/config-recipes.ts" as const

export const TendLongJobConfigInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/long-job"),
  configPaths: Schema.Array(Schema.String),
})
export type TendLongJobConfigInput = typeof TendLongJobConfigInput.Type

export const TendLongJobConfigReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/long-job"),
  configCount: Schema.Number,
})
export type TendLongJobConfigReport = typeof TendLongJobConfigReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobConfigSourceResource = defineAlchemyResource({
  id: "tend-long-job.config-surface.source",
  kind: "configuration",
  alchemyType: "attune:resource:PackageConfiguration",
  ownerRecipeId: TendLongJobConfigRecipeId,
  consumedBy: [TendLongJobConfigRecipeId],
  addressSchema: TendLongJobConfigInput,
  stateSchema: TendLongJobConfigInput,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobConfigReportResource = defineAlchemyResource({
  id: "tend-long-job.config-surface.report",
  kind: "report",
  alchemyType: "attune:resource:ConfigurationReport",
  ownerRecipeId: TendLongJobConfigRecipeId,
  producedBy: [TendLongJobConfigRecipeId],
  addressSchema: TendLongJobConfigInput,
  stateSchema: TendLongJobConfigReport,
  modes: ["check", "observe"],
})

export const summarizeTendLongJobConfig = (
  input: TendLongJobConfigInput,
): TendLongJobConfigReport => ({
  packageRoot: input.packageRoot,
  configCount: input.configPaths.length,
})

export const tendLongJobConfigCheckInvocation = (
  configPaths: readonly string[] = [
    "packages/tend/long-job/package.json",
    "packages/tend/long-job/project.json",
    "packages/tend/long-job/tsconfig.json",
    "packages/tend/long-job/vitest.config.ts",
  ],
): RecipeInvocation => ({
  recipeId: TendLongJobConfigRecipeId,
  action: "check",
  input: {
    packageRoot: "packages/tend/long-job",
    configPaths,
  },
  source: {
    surface: "nx",
    projectId: "tend-long-job",
    target: TendLongJobTypecheckTarget,
  },
})

export const TendLongJobConfigHandler = defineRecipeHandler<TendLongJobConfigInput, TendLongJobConfigReport>({
  id: "tend-long-job.config-surface.handler",
  recipeId: TendLongJobConfigRecipeId,
  sourcePath: TendLongJobConfigRecipesSourcePath,
  exportName: "summarizeTendLongJobConfig",
  handler: (input) => Effect.succeed(summarizeTendLongJobConfig(input)),
  emitsReceipts: ["tend-long-job.config-surface.report"],
})

export const TendLongJobConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendLongJobConfigRecipeId,
  toRecipeId: TendLongJobRegistrationRecipeId,
  resource: TendLongJobConfigReportResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
  validationTargets: [TendLongJobTypecheckTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendLongJobConfigRecipe = defineConfigRecipe({
  id: TendLongJobConfigRecipeId,
  title: "Own Tend long-job package configuration surfaces",
  inputSchema: TendLongJobConfigInput,
  outputSchema: TendLongJobConfigReport,
  allowedFiles: [
    TendLongJobConfigRecipesSourcePath,
    "packages/tend/long-job/package.json",
    "packages/tend/long-job/project.json",
    "packages/tend/long-job/tsconfig.json",
    "packages/tend/long-job/vitest.config.ts",
  ],
  validationEvidence: [TendLongJobTypecheckTarget],
  io: {
    inputSchema: TendLongJobConfigInput,
    outputSchema: TendLongJobConfigReport,
    inputResources: [TendLongJobConfigSourceResource],
    outputResources: [TendLongJobConfigReportResource],
  },
  handler: TendLongJobConfigHandler,
  alchemyDag: [TendLongJobConfigDagEdge],
})

export const TendLongJobConfigRecipes = [tendLongJobConfigRecipe] as const
