import { Effect } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"

import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceCommandResource,
  LanguageServiceProjectionInput,
  LanguageServiceWorkspaceResource,
} from "./contracts.js"

export const LanguageServiceTestRecipesSourcePath = "packages/trellis/language-service/src/test-recipes.ts" as const

const languageServiceTestSuiteHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.test-suite.handler",
  recipeId: "trellis-language-service.test-suite",
  sourcePath: LanguageServiceTestRecipesSourcePath,
  exportName: "LanguageServiceTestRecipes",
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceTestSuiteDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-surface",
  toRecipeId: "trellis-language-service.test-suite",
  resource: LanguageServiceCommandResource,
  kind: "validates",
  modes: ["check", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceTestSuiteRecipe = defineTestRecipe({
  id: "trellis-language-service.test-suite",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Own Trellis language-service CLI and framework tests",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [
    LanguageServiceTestRecipesSourcePath,
    "packages/trellis/language-service/test/**",
  ],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceTestSuiteHandler,
  alchemyDag: [languageServiceTestSuiteDag],
})

export const LanguageServiceTestRecipes = [LanguageServiceTestSuiteRecipe] as const
