import { defineRecipePackage } from "@attune/framework-protocol"

import { FrameworkRuntimeAlchemyProviderRecipes } from "./alchemy.js"
import { FrameworkRuntimeConfigRecipes } from "./config-recipes.js"
import { LocalTimescaleManagedRecipe } from "./LocalTimescaleRecipe.js"
import { MeasurementObservationRecipes } from "./MeasurementObservation.js"
import { PostgresRecipeReceiptStoreRecipes } from "./PostgresRecipeReceiptStore.js"
import { ProgramDiagnosticsRecipes } from "./ProgramDiagnostics.js"
import { ProgramFactProjectionRecipes } from "./ProgramFactProjection.js"
import { ProgramFactQueryRecipes } from "./ProgramFactQuery.js"
import { ProgramFactRuntimeRecipes } from "./ProgramFactRuntime.js"
import { ProgramFactStoreRecipes } from "./ProgramFactStore.js"
import { RecipeReceiptStoreRecipes } from "./RecipeReceiptStore.js"
import { FrameworkRuntimeRecipeKernelRecipes } from "./RecipeKernel.js"
import { FrameworkRuntimeSqlRouteRecipes } from "./SqlRoute.js"
import { FrameworkRuntimeTestRecipes } from "./test-recipes.js"
import { LocalTimescaleCliInvocationRecipes } from "./internal/db/LocalTimescaleCli.js"

export const FrameworkRuntimeRecipes = [
  ...RecipeReceiptStoreRecipes,
  ...ProgramDiagnosticsRecipes,
  ...MeasurementObservationRecipes,
  ...PostgresRecipeReceiptStoreRecipes,
  ...LocalTimescaleCliInvocationRecipes,
  ...ProgramFactProjectionRecipes,
  ...ProgramFactQueryRecipes,
  ...ProgramFactRuntimeRecipes,
  ...ProgramFactStoreRecipes,
  ...FrameworkRuntimeAlchemyProviderRecipes,
  ...FrameworkRuntimeConfigRecipes,
  ...FrameworkRuntimeTestRecipes,
  ...FrameworkRuntimeRecipeKernelRecipes,
  ...FrameworkRuntimeSqlRouteRecipes,
  LocalTimescaleManagedRecipe,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeRecipePackage = defineRecipePackage({
  packageId: "framework-runtime",
  kind: "core-discovery-runtime",
  title: "Trellis framework runtime recipe spine recipes",
  sourceRoot: "packages/trellis/runtime/src",
  recipes: FrameworkRuntimeRecipes,
  ownership: [
    {
      id: "runtime-receipt-spine",
      title: "Recipe kernel, receipt store, local TimescaleDB, SQL route, and runtime DB boundary source",
      files: ["packages/trellis/runtime/src/**", "packages/trellis/runtime/sql/**"],
      recipeIds: FrameworkRuntimeRecipes.map((recipe) => recipe.id),
    },
  ],
})
