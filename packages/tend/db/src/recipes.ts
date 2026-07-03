import { defineRecipePackage } from "@attune/framework-protocol"

import { TendDbConfigRecipes } from "./config-recipes.js"
import { TendDbProductionRecipes } from "./index.js"
import { TendDbTestRecipes } from "./test-recipes.js"

export const TendDbRecipes = [
  ...TendDbProductionRecipes,
  ...TendDbConfigRecipes,
  ...TendDbTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendDbRecipePackage = defineRecipePackage({
  packageId: "tend-db",
  kind: "agent-extension",
  title: "Tend DB runtime-boundary recipes",
  sourceRoot: "packages/tend/db/src",
  recipes: TendDbRecipes,
  ownership: [
    {
      id: "db-runtime-source",
      title: "Control spine and SQL validation runtime source",
      files: [
        "packages/tend/db/src/index.ts",
        "packages/tend/db/sql/0001_tend_control_spine.sql",
      ],
      recipeIds: TendDbProductionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "db-config",
      title: "Package configuration and target metadata",
      files: [
        "packages/tend/db/src/config-recipes.ts",
        "packages/tend/db/package.json",
        "packages/tend/db/tsconfig.json",
        "packages/tend/db/vitest.config.ts",
      ],
      recipeIds: TendDbConfigRecipes.map((recipe) => recipe.id),
    },
    {
      id: "db-test-source",
      title: "Test recipe module and DB test evidence",
      files: [
        "packages/tend/db/src/test-recipes.ts",
        "packages/tend/db/test/**",
      ],
      recipeIds: TendDbTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
