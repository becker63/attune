import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export type AdmissionTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

const admissionTags = (values: readonly string[]): readonly string[] => values

export const admissionTemplates: readonly AdmissionTemplate[] = [
  {
    id: "oxc-module-parse",
    tags: admissionTags(["syntax", "admission", "oxc"]),
    title: "OXC module parser admission",
  },
]

const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId = "joern-effect-properties.fuzz.templates.admissions" as const
const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResourceId = "joern-effect-properties.fuzz.templates.admissions.resource" as const
const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalHandlerId = "joern-effect-properties.fuzz.templates.admissions.handler" as const
const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/admissions.ts" as const
const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId, JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.admissions.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/admissions.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesAdmissionsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipes = [JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipe] as const
