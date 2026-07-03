import { createHash } from "node:crypto"

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

export const LanguageServiceStableIdSourcePath = "packages/trellis/language-service/src/ids.ts" as const

export const stableTrellisLsId = (
  prefix: "diag" | "fix" | "packet",
  parts: readonly unknown[],
): string => {
  const hash = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("base64url")
    .slice(0, 24)

  return `${prefix}_${hash}`
}

const languageServiceStableIdHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.stable-id-source.handler",
  recipeId: "trellis-language-service.stable-id-source",
  sourcePath: LanguageServiceStableIdSourcePath,
  exportName: "stableTrellisLsId",
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceStableIdDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-surface",
  toRecipeId: "trellis-language-service.stable-id-source",
  resource: LanguageServiceCommandResource,
  kind: "validates",
  modes: ["read"],
})

export const LanguageServiceStableIdRecipe = defineRecipe({
  id: "trellis-language-service.stable-id-source",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Own stable Trellis language-service diagnostic, fix, and packet IDs",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceStableIdSourcePath,
  allowedFiles: [LanguageServiceStableIdSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceStableIdHandler,
  alchemyDag: [languageServiceStableIdDag],
})

export const LanguageServiceStableIdRecipes = [LanguageServiceStableIdRecipe] as const
