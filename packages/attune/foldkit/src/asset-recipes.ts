import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineAssetRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FoldKitAssetRecipeId,
  FoldKitEntryRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"

export const FoldKitAssetRecipesSourcePath =
  "packages/attune/foldkit/src/asset-recipes.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitAssetResource = defineAlchemyResource({
  id: "attune-foldkit.asset-surface.report",
  kind: "asset",
  alchemyType: "attune:resource:Asset",
  ownerRecipeId: FoldKitAssetRecipeId,
  producedBy: [FoldKitAssetRecipeId],
  consumedBy: [FoldKitEntryRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitAssetSurface = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitAssetRecipeId,
    sourcePath: FoldKitAssetRecipesSourcePath,
    surface: "FoldKit static HTML shell and stylesheet assets",
    exportedSymbols: ["FoldKitAssetRecipe"],
  })

export const FoldKitAssetHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.asset-surface.handler",
  recipeId: FoldKitAssetRecipeId,
  sourcePath: FoldKitAssetRecipesSourcePath,
  exportName: "describeFoldKitAssetSurface",
  handler: () => Effect.succeed(describeFoldKitAssetSurface()),
  emitsReceipts: ["attune-foldkit.asset-surface.report"],
})

export const FoldKitAssetDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitAssetRecipeId,
  toRecipeId: FoldKitEntryRecipeId,
  resource: FoldKitAssetResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

export const FoldKitAssetRecipe = defineAssetRecipe({
  id: FoldKitAssetRecipeId,
  projectId: FoldKitProjectId,
  title: "Own FoldKit browser shell assets",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [
    FoldKitAssetRecipesSourcePath,
    "packages/attune/foldkit/index.html",
    "packages/attune/foldkit/src/styles.css",
  ],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitAssetResource],
  },
  handler: FoldKitAssetHandler,
  alchemyDag: [FoldKitAssetDagEdge],
})

export const FoldKitAssetRecipes = [FoldKitAssetRecipe] as const
