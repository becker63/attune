import { defineRecipePackage } from "@attune/framework-protocol"

import { FoldKitActivityRecipes } from "./activity.js"
import { FoldKitAssetRecipes } from "./asset-recipes.js"
import { FoldKitConfigRecipes } from "./config-recipes.js"
import { FoldKitEntryRecipes } from "./entry.js"
import { FoldKitFixtureCommandRecipes } from "./fixture-commands.js"
import { FoldKitFixtureRouteRecipes } from "./fixture-route.js"
import { FoldKitFixtureTypesRecipes } from "./fixture-types.js"
import { FoldKitAppMdxFixtureRecipes } from "./fixtures/app-mdx-fixture.js"
import { FoldKitAppSiteFixtureRecipes } from "./fixtures/app-site-fixture.js"
import { FoldKitMdxViewFixtureRecipes } from "./fixtures/mdx-view-fixture.js"
import { FoldKitWorkbenchAtomFixtureRecipes } from "./fixtures/workbench-atom-fixture.js"
import { FoldKitMainRecipes } from "./main.js"
import { FoldKitMessageRecipes } from "./message.js"
import { FoldKitModelRecipes } from "./model.js"
import { FoldKitIndexRecipeId, FoldKitSchemaRecipes } from "./schema.js"
import { FoldKitTestRecipes } from "./test-recipes.js"
import { FoldKitUpdateRecipes } from "./update.js"
import { FoldKitViewRecipes } from "./view.js"

export const FoldKitReportRecipes = [
  ...FoldKitConfigRecipes,
  ...FoldKitSchemaRecipes,
  ...FoldKitActivityRecipes,
  ...FoldKitFixtureTypesRecipes,
  ...FoldKitWorkbenchAtomFixtureRecipes,
  ...FoldKitMdxViewFixtureRecipes,
  ...FoldKitAppMdxFixtureRecipes,
  ...FoldKitAppSiteFixtureRecipes,
  ...FoldKitFixtureRouteRecipes,
  ...FoldKitFixtureCommandRecipes,
  ...FoldKitMessageRecipes,
  ...FoldKitModelRecipes,
  ...FoldKitUpdateRecipes,
  ...FoldKitViewRecipes,
  ...FoldKitMainRecipes,
  ...FoldKitAssetRecipes,
  ...FoldKitEntryRecipes,
  ...FoldKitTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitRecipePackage = defineRecipePackage({
  packageId: "attune-foldkit",
  kind: "foldkit-ui",
  title: "FoldKit report and workbench projection recipes",
  sourceRoot: "packages/attune/foldkit/src",
  recipes: FoldKitReportRecipes,
  ownership: [
    {
      id: "foldkit-config-surface",
      title: "FoldKit package configuration surfaces",
      files: [
        "packages/attune/foldkit/src/config-recipes.ts",
        "packages/attune/foldkit/package.json",
        "packages/attune/foldkit/project.json",
        "packages/attune/foldkit/tsconfig.json",
        "packages/attune/foldkit/vite.config.ts",
        "packages/attune/foldkit/vitest.config.ts",
      ],
      recipeIds: FoldKitConfigRecipes.map((recipe) => recipe.id),
    },
    {
      id: "foldkit-schema-surface",
      title: "FoldKit schema and recipe-expression contracts",
      files: ["packages/attune/foldkit/src/schema.ts"],
      recipeIds: FoldKitSchemaRecipes.map((recipe) => recipe.id),
    },
    {
      id: "foldkit-activity-surface",
      title: "FoldKit activity and receipt report projection source",
      files: ["packages/attune/foldkit/src/activity.ts"],
      recipeIds: FoldKitActivityRecipes.map((recipe) => recipe.id),
    },
    {
      id: "foldkit-fixture-contracts",
      title: "FoldKit typed fixture contracts",
      files: ["packages/attune/foldkit/src/fixture-types.ts"],
      recipeIds: FoldKitFixtureTypesRecipes.map((recipe) => recipe.id),
    },
    {
      id: "foldkit-fixture-modules",
      title: "FoldKit route, site, MDX, and atom fixture modules",
      files: [
        "packages/attune/foldkit/src/fixtures/workbench-atom-fixture.ts",
        "packages/attune/foldkit/src/fixtures/mdx-view-fixture.ts",
        "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts",
        "packages/attune/foldkit/src/fixtures/app-site-fixture.ts",
      ],
      recipeIds: [
        ...FoldKitWorkbenchAtomFixtureRecipes.map((recipe) => recipe.id),
        ...FoldKitMdxViewFixtureRecipes.map((recipe) => recipe.id),
        ...FoldKitAppMdxFixtureRecipes.map((recipe) => recipe.id),
        ...FoldKitAppSiteFixtureRecipes.map((recipe) => recipe.id),
      ],
    },
    {
      id: "foldkit-runtime-route",
      title: "FoldKit fixture runtime and command invocation modules",
      files: [
        "packages/attune/foldkit/src/fixture-route.ts",
        "packages/attune/foldkit/src/fixture-commands.ts",
      ],
      recipeIds: [
        ...FoldKitFixtureRouteRecipes.map((recipe) => recipe.id),
        ...FoldKitFixtureCommandRecipes.map((recipe) => recipe.id),
      ],
    },
    {
      id: "foldkit-elm-loop",
      title: "FoldKit message, model, update, view, init, and entry modules",
      files: [
        "packages/attune/foldkit/src/message.ts",
        "packages/attune/foldkit/src/model.ts",
        "packages/attune/foldkit/src/update.ts",
        "packages/attune/foldkit/src/view.ts",
        "packages/attune/foldkit/src/main.ts",
        "packages/attune/foldkit/src/entry.ts",
      ],
      recipeIds: [
        ...FoldKitMessageRecipes.map((recipe) => recipe.id),
        ...FoldKitModelRecipes.map((recipe) => recipe.id),
        ...FoldKitUpdateRecipes.map((recipe) => recipe.id),
        ...FoldKitViewRecipes.map((recipe) => recipe.id),
        ...FoldKitMainRecipes.map((recipe) => recipe.id),
        ...FoldKitEntryRecipes.map((recipe) => recipe.id),
      ],
    },
    {
      id: "foldkit-public-api",
      title: "FoldKit public API barrel",
      files: ["packages/attune/foldkit/src/index.ts"],
      recipeIds: [FoldKitIndexRecipeId],
    },
    {
      id: "foldkit-assets",
      title: "FoldKit browser shell assets",
      files: [
        "packages/attune/foldkit/src/asset-recipes.ts",
        "packages/attune/foldkit/index.html",
        "packages/attune/foldkit/src/styles.css",
      ],
      recipeIds: FoldKitAssetRecipes.map((recipe) => recipe.id),
    },
    {
      id: "foldkit-tests",
      title: "FoldKit tests and fixture evidence",
      files: [
        "packages/attune/foldkit/src/test-recipes.ts",
        "packages/attune/foldkit/src/fixtures/**",
        "packages/attune/foldkit/test/**",
      ],
      recipeIds: FoldKitTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
