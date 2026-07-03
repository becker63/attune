import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

export const JoernEffectIndexRecipesSourcePath = "packages/attune/joern-effect/src/index-recipes.ts" as const
const joernSourceSurfaceRecipeId = "joern-effect.source-surface" as const
const joernCpgqlEmitterRecipeId = "joern-effect.cpgql-emitter" as const

export const JoernSourceSurfaceInput = Schema.Struct({
  packageRoot: Schema.optional(Schema.String),
})
export type JoernSourceSurfaceInput = typeof JoernSourceSurfaceInput.Type

export const JoernSourceSurfaceOutput = Schema.Struct({
  packageId: Schema.Literal("joern-effect"),
  exportedSurfaceCount: Schema.Number,
})
export type JoernSourceSurfaceOutput = typeof JoernSourceSurfaceOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernSourceSurfaceResource = defineAlchemyResource({
  id: "joern-effect.source-surface.resource",
  kind: "package-metadata",
  alchemyType: "attune:resource:PackageMetadata",
  ownerRecipeId: joernSourceSurfaceRecipeId,
  producedBy: [joernSourceSurfaceRecipeId],
  consumedBy: [joernSourceSurfaceRecipeId, joernCpgqlEmitterRecipeId],
  addressFields: ["packageRoot"],
  addressSchema: JoernSourceSurfaceInput as never,
  stateSchema: JoernSourceSurfaceOutput as never,
  modes: ["read", "project", "check"],
})

export const JoernSourceSurfaceHandler = defineRecipeHandler<
  JoernSourceSurfaceInput,
  JoernSourceSurfaceOutput
>({
  id: "joern-effect.source-surface.handler",
  recipeId: joernSourceSurfaceRecipeId,
  sourcePath: JoernEffectIndexRecipesSourcePath,
  exportName: "JoernSourceSurfaceRecipes",
  emitsReceipts: ["joern.source-surface.projected"],
  handler: () =>
    Effect.succeed({
      packageId: "joern-effect",
      exportedSurfaceCount: 4,
    }) as never,
})

export const JoernSourceSurfaceRecipe = defineRecipe({
  id: joernSourceSurfaceRecipeId,
  projectId: "joern-effect",
  title: "Own Joern Effect public barrel and source-surface helpers",
  inputSchema: JoernSourceSurfaceInput as never,
  outputSchema: JoernSourceSurfaceOutput as never,
  allowedFiles: [
    "packages/attune/joern-effect/src/index.ts",
    JoernEffectIndexRecipesSourcePath,
    "packages/attune/joern-effect/src/edge/index.ts",
    "packages/attune/joern-effect/src/joern/index.ts",
    "packages/attune/joern-effect/src/pure/index.ts",
    "packages/attune/joern-effect/vitest.config.ts",
  ],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernSourceSurfaceInput as never,
    outputSchema: JoernSourceSurfaceOutput as never,
    inputResources: [JoernSourceSurfaceResource],
    outputResources: [JoernSourceSurfaceResource],
  },
  handler: JoernSourceSurfaceHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernSourceSurfaceRecipeId,
      toRecipeId: joernCpgqlEmitterRecipeId,
      resource: JoernSourceSurfaceResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernSourceSurfaceRecipes = [JoernSourceSurfaceRecipe] as const
