import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export type FeedbackTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

const feedbackTags = (values: readonly string[]): readonly string[] => values

export const feedbackTemplates: readonly FeedbackTemplate[] = [
  {
    id: "axiom-underexplored-query-feedback",
    tags: feedbackTags(["axiom", "query-selection", "feedback-guided"]),
    title: "Prefer underexplored generated query fingerprints",
  },
]

const JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId = "joern-effect-properties.fuzz.templates.feedback" as const
const JoernEffectPropertiesFuzzTemplatesFeedbackLocalResourceId = "joern-effect-properties.fuzz.templates.feedback.resource" as const
const JoernEffectPropertiesFuzzTemplatesFeedbackLocalHandlerId = "joern-effect-properties.fuzz.templates.feedback.handler" as const
const JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/feedback.ts" as const
const JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesFeedbackLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId, JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesFeedbackLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.feedback.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/feedback.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesFeedbackLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesFeedbackLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesFeedbackLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesFeedbackLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesFeedbackLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipes = [JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipe] as const
