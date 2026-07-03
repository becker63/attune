import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Schema, Effect } from "effect"
import type { RecipeRepair } from "@attune/framework-protocol"

import {
  SemanticAdmissionResult,
  SemanticCase,
  SemanticMutationStep,
  SemanticRunSummary,
} from "./fuzz/domain/model.js"

const fuzzerWorkerDriftRisk = "needs-review" as const

export const SemanticFuzzerRunInput = Schema.Struct({
  seed: Schema.Number,
  cases: Schema.Array(SemanticCase),
  mutations: Schema.Array(SemanticMutationStep),
})
export type SemanticFuzzerRunInput = typeof SemanticFuzzerRunInput.Type

export const FuzzerEvidencePipelineOutput = Schema.Struct({
  admission: SemanticAdmissionResult,
  summary: SemanticRunSummary,
})
export type FuzzerEvidencePipelineOutput = typeof FuzzerEvidencePipelineOutput.Type

export const fuzzerWorkerDriftRepair: RecipeRepair = {
  repairId: "recipe-repair:joern-effect-properties.worker-fuzzer:drift",
  recipeId: "joern-effect-properties.worker-fuzzer",
  title: "Repair Joern fuzzer worker/runtime drift",
  kind: "managed-lifecycle",
  nxTarget: "joern-effect-properties:repair",
  allowedFiles: ["packages/attune/joern-effect-properties/**"],
  risk: fuzzerWorkerDriftRisk,
  evidenceRequirements: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
}

const JoernEffectPropertiesRecipeContractsLocalRecipeId = "joern-effect-properties.recipe-contracts" as const
const JoernEffectPropertiesRecipeContractsLocalResourceId = "joern-effect-properties.recipe-contracts.resource" as const
const JoernEffectPropertiesRecipeContractsLocalHandlerId = "joern-effect-properties.recipe-contracts.handler" as const
const JoernEffectPropertiesRecipeContractsLocalSourcePath = "packages/attune/joern-effect-properties/src/recipe-contracts.ts" as const
const JoernEffectPropertiesRecipeContractsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesRecipeContractsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesRecipeContractsLocalSourcePath),
})
export type JoernEffectPropertiesRecipeContractsLocalRecipeInput = typeof JoernEffectPropertiesRecipeContractsLocalRecipeInput.Type

export const JoernEffectPropertiesRecipeContractsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesRecipeContractsLocalSourcePath),
})
export type JoernEffectPropertiesRecipeContractsLocalRecipeOutput = typeof JoernEffectPropertiesRecipeContractsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesRecipeContractsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesRecipeContractsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesRecipeContractsLocalRecipeId,
  producedBy: [JoernEffectPropertiesRecipeContractsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesRecipeContractsLocalRecipeId, JoernEffectPropertiesRecipeContractsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesRecipeContractsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesRecipeContractsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesRecipeContractsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesRecipeContractsLocalRecipeInput,
  JoernEffectPropertiesRecipeContractsLocalRecipeOutput
>({
  id: JoernEffectPropertiesRecipeContractsLocalHandlerId,
  recipeId: JoernEffectPropertiesRecipeContractsLocalRecipeId,
  sourcePath: JoernEffectPropertiesRecipeContractsLocalSourcePath,
  exportName: "JoernEffectPropertiesRecipeContractsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.recipe-contracts.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesRecipeContractsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesRecipeContractsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/recipe-contracts.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesRecipeContractsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesRecipeContractsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesRecipeContractsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesRecipeContractsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesRecipeContractsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesRecipeContractsLocalResource],
    outputResources: [JoernEffectPropertiesRecipeContractsLocalResource],
  },
  handler: JoernEffectPropertiesRecipeContractsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesRecipeContractsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesRecipeContractsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesRecipeContractsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesRecipeContractsLocalRecipes = [JoernEffectPropertiesRecipeContractsLocalRecipe] as const
