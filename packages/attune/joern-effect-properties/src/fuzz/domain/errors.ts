import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Data, Effect, Schema } from "effect"

export class FuzzConfigError extends Data.TaggedError("FuzzConfigError")<{
  readonly message: string
}> {}

export class FuzzPipelineError extends Data.TaggedError("FuzzPipelineError")<{
  readonly message: string
  readonly stage: string
}> {}

export class FuzzTemplateError extends Data.TaggedError("FuzzTemplateError")<{
  readonly message: string
  readonly templateId: string
}> {}

const JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId = "joern-effect-properties.fuzz.domain.errors" as const
const JoernEffectPropertiesFuzzDomainErrorsLocalResourceId = "joern-effect-properties.fuzz.domain.errors.resource" as const
const JoernEffectPropertiesFuzzDomainErrorsLocalHandlerId = "joern-effect-properties.fuzz.domain.errors.handler" as const
const JoernEffectPropertiesFuzzDomainErrorsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/domain/errors.ts" as const
const JoernEffectPropertiesFuzzDomainErrorsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzDomainErrorsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput = typeof JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzDomainErrorsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzDomainErrorsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzDomainErrorsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId, JoernEffectPropertiesFuzzDomainErrorsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzDomainErrorsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput,
  JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzDomainErrorsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzDomainErrorsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzDomainErrorsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.domain.errors.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzDomainErrorsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/domain/errors.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzDomainErrorsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzDomainErrorsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzDomainErrorsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzDomainErrorsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzDomainErrorsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzDomainErrorsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzDomainErrorsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzDomainErrorsLocalRecipes = [JoernEffectPropertiesFuzzDomainErrorsLocalRecipe] as const
