import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export type FuzzStageId =
  | "load-corpus"
  | "plan-cases"
  | "apply-mutations"
  | "admit-projects"
  | "allocate-workspace"
  | "import-cpg"
  | "plan-queries"
  | "execute-queries"
  | "collect-evidence"
  | "emit-telemetry"

export type FuzzStage<I, O, E = unknown, R = never> = Readonly<{
  readonly id: FuzzStageId
  readonly title: string
  readonly run: (input: I) => Effect.Effect<O, E, R>
}>

export type FuzzStageDefinition = Readonly<{
  readonly id: FuzzStageId
  readonly title: string
  readonly description: string
}>

const JoernEffectPropertiesFuzzPipelineStageLocalRecipeId = "joern-effect-properties.fuzz.pipeline.stage" as const
const JoernEffectPropertiesFuzzPipelineStageLocalResourceId = "joern-effect-properties.fuzz.pipeline.stage.resource" as const
const JoernEffectPropertiesFuzzPipelineStageLocalHandlerId = "joern-effect-properties.fuzz.pipeline.stage.handler" as const
const JoernEffectPropertiesFuzzPipelineStageLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/pipeline/stage.ts" as const
const JoernEffectPropertiesFuzzPipelineStageLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzPipelineStageLocalSourcePath),
})
export type JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput = typeof JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzPipelineStageLocalSourcePath),
})
export type JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput = typeof JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzPipelineStageLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzPipelineStageLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzPipelineStageLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzPipelineStageLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzPipelineStageLocalRecipeId, JoernEffectPropertiesFuzzPipelineStageLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzPipelineStageLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput,
  JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzPipelineStageLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzPipelineStageLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzPipelineStageLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzPipelineStageLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.pipeline.stage.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzPipelineStageLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzPipelineStageLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/pipeline/stage.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzPipelineStageLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzPipelineStageLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzPipelineStageLocalResource],
    outputResources: [JoernEffectPropertiesFuzzPipelineStageLocalResource],
  },
  handler: JoernEffectPropertiesFuzzPipelineStageLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzPipelineStageLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzPipelineStageLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzPipelineStageLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzPipelineStageLocalRecipes = [JoernEffectPropertiesFuzzPipelineStageLocalRecipe] as const
