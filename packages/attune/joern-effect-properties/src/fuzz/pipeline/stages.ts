import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import type { FuzzStageDefinition } from "./stage.js"

export const fuzzPipelineStages: readonly FuzzStageDefinition[] = [
  {
    description: "Load curated and promoted project templates.",
    id: "load-corpus",
    title: "Load corpus",
  },
  {
    description: "Use FastCheck to plan project-level mutation cases.",
    id: "plan-cases",
    title: "Plan cases",
  },
  {
    description: "Apply ts-morph mutation templates to project templates.",
    id: "apply-mutations",
    title: "Apply mutations",
  },
  {
    description: "Parse and admit generated projects before Joern sees them.",
    id: "admit-projects",
    title: "Admit projects",
  },
  {
    description: "Allocate an isolated memory-backed workspace.",
    id: "allocate-workspace",
    title: "Allocate workspace",
  },
  {
    description: "Import admitted projects into Joern CPGs.",
    id: "import-cpg",
    title: "Import CPG",
  },
  {
    description: "Select DSL query templates with optional Axiom feedback.",
    id: "plan-queries",
    title: "Plan queries",
  },
  {
    description: "Compile and execute generated Joern DSL programs.",
    id: "execute-queries",
    title: "Execute queries",
  },
  {
    description: "Collect row, graphology, findings, and protocol evidence.",
    id: "collect-evidence",
    title: "Collect evidence",
  },
  {
    description: "Emit structured property events and OTLP/Axiom telemetry.",
    id: "emit-telemetry",
    title: "Emit telemetry",
  },
]

const JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId = "joern-effect-properties.fuzz.pipeline.stages" as const
const JoernEffectPropertiesFuzzPipelineStagesLocalResourceId = "joern-effect-properties.fuzz.pipeline.stages.resource" as const
const JoernEffectPropertiesFuzzPipelineStagesLocalHandlerId = "joern-effect-properties.fuzz.pipeline.stages.handler" as const
const JoernEffectPropertiesFuzzPipelineStagesLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/pipeline/stages.ts" as const
const JoernEffectPropertiesFuzzPipelineStagesLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzPipelineStagesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput = typeof JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzPipelineStagesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput = typeof JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzPipelineStagesLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzPipelineStagesLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId, JoernEffectPropertiesFuzzPipelineStagesLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzPipelineStagesLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput,
  JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzPipelineStagesLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzPipelineStagesLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzPipelineStagesLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.pipeline.stages.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzPipelineStagesLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/pipeline/stages.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzPipelineStagesLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzPipelineStagesLocalResource],
    outputResources: [JoernEffectPropertiesFuzzPipelineStagesLocalResource],
  },
  handler: JoernEffectPropertiesFuzzPipelineStagesLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzPipelineStagesLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzPipelineStagesLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzPipelineStagesLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzPipelineStagesLocalRecipes = [JoernEffectPropertiesFuzzPipelineStagesLocalRecipe] as const
