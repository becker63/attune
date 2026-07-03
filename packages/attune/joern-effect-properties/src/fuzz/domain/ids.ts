import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export const fuzzRunId = (prefix = "joern-effect-fuzz", now = Date.now()): string =>
  `${prefix}-${now}`

export const slugId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 96) || "id"

const JoernEffectPropertiesFuzzDomainIdsLocalRecipeId = "joern-effect-properties.fuzz.domain.ids" as const
const JoernEffectPropertiesFuzzDomainIdsLocalResourceId = "joern-effect-properties.fuzz.domain.ids.resource" as const
const JoernEffectPropertiesFuzzDomainIdsLocalHandlerId = "joern-effect-properties.fuzz.domain.ids.handler" as const
const JoernEffectPropertiesFuzzDomainIdsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/domain/ids.ts" as const
const JoernEffectPropertiesFuzzDomainIdsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzDomainIdsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput = typeof JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzDomainIdsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzDomainIdsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzDomainIdsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzDomainIdsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzDomainIdsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzDomainIdsLocalRecipeId, JoernEffectPropertiesFuzzDomainIdsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzDomainIdsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput,
  JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzDomainIdsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzDomainIdsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzDomainIdsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzDomainIdsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.domain.ids.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzDomainIdsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzDomainIdsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/domain/ids.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzDomainIdsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzDomainIdsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzDomainIdsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzDomainIdsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzDomainIdsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzDomainIdsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzDomainIdsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzDomainIdsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzDomainIdsLocalRecipes = [JoernEffectPropertiesFuzzDomainIdsLocalRecipe] as const
