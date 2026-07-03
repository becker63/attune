import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { semanticMutationRules } from "../services/mutator.js"

export type MutationTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

const mutationTags = (values: readonly string[]): readonly string[] => values

export const mutationTemplates: readonly MutationTemplate[] = semanticMutationRules.map((rule) => ({
  id: rule.kind,
  tags: mutationTags(["ts-morph", "mutation", rule.kind]),
  title: rule.description,
}))

const JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId = "joern-effect-properties.fuzz.templates.mutations" as const
const JoernEffectPropertiesFuzzTemplatesMutationsLocalResourceId = "joern-effect-properties.fuzz.templates.mutations.resource" as const
const JoernEffectPropertiesFuzzTemplatesMutationsLocalHandlerId = "joern-effect-properties.fuzz.templates.mutations.handler" as const
const JoernEffectPropertiesFuzzTemplatesMutationsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/mutations.ts" as const
const JoernEffectPropertiesFuzzTemplatesMutationsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesMutationsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesMutationsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesMutationsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesMutationsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId, JoernEffectPropertiesFuzzTemplatesMutationsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesMutationsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesMutationsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesMutationsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.mutations.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/mutations.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesMutationsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesMutationsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesMutationsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesMutationsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesMutationsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesMutationsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipes = [JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipe] as const
