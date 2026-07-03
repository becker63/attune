import { fileURLToPath } from "node:url"
import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Joern, raw } from "joern-effect"

const JoernEffectExampleRawCpgqlRecipeId = "joern-effect.examples.raw-cpgql" as const
const JoernEffectExampleRawCpgqlResourceId = "joern-effect.examples.raw-cpgql.resource" as const
const JoernEffectExampleRawCpgqlHandlerId = "joern-effect.examples.raw-cpgql.handler" as const
const JoernEffectExampleRawCpgqlSourcePath = "packages/attune/joern-effect/examples/raw-cpgql.ts" as const
const JoernEffectSourceSurfaceRecipeId = "joern-effect.source-surface" as const

const topLevelMethods = raw(
  `cpg.method
    .filter(_.isExternal == false)
    .map(m => Map(
      "name" -> m.name,
      "fullName" -> m.fullName,
      "line" -> m.lineNumber
    ))
    .toJson`,
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      fullName: Schema.String,
      line: Schema.NullOr(Schema.Number),
    }),
  ),
)

const program = Effect.gen(function* () {
  const joern = yield* Joern
  return yield* joern.query(topLevelMethods)
})

export const makeRawCpgqlRecipeInvocation = (
  repoPath = process.argv[2] ?? ".",
): RecipeInvocation => ({
  recipeId: JoernEffectExampleRawCpgqlRecipeId,
  action: "check",
  input: {
    repoPath,
  },
  source: {
    surface: "cli",
    projectId: "joern-effect",
    target: "joern-effect:raw-cpgql-example",
    sourcePath: JoernEffectExampleRawCpgqlSourcePath,
  },
})

export const runRawCpgqlExample = (
  repoPath = process.argv[2] ?? ".",
): Promise<void> => {
  void makeRawCpgqlRecipeInvocation(repoPath)
  return Effect.runPromise(
    program.pipe(
      Effect.provide(Joern.layer({ repoPath })),
    ),
  ).then((methods) => {
    console.table(methods)
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRawCpgqlExample().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export const JoernEffectExampleRawCpgqlInput = Schema.Struct({
  repoPath: Schema.String,
})
export type JoernEffectExampleRawCpgqlInput = typeof JoernEffectExampleRawCpgqlInput.Type

export const JoernEffectExampleRawCpgqlOutput = Schema.Struct({
  invoked: Schema.Boolean,
  repoPath: Schema.String,
})
export type JoernEffectExampleRawCpgqlOutput = typeof JoernEffectExampleRawCpgqlOutput.Type

export const JoernEffectExampleRawCpgqlResource = defineAlchemyResource({
  id: JoernEffectExampleRawCpgqlResourceId,
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: JoernEffectExampleRawCpgqlRecipeId,
  producedBy: [JoernEffectExampleRawCpgqlRecipeId],
  consumedBy: [JoernEffectExampleRawCpgqlRecipeId, JoernEffectSourceSurfaceRecipeId],
  addressFields: ["repoPath"],
  addressSchema: JoernEffectExampleRawCpgqlInput as never,
  stateSchema: JoernEffectExampleRawCpgqlOutput as never,
  modes: ["invoke", "read", "check"],
  programmaticResourceExport: "runRawCpgqlExample",
  programmaticBridgeSourcePath: JoernEffectExampleRawCpgqlSourcePath,
})

export const JoernEffectExampleRawCpgqlHandler = defineRecipeHandler<
  JoernEffectExampleRawCpgqlInput,
  JoernEffectExampleRawCpgqlOutput
>({
  id: JoernEffectExampleRawCpgqlHandlerId,
  recipeId: JoernEffectExampleRawCpgqlRecipeId,
  sourcePath: JoernEffectExampleRawCpgqlSourcePath,
  exportName: "runRawCpgqlExample",
  emitsReceipts: ["joern-effect.examples.raw-cpgql.invoked"],
  handler: (input) =>
    Effect.succeed({
      invoked: true,
      repoPath: input.repoPath,
    }) as never,
})

export const JoernEffectExampleRawCpgqlRecipe = defineInvocationRecipe({
  id: JoernEffectExampleRawCpgqlRecipeId,
  projectId: "joern-effect",
  title: "Expose raw-cpgql example through recipe invocation",
  inputSchema: JoernEffectExampleRawCpgqlInput as never,
  outputSchema: JoernEffectExampleRawCpgqlOutput as never,
  sourcePath: JoernEffectExampleRawCpgqlSourcePath,
  entrypoints: [JoernEffectExampleRawCpgqlSourcePath],
  allowedFiles: [JoernEffectExampleRawCpgqlSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectExampleRawCpgqlInput as never,
    outputSchema: JoernEffectExampleRawCpgqlOutput as never,
    inputResources: [JoernEffectExampleRawCpgqlResource],
    outputResources: [JoernEffectExampleRawCpgqlResource],
  },
  handler: JoernEffectExampleRawCpgqlHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectExampleRawCpgqlRecipeId,
      toRecipeId: JoernEffectSourceSurfaceRecipeId,
      resource: JoernEffectExampleRawCpgqlResource,
      kind: "invokes",
      modes: ["invoke", "read", "check"],
    }),
  ],
})

export const JoernEffectExampleRawCpgqlRecipes = [JoernEffectExampleRawCpgqlRecipe] as const
