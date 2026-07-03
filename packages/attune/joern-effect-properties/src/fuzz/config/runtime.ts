import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Context, Layer, Effect, Schema } from "effect"
import { loadAxiomConfig } from "../../events.js"
import type { PropertyEventRuntime } from "../../events.js"

export type PropertyHarnessConfig = Readonly<{
  readonly eventRuntime: PropertyEventRuntime
  readonly workspaceRootPath?: string
  readonly workerCount: number
}>

export class PropertyHarnessRuntime extends Context.Tag(
  "attune/joern-effect-properties/fuzz/PropertyHarnessRuntime",
)<PropertyHarnessRuntime, PropertyHarnessConfig>() {}

export const makePropertyHarnessConfig = (
  input: Partial<PropertyHarnessConfig> & Readonly<{
    readonly localEvents?: boolean
    readonly runId?: string
    readonly workspaceRootPath?: string
    readonly workerCount?: number
  }> = {},
): PropertyHarnessConfig => {
  const axiom = loadAxiomConfig()
  const workspaceRootPath = input.workspaceRootPath?.trim()
  return {
    eventRuntime: input.eventRuntime ?? {
      ...(axiom === undefined ? {} : { axiom }),
      localEvents: input.localEvents ?? false,
      runId: input.runId ?? `joern-effect-property-${Date.now()}`,
    },
    ...(workspaceRootPath === undefined || workspaceRootPath.length === 0 ? {} : { workspaceRootPath }),
    workerCount: Math.max(1, Math.floor(input.workerCount ?? 2)),
  }
}

export const makePropertyHarnessRuntimeLayer = (
  input?: Parameters<typeof makePropertyHarnessConfig>[0],
): Layer.Layer<PropertyHarnessRuntime> =>
  Layer.succeed(PropertyHarnessRuntime, makePropertyHarnessConfig(input))

const JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId = "joern-effect-properties.fuzz.config.runtime" as const
const JoernEffectPropertiesFuzzConfigRuntimeLocalResourceId = "joern-effect-properties.fuzz.config.runtime.resource" as const
const JoernEffectPropertiesFuzzConfigRuntimeLocalHandlerId = "joern-effect-properties.fuzz.config.runtime.handler" as const
const JoernEffectPropertiesFuzzConfigRuntimeLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/config/runtime.ts" as const
const JoernEffectPropertiesFuzzConfigRuntimeLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzConfigRuntimeLocalSourcePath),
})
export type JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput = typeof JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzConfigRuntimeLocalSourcePath),
})
export type JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput = typeof JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzConfigRuntimeLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzConfigRuntimeLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId, JoernEffectPropertiesFuzzConfigRuntimeLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzConfigRuntimeLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput,
  JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzConfigRuntimeLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzConfigRuntimeLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzConfigRuntimeLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.config.runtime.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzConfigRuntimeLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/config/runtime.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzConfigRuntimeLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzConfigRuntimeLocalResource],
    outputResources: [JoernEffectPropertiesFuzzConfigRuntimeLocalResource],
  },
  handler: JoernEffectPropertiesFuzzConfigRuntimeLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzConfigRuntimeLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzConfigRuntimeLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzConfigRuntimeLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzConfigRuntimeLocalRecipes = [JoernEffectPropertiesFuzzConfigRuntimeLocalRecipe] as const
