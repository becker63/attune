import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRecipeLayer,
  defineToolchainRecipe,
} from "@attune/framework-protocol"
import { EnvVars, readEnv } from "../../edge/runtime/env.js"
import { JoernSchemaExtractionError } from "../../edge/runtime/errors.js"
import type { RawSchema } from "./types.js"

const execFileAsync = promisify(execFile)
const joernSchemaExtractionRecipeId = "joern-effect.codegen.extract-schema"
const joernGeneratedSchemaModulesRecipeId = "joern-effect.codegen.schema-modules"
const joernSchemaExtractionSourcePath = "packages/attune/joern-effect/src/pure/codegen/extractSchema.ts"

export const JoernSchemaExtractionInputSchema = Schema.Struct({
  defaultSchemaPath: Schema.optional(Schema.String),
})
export type JoernSchemaExtractionInput = typeof JoernSchemaExtractionInputSchema.Type

export const RawJoernSchemaShape = Schema.Struct({
  version: Schema.optional(Schema.String),
  nodes: Schema.optional(Schema.Array(Schema.Unknown)),
  nodeTypes: Schema.optional(Schema.Array(Schema.Unknown)),
  properties: Schema.optional(Schema.Array(Schema.Unknown)),
  edges: Schema.optional(Schema.Array(Schema.Unknown)),
})

export const JoernSchemaExtractionOutputSchema = Schema.Struct({
  schema: RawJoernSchemaShape,
})
export type JoernSchemaExtractionOutput = typeof JoernSchemaExtractionOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernSchemaExtractionResource = defineAlchemyResource({
  id: "joern-effect.codegen.extract-schema.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: joernSchemaExtractionRecipeId,
  producedBy: [joernSchemaExtractionRecipeId],
  consumedBy: [joernSchemaExtractionRecipeId, joernGeneratedSchemaModulesRecipeId],
  addressFields: ["defaultSchemaPath"],
  addressSchema: JoernSchemaExtractionInputSchema as never,
  stateSchema: JoernSchemaExtractionOutputSchema as never,
  modes: ["read", "project", "check"],
  programmaticResourceExport: "JoernSchemaExtractionLive",
  programmaticBridgeSourcePath: joernSchemaExtractionSourcePath,
})

const parseRawSchema = (text: string): RawSchema => JSON.parse(text)

const readSchemaFile = (
  schemaPath: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new JoernSchemaExtractionError({
        cause,
        inputMode: "JOERN_CPG_SCHEMA_JSON",
        message: "Failed to read JOERN_CPG_SCHEMA_JSON",
        schemaPath,
      }),
    try: () => readFile(schemaPath, "utf8").then(parseRawSchema),
  })

const readCodePropertyGraphSchema = (
  cpgDir: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new JoernSchemaExtractionError({
        cause,
        inputMode: "CODEPROPERTYGRAPH_DIR",
        message: "Failed to run CODEPROPERTYGRAPH_DIR/schema2json.sh",
        schemaPath: cpgDir,
      }),
    try: () =>
      execFileAsync(join(cpgDir, "schema2json.sh"), { cwd: cpgDir }).then(
        ({ stdout }) => parseRawSchema(stdout),
      ),
  })

export const extractSchema = (
  defaultSchemaPath?: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> => {
  const schemaPath = readEnv(EnvVars.JoernCpgSchemaJson)
  if (schemaPath) {
    return readSchemaFile(schemaPath)
  }

  const cpgDir = readEnv(EnvVars.CodePropertyGraphDir)
  if (cpgDir) {
    return readCodePropertyGraphSchema(cpgDir)
  }

  if (defaultSchemaPath) {
    return readSchemaFile(defaultSchemaPath)
  }

  return Effect.fail(
    new JoernSchemaExtractionError({
      message:
        "No Joern CPG schema input provided. Set JOERN_CPG_SCHEMA_JSON=/path/to/schema.json or CODEPROPERTYGRAPH_DIR=/path/to/codepropertygraph.",
    }),
  )
}

export interface JoernSchemaExtractionService {
  readonly extract: (
    input: JoernSchemaExtractionInput,
  ) => Effect.Effect<JoernSchemaExtractionOutput, JoernSchemaExtractionError>
}

export class JoernSchemaExtraction extends Context.Tag("joern-effect/SchemaExtraction")<
  JoernSchemaExtraction,
  JoernSchemaExtractionService
>() {}

export const extractJoernSchemaForRecipe = (
  input: JoernSchemaExtractionInput,
): Effect.Effect<JoernSchemaExtractionOutput, JoernSchemaExtractionError> =>
  extractSchema(input.defaultSchemaPath).pipe(
    Effect.map((schema) => ({ schema })),
  )

export const JoernSchemaExtractionLive = Layer.succeed(JoernSchemaExtraction, {
  extract: extractJoernSchemaForRecipe,
})

export const JoernSchemaExtractionLayer = defineRecipeLayer({
  id: "joern-effect.codegen.extract-schema.layer",
  sourcePath: joernSchemaExtractionSourcePath,
  exportName: "JoernSchemaExtractionLive",
  layer: JoernSchemaExtractionLive as never,
  provides: [{
    id: "joern-effect.codegen.extract-schema.service",
    service: JoernSchemaExtraction as never,
  }],
})

export const extractJoernSchemaViaLayer = (
  input: JoernSchemaExtractionInput,
): Effect.Effect<JoernSchemaExtractionOutput, JoernSchemaExtractionError, JoernSchemaExtraction> =>
  Effect.gen(function* extractJoernSchemaViaLayerBody() {
    const extraction = yield* JoernSchemaExtraction
    return yield* extraction.extract(input)
  })

export const JoernSchemaExtractionHandler = defineRecipeHandler<
  JoernSchemaExtractionInput,
  JoernSchemaExtractionOutput,
  JoernSchemaExtractionError,
  JoernSchemaExtraction
>({
  id: "joern-effect.codegen.extract-schema.handler",
  recipeId: joernSchemaExtractionRecipeId,
  sourcePath: joernSchemaExtractionSourcePath,
  exportName: "extractJoernSchemaViaLayer",
  layer: JoernSchemaExtractionLayer,
  emitsReceipts: ["joern.codegen.schema.extracted"],
  handler: (input) => extractJoernSchemaViaLayer(input) as never,
})

export const JoernSchemaExtractionRecipe = defineToolchainRecipe({
  id: joernSchemaExtractionRecipeId,
  projectId: "joern-effect",
  title: "Extract Joern CPG schema from file or CodePropertyGraph toolchain",
  inputSchema: JoernSchemaExtractionInputSchema as never,
  outputSchema: JoernSchemaExtractionOutputSchema as never,
  allowedFiles: [joernSchemaExtractionSourcePath],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernSchemaExtractionInputSchema as never,
    outputSchema: JoernSchemaExtractionOutputSchema as never,
    inputResources: [JoernSchemaExtractionResource],
    outputResources: [JoernSchemaExtractionResource],
  },
  handler: JoernSchemaExtractionHandler,
  alchemyDag: [{
    fromRecipeId: joernSchemaExtractionRecipeId,
    toRecipeId: joernGeneratedSchemaModulesRecipeId,
    resource: JoernSchemaExtractionResource,
    kind: "projects",
    modes: ["read", "project", "check"],
  }],
})

export const JoernSchemaExtractionRecipes = [JoernSchemaExtractionRecipe] as const
