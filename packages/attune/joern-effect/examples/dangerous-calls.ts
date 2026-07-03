import { Effect, Schema } from "effect"
import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Joern, cpg, prop } from "joern-effect"

export const dangerousCalls = Effect.gen(function* () {
  const joern = yield* Joern

  const findings = yield* joern.query(
    cpg.method
      .name("handleRequest")
      .call.name(/exec|spawn|eval/u)
      .select({
        method: prop.methodFullName,
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  // findings is inferred from the selected properties.
  return findings
})

const JoernEffectExampleDangerousCallsRecipeId = "joern-effect.examples.dangerous-calls" as const
const JoernEffectExampleDangerousCallsResourceId = "joern-effect.examples.dangerous-calls.resource" as const
const JoernEffectExampleDangerousCallsHandlerId = "joern-effect.examples.dangerous-calls.handler" as const
const JoernEffectExampleDangerousCallsSourcePath = "packages/attune/joern-effect/examples/dangerous-calls.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectExampleDangerousCallsInput = Schema.Struct({
  path: Schema.Literal(JoernEffectExampleDangerousCallsSourcePath),
})
export type JoernEffectExampleDangerousCallsInput = typeof JoernEffectExampleDangerousCallsInput.Type

export const JoernEffectExampleDangerousCallsOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectExampleDangerousCallsSourcePath),
})
export type JoernEffectExampleDangerousCallsOutput = typeof JoernEffectExampleDangerousCallsOutput.Type

export const JoernEffectExampleDangerousCallsResource = defineAlchemyResource({
  id: JoernEffectExampleDangerousCallsResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectExampleDangerousCallsRecipeId,
  producedBy: [JoernEffectExampleDangerousCallsRecipeId],
  consumedBy: [JoernEffectExampleDangerousCallsRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectExampleDangerousCallsInput as never,
  stateSchema: JoernEffectExampleDangerousCallsOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectExampleDangerousCallsHandler = defineRecipeHandler<
  JoernEffectExampleDangerousCallsInput,
  JoernEffectExampleDangerousCallsOutput
>({
  id: JoernEffectExampleDangerousCallsHandlerId,
  recipeId: JoernEffectExampleDangerousCallsRecipeId,
  sourcePath: JoernEffectExampleDangerousCallsSourcePath,
  exportName: "JoernEffectExampleDangerousCallsRecipes",
  emitsReceipts: ["joern-effect.examples.dangerous-calls.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectExampleDangerousCallsRecipe = defineRecipe({
  id: JoernEffectExampleDangerousCallsRecipeId,
  projectId: "joern-effect",
  title: "Express dangerous-calls example as a file-local recipe",
  inputSchema: JoernEffectExampleDangerousCallsInput as never,
  outputSchema: JoernEffectExampleDangerousCallsOutput as never,
  nxTarget: "joern-effect:typecheck",
  sourcePath: JoernEffectExampleDangerousCallsSourcePath,
  allowedFiles: [JoernEffectExampleDangerousCallsSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleDangerousCallsInput as never,
    outputSchema: JoernEffectExampleDangerousCallsOutput as never,
    inputResources: [JoernEffectExampleDangerousCallsResource],
    outputResources: [JoernEffectExampleDangerousCallsResource],
  },
  handler: JoernEffectExampleDangerousCallsHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleDangerousCallsRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleDangerousCallsResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectExampleDangerousCallsRecipes = [JoernEffectExampleDangerousCallsRecipe] as const
