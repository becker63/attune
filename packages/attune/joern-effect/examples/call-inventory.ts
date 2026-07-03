import { Effect, Schema } from "effect"
import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Joern, cpg, prop } from "joern-effect"

export const callInventory = Effect.gen(function* () {
  const joern = yield* Joern

  const calls = yield* joern.query(
    cpg.call
      .dedup.take(100)
      .select({
        name: prop.name,
        method: prop.methodFullName,
        dispatch: prop.dispatchType,
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  return calls
})

const JoernEffectExampleCallInventoryRecipeId = "joern-effect.examples.call-inventory" as const
const JoernEffectExampleCallInventoryResourceId = "joern-effect.examples.call-inventory.resource" as const
const JoernEffectExampleCallInventoryHandlerId = "joern-effect.examples.call-inventory.handler" as const
const JoernEffectExampleCallInventorySourcePath = "packages/attune/joern-effect/examples/call-inventory.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectExampleCallInventoryInput = Schema.Struct({
  path: Schema.Literal(JoernEffectExampleCallInventorySourcePath),
})
export type JoernEffectExampleCallInventoryInput = typeof JoernEffectExampleCallInventoryInput.Type

export const JoernEffectExampleCallInventoryOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectExampleCallInventorySourcePath),
})
export type JoernEffectExampleCallInventoryOutput = typeof JoernEffectExampleCallInventoryOutput.Type

export const JoernEffectExampleCallInventoryResource = defineAlchemyResource({
  id: JoernEffectExampleCallInventoryResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectExampleCallInventoryRecipeId,
  producedBy: [JoernEffectExampleCallInventoryRecipeId],
  consumedBy: [JoernEffectExampleCallInventoryRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectExampleCallInventoryInput as never,
  stateSchema: JoernEffectExampleCallInventoryOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectExampleCallInventoryHandler = defineRecipeHandler<
  JoernEffectExampleCallInventoryInput,
  JoernEffectExampleCallInventoryOutput
>({
  id: JoernEffectExampleCallInventoryHandlerId,
  recipeId: JoernEffectExampleCallInventoryRecipeId,
  sourcePath: JoernEffectExampleCallInventorySourcePath,
  exportName: "JoernEffectExampleCallInventoryRecipes",
  emitsReceipts: ["joern-effect.examples.call-inventory.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectExampleCallInventoryRecipe = defineRecipe({
  id: JoernEffectExampleCallInventoryRecipeId,
  projectId: "joern-effect",
  title: "Express call-inventory example as a file-local recipe",
  inputSchema: JoernEffectExampleCallInventoryInput as never,
  outputSchema: JoernEffectExampleCallInventoryOutput as never,
  nxTarget: "joern-effect:typecheck",
  sourcePath: JoernEffectExampleCallInventorySourcePath,
  allowedFiles: [JoernEffectExampleCallInventorySourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleCallInventoryInput as never,
    outputSchema: JoernEffectExampleCallInventoryOutput as never,
    inputResources: [JoernEffectExampleCallInventoryResource],
    outputResources: [JoernEffectExampleCallInventoryResource],
  },
  handler: JoernEffectExampleCallInventoryHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleCallInventoryRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleCallInventoryResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectExampleCallInventoryRecipes = [JoernEffectExampleCallInventoryRecipe] as const
