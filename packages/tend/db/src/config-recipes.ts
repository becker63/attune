import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  TendDbConfigRecipeId,
  TendDbControlSpineRecipeId,
  TendDbTypecheckTarget,
} from "./index.js"

export const TendDbConfigRecipesSourcePath = "packages/tend/db/src/config-recipes.ts" as const

export const TendDbConfigInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/db"),
  configPaths: Schema.Array(Schema.String),
})
export type TendDbConfigInput = typeof TendDbConfigInput.Type

export const TendDbConfigReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/db"),
  configCount: Schema.Number,
})
export type TendDbConfigReport = typeof TendDbConfigReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendDbConfigSourceResource = defineAlchemyResource({
  id: "tend-db.config-surface.source",
  kind: "configuration",
  alchemyType: "attune:resource:PackageConfiguration",
  ownerRecipeId: TendDbConfigRecipeId,
  consumedBy: [TendDbConfigRecipeId],
  addressSchema: TendDbConfigInput,
  stateSchema: TendDbConfigInput,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendDbConfigReportResource = defineAlchemyResource({
  id: "tend-db.config-surface.report",
  kind: "report",
  alchemyType: "attune:resource:ConfigurationReport",
  ownerRecipeId: TendDbConfigRecipeId,
  producedBy: [TendDbConfigRecipeId],
  addressSchema: TendDbConfigInput,
  stateSchema: TendDbConfigReport,
  modes: ["check", "observe"],
})

export const summarizeTendDbConfig = (
  input: TendDbConfigInput,
): TendDbConfigReport => ({
  packageRoot: input.packageRoot,
  configCount: input.configPaths.length,
})

export const tendDbConfigCheckInvocation = (): RecipeInvocation => ({
  recipeId: TendDbConfigRecipeId,
  action: "check",
  source: {
    surface: "nx",
    projectId: "tend-db",
    target: TendDbTypecheckTarget,
  },
})

export const TendDbConfigHandler = defineRecipeHandler<TendDbConfigInput, TendDbConfigReport>({
  id: "tend-db.config-surface.handler",
  recipeId: TendDbConfigRecipeId,
  sourcePath: TendDbConfigRecipesSourcePath,
  exportName: "summarizeTendDbConfig",
  handler: (input) => Effect.succeed(summarizeTendDbConfig(input)),
  emitsReceipts: ["tend-db.config-surface.report"],
})

export const TendDbConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendDbConfigRecipeId,
  toRecipeId: TendDbControlSpineRecipeId,
  resource: TendDbConfigReportResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
  validationTargets: [TendDbTypecheckTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendDbConfigRecipe = defineConfigRecipe({
  id: TendDbConfigRecipeId,
  title: "Own Tend DB package configuration surfaces",
  inputSchema: TendDbConfigInput,
  outputSchema: TendDbConfigReport,
  allowedFiles: [
    TendDbConfigRecipesSourcePath,
    "packages/tend/db/package.json",
    "packages/tend/db/project.json",
    "packages/tend/db/tsconfig.json",
    "packages/tend/db/vitest.config.ts",
  ],
  validationEvidence: [TendDbTypecheckTarget],
  io: {
    inputSchema: TendDbConfigInput,
    outputSchema: TendDbConfigReport,
    inputResources: [TendDbConfigSourceResource],
    outputResources: [TendDbConfigReportResource],
  },
  handler: TendDbConfigHandler,
  alchemyDag: [TendDbConfigDagEdge],
})

export const TendDbConfigRecipes = [tendDbConfigRecipe] as const
