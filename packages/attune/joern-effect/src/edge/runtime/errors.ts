import { Data, Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"

const joernErrorTaxonomyRecipeId = "joern-effect.error-taxonomy"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernErrorTaxonomySourcePath = "packages/attune/joern-effect/src/edge/runtime/errors.ts"

export const JoernErrorTaxonomyInputSchema = Schema.Struct({
  surface: Schema.Literal("joern-runtime"),
})
export type JoernErrorTaxonomyInput = typeof JoernErrorTaxonomyInputSchema.Type

export const JoernErrorTaxonomyOutputSchema = Schema.Struct({
  tags: Schema.Array(Schema.String),
  sourcePath: Schema.String,
})
export type JoernErrorTaxonomyOutput = typeof JoernErrorTaxonomyOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernErrorTaxonomyResource = defineAlchemyResource({
  id: "joern-effect.error-taxonomy.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: joernErrorTaxonomyRecipeId,
  producedBy: [joernErrorTaxonomyRecipeId],
  consumedBy: [joernErrorTaxonomyRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["surface"],
  addressSchema: JoernErrorTaxonomyInputSchema as never,
  stateSchema: JoernErrorTaxonomyOutputSchema as never,
  modes: ["project", "read"],
})

const snippet = (value: string, max = 400): string =>
  value.length <= max ? value : `${value.slice(0, max)}...`

export class JoernError extends Data.TaggedError("JoernError")<{
  readonly message: string
  readonly query?: string
  readonly cause?: unknown
}> {}

export class JoernHttpError extends Data.TaggedError("JoernHttpError")<{
  readonly message: string
  readonly status: number
  readonly body: string
  readonly query?: string
}> {
  get bodySnippet(): string {
    return snippet(this.body)
  }
}

export class JoernDecodeError extends Data.TaggedError("JoernDecodeError")<{
  readonly message: string
  readonly query: string
  readonly body: string
  readonly cause?: unknown
}> {}

export class JoernSchemaExtractionError extends Data.TaggedError(
  "JoernSchemaExtractionError",
)<{
  readonly message: string
  readonly schemaPath?: string
  readonly inputMode?: string
  readonly cause?: unknown
}> {}

export class JoernCodegenError extends Data.TaggedError("JoernCodegenError")<{
  readonly message: string
  readonly generatedFilePath?: string
  readonly cause?: unknown
}> {}

export class JoernCpgqlEmissionError extends Data.TaggedError(
  "JoernCpgqlEmissionError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class JoernExecutableNotFoundError extends Data.TaggedError(
  "JoernExecutableNotFoundError",
)<{
  readonly message: string
  readonly attempted: readonly string[]
}> {}

export class JoernServerStartError extends Data.TaggedError(
  "JoernServerStartError",
)<{
  readonly message: string
  readonly command: string
  readonly args: readonly string[]
  readonly port: number
  readonly stdout: string
  readonly stderr: string
  readonly cause?: unknown
}> {}

export class JoernServerTimeoutError extends Data.TaggedError(
  "JoernServerTimeoutError",
)<{
  readonly message: string
  readonly command: string
  readonly args: readonly string[]
  readonly port: number
  readonly timeoutMs: number
  readonly stdout: string
  readonly stderr: string
}> {}

export class JoernImportError extends Data.TaggedError("JoernImportError")<{
  readonly message: string
  readonly repoPath: string
  readonly baseUrl: string
  readonly cause?: unknown
}> {}

export class JoernServerShutdownError extends Data.TaggedError(
  "JoernServerShutdownError",
)<{
  readonly message: string
  readonly command: string
  readonly pid?: number
  readonly cause?: unknown
}> {}

export const projectJoernErrorTaxonomy = (
  input: JoernErrorTaxonomyInput,
): JoernErrorTaxonomyOutput => ({
  tags: input.surface === "joern-runtime"
    ? [
      "JoernError",
      "JoernHttpError",
      "JoernDecodeError",
      "JoernSchemaExtractionError",
      "JoernCodegenError",
      "JoernCpgqlEmissionError",
      "JoernExecutableNotFoundError",
      "JoernServerStartError",
      "JoernServerTimeoutError",
      "JoernImportError",
      "JoernServerShutdownError",
    ]
    : [],
  sourcePath: joernErrorTaxonomySourcePath,
})

export const JoernErrorTaxonomyHandler = defineRecipeHandler<
  JoernErrorTaxonomyInput,
  JoernErrorTaxonomyOutput
>({
  id: "joern-effect.error-taxonomy.handler",
  recipeId: joernErrorTaxonomyRecipeId,
  sourcePath: joernErrorTaxonomySourcePath,
  exportName: "projectJoernErrorTaxonomy",
  emitsReceipts: ["joern.error-taxonomy.projected"],
  handler: (input) => Effect.succeed(projectJoernErrorTaxonomy(input)) as never,
})

export const JoernErrorTaxonomyRecipe = defineSchemaRecipe({
  id: joernErrorTaxonomyRecipeId,
  projectId: "joern-effect",
  title: "Own Joern runtime error taxonomy as a typed schema resource",
  inputSchema: JoernErrorTaxonomyInputSchema as never,
  outputSchema: JoernErrorTaxonomyOutputSchema as never,
  allowedFiles: [joernErrorTaxonomySourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernErrorTaxonomyInputSchema as never,
    outputSchema: JoernErrorTaxonomyOutputSchema as never,
    inputResources: [JoernErrorTaxonomyResource],
    outputResources: [JoernErrorTaxonomyResource],
  },
  handler: JoernErrorTaxonomyHandler,
  alchemyDag: [{
    fromRecipeId: joernErrorTaxonomyRecipeId,
    toRecipeId: joernClientRuntimeRecipeId,
    resource: JoernErrorTaxonomyResource,
    kind: "validates",
    modes: ["project", "read"],
  }],
})

export const JoernErrorTaxonomyRecipes = [JoernErrorTaxonomyRecipe] as const
