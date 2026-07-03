import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  TendCoreConfigRecipeId,
  TendCoreEventEnvelopeRecipeId,
} from "./index.js"

export const TendCoreConfigRecipesSourcePath = "packages/tend/core/src/config-recipes.ts" as const
export const TendCoreConfigTypecheckTarget = "tend-core:typecheck" as const

export const TendCoreConfigInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/core"),
  configPaths: Schema.Array(Schema.String),
})
export type TendCoreConfigInput = typeof TendCoreConfigInput.Type

export const TendCoreConfigReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/core"),
  configCount: Schema.Number,
})
export type TendCoreConfigReport = typeof TendCoreConfigReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendCoreConfigSourceResource = defineAlchemyResource({
  id: "tend-core.config-surface.source",
  kind: "configuration",
  alchemyType: "attune:resource:PackageConfiguration",
  ownerRecipeId: TendCoreConfigRecipeId,
  consumedBy: [TendCoreConfigRecipeId],
  addressSchema: TendCoreConfigInput,
  stateSchema: TendCoreConfigInput,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendCoreConfigReportResource = defineAlchemyResource({
  id: "tend-core.config-surface.report",
  kind: "report",
  alchemyType: "attune:resource:ConfigurationReport",
  ownerRecipeId: TendCoreConfigRecipeId,
  producedBy: [TendCoreConfigRecipeId],
  addressSchema: TendCoreConfigInput,
  stateSchema: TendCoreConfigReport,
  modes: ["check", "observe"],
})

export const summarizeTendCoreConfig = (
  input: TendCoreConfigInput,
): TendCoreConfigReport => ({
  packageRoot: input.packageRoot,
  configCount: input.configPaths.length,
})

export const TendCoreConfigHandler = defineRecipeHandler<TendCoreConfigInput, TendCoreConfigReport>({
  id: "tend-core.config-surface.handler",
  recipeId: TendCoreConfigRecipeId,
  sourcePath: TendCoreConfigRecipesSourcePath,
  exportName: "summarizeTendCoreConfig",
  handler: (input) => Effect.succeed(summarizeTendCoreConfig(input)),
  emitsReceipts: ["tend-core.config-surface.report"],
})

export const TendCoreConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendCoreConfigRecipeId,
  toRecipeId: TendCoreEventEnvelopeRecipeId,
  resource: TendCoreConfigReportResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendCoreConfigRecipe = defineConfigRecipe({
  id: TendCoreConfigRecipeId,
  title: "Own Tend core package configuration surfaces",
  inputSchema: TendCoreConfigInput,
  outputSchema: TendCoreConfigReport,
  allowedFiles: [
    TendCoreConfigRecipesSourcePath,
    "packages/tend/core/package.json",
    "packages/tend/core/project.json",
    "packages/tend/core/tsconfig.json",
    "packages/tend/core/vitest.config.ts",
  ],
  validationEvidence: [TendCoreConfigTypecheckTarget],
  io: {
    inputSchema: TendCoreConfigInput,
    outputSchema: TendCoreConfigReport,
    inputResources: [TendCoreConfigSourceResource],
    outputResources: [TendCoreConfigReportResource],
  },
  handler: TendCoreConfigHandler,
  alchemyDag: [TendCoreConfigDagEdge],
})

export const TendCoreConfigRecipes = [tendCoreConfigRecipe] as const
