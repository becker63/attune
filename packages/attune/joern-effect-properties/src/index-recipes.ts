import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

import {
  FuzzerEvidencePipelineOutput,
  SemanticFuzzerRunInput,
} from "./recipe-contracts.js"

export const JoernEffectPropertiesIndexRecipesSourcePath =
  "packages/attune/joern-effect-properties/src/index-recipes.ts" as const
const joernFuzzerSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const
const joernFuzzerSourceSurfaceResourceId = "joern-effect-properties.source-surface.resource" as const
const joernFuzzerSourceSurfaceHandlerId = "joern-effect-properties.source-surface.handler" as const
const semanticCaseRecipeId = "joern-effect-properties.semantic-case" as const

// @attune-packet-target generated-runtime-projection eligible
export const JoernFuzzerSourceSurfaceResource = defineAlchemyResource({
  id: joernFuzzerSourceSurfaceResourceId,
  kind: "package-metadata",
  alchemyType: "attune:resource:PackageMetadata",
  ownerRecipeId: joernFuzzerSourceSurfaceRecipeId,
  producedBy: [joernFuzzerSourceSurfaceRecipeId],
  consumedBy: [
    joernFuzzerSourceSurfaceRecipeId,
    semanticCaseRecipeId,
  ],
  addressFields: ["seed"],
  addressSchema: SemanticFuzzerRunInput as never,
  stateSchema: FuzzerEvidencePipelineOutput as never,
  modes: ["read", "project", "check"],
})

export const JoernFuzzerSourceSurfaceHandler = defineRecipeHandler<
  SemanticFuzzerRunInput,
  FuzzerEvidencePipelineOutput
>({
  id: joernFuzzerSourceSurfaceHandlerId,
  recipeId: joernFuzzerSourceSurfaceRecipeId,
  sourcePath: JoernEffectPropertiesIndexRecipesSourcePath,
  exportName: "JoernFuzzerSourceSurfaceRecipes",
  emitsReceipts: ["joern-effect-properties.source-surface.projected"],
  handler: (input) =>
    Effect.succeed({
      admission: {
        accepted: true,
        caseId: "source-surface",
        diagnostics: [],
        files: [],
        projectId: "joern-effect-properties",
      },
      summary: {
        accepted: 0,
        cases: input.cases.length,
        mode: "smoke",
        rejected: 0,
        seed: input.seed,
      },
    }) as never,
})

export const JoernFuzzerSourceSurfaceRecipe = defineRecipe({
  id: joernFuzzerSourceSurfaceRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern property fuzzer source modules",
  inputSchema: SemanticFuzzerRunInput as never,
  outputSchema: FuzzerEvidencePipelineOutput as never,
  nxTarget: "joern-effect-properties:test",
  allowedFiles: [
    "packages/attune/joern-effect-properties/src/index.ts",
    "packages/attune/joern-effect-properties/src/index-recipes.ts",
    "packages/attune/joern-effect-properties/src/recipe-contracts.ts",
    "packages/attune/joern-effect-properties/src/fuzz/index.ts",
    "packages/attune/joern-effect-properties/vitest.config.ts",
  ],
  validationEvidence: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
  io: {
    inputSchema: SemanticFuzzerRunInput as never,
    outputSchema: FuzzerEvidencePipelineOutput as never,
    inputResources: [JoernFuzzerSourceSurfaceResource],
    outputResources: [JoernFuzzerSourceSurfaceResource],
  },
  handler: JoernFuzzerSourceSurfaceHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernFuzzerSourceSurfaceRecipeId,
      toRecipeId: semanticCaseRecipeId,
      resource: JoernFuzzerSourceSurfaceResource,
      kind: "validates",
      modes: ["read", "project", "check"],
    }),
  ],
})

export const JoernFuzzerSourceSurfaceRecipes = [JoernFuzzerSourceSurfaceRecipe] as const
