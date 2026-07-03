import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export type VariableId = `v${number}`
export type BindingPhase = "remote" | "flow" | "materialized" | "derived" | "evidence"

export type BoundLike = {
  readonly variable: string
  readonly bindingName: string
  readonly cpgqlName: string
  readonly phase: BindingPhase
}

export type BindingAst = {
  readonly _tag: "RemoteTraversalBinding" | "RemoteFlowBinding" | "MaterializedGraphBinding" | "GraphPassBinding"
  readonly variable: VariableId
  readonly name: string
  readonly cpgqlName: string
  readonly phase: BindingPhase
  readonly cpgql?: string
  readonly root?: VariableId
  readonly source?: VariableId
  readonly sink?: VariableId
  readonly relation?: "reachableBy" | "reachableByFlows"
  readonly filters?: readonly FlowFilterAst[]
  readonly includes?: readonly GraphIncludeAst[]
}

export type FlowFilterAst = {
  readonly _tag: "Where" | "WhereNot"
  readonly cpgql: string
}

export type GraphIncludeAst = {
  readonly _tag: "Path" | "Traversal" | "Nearest" | "Missing"
  readonly cpgql?: string
  readonly variable?: string
  readonly cpgqlName?: string
  readonly phase?: BindingPhase
}

const JoernEffectPureProgramModelLocalRecipeId = "joern-effect.pure.program.model" as const
const JoernEffectPureProgramModelLocalResourceId = "joern-effect.pure.program.model.resource" as const
const JoernEffectPureProgramModelLocalHandlerId = "joern-effect.pure.program.model.handler" as const
const JoernEffectPureProgramModelLocalSourcePath = "packages/attune/joern-effect/src/pure/program/model.ts" as const
const JoernEffectPureProgramModelLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureProgramModelLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureProgramModelLocalSourcePath),
})
export type JoernEffectPureProgramModelLocalRecipeInput = typeof JoernEffectPureProgramModelLocalRecipeInput.Type

export const JoernEffectPureProgramModelLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureProgramModelLocalSourcePath),
})
export type JoernEffectPureProgramModelLocalRecipeOutput = typeof JoernEffectPureProgramModelLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureProgramModelLocalResource = defineAlchemyResource({
  id: JoernEffectPureProgramModelLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureProgramModelLocalRecipeId,
  producedBy: [JoernEffectPureProgramModelLocalRecipeId],
  consumedBy: [JoernEffectPureProgramModelLocalRecipeId, JoernEffectPureProgramModelLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureProgramModelLocalRecipeInput as never,
  stateSchema: JoernEffectPureProgramModelLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureProgramModelLocalHandler = defineRecipeHandler<
  JoernEffectPureProgramModelLocalRecipeInput,
  JoernEffectPureProgramModelLocalRecipeOutput
>({
  id: JoernEffectPureProgramModelLocalHandlerId,
  recipeId: JoernEffectPureProgramModelLocalRecipeId,
  sourcePath: JoernEffectPureProgramModelLocalSourcePath,
  exportName: "JoernEffectPureProgramModelLocalRecipes",
  emitsReceipts: ["joern-effect.pure.program.model.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureProgramModelLocalRecipe = defineRecipe({
  id: JoernEffectPureProgramModelLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/program/model.ts as a file-local recipe",
  inputSchema: JoernEffectPureProgramModelLocalRecipeInput as never,
  outputSchema: JoernEffectPureProgramModelLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureProgramModelLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureProgramModelLocalRecipeInput as never,
    outputSchema: JoernEffectPureProgramModelLocalRecipeOutput as never,
    inputResources: [JoernEffectPureProgramModelLocalResource],
    outputResources: [JoernEffectPureProgramModelLocalResource],
  },
  handler: JoernEffectPureProgramModelLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureProgramModelLocalRecipeId,
      toRecipeId: JoernEffectPureProgramModelLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureProgramModelLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureProgramModelLocalRecipes = [JoernEffectPureProgramModelLocalRecipe] as const
