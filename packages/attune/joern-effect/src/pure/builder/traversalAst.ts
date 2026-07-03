import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export type FilterValue =
  | string
  | number
  | boolean
  | RegExp
  | null
  | readonly (string | number | boolean | null)[]

export type TraversalSegment =
  | { readonly kind: "starter"; readonly name: string }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "step"; readonly name: string }
  | { readonly kind: "propertyFilter"; readonly property: string; readonly value: FilterValue }
  | { readonly kind: "whereRaw"; readonly predicate: string }
  | { readonly kind: "where"; readonly negated: boolean; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "repeat"; readonly segments: readonly TraversalSegment[]; readonly modifier?: RepeatModifier }
  | { readonly kind: "rawStep"; readonly cpgql: string }
  | { readonly kind: "operation"; readonly name: "dedup" | "take"; readonly value?: number }
  | {
      readonly kind: "filter"
      readonly name: "name" | "fullName"
      readonly value: string | RegExp
    }

export type RepeatModifier =
  | { readonly kind: "until"; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "maxDepth"; readonly depth: number }

const JoernEffectPureBuilderTraversalAstLocalRecipeId = "joern-effect.pure.builder.traversal-ast" as const
const JoernEffectPureBuilderTraversalAstLocalResourceId = "joern-effect.pure.builder.traversal-ast.resource" as const
const JoernEffectPureBuilderTraversalAstLocalHandlerId = "joern-effect.pure.builder.traversal-ast.handler" as const
const JoernEffectPureBuilderTraversalAstLocalSourcePath = "packages/attune/joern-effect/src/pure/builder/traversalAst.ts" as const
const JoernEffectPureBuilderTraversalAstLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureBuilderTraversalAstLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureBuilderTraversalAstLocalSourcePath),
})
export type JoernEffectPureBuilderTraversalAstLocalRecipeInput = typeof JoernEffectPureBuilderTraversalAstLocalRecipeInput.Type

export const JoernEffectPureBuilderTraversalAstLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureBuilderTraversalAstLocalSourcePath),
})
export type JoernEffectPureBuilderTraversalAstLocalRecipeOutput = typeof JoernEffectPureBuilderTraversalAstLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureBuilderTraversalAstLocalResource = defineAlchemyResource({
  id: JoernEffectPureBuilderTraversalAstLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureBuilderTraversalAstLocalRecipeId,
  producedBy: [JoernEffectPureBuilderTraversalAstLocalRecipeId],
  consumedBy: [JoernEffectPureBuilderTraversalAstLocalRecipeId, JoernEffectPureBuilderTraversalAstLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureBuilderTraversalAstLocalRecipeInput as never,
  stateSchema: JoernEffectPureBuilderTraversalAstLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureBuilderTraversalAstLocalHandler = defineRecipeHandler<
  JoernEffectPureBuilderTraversalAstLocalRecipeInput,
  JoernEffectPureBuilderTraversalAstLocalRecipeOutput
>({
  id: JoernEffectPureBuilderTraversalAstLocalHandlerId,
  recipeId: JoernEffectPureBuilderTraversalAstLocalRecipeId,
  sourcePath: JoernEffectPureBuilderTraversalAstLocalSourcePath,
  exportName: "JoernEffectPureBuilderTraversalAstLocalRecipes",
  emitsReceipts: ["joern-effect.pure.builder.traversal-ast.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureBuilderTraversalAstLocalRecipe = defineRecipe({
  id: JoernEffectPureBuilderTraversalAstLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/builder/traversalAst.ts as a file-local recipe",
  inputSchema: JoernEffectPureBuilderTraversalAstLocalRecipeInput as never,
  outputSchema: JoernEffectPureBuilderTraversalAstLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureBuilderTraversalAstLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureBuilderTraversalAstLocalRecipeInput as never,
    outputSchema: JoernEffectPureBuilderTraversalAstLocalRecipeOutput as never,
    inputResources: [JoernEffectPureBuilderTraversalAstLocalResource],
    outputResources: [JoernEffectPureBuilderTraversalAstLocalResource],
  },
  handler: JoernEffectPureBuilderTraversalAstLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureBuilderTraversalAstLocalRecipeId,
      toRecipeId: JoernEffectPureBuilderTraversalAstLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureBuilderTraversalAstLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureBuilderTraversalAstLocalRecipes = [JoernEffectPureBuilderTraversalAstLocalRecipe] as const
