import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { Query } from "../../edge/runtime/Query.js"

export const raw = <A>(cpgql: string, schema: Schema.Schema<A>): Query<A> =>
  new Query(cpgql, schema, { raw: true })

const JoernEffectPureBuilderRawLocalRecipeId = "joern-effect.pure.builder.raw" as const
const JoernEffectPureBuilderRawLocalResourceId = "joern-effect.pure.builder.raw.resource" as const
const JoernEffectPureBuilderRawLocalHandlerId = "joern-effect.pure.builder.raw.handler" as const
const JoernEffectPureBuilderRawLocalSourcePath = "packages/attune/joern-effect/src/pure/builder/raw.ts" as const
const JoernEffectPureBuilderRawLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureBuilderRawLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureBuilderRawLocalSourcePath),
})
export type JoernEffectPureBuilderRawLocalRecipeInput = typeof JoernEffectPureBuilderRawLocalRecipeInput.Type

export const JoernEffectPureBuilderRawLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureBuilderRawLocalSourcePath),
})
export type JoernEffectPureBuilderRawLocalRecipeOutput = typeof JoernEffectPureBuilderRawLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureBuilderRawLocalResource = defineAlchemyResource({
  id: JoernEffectPureBuilderRawLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureBuilderRawLocalRecipeId,
  producedBy: [JoernEffectPureBuilderRawLocalRecipeId],
  consumedBy: [JoernEffectPureBuilderRawLocalRecipeId, JoernEffectPureBuilderRawLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureBuilderRawLocalRecipeInput as never,
  stateSchema: JoernEffectPureBuilderRawLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureBuilderRawLocalHandler = defineRecipeHandler<
  JoernEffectPureBuilderRawLocalRecipeInput,
  JoernEffectPureBuilderRawLocalRecipeOutput
>({
  id: JoernEffectPureBuilderRawLocalHandlerId,
  recipeId: JoernEffectPureBuilderRawLocalRecipeId,
  sourcePath: JoernEffectPureBuilderRawLocalSourcePath,
  exportName: "JoernEffectPureBuilderRawLocalRecipes",
  emitsReceipts: ["joern-effect.pure.builder.raw.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureBuilderRawLocalRecipe = defineRecipe({
  id: JoernEffectPureBuilderRawLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/builder/raw.ts as a file-local recipe",
  inputSchema: JoernEffectPureBuilderRawLocalRecipeInput as never,
  outputSchema: JoernEffectPureBuilderRawLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureBuilderRawLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureBuilderRawLocalRecipeInput as never,
    outputSchema: JoernEffectPureBuilderRawLocalRecipeOutput as never,
    inputResources: [JoernEffectPureBuilderRawLocalResource],
    outputResources: [JoernEffectPureBuilderRawLocalResource],
  },
  handler: JoernEffectPureBuilderRawLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureBuilderRawLocalRecipeId,
      toRecipeId: JoernEffectPureBuilderRawLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureBuilderRawLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureBuilderRawLocalRecipes = [JoernEffectPureBuilderRawLocalRecipe] as const
