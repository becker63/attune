import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import type { FuzzerRunConfig } from "../domain/model.js"
import { emitFuzzEvent, flushFuzzTelemetry } from "./eventPayloads.js"
import { PropertyHarnessRuntime } from "../config/runtime.js"
import type { PropertyHarnessConfig } from "../config/runtime.js"

export interface FuzzTelemetryService {
  readonly emit: (
    config: Pick<FuzzerRunConfig, "target">,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ) => Effect.Effect<void>
  readonly flush: Effect.Effect<void>
}

export class FuzzTelemetry extends Context.Tag("attune/joern-effect-properties/fuzz/FuzzTelemetry")<
  FuzzTelemetry,
  FuzzTelemetryService
>() {}

export const makeFuzzTelemetry = (runtime: PropertyHarnessConfig): FuzzTelemetryService => ({
  emit: (config, eventType, payload) => emitFuzzEvent(runtime.eventRuntime, config, eventType, payload),
  flush: flushFuzzTelemetry(runtime.eventRuntime),
})

export const FuzzTelemetryLive: Layer.Layer<FuzzTelemetry, never, PropertyHarnessRuntime> = Layer.effect(
  FuzzTelemetry,
  PropertyHarnessRuntime.pipe(Effect.map(makeFuzzTelemetry)),
)

const JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId = "joern-effect-properties.fuzz.services.telemetry" as const
const JoernEffectPropertiesFuzzServicesTelemetryLocalResourceId = "joern-effect-properties.fuzz.services.telemetry.resource" as const
const JoernEffectPropertiesFuzzServicesTelemetryLocalHandlerId = "joern-effect-properties.fuzz.services.telemetry.handler" as const
const JoernEffectPropertiesFuzzServicesTelemetryLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/services/telemetry.ts" as const
const JoernEffectPropertiesFuzzServicesTelemetryLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesTelemetryLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput = typeof JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesTelemetryLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput = typeof JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzServicesTelemetryLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzServicesTelemetryLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId, JoernEffectPropertiesFuzzServicesTelemetryLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzServicesTelemetryLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput,
  JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzServicesTelemetryLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzServicesTelemetryLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzServicesTelemetryLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.services.telemetry.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzServicesTelemetryLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/services/telemetry.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzServicesTelemetryLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzServicesTelemetryLocalResource],
    outputResources: [JoernEffectPropertiesFuzzServicesTelemetryLocalResource],
  },
  handler: JoernEffectPropertiesFuzzServicesTelemetryLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzServicesTelemetryLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzServicesTelemetryLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzServicesTelemetryLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzServicesTelemetryLocalRecipes = [JoernEffectPropertiesFuzzServicesTelemetryLocalRecipe] as const
