import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Schema, Effect } from "effect"
import type { Property } from "./property.js"

// Heterogeneous selections carry each field's Property<A>; the index type has to
// admit all Property instantiations so SelectionResult can recover A per key.
export type Selection = Record<string, Property<any>>

export type SelectionResult<S extends Selection> = {
  readonly [K in keyof S]: S[K] extends Property<infer A> ? A : never
}

export const selectionSchema = <S extends Selection>(
  selection: S,
): Schema.Schema<ReadonlyArray<SelectionResult<S>>> => {
  const fields = Object.fromEntries(
    Object.entries(selection).map(([key, prop]) => [key, prop.schema]),
  )

  return Schema.Array(Schema.Struct(fields)) as Schema.Schema<
    ReadonlyArray<SelectionResult<S>>
  >
}

const JoernEffectPureBuilderSelectLocalRecipeId = "joern-effect.pure.builder.select" as const
const JoernEffectPureBuilderSelectLocalResourceId = "joern-effect.pure.builder.select.resource" as const
const JoernEffectPureBuilderSelectLocalHandlerId = "joern-effect.pure.builder.select.handler" as const
const JoernEffectPureBuilderSelectLocalSourcePath = "packages/attune/joern-effect/src/pure/builder/select.ts" as const
const JoernEffectPureBuilderSelectLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureBuilderSelectLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureBuilderSelectLocalSourcePath),
})
export type JoernEffectPureBuilderSelectLocalRecipeInput = typeof JoernEffectPureBuilderSelectLocalRecipeInput.Type

export const JoernEffectPureBuilderSelectLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureBuilderSelectLocalSourcePath),
})
export type JoernEffectPureBuilderSelectLocalRecipeOutput = typeof JoernEffectPureBuilderSelectLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureBuilderSelectLocalResource = defineAlchemyResource({
  id: JoernEffectPureBuilderSelectLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureBuilderSelectLocalRecipeId,
  producedBy: [JoernEffectPureBuilderSelectLocalRecipeId],
  consumedBy: [JoernEffectPureBuilderSelectLocalRecipeId, JoernEffectPureBuilderSelectLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureBuilderSelectLocalRecipeInput as never,
  stateSchema: JoernEffectPureBuilderSelectLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureBuilderSelectLocalHandler = defineRecipeHandler<
  JoernEffectPureBuilderSelectLocalRecipeInput,
  JoernEffectPureBuilderSelectLocalRecipeOutput
>({
  id: JoernEffectPureBuilderSelectLocalHandlerId,
  recipeId: JoernEffectPureBuilderSelectLocalRecipeId,
  sourcePath: JoernEffectPureBuilderSelectLocalSourcePath,
  exportName: "JoernEffectPureBuilderSelectLocalRecipes",
  emitsReceipts: ["joern-effect.pure.builder.select.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureBuilderSelectLocalRecipe = defineRecipe({
  id: JoernEffectPureBuilderSelectLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/builder/select.ts as a file-local recipe",
  inputSchema: JoernEffectPureBuilderSelectLocalRecipeInput as never,
  outputSchema: JoernEffectPureBuilderSelectLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureBuilderSelectLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureBuilderSelectLocalRecipeInput as never,
    outputSchema: JoernEffectPureBuilderSelectLocalRecipeOutput as never,
    inputResources: [JoernEffectPureBuilderSelectLocalResource],
    outputResources: [JoernEffectPureBuilderSelectLocalResource],
  },
  handler: JoernEffectPureBuilderSelectLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureBuilderSelectLocalRecipeId,
      toRecipeId: JoernEffectPureBuilderSelectLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureBuilderSelectLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureBuilderSelectLocalRecipes = [JoernEffectPureBuilderSelectLocalRecipe] as const
