import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export const propertyTmpdir = (): string =>
  "/tmp"

export const makePropertyTempDir = (prefix = "joern-effect-property-"): string =>
  `${propertyTmpdir()}/${prefix}deterministic`

const JoernEffectPropertiesTempLocalRecipeId = "joern-effect-properties.temp" as const
const JoernEffectPropertiesTempLocalResourceId = "joern-effect-properties.temp.resource" as const
const JoernEffectPropertiesTempLocalHandlerId = "joern-effect-properties.temp.handler" as const
const JoernEffectPropertiesTempLocalSourcePath = "packages/attune/joern-effect-properties/src/temp.ts" as const
const JoernEffectPropertiesTempLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesTempLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesTempLocalSourcePath),
})
export type JoernEffectPropertiesTempLocalRecipeInput = typeof JoernEffectPropertiesTempLocalRecipeInput.Type

export const JoernEffectPropertiesTempLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesTempLocalSourcePath),
})
export type JoernEffectPropertiesTempLocalRecipeOutput = typeof JoernEffectPropertiesTempLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesTempLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesTempLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesTempLocalRecipeId,
  producedBy: [JoernEffectPropertiesTempLocalRecipeId],
  consumedBy: [JoernEffectPropertiesTempLocalRecipeId, JoernEffectPropertiesTempLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesTempLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesTempLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesTempLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesTempLocalRecipeInput,
  JoernEffectPropertiesTempLocalRecipeOutput
>({
  id: JoernEffectPropertiesTempLocalHandlerId,
  recipeId: JoernEffectPropertiesTempLocalRecipeId,
  sourcePath: JoernEffectPropertiesTempLocalSourcePath,
  exportName: "JoernEffectPropertiesTempLocalRecipes",
  emitsReceipts: ["joern-effect-properties.temp.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesTempLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesTempLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/temp.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesTempLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesTempLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesTempLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesTempLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesTempLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesTempLocalResource],
    outputResources: [JoernEffectPropertiesTempLocalResource],
  },
  handler: JoernEffectPropertiesTempLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesTempLocalRecipeId,
      toRecipeId: JoernEffectPropertiesTempLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesTempLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesTempLocalRecipes = [JoernEffectPropertiesTempLocalRecipe] as const
