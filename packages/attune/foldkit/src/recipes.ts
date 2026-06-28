import {
  RecipeReceiptSchema,
  defineRecipe,
} from "@attune/framework-protocol"
import { Schema as S } from "effect"

import {
  ActivityItem,
  FoldkitPage,
  WorkThread,
} from "./schema.js"

export const RecipeReceiptReportInput = S.Struct({
  receipts: S.Array(RecipeReceiptSchema),
  activity: S.Array(ActivityItem),
  threads: S.Array(WorkThread),
})
export type RecipeReceiptReportInput = typeof RecipeReceiptReportInput.Type

export const FoldKitRecipeReport = S.Struct({
  page: FoldkitPage,
  receipts: S.Array(RecipeReceiptSchema),
  threads: S.Array(WorkThread),
})
export type FoldKitRecipeReport = typeof FoldKitRecipeReport.Type

export const FoldKitReportRecipes = [
  defineRecipe({
    id: "attune-foldkit.recipe-receipts-report",
    projectId: "attune-foldkit",
    title: "Project recipe receipts into FoldKit report",
    inputSchema: RecipeReceiptReportInput,
    outputSchema: FoldKitRecipeReport,
    nxTarget: "attune-foldkit:test",
    sourcePath: "packages/attune/foldkit/src/recipes.ts",
    allowedFiles: ["packages/attune/foldkit/src/**"],
    validationEvidence: ["attune-foldkit:test"],
  }),
] as const
