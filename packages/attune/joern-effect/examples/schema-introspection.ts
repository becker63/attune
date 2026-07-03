import { Effect, Schema } from "effect"
import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { generatedSchema, nodes, prop, traversalStepNames } from "joern-effect"

const propertyCountByNode = nodes
  .map((node) => ({
    node: node.name,
    starter: node.starterName,
    properties: node.properties.length,
  }))
  .toSorted((a, b) => b.properties - a.properties)

console.log("Generated schema:", generatedSchema)
console.log("Traversal steps:", traversalStepNames.length)
console.log("Properties:", Object.keys(prop).length)
console.table(propertyCountByNode.slice(0, 10))

const JoernEffectExampleSchemaIntrospectionRecipeId = "joern-effect.examples.schema-introspection" as const
const JoernEffectExampleSchemaIntrospectionResourceId = "joern-effect.examples.schema-introspection.resource" as const
const JoernEffectExampleSchemaIntrospectionHandlerId = "joern-effect.examples.schema-introspection.handler" as const
const JoernEffectExampleSchemaIntrospectionSourcePath = "packages/attune/joern-effect/examples/schema-introspection.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectExampleSchemaIntrospectionInput = Schema.Struct({
  path: Schema.Literal(JoernEffectExampleSchemaIntrospectionSourcePath),
})
export type JoernEffectExampleSchemaIntrospectionInput = typeof JoernEffectExampleSchemaIntrospectionInput.Type

export const JoernEffectExampleSchemaIntrospectionOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectExampleSchemaIntrospectionSourcePath),
})
export type JoernEffectExampleSchemaIntrospectionOutput = typeof JoernEffectExampleSchemaIntrospectionOutput.Type

export const JoernEffectExampleSchemaIntrospectionResource = defineAlchemyResource({
  id: JoernEffectExampleSchemaIntrospectionResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectExampleSchemaIntrospectionRecipeId,
  producedBy: [JoernEffectExampleSchemaIntrospectionRecipeId],
  consumedBy: [JoernEffectExampleSchemaIntrospectionRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectExampleSchemaIntrospectionInput as never,
  stateSchema: JoernEffectExampleSchemaIntrospectionOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectExampleSchemaIntrospectionHandler = defineRecipeHandler<
  JoernEffectExampleSchemaIntrospectionInput,
  JoernEffectExampleSchemaIntrospectionOutput
>({
  id: JoernEffectExampleSchemaIntrospectionHandlerId,
  recipeId: JoernEffectExampleSchemaIntrospectionRecipeId,
  sourcePath: JoernEffectExampleSchemaIntrospectionSourcePath,
  exportName: "JoernEffectExampleSchemaIntrospectionRecipes",
  emitsReceipts: ["joern-effect.examples.schema-introspection.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectExampleSchemaIntrospectionRecipe = defineRecipe({
  id: JoernEffectExampleSchemaIntrospectionRecipeId,
  projectId: "joern-effect",
  title: "Express schema-introspection example as a file-local recipe",
  inputSchema: JoernEffectExampleSchemaIntrospectionInput as never,
  outputSchema: JoernEffectExampleSchemaIntrospectionOutput as never,
  nxTarget: "joern-effect:typecheck",
  sourcePath: JoernEffectExampleSchemaIntrospectionSourcePath,
  allowedFiles: [JoernEffectExampleSchemaIntrospectionSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleSchemaIntrospectionInput as never,
    outputSchema: JoernEffectExampleSchemaIntrospectionOutput as never,
    inputResources: [JoernEffectExampleSchemaIntrospectionResource],
    outputResources: [JoernEffectExampleSchemaIntrospectionResource],
  },
  handler: JoernEffectExampleSchemaIntrospectionHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleSchemaIntrospectionRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleSchemaIntrospectionResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectExampleSchemaIntrospectionRecipes = [JoernEffectExampleSchemaIntrospectionRecipe] as const
