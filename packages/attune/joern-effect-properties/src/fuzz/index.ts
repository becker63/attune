import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./config/presets.js"
export * from "./config/resources.js"
export * from "./config/runtime.js"
export * from "./domain/errors.js"
export * from "./domain/ids.js"
export * from "./domain/model.js"
export * from "./domain/project.js"
export * from "./templates/admissions.js"
export * from "./templates/feedback.js"
export * from "./templates/mutations.js"
export * from "./templates/projects.js"
export * from "./templates/queries.js"
export * from "./templates/workloads.js"
export * from "./templates/workspaces.js"
export * from "./pipeline/runner.js"
export * from "./pipeline/stage.js"
export * from "./pipeline/stages.js"
export * from "./services/admission.js"
export * from "./services/corpus.js"
export * from "./services/counterexamples.js"
export * from "./services/eventPayloads.js"
export * from "./services/expectations.js"
export * from "./services/mutator.js"
export * from "./services/oracle.js"
export * from "./services/queryFeedback.js"
export * from "./services/telemetry.js"
export * from "./services/workspacePool.js"
export * from "./cli/run.js"

const JoernEffectPropertiesFuzzIndexLocalRecipeId = "joern-effect-properties.fuzz.index" as const
const JoernEffectPropertiesFuzzIndexLocalResourceId = "joern-effect-properties.fuzz.index.resource" as const
const JoernEffectPropertiesFuzzIndexLocalHandlerId = "joern-effect-properties.fuzz.index.handler" as const
const JoernEffectPropertiesFuzzIndexLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/index.ts" as const
const JoernEffectPropertiesFuzzIndexLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzIndexLocalSourcePath),
})
export type JoernEffectPropertiesFuzzIndexLocalRecipeInput = typeof JoernEffectPropertiesFuzzIndexLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzIndexLocalSourcePath),
})
export type JoernEffectPropertiesFuzzIndexLocalRecipeOutput = typeof JoernEffectPropertiesFuzzIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzIndexLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzIndexLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzIndexLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzIndexLocalRecipeId, JoernEffectPropertiesFuzzIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzIndexLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzIndexLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzIndexLocalRecipeInput,
  JoernEffectPropertiesFuzzIndexLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzIndexLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzIndexLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzIndexLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzIndexLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzIndexLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzIndexLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/index.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzIndexLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzIndexLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzIndexLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzIndexLocalResource],
    outputResources: [JoernEffectPropertiesFuzzIndexLocalResource],
  },
  handler: JoernEffectPropertiesFuzzIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzIndexLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzIndexLocalRecipes = [JoernEffectPropertiesFuzzIndexLocalRecipe] as const
