import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export { curatedSemanticProjectSeeds, curatedSemanticProjectSeeds as projectTemplates } from "../services/corpus.js"
export type { ProjectTemplate } from "../domain/model.js"

const JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId = "joern-effect-properties.fuzz.templates.projects" as const
const JoernEffectPropertiesFuzzTemplatesProjectsLocalResourceId = "joern-effect-properties.fuzz.templates.projects.resource" as const
const JoernEffectPropertiesFuzzTemplatesProjectsLocalHandlerId = "joern-effect-properties.fuzz.templates.projects.handler" as const
const JoernEffectPropertiesFuzzTemplatesProjectsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/projects.ts" as const
const JoernEffectPropertiesFuzzTemplatesProjectsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesProjectsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesProjectsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesProjectsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesProjectsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId, JoernEffectPropertiesFuzzTemplatesProjectsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesProjectsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesProjectsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesProjectsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.projects.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/projects.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesProjectsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesProjectsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesProjectsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesProjectsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesProjectsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesProjectsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipes = [JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipe] as const
