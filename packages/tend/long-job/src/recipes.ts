import {
  defineRecipePackage,
  type RecipeInvocation,
} from "@attune/framework-protocol"

import { TendLongJobConfigRecipes } from "./config-recipes.js"
import {
  TendLongJobConfigRecipeId,
  TendLongJobProductionRecipes,
} from "./index.js"
import { TendLongJobTestRecipes } from "./test-recipes.js"

export const TendLongJobPackageCatalogSourcePath = "packages/tend/long-job/src/recipes.ts" as const

export const tendLongJobPackageCatalogInvocation = (): RecipeInvocation => ({
  recipeId: TendLongJobConfigRecipeId,
  action: "check",
  input: {
    packageRoot: "packages/tend/long-job",
    configPaths: [
      "packages/tend/long-job/src/recipes.ts",
      "packages/tend/long-job/src/config-recipes.ts",
      "packages/tend/long-job/package.json",
      "packages/tend/long-job/project.json",
      "packages/tend/long-job/tsconfig.json",
      "packages/tend/long-job/vitest.config.ts",
    ],
  },
  source: {
    surface: "nx",
    projectId: "tend-long-job",
    target: "tend-long-job:check",
  },
})

export const TendLongJobRecipes = [
  ...TendLongJobProductionRecipes,
  ...TendLongJobConfigRecipes,
  ...TendLongJobTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendLongJobRecipePackage = defineRecipePackage({
  packageId: "tend-long-job",
  kind: "agent-extension",
  title: "Tend long-job observation recipes",
  sourceRoot: "packages/tend/long-job/src",
  recipes: TendLongJobRecipes,
  ownership: [
    {
      id: "long-job-observation-source",
      title: "Long-job registry and wakeup projection source",
      files: [
        "packages/tend/long-job/src/index.ts",
      ],
      recipeIds: TendLongJobProductionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "long-job-config",
      title: "Package configuration and target metadata",
      files: [
        "packages/tend/long-job/src/config-recipes.ts",
        "packages/tend/long-job/package.json",
        "packages/tend/long-job/project.json",
        "packages/tend/long-job/tsconfig.json",
        "packages/tend/long-job/vitest.config.ts",
      ],
      recipeIds: TendLongJobConfigRecipes.map((recipe) => recipe.id),
    },
    {
      id: "long-job-test-source",
      title: "Test recipe module and long-job test evidence",
      files: [
        "packages/tend/long-job/src/test-recipes.ts",
        "packages/tend/long-job/test/**",
      ],
      recipeIds: TendLongJobTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
