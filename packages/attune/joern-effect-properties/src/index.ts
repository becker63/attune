import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./attuneProperty.js"
export * from "./coverageSearch.js"
export * from "./events.js"
export * from "./packageBoundaryProperty.js"
export * from "./SourceSinkPipeline.js"
export * from "./temp.js"
export * from "./workerProperty.js"
export * from "./fuzz/index.js"
export * from "./recipes.js"

const JoernEffectPropertiesIndexLocalRecipeId = "joern-effect-properties.index" as const
const JoernEffectPropertiesIndexLocalResourceId = "joern-effect-properties.index.resource" as const
const JoernEffectPropertiesIndexLocalHandlerId = "joern-effect-properties.index.handler" as const
const JoernEffectPropertiesIndexLocalSourcePath = "packages/attune/joern-effect-properties/src/index.ts" as const
const JoernEffectPropertiesIndexLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesIndexLocalSourcePath),
})
export type JoernEffectPropertiesIndexLocalRecipeInput = typeof JoernEffectPropertiesIndexLocalRecipeInput.Type

export const JoernEffectPropertiesIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesIndexLocalSourcePath),
})
export type JoernEffectPropertiesIndexLocalRecipeOutput = typeof JoernEffectPropertiesIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesIndexLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesIndexLocalRecipeId,
  producedBy: [JoernEffectPropertiesIndexLocalRecipeId],
  consumedBy: [JoernEffectPropertiesIndexLocalRecipeId, JoernEffectPropertiesIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesIndexLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesIndexLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesIndexLocalRecipeInput,
  JoernEffectPropertiesIndexLocalRecipeOutput
>({
  id: JoernEffectPropertiesIndexLocalHandlerId,
  recipeId: JoernEffectPropertiesIndexLocalRecipeId,
  sourcePath: JoernEffectPropertiesIndexLocalSourcePath,
  exportName: "JoernEffectPropertiesIndexLocalRecipes",
  emitsReceipts: ["joern-effect-properties.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesIndexLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesIndexLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/index.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesIndexLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesIndexLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesIndexLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesIndexLocalResource],
    outputResources: [JoernEffectPropertiesIndexLocalResource],
  },
  handler: JoernEffectPropertiesIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesIndexLocalRecipeId,
      toRecipeId: JoernEffectPropertiesIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesIndexLocalRecipes = [JoernEffectPropertiesIndexLocalRecipe] as const
