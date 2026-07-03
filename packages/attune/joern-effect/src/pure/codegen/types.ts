import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import type { Cardinality } from "../builder/property.js"

export type RawSchema = {
  readonly version?: string
  readonly nodes?: readonly RawNode[]
  readonly nodeTypes?: readonly RawNode[]
  readonly properties?: readonly RawProperty[]
  readonly edges?: readonly RawEdge[]
}

export type RawNode = {
  readonly name?: string
  readonly label?: string
  readonly comment?: string
  readonly properties?: readonly (RawProperty | string)[]
}

export type RawProperty = {
  readonly name?: string
  readonly cpgName?: string
  readonly valueType?: string
  readonly type?: string
  readonly cardinality?: Cardinality | string
  readonly optional?: boolean
  readonly nullable?: boolean
  readonly comment?: string
}

export type RawEdge = {
  readonly label?: string
  readonly name?: string
  readonly from?: string
  readonly to?: string
  readonly comment?: string
}

export type NormalizedSchema = {
  readonly version: string
  readonly hash: string
  readonly nodes: readonly NormalizedNode[]
  readonly properties: readonly NormalizedProperty[]
  readonly edges: readonly NormalizedEdge[]
}

export type NormalizedNode = {
  readonly name: string
  readonly starterName: string
  readonly properties: readonly string[]
  readonly comment?: string
}

export type NormalizedProperty = {
  readonly cpgName: string
  readonly cpgql: string
  readonly exportName: string
  readonly valueType: string
  readonly nullable: boolean
  readonly cardinality: Cardinality
  readonly owners: readonly string[]
  readonly comment?: string
}

export type NormalizedEdge = {
  readonly label: string
  readonly from?: string
  readonly to?: string
  readonly comment?: string
}

const JoernEffectPureCodegenTypesLocalRecipeId = "joern-effect.pure.codegen.types" as const
const JoernEffectPureCodegenTypesLocalResourceId = "joern-effect.pure.codegen.types.resource" as const
const JoernEffectPureCodegenTypesLocalHandlerId = "joern-effect.pure.codegen.types.handler" as const
const JoernEffectPureCodegenTypesLocalSourcePath = "packages/attune/joern-effect/src/pure/codegen/types.ts" as const
const JoernEffectPureCodegenTypesLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureCodegenTypesLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureCodegenTypesLocalSourcePath),
})
export type JoernEffectPureCodegenTypesLocalRecipeInput = typeof JoernEffectPureCodegenTypesLocalRecipeInput.Type

export const JoernEffectPureCodegenTypesLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureCodegenTypesLocalSourcePath),
})
export type JoernEffectPureCodegenTypesLocalRecipeOutput = typeof JoernEffectPureCodegenTypesLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureCodegenTypesLocalResource = defineAlchemyResource({
  id: JoernEffectPureCodegenTypesLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureCodegenTypesLocalRecipeId,
  producedBy: [JoernEffectPureCodegenTypesLocalRecipeId],
  consumedBy: [JoernEffectPureCodegenTypesLocalRecipeId, JoernEffectPureCodegenTypesLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureCodegenTypesLocalRecipeInput as never,
  stateSchema: JoernEffectPureCodegenTypesLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureCodegenTypesLocalHandler = defineRecipeHandler<
  JoernEffectPureCodegenTypesLocalRecipeInput,
  JoernEffectPureCodegenTypesLocalRecipeOutput
>({
  id: JoernEffectPureCodegenTypesLocalHandlerId,
  recipeId: JoernEffectPureCodegenTypesLocalRecipeId,
  sourcePath: JoernEffectPureCodegenTypesLocalSourcePath,
  exportName: "JoernEffectPureCodegenTypesLocalRecipes",
  emitsReceipts: ["joern-effect.pure.codegen.types.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureCodegenTypesLocalRecipe = defineRecipe({
  id: JoernEffectPureCodegenTypesLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/codegen/types.ts as a file-local recipe",
  inputSchema: JoernEffectPureCodegenTypesLocalRecipeInput as never,
  outputSchema: JoernEffectPureCodegenTypesLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureCodegenTypesLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureCodegenTypesLocalRecipeInput as never,
    outputSchema: JoernEffectPureCodegenTypesLocalRecipeOutput as never,
    inputResources: [JoernEffectPureCodegenTypesLocalResource],
    outputResources: [JoernEffectPureCodegenTypesLocalResource],
  },
  handler: JoernEffectPureCodegenTypesLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureCodegenTypesLocalRecipeId,
      toRecipeId: JoernEffectPureCodegenTypesLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureCodegenTypesLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureCodegenTypesLocalRecipes = [JoernEffectPureCodegenTypesLocalRecipe] as const
