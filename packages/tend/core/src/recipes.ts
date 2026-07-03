import { defineRecipePackage } from "@attune/framework-protocol"

import { TendCoreConfigRecipes } from "./config-recipes.js"
import { TendCoreProductionRecipes } from "./index.js"
import { TendCoreTestRecipes } from "./test-recipes.js"

export const TendCoreRecipes = [
  ...TendCoreProductionRecipes,
  ...TendCoreConfigRecipes,
  ...TendCoreTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendCoreRecipePackage = defineRecipePackage({
  packageId: "tend-core",
  kind: "agent-extension",
  title: "Tend core receipt projection recipes",
  sourceRoot: "packages/tend/core/src",
  recipes: TendCoreRecipes,
  ownership: [
    {
      id: "core-receipt-source",
      title: "Event envelope and receipt projection source",
      files: [
        "packages/tend/core/src/index.ts",
      ],
      recipeIds: TendCoreProductionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "core-config",
      title: "Package configuration and target metadata",
      files: [
        "packages/tend/core/src/config-recipes.ts",
        "packages/tend/core/package.json",
        "packages/tend/core/project.json",
        "packages/tend/core/tsconfig.json",
        "packages/tend/core/vitest.config.ts",
      ],
      recipeIds: TendCoreConfigRecipes.map((recipe) => recipe.id),
    },
    {
      id: "core-test-source",
      title: "Test recipe module and test evidence",
      files: [
        "packages/tend/core/src/test-recipes.ts",
        "packages/tend/core/test/**",
      ],
      recipeIds: TendCoreTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
