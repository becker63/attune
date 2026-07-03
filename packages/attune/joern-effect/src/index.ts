import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./pure/index.js"
export * from "./edge/index.js"
export * from "./joern/templates/index.js"
export * from "./recipes.js"

const JoernEffectIndexLocalRecipeId = "joern-effect.index" as const
const JoernEffectIndexLocalResourceId = "joern-effect.index.resource" as const
const JoernEffectIndexLocalHandlerId = "joern-effect.index.handler" as const
const JoernEffectIndexLocalSourcePath = "packages/attune/joern-effect/src/index.ts" as const
const JoernEffectIndexLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectIndexLocalSourcePath),
})
export type JoernEffectIndexLocalRecipeInput = typeof JoernEffectIndexLocalRecipeInput.Type

export const JoernEffectIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectIndexLocalSourcePath),
})
export type JoernEffectIndexLocalRecipeOutput = typeof JoernEffectIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectIndexLocalResource = defineAlchemyResource({
  id: JoernEffectIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectIndexLocalRecipeId,
  producedBy: [JoernEffectIndexLocalRecipeId],
  consumedBy: [JoernEffectIndexLocalRecipeId, JoernEffectIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectIndexLocalRecipeInput as never,
  stateSchema: JoernEffectIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectIndexLocalHandler = defineRecipeHandler<
  JoernEffectIndexLocalRecipeInput,
  JoernEffectIndexLocalRecipeOutput
>({
  id: JoernEffectIndexLocalHandlerId,
  recipeId: JoernEffectIndexLocalRecipeId,
  sourcePath: JoernEffectIndexLocalSourcePath,
  exportName: "JoernEffectIndexLocalRecipes",
  emitsReceipts: ["joern-effect.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectIndexLocalRecipe = defineRecipe({
  id: JoernEffectIndexLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/index.ts as a file-local recipe",
  inputSchema: JoernEffectIndexLocalRecipeInput as never,
  outputSchema: JoernEffectIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectIndexLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectIndexLocalRecipeInput as never,
    outputSchema: JoernEffectIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectIndexLocalResource],
    outputResources: [JoernEffectIndexLocalResource],
  },
  handler: JoernEffectIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectIndexLocalRecipeId,
      toRecipeId: JoernEffectIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectIndexLocalRecipes = [JoernEffectIndexLocalRecipe] as const
