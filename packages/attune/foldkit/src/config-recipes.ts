import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FoldKitConfigRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSchemaCatalogRecipeId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"

export const FoldKitConfigRecipesSourcePath =
  "packages/attune/foldkit/src/config-recipes.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitConfigResource = defineAlchemyResource({
  id: "attune-foldkit.config-surface.report",
  kind: "configuration",
  alchemyType: "attune:resource:PackageConfiguration",
  ownerRecipeId: FoldKitConfigRecipeId,
  producedBy: [FoldKitConfigRecipeId],
  consumedBy: [FoldKitSchemaCatalogRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "check", "observe"],
})

export const describeFoldKitConfigSurface = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitConfigRecipeId,
    sourcePath: FoldKitConfigRecipesSourcePath,
    surface: "FoldKit package metadata, Nx target, TypeScript, Vite, and Vitest configuration",
    exportedSymbols: ["FoldKitConfigRecipe"],
  })

export const FoldKitConfigHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.config-surface.handler",
  recipeId: FoldKitConfigRecipeId,
  sourcePath: FoldKitConfigRecipesSourcePath,
  exportName: "describeFoldKitConfigSurface",
  handler: () => Effect.succeed(describeFoldKitConfigSurface()),
  emitsReceipts: ["attune-foldkit.config-surface.report"],
})

export const FoldKitConfigDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitConfigRecipeId,
  toRecipeId: FoldKitSchemaCatalogRecipeId,
  resource: FoldKitConfigResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitConfigRecipe = defineConfigRecipe({
  id: FoldKitConfigRecipeId,
  projectId: FoldKitProjectId,
  title: "Own FoldKit package and tool configuration",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: [
    FoldKitConfigRecipesSourcePath,
    "packages/attune/foldkit/package.json",
    "packages/attune/foldkit/project.json",
    "packages/attune/foldkit/tsconfig.json",
    "packages/attune/foldkit/vite.config.ts",
    "packages/attune/foldkit/vitest.config.ts",
  ],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitConfigResource],
  },
  handler: FoldKitConfigHandler,
  alchemyDag: [FoldKitConfigDagEdge],
})

export const FoldKitConfigRecipes = [FoldKitConfigRecipe] as const
