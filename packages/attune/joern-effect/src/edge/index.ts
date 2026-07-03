import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { JoernClientRuntimeRecipes } from "./runtime/Joern.js"
import { JoernServerLifecycleRecipes } from "./runtime/JoernServer.js"
import { JoernQueryRuntimeRecipes } from "./runtime/Query.js"
import { JoernEnvironmentConfigRecipes } from "./runtime/env.js"
import { JoernCpgqlEmitterRecipes } from "./runtime/emitCpgql.js"
import { JoernErrorTaxonomyRecipes } from "./runtime/errors.js"
import { JoernJsonValueSchemaRecipes } from "./runtime/json.js"
import { JoernPortAllocationRecipes } from "./runtime/ports.js"
import { JoernProcessRuntimeRecipes } from "./runtime/process.js"
import { JoernTransportRuntimeRecipes } from "./runtime/transport.js"

export { Joern, makeJoernClient } from "./runtime/Joern.js"
export { JoernDecodeError } from "./runtime/errors.js"
export { JsonObject, JsonValue, type JsonPrimitive } from "./runtime/json.js"
export { Query } from "./runtime/Query.js"
export { emitSelect, emitTraversal, escapeScalaString } from "./runtime/emitCpgql.js"
export { EnvVars, envFlagEnabled, readEnv, readEnvOr } from "./runtime/env.js"
export { acquireJoernServer, projectNameForRepo } from "./runtime/JoernServer.js"
export * from "./runtime/errors.js"
export { renderImportCode } from "./runtime/transport.js"
export type { JoernImportFrontend, JoernTransport } from "./runtime/transport.js"
export type { StartedProcess } from "./runtime/process.js"

export const JoernEdgeRuntimeRecipes = [
  ...JoernCpgqlEmitterRecipes,
  ...JoernJsonValueSchemaRecipes,
  ...JoernErrorTaxonomyRecipes,
  ...JoernEnvironmentConfigRecipes,
  ...JoernPortAllocationRecipes,
  ...JoernProcessRuntimeRecipes,
  ...JoernTransportRuntimeRecipes,
  ...JoernServerLifecycleRecipes,
  ...JoernQueryRuntimeRecipes,
  ...JoernClientRuntimeRecipes,
] as const

const JoernEffectEdgeIndexLocalRecipeId = "joern-effect.edge.index" as const
const JoernEffectEdgeIndexLocalResourceId = "joern-effect.edge.index.resource" as const
const JoernEffectEdgeIndexLocalHandlerId = "joern-effect.edge.index.handler" as const
const JoernEffectEdgeIndexLocalSourcePath = "packages/attune/joern-effect/src/edge/index.ts" as const
const JoernEffectEdgeIndexLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectEdgeIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectEdgeIndexLocalSourcePath),
})
export type JoernEffectEdgeIndexLocalRecipeInput = typeof JoernEffectEdgeIndexLocalRecipeInput.Type

export const JoernEffectEdgeIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectEdgeIndexLocalSourcePath),
})
export type JoernEffectEdgeIndexLocalRecipeOutput = typeof JoernEffectEdgeIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectEdgeIndexLocalResource = defineAlchemyResource({
  id: JoernEffectEdgeIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectEdgeIndexLocalRecipeId,
  producedBy: [JoernEffectEdgeIndexLocalRecipeId],
  consumedBy: [JoernEffectEdgeIndexLocalRecipeId, JoernEffectEdgeIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectEdgeIndexLocalRecipeInput as never,
  stateSchema: JoernEffectEdgeIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectEdgeIndexLocalHandler = defineRecipeHandler<
  JoernEffectEdgeIndexLocalRecipeInput,
  JoernEffectEdgeIndexLocalRecipeOutput
>({
  id: JoernEffectEdgeIndexLocalHandlerId,
  recipeId: JoernEffectEdgeIndexLocalRecipeId,
  sourcePath: JoernEffectEdgeIndexLocalSourcePath,
  exportName: "JoernEffectEdgeIndexLocalRecipes",
  emitsReceipts: ["joern-effect.edge.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectEdgeIndexLocalRecipe = defineRecipe({
  id: JoernEffectEdgeIndexLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/edge/index.ts as a file-local recipe",
  inputSchema: JoernEffectEdgeIndexLocalRecipeInput as never,
  outputSchema: JoernEffectEdgeIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectEdgeIndexLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectEdgeIndexLocalRecipeInput as never,
    outputSchema: JoernEffectEdgeIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectEdgeIndexLocalResource],
    outputResources: [JoernEffectEdgeIndexLocalResource],
  },
  handler: JoernEffectEdgeIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectEdgeIndexLocalRecipeId,
      toRecipeId: JoernEffectEdgeIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectEdgeIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectEdgeIndexLocalRecipes = [JoernEffectEdgeIndexLocalRecipe] as const
