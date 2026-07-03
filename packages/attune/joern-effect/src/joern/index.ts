import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./joern-template-executor.js"

const JoernEffectJoernIndexLocalRecipeId = "joern-effect.joern.index" as const
const JoernEffectJoernIndexLocalResourceId = "joern-effect.joern.index.resource" as const
const JoernEffectJoernIndexLocalHandlerId = "joern-effect.joern.index.handler" as const
const JoernEffectJoernIndexLocalSourcePath = "packages/attune/joern-effect/src/joern/index.ts" as const
const JoernEffectJoernIndexLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectJoernIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectJoernIndexLocalSourcePath),
})
export type JoernEffectJoernIndexLocalRecipeInput = typeof JoernEffectJoernIndexLocalRecipeInput.Type

export const JoernEffectJoernIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectJoernIndexLocalSourcePath),
})
export type JoernEffectJoernIndexLocalRecipeOutput = typeof JoernEffectJoernIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectJoernIndexLocalResource = defineAlchemyResource({
  id: JoernEffectJoernIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectJoernIndexLocalRecipeId,
  producedBy: [JoernEffectJoernIndexLocalRecipeId],
  consumedBy: [JoernEffectJoernIndexLocalRecipeId, JoernEffectJoernIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectJoernIndexLocalRecipeInput as never,
  stateSchema: JoernEffectJoernIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectJoernIndexLocalHandler = defineRecipeHandler<
  JoernEffectJoernIndexLocalRecipeInput,
  JoernEffectJoernIndexLocalRecipeOutput
>({
  id: JoernEffectJoernIndexLocalHandlerId,
  recipeId: JoernEffectJoernIndexLocalRecipeId,
  sourcePath: JoernEffectJoernIndexLocalSourcePath,
  exportName: "JoernEffectJoernIndexLocalRecipes",
  emitsReceipts: ["joern-effect.joern.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectJoernIndexLocalRecipe = defineRecipe({
  id: JoernEffectJoernIndexLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/joern/index.ts as a file-local recipe",
  inputSchema: JoernEffectJoernIndexLocalRecipeInput as never,
  outputSchema: JoernEffectJoernIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectJoernIndexLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectJoernIndexLocalRecipeInput as never,
    outputSchema: JoernEffectJoernIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectJoernIndexLocalResource],
    outputResources: [JoernEffectJoernIndexLocalResource],
  },
  handler: JoernEffectJoernIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectJoernIndexLocalRecipeId,
      toRecipeId: JoernEffectJoernIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectJoernIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectJoernIndexLocalRecipes = [JoernEffectJoernIndexLocalRecipe] as const
