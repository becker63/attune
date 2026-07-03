import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export type Cardinality = "one" | "zeroOrOne" | "list" | "zeroOrMore"

export type SelectCpgqlInput = Readonly<{
  readonly node: string
  readonly segments: readonly Readonly<{
    readonly kind: string
    readonly name?: string
  }>[]
}>

export type Property<A> = {
  readonly cpgName: string
  readonly cpgql: string
  readonly schema: Schema.Schema<A>
  readonly nullable: boolean
  readonly cardinality?: Cardinality
  readonly owners?: readonly string[]
  readonly selectCpgql?: (input: SelectCpgqlInput) => string
  readonly selectImports?: readonly string[]
  readonly debug?: unknown
}

export const property = <A>(def: Property<A>): Property<A> => def

const JoernEffectPureBuilderPropertyLocalRecipeId = "joern-effect.pure.builder.property" as const
const JoernEffectPureBuilderPropertyLocalResourceId = "joern-effect.pure.builder.property.resource" as const
const JoernEffectPureBuilderPropertyLocalHandlerId = "joern-effect.pure.builder.property.handler" as const
const JoernEffectPureBuilderPropertyLocalSourcePath = "packages/attune/joern-effect/src/pure/builder/property.ts" as const
const JoernEffectPureBuilderPropertyLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureBuilderPropertyLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureBuilderPropertyLocalSourcePath),
})
export type JoernEffectPureBuilderPropertyLocalRecipeInput = typeof JoernEffectPureBuilderPropertyLocalRecipeInput.Type

export const JoernEffectPureBuilderPropertyLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureBuilderPropertyLocalSourcePath),
})
export type JoernEffectPureBuilderPropertyLocalRecipeOutput = typeof JoernEffectPureBuilderPropertyLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureBuilderPropertyLocalResource = defineAlchemyResource({
  id: JoernEffectPureBuilderPropertyLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureBuilderPropertyLocalRecipeId,
  producedBy: [JoernEffectPureBuilderPropertyLocalRecipeId],
  consumedBy: [JoernEffectPureBuilderPropertyLocalRecipeId, JoernEffectPureBuilderPropertyLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureBuilderPropertyLocalRecipeInput as never,
  stateSchema: JoernEffectPureBuilderPropertyLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureBuilderPropertyLocalHandler = defineRecipeHandler<
  JoernEffectPureBuilderPropertyLocalRecipeInput,
  JoernEffectPureBuilderPropertyLocalRecipeOutput
>({
  id: JoernEffectPureBuilderPropertyLocalHandlerId,
  recipeId: JoernEffectPureBuilderPropertyLocalRecipeId,
  sourcePath: JoernEffectPureBuilderPropertyLocalSourcePath,
  exportName: "JoernEffectPureBuilderPropertyLocalRecipes",
  emitsReceipts: ["joern-effect.pure.builder.property.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureBuilderPropertyLocalRecipe = defineRecipe({
  id: JoernEffectPureBuilderPropertyLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/builder/property.ts as a file-local recipe",
  inputSchema: JoernEffectPureBuilderPropertyLocalRecipeInput as never,
  outputSchema: JoernEffectPureBuilderPropertyLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureBuilderPropertyLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureBuilderPropertyLocalRecipeInput as never,
    outputSchema: JoernEffectPureBuilderPropertyLocalRecipeOutput as never,
    inputResources: [JoernEffectPureBuilderPropertyLocalResource],
    outputResources: [JoernEffectPureBuilderPropertyLocalResource],
  },
  handler: JoernEffectPureBuilderPropertyLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureBuilderPropertyLocalRecipeId,
      toRecipeId: JoernEffectPureBuilderPropertyLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureBuilderPropertyLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureBuilderPropertyLocalRecipes = [JoernEffectPureBuilderPropertyLocalRecipe] as const
