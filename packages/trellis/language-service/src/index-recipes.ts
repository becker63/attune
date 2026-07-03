import { Effect } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceCommandResource,
  LanguageServiceProjectionInput,
  LanguageServiceWorkspaceResource,
} from "./contracts.js"

export const LanguageServiceIndexRecipesSourcePath = "packages/trellis/language-service/src/index-recipes.ts" as const

const languageServiceSourceSurfaceRecipeHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.source-surface.recipe-handler",
  recipeId: "trellis-language-service.source-surface",
  sourcePath: LanguageServiceIndexRecipesSourcePath,
  exportName: "LanguageServiceSourceSurfaceRecipes",
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceSourceSurfaceDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-surface",
  toRecipeId: "trellis-language-service.contracts",
  resource: LanguageServiceCommandResource,
  kind: "validates",
  modes: ["read"],
})

const languageServiceStableIdSurfaceDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-surface",
  toRecipeId: "trellis-language-service.stable-id-source",
  resource: LanguageServiceCommandResource,
  kind: "validates",
  modes: ["read"],
})

export const FrameworkLanguageServiceSourceSurfaceRecipe = defineRecipe({
  id: "trellis-language-service.source-surface",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Own Trellis language-service public barrel and source-surface helpers",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceIndexRecipesSourcePath,
  allowedFiles: [
    "packages/trellis/language-service/src/index.ts",
    LanguageServiceIndexRecipesSourcePath,
    "packages/trellis/language-service/vitest.config.ts",
  ],
  validationEvidence: ["framework-language-service:test", "framework-language-service:typecheck"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceSourceSurfaceRecipeHandler,
  alchemyDag: [
    languageServiceSourceSurfaceDag,
    languageServiceStableIdSurfaceDag,
  ],
})

export const LanguageServiceSourceSurfaceRecipes = [FrameworkLanguageServiceSourceSurfaceRecipe] as const
