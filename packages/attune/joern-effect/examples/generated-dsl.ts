import { Effect, Schema } from "effect"
import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Joern, cpg, prop } from "joern-effect"

export const generatedDslInventory = Effect.gen(function* () {
  const joern = yield* Joern

  const typeMembers = yield* joern.query(
    cpg.typeDecl
      .fullName(/com\.example\..*/u)
      .member.name(/password|secret|token/iu)
      .dedup.select({
        type: prop.astParentFullName,
        member: prop.name,
        code: prop.code,
        line: prop.lineNumber,
      }),
  )

  const reachingDefinitions = yield* joern.query(
    cpg.call
      .name(/exec|spawn|eval/u)
      .argument.reachingDef
      .select({
        symbol: prop.name,
        code: prop.code,
        type: prop.typeFullName,
        line: prop.lineNumber,
      }),
  )

  return { typeMembers, reachingDefinitions }
})

const JoernEffectExampleGeneratedDslRecipeId = "joern-effect.examples.generated-dsl" as const
const JoernEffectExampleGeneratedDslResourceId = "joern-effect.examples.generated-dsl.resource" as const
const JoernEffectExampleGeneratedDslHandlerId = "joern-effect.examples.generated-dsl.handler" as const
const JoernEffectExampleGeneratedDslSourcePath = "packages/attune/joern-effect/examples/generated-dsl.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectExampleGeneratedDslInput = Schema.Struct({
  path: Schema.Literal(JoernEffectExampleGeneratedDslSourcePath),
})
export type JoernEffectExampleGeneratedDslInput = typeof JoernEffectExampleGeneratedDslInput.Type

export const JoernEffectExampleGeneratedDslOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectExampleGeneratedDslSourcePath),
})
export type JoernEffectExampleGeneratedDslOutput = typeof JoernEffectExampleGeneratedDslOutput.Type

export const JoernEffectExampleGeneratedDslResource = defineAlchemyResource({
  id: JoernEffectExampleGeneratedDslResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectExampleGeneratedDslRecipeId,
  producedBy: [JoernEffectExampleGeneratedDslRecipeId],
  consumedBy: [JoernEffectExampleGeneratedDslRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectExampleGeneratedDslInput as never,
  stateSchema: JoernEffectExampleGeneratedDslOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectExampleGeneratedDslHandler = defineRecipeHandler<
  JoernEffectExampleGeneratedDslInput,
  JoernEffectExampleGeneratedDslOutput
>({
  id: JoernEffectExampleGeneratedDslHandlerId,
  recipeId: JoernEffectExampleGeneratedDslRecipeId,
  sourcePath: JoernEffectExampleGeneratedDslSourcePath,
  exportName: "JoernEffectExampleGeneratedDslRecipes",
  emitsReceipts: ["joern-effect.examples.generated-dsl.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectExampleGeneratedDslRecipe = defineRecipe({
  id: JoernEffectExampleGeneratedDslRecipeId,
  projectId: "joern-effect",
  title: "Express generated-dsl example as a file-local recipe",
  inputSchema: JoernEffectExampleGeneratedDslInput as never,
  outputSchema: JoernEffectExampleGeneratedDslOutput as never,
  nxTarget: "joern-effect:typecheck",
  sourcePath: JoernEffectExampleGeneratedDslSourcePath,
  allowedFiles: [JoernEffectExampleGeneratedDslSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleGeneratedDslInput as never,
    outputSchema: JoernEffectExampleGeneratedDslOutput as never,
    inputResources: [JoernEffectExampleGeneratedDslResource],
    outputResources: [JoernEffectExampleGeneratedDslResource],
  },
  handler: JoernEffectExampleGeneratedDslHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleGeneratedDslRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleGeneratedDslResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectExampleGeneratedDslRecipes = [JoernEffectExampleGeneratedDslRecipe] as const
