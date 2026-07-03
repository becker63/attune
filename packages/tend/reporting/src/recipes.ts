import { defineRecipePackage } from "@attune/framework-protocol"

import { TendReportingProductionRecipes } from "./index.js"
import { TendReportingTestRecipes } from "./test-recipes.js"

export const TendReportRecipes = [
  ...TendReportingProductionRecipes,
  ...TendReportingTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendReportingRecipePackage = defineRecipePackage({
  packageId: "tend-reporting",
  kind: "agent-extension",
  title: "Tend receipt-derived reporting recipes",
  sourceRoot: "packages/tend/reporting/src",
  recipes: TendReportRecipes,
  ownership: [
    {
      id: "receipt-reporting",
      title: "Token report and markdown report source",
      files: [
        "packages/tend/reporting/src/index.ts",
        "packages/tend/reporting/src/test-recipes.ts",
        "packages/tend/reporting/test/**",
        "packages/tend/reporting/vitest.config.ts",
      ],
      recipeIds: TendReportRecipes.map((recipe) => recipe.id),
    },
  ],
})
