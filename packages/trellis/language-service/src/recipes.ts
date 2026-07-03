import { defineRecipePackage } from "@attune/framework-protocol"

import { LanguageServiceCliInvocationRecipe, LanguageServiceReceiptObservationRecipe } from "./cli.js"
import { LanguageServiceCliCoreRecipes } from "./cli-core.js"
import { LanguageServiceContractRecipes } from "./contracts.js"
import { LanguageServiceDiagnosticRecipes } from "./diagnostic-recipes.js"
import { LanguageServiceFileAccountingRecipes } from "./file-accounting.js"
import { LanguageServiceStableIdRecipes } from "./ids.js"
import { LanguageServiceSourceSurfaceRecipes } from "./index-recipes.js"
import { LanguageServiceProjectLoaderRecipes } from "./project-loader.js"
import { LanguageServiceRepairRecipes } from "./repair-recipes.js"
import { LanguageServiceSourceExpressionRecipes } from "./source-expression.js"
import { LanguageServiceTestRecipes } from "./test-recipes.js"
import { LanguageServiceTextEditRecipes } from "./text-edits.js"
import { LanguageServiceUpstreamEffectRecipes } from "./upstream-effect/index.js"

export const FrameworkLanguageServiceRecipes = [
  ...LanguageServiceSourceSurfaceRecipes,
  ...LanguageServiceStableIdRecipes,
  ...LanguageServiceContractRecipes,
  ...LanguageServiceTestRecipes,
  ...LanguageServiceUpstreamEffectRecipes,
  LanguageServiceCliInvocationRecipe,
  ...LanguageServiceProjectLoaderRecipes,
  ...LanguageServiceRepairRecipes,
  ...LanguageServiceDiagnosticRecipes,
  ...LanguageServiceCliCoreRecipes,
  ...LanguageServiceTextEditRecipes,
  ...LanguageServiceFileAccountingRecipes,
  ...LanguageServiceSourceExpressionRecipes,
  LanguageServiceReceiptObservationRecipe,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkLanguageServiceRecipePackage = defineRecipePackage({
  packageId: "framework-language-service",
  kind: "framework-language-service",
  title: "Trellis language-service CLI and recipe-only migration engine",
  sourceRoot: "packages/trellis/language-service/src",
  recipes: FrameworkLanguageServiceRecipes,
  ownership: [
    {
      id: "language-service-source-surface",
      title: "Public barrel, stable IDs, contracts, and test ownership",
      files: [
        "packages/trellis/language-service/src/index.ts",
        "packages/trellis/language-service/src/ids.ts",
        "packages/trellis/language-service/src/contracts.ts",
        "packages/trellis/language-service/src/test-recipes.ts",
        "packages/trellis/language-service/test/**",
        "packages/trellis/language-service/vitest.config.ts",
      ],
      recipeIds: [
        ...LanguageServiceSourceSurfaceRecipes,
        ...LanguageServiceStableIdRecipes,
        ...LanguageServiceContractRecipes,
        ...LanguageServiceTestRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "language-service-invocation-projections",
      title: "CLI invocation and command projection modules",
      files: [
        "packages/trellis/language-service/src/cli.ts",
        "packages/trellis/language-service/src/cli-core.ts",
        "packages/trellis/language-service/src/text-edits.ts",
      ],
      recipeIds: [
        LanguageServiceCliInvocationRecipe,
        ...LanguageServiceCliCoreRecipes,
        ...LanguageServiceTextEditRecipes,
        LanguageServiceReceiptObservationRecipe,
      ].map((recipe) => recipe.id),
    },
    {
      id: "language-service-diagnostic-repair-pipeline",
      title: "Diagnostic, repair, file-accounting, and source-expression modules",
      files: [
        "packages/trellis/language-service/src/project-loader.ts",
        "packages/trellis/language-service/src/diagnostic-recipes.ts",
        "packages/trellis/language-service/src/repair-recipes.ts",
        "packages/trellis/language-service/src/file-accounting.ts",
        "packages/trellis/language-service/src/source-expression.ts",
        "packages/trellis/language-service/src/upstream-effect/**",
      ],
      recipeIds: [
        ...LanguageServiceProjectLoaderRecipes,
        ...LanguageServiceDiagnosticRecipes,
        ...LanguageServiceRepairRecipes,
        ...LanguageServiceFileAccountingRecipes,
        ...LanguageServiceSourceExpressionRecipes,
        ...LanguageServiceUpstreamEffectRecipes,
      ].map((recipe) => recipe.id),
    },
  ],
})
