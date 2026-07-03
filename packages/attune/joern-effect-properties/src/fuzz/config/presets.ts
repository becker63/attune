import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import type { FuzzerRunConfig, FuzzPreset, JoernExecutionMode } from "../domain/model.js"

export type FuzzPresetConfig = Readonly<{
  readonly batchCount: number
  readonly caseCount: number
  readonly joernMode: JoernExecutionMode
  readonly joernShardSize: number
  readonly maxMutators: number
  readonly mode: FuzzPreset
  readonly queryBudget: number
  readonly queryFeedback: boolean
}>

export const fuzzPresetConfigs: Readonly<Record<FuzzPreset, FuzzPresetConfig>> = {
  smoke: {
    batchCount: 1,
    caseCount: 25,
    joernMode: "none",
    joernShardSize: Number.MAX_SAFE_INTEGER,
    maxMutators: 4,
    mode: "smoke",
    queryBudget: 0,
    queryFeedback: false,
  },
  workbench: {
    batchCount: 1,
    caseCount: 40,
    joernMode: "query",
    joernShardSize: Number.MAX_SAFE_INTEGER,
    maxMutators: 5,
    mode: "workbench",
    queryBudget: 25,
    queryFeedback: true,
  },
  nightly: {
    batchCount: 120,
    caseCount: 80,
    joernMode: "query",
    joernShardSize: 40,
    maxMutators: 8,
    mode: "nightly",
    queryBudget: 75,
    queryFeedback: true,
  },
  campaign: {
    batchCount: 160,
    caseCount: 100,
    joernMode: "query",
    joernShardSize: 40,
    maxMutators: 10,
    mode: "campaign",
    queryBudget: 120,
    queryFeedback: true,
  },
}

export const configForPreset = (
  preset: FuzzPreset,
  input: Partial<FuzzerRunConfig> & Readonly<{ readonly seed?: number; readonly target?: string }> = {},
): FuzzerRunConfig => {
  const base = fuzzPresetConfigs[preset]
  return {
    batchCount: input.batchCount ?? base.batchCount,
    caseCount: input.caseCount ?? base.caseCount,
    joernMode: input.joernMode ?? base.joernMode,
    joernShardSize: input.joernShardSize ?? base.joernShardSize,
    maxMutators: input.maxMutators ?? base.maxMutators,
    mode: preset,
    queryBudget: input.queryBudget ?? base.queryBudget,
    queryFeedback: input.queryFeedback ?? base.queryFeedback,
    seed: input.seed ?? 1337,
    ...(input.seedIds === undefined ? {} : { seedIds: input.seedIds }),
    ...(input.syntaxFlavors === undefined ? {} : { syntaxFlavors: input.syntaxFlavors }),
    target: input.target ?? `joern-effect-properties:fuzz:${preset}`,
  }
}

const JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId = "joern-effect-properties.fuzz.config.presets" as const
const JoernEffectPropertiesFuzzConfigPresetsLocalResourceId = "joern-effect-properties.fuzz.config.presets.resource" as const
const JoernEffectPropertiesFuzzConfigPresetsLocalHandlerId = "joern-effect-properties.fuzz.config.presets.handler" as const
const JoernEffectPropertiesFuzzConfigPresetsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/config/presets.ts" as const
const JoernEffectPropertiesFuzzConfigPresetsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzConfigPresetsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput = typeof JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzConfigPresetsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzConfigPresetsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzConfigPresetsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId, JoernEffectPropertiesFuzzConfigPresetsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzConfigPresetsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput,
  JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzConfigPresetsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzConfigPresetsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzConfigPresetsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.config.presets.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzConfigPresetsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/config/presets.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzConfigPresetsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzConfigPresetsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzConfigPresetsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzConfigPresetsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzConfigPresetsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzConfigPresetsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzConfigPresetsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzConfigPresetsLocalRecipes = [JoernEffectPropertiesFuzzConfigPresetsLocalRecipe] as const
