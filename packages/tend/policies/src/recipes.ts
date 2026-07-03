import { defineRecipePackage } from "@attune/framework-protocol"

import { TendPolicyProductionRecipes } from "./index.js"
import { TendPolicyTestRecipes } from "./test-recipes.js"

export const TendPolicyRecipes = [
  ...TendPolicyProductionRecipes,
  ...TendPolicyTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendPolicyRecipePackage = defineRecipePackage({
  packageId: "tend-policies",
  kind: "agent-extension",
  title: "Tend policy and compression recipes",
  sourceRoot: "packages/tend/policies/src",
  recipes: TendPolicyRecipes,
  ownership: [
    {
      id: "policy-decisions",
      title: "Forcing policy, Magic Context, OpenRTK compression, and test source",
      files: [
        "packages/tend/policies/src/index.ts",
        "packages/tend/policies/src/test-recipes.ts",
        "packages/tend/policies/test/**",
        "packages/tend/policies/vitest.config.ts",
      ],
      recipeIds: TendPolicyRecipes.map((recipe) => recipe.id),
    },
  ],
})
