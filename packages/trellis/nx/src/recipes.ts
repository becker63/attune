import { defineRecipePackage } from "@attune/framework-protocol"

import { FrameworkNxProductionRecipes } from "./index.js"
import { FrameworkNxTestRecipes } from "./test-recipes.js"

export const FrameworkNxRecipes = [
  ...FrameworkNxProductionRecipes,
  ...FrameworkNxTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkNxRecipePackage = defineRecipePackage({
  packageId: "framework-nx",
  kind: "generator-tooling",
  title: "Trellis framework Nx recipe projection recipes",
  sourceRoot: "packages/trellis/nx/src",
  recipes: FrameworkNxRecipes,
  ownership: [
    {
      id: "framework-nx-projections",
      title: "Recipe public target projection, repair plan, and framework materialization source",
      files: ["packages/trellis/nx/src/index.ts"],
      recipeIds: FrameworkNxProductionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "framework-nx-test-source",
      title: "Framework Nx test recipe module and test evidence",
      files: [
        "packages/trellis/nx/src/test-recipes.ts",
        "packages/trellis/nx/test/**",
      ],
      recipeIds: FrameworkNxTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
