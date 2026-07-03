import { defineRecipePackage } from "@attune/framework-protocol"

import { TendTokenAuditProductionRecipes } from "./index.js"
import { TendTokenAuditTestRecipes } from "./test-recipes.js"

export const TendTokenAuditRecipes = [
  ...TendTokenAuditProductionRecipes,
  ...TendTokenAuditTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendTokenAuditRecipePackage = defineRecipePackage({
  packageId: "tend-token-audit",
  kind: "agent-extension",
  title: "Tend token audit receipt recipes",
  sourceRoot: "packages/tend/token-audit/src",
  recipes: TendTokenAuditRecipes,
  ownership: [
    {
      id: "token-audit",
      title: "Token metrics and compression metric source",
      files: [
        "packages/tend/token-audit/src/index.ts",
        "packages/tend/token-audit/src/test-recipes.ts",
        "packages/tend/token-audit/test/**",
        "packages/tend/token-audit/vitest.config.ts",
      ],
      recipeIds: TendTokenAuditRecipes.map((recipe) => recipe.id),
    },
  ],
})
