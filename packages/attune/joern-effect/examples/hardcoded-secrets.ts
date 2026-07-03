import { Effect, Schema } from "effect"
import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Joern, cpg, prop } from "joern-effect"

const secretName = /.*(api[_-]?key|secret|token|password).*/iu

export const hardcodedSecrets = Effect.gen(function* () {
  const joern = yield* Joern

  const literals = yield* joern.query(
    cpg.literal
      .code(/.*(api[_-]?key|secret|token|password).*/iu)
      .select({
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  const identifiers = yield* joern.query(
    cpg.identifier
      .name(secretName)
      .select({
        name: prop.name,
        code: prop.code,
        line: prop.lineNumber,
        type: prop.typeFullName,
      }),
  )

  return { literals, identifiers }
})

const JoernEffectExampleHardcodedSecretsRecipeId = "joern-effect.examples.hardcoded-secrets" as const
const JoernEffectExampleHardcodedSecretsResourceId = "joern-effect.examples.hardcoded-secrets.resource" as const
const JoernEffectExampleHardcodedSecretsHandlerId = "joern-effect.examples.hardcoded-secrets.handler" as const
const JoernEffectExampleHardcodedSecretsSourcePath = "packages/attune/joern-effect/examples/hardcoded-secrets.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectExampleHardcodedSecretsInput = Schema.Struct({
  path: Schema.Literal(JoernEffectExampleHardcodedSecretsSourcePath),
})
export type JoernEffectExampleHardcodedSecretsInput = typeof JoernEffectExampleHardcodedSecretsInput.Type

export const JoernEffectExampleHardcodedSecretsOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectExampleHardcodedSecretsSourcePath),
})
export type JoernEffectExampleHardcodedSecretsOutput = typeof JoernEffectExampleHardcodedSecretsOutput.Type

export const JoernEffectExampleHardcodedSecretsResource = defineAlchemyResource({
  id: JoernEffectExampleHardcodedSecretsResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectExampleHardcodedSecretsRecipeId,
  producedBy: [JoernEffectExampleHardcodedSecretsRecipeId],
  consumedBy: [JoernEffectExampleHardcodedSecretsRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectExampleHardcodedSecretsInput as never,
  stateSchema: JoernEffectExampleHardcodedSecretsOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectExampleHardcodedSecretsHandler = defineRecipeHandler<
  JoernEffectExampleHardcodedSecretsInput,
  JoernEffectExampleHardcodedSecretsOutput
>({
  id: JoernEffectExampleHardcodedSecretsHandlerId,
  recipeId: JoernEffectExampleHardcodedSecretsRecipeId,
  sourcePath: JoernEffectExampleHardcodedSecretsSourcePath,
  exportName: "JoernEffectExampleHardcodedSecretsRecipes",
  emitsReceipts: ["joern-effect.examples.hardcoded-secrets.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectExampleHardcodedSecretsRecipe = defineRecipe({
  id: JoernEffectExampleHardcodedSecretsRecipeId,
  projectId: "joern-effect",
  title: "Express hardcoded-secrets example as a file-local recipe",
  inputSchema: JoernEffectExampleHardcodedSecretsInput as never,
  outputSchema: JoernEffectExampleHardcodedSecretsOutput as never,
  nxTarget: "joern-effect:typecheck",
  sourcePath: JoernEffectExampleHardcodedSecretsSourcePath,
  allowedFiles: [JoernEffectExampleHardcodedSecretsSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleHardcodedSecretsInput as never,
    outputSchema: JoernEffectExampleHardcodedSecretsOutput as never,
    inputResources: [JoernEffectExampleHardcodedSecretsResource],
    outputResources: [JoernEffectExampleHardcodedSecretsResource],
  },
  handler: JoernEffectExampleHardcodedSecretsHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleHardcodedSecretsRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleHardcodedSecretsResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectExampleHardcodedSecretsRecipes = [JoernEffectExampleHardcodedSecretsRecipe] as const
