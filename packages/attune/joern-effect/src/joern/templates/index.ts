import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./dangerous-call.js"
export * from "./generated/TemplateRegistry.generated.js"

const JoernEffectJoernTemplatesIndexLocalRecipeId = "joern-effect.joern.templates.index" as const
const JoernEffectJoernTemplatesIndexLocalResourceId = "joern-effect.joern.templates.index.resource" as const
const JoernEffectJoernTemplatesIndexLocalHandlerId = "joern-effect.joern.templates.index.handler" as const
const JoernEffectJoernTemplatesIndexLocalSourcePath = "packages/attune/joern-effect/src/joern/templates/index.ts" as const
const JoernEffectJoernTemplatesIndexLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectJoernTemplatesIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectJoernTemplatesIndexLocalSourcePath),
})
export type JoernEffectJoernTemplatesIndexLocalRecipeInput = typeof JoernEffectJoernTemplatesIndexLocalRecipeInput.Type

export const JoernEffectJoernTemplatesIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectJoernTemplatesIndexLocalSourcePath),
})
export type JoernEffectJoernTemplatesIndexLocalRecipeOutput = typeof JoernEffectJoernTemplatesIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectJoernTemplatesIndexLocalResource = defineAlchemyResource({
  id: JoernEffectJoernTemplatesIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectJoernTemplatesIndexLocalRecipeId,
  producedBy: [JoernEffectJoernTemplatesIndexLocalRecipeId],
  consumedBy: [JoernEffectJoernTemplatesIndexLocalRecipeId, JoernEffectJoernTemplatesIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectJoernTemplatesIndexLocalRecipeInput as never,
  stateSchema: JoernEffectJoernTemplatesIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectJoernTemplatesIndexLocalHandler = defineRecipeHandler<
  JoernEffectJoernTemplatesIndexLocalRecipeInput,
  JoernEffectJoernTemplatesIndexLocalRecipeOutput
>({
  id: JoernEffectJoernTemplatesIndexLocalHandlerId,
  recipeId: JoernEffectJoernTemplatesIndexLocalRecipeId,
  sourcePath: JoernEffectJoernTemplatesIndexLocalSourcePath,
  exportName: "JoernEffectJoernTemplatesIndexLocalRecipes",
  emitsReceipts: ["joern-effect.joern.templates.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectJoernTemplatesIndexLocalRecipe = defineRecipe({
  id: JoernEffectJoernTemplatesIndexLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/joern/templates/index.ts as a file-local recipe",
  inputSchema: JoernEffectJoernTemplatesIndexLocalRecipeInput as never,
  outputSchema: JoernEffectJoernTemplatesIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectJoernTemplatesIndexLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectJoernTemplatesIndexLocalRecipeInput as never,
    outputSchema: JoernEffectJoernTemplatesIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectJoernTemplatesIndexLocalResource],
    outputResources: [JoernEffectJoernTemplatesIndexLocalResource],
  },
  handler: JoernEffectJoernTemplatesIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectJoernTemplatesIndexLocalRecipeId,
      toRecipeId: JoernEffectJoernTemplatesIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectJoernTemplatesIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectJoernTemplatesIndexLocalRecipes = [JoernEffectJoernTemplatesIndexLocalRecipe] as const
