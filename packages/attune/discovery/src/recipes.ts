import { defineRecipePackage } from "@attune/framework-protocol";
import { AttuneDiscoveryConfigRecipes } from "./config-recipes.js";
import { AttuneDiscoveryRecipes } from "./index.js";
import { AttuneDiscoveryReadModelRecipes } from "./memory/read-model.js";
import { AttuneDiscoveryProjectionRecipes } from "./projection/read-model-projection.js";
import { AttuneDiscoveryTestRecipes } from "./test-recipes.js";

export const createAttuneDiscoveryRecipes = () => [
  ...AttuneDiscoveryRecipes,
  ...AttuneDiscoveryReadModelRecipes,
  ...AttuneDiscoveryProjectionRecipes,
  ...AttuneDiscoveryConfigRecipes,
  ...AttuneDiscoveryTestRecipes,
] as const;

export const createAttuneDiscoveryRecipePackage = () => {
  const recipes = createAttuneDiscoveryRecipes();
// @attune-packet-target generated-runtime-projection eligible
  return defineRecipePackage({
    packageId: "attuned-discovery",
    kind: "core-discovery-runtime",
    title: "Attuned Discovery recipe package",
    sourceRoot: "packages/attune/discovery/src",
    recipes,
    ownership: [
      {
        id: "discovery-runtime",
        title: "Discovery file-local recipe modules and runtime source",
        files: [
          "packages/attune/discovery/src/index.ts",
          "packages/attune/discovery/src/memory/read-model.ts",
          "packages/attune/discovery/src/projection/read-model-projection.ts",
          "packages/attune/discovery/src/config-recipes.ts",
          "packages/attune/discovery/src/test-recipes.ts",
          "packages/attune/discovery/vitest.config.ts",
          "packages/attune/discovery/test/**",
        ],
        recipeIds: recipes.map((recipe) => recipe.id),
      },
    ],
  });
};
