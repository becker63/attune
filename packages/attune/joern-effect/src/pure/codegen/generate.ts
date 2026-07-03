import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { emitFastCheckArbitraries, emitGenerated } from "./emitGenerated.js"
import { extractSchema, JoernSchemaExtractionResource } from "./extractSchema.js"
import { normalizeSchema } from "./normalizeSchema.js"

const joernGeneratedSchemaModulesRecipeId = "joern-effect.codegen.schema-modules"
const joernGeneratedFastCheckArbitrariesRecipeId = "joern-effect.codegen.fast-check-arbitraries"
const joernCodegenSourcePath = "packages/attune/joern-effect/src/pure/codegen/generate.ts"

export const JoernCodegenArtifactKindSchema = Schema.Literal(
  "schema-modules",
  "fast-check-arbitraries",
)
export type JoernCodegenArtifactKind = typeof JoernCodegenArtifactKindSchema.Type

export const JoernCodegenRunInputSchema = Schema.Struct({
  artifactKind: JoernCodegenArtifactKindSchema,
  outDir: Schema.optional(Schema.String),
  defaultSchemaPath: Schema.optional(Schema.String),
})
export type JoernCodegenRunInput = typeof JoernCodegenRunInputSchema.Type

export const JoernCodegenRunOutputSchema = Schema.Struct({
  artifactKind: JoernCodegenArtifactKindSchema,
  outDir: Schema.String,
  generated: Schema.Boolean,
})
export type JoernCodegenRunOutput = typeof JoernCodegenRunOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedSchemaModulesResource = defineAlchemyResource({
  id: "joern-effect.codegen.schema-modules.resource",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  ownerRecipeId: joernGeneratedSchemaModulesRecipeId,
  producedBy: [joernGeneratedSchemaModulesRecipeId],
  consumedBy: [joernGeneratedSchemaModulesRecipeId, joernGeneratedFastCheckArbitrariesRecipeId],
  addressFields: ["outDir"],
  addressSchema: JoernCodegenRunInputSchema as never,
  stateSchema: JoernCodegenRunOutputSchema as never,
  modes: ["project", "write", "check"],
  programmaticResourceExport: "JoernCodegenGenerationLive",
  programmaticBridgeSourcePath: joernCodegenSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedFastCheckArbitrariesResource = defineAlchemyResource({
  id: "joern-effect.codegen.fast-check-arbitraries.resource",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  ownerRecipeId: joernGeneratedFastCheckArbitrariesRecipeId,
  producedBy: [joernGeneratedFastCheckArbitrariesRecipeId],
  consumedBy: [joernGeneratedFastCheckArbitrariesRecipeId],
  addressFields: ["outDir"],
  addressSchema: JoernCodegenRunInputSchema as never,
  stateSchema: JoernCodegenRunOutputSchema as never,
  modes: ["project", "write", "check"],
  programmaticResourceExport: "JoernCodegenGenerationLive",
  programmaticBridgeSourcePath: joernCodegenSourcePath,
})

export const generate = (
  outDir = "src/pure/generated",
  defaultSchemaPath?: string,
): Effect.Effect<void, Error> =>
  extractSchema(defaultSchemaPath).pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitGenerated(schema, outDir)),
  )

export const generateFastCheckArbitraries = (
  outDir = "src/internal/generated",
  defaultSchemaPath?: string,
): Effect.Effect<void, Error> =>
  extractSchema(defaultSchemaPath).pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitFastCheckArbitraries(schema, outDir)),
  )

export interface JoernCodegenGenerationService {
  readonly run: (input: JoernCodegenRunInput) => Effect.Effect<JoernCodegenRunOutput, Error>
}

export class JoernCodegenGeneration extends Context.Tag("joern-effect/CodegenGeneration")<
  JoernCodegenGeneration,
  JoernCodegenGenerationService
>() {}

const runJoernCodegen = (
  input: JoernCodegenRunInput,
): Effect.Effect<JoernCodegenRunOutput, Error> => {
  const outDir = input.outDir ??
    (input.artifactKind === "schema-modules" ? "src/pure/generated" : "src/internal/generated")
  const effect = input.artifactKind === "schema-modules"
    ? generate(outDir, input.defaultSchemaPath)
    : generateFastCheckArbitraries(outDir, input.defaultSchemaPath)
  return effect.pipe(
    Effect.as({
      artifactKind: input.artifactKind,
      outDir,
      generated: true,
    }),
  )
}

export const JoernCodegenGenerationLive = Layer.succeed(JoernCodegenGeneration, {
  run: runJoernCodegen,
})

export const JoernCodegenGenerationLayer = defineRecipeLayer({
  id: "joern-effect.codegen.generation.layer",
  sourcePath: joernCodegenSourcePath,
  exportName: "JoernCodegenGenerationLive",
  layer: JoernCodegenGenerationLive as never,
  provides: [{
    id: "joern-effect.codegen.generation.service",
    service: JoernCodegenGeneration as never,
  }],
})

export const runJoernCodegenViaLayer = (
  input: JoernCodegenRunInput,
): Effect.Effect<JoernCodegenRunOutput, Error, JoernCodegenGeneration> =>
  Effect.gen(function* runJoernCodegenViaLayerBody() {
    const generation = yield* JoernCodegenGeneration
    return yield* generation.run(input)
  })

export const JoernGeneratedSchemaModulesHandler = defineRecipeHandler<
  JoernCodegenRunInput,
  JoernCodegenRunOutput,
  Error,
  JoernCodegenGeneration
>({
  id: "joern-effect.codegen.schema-modules.handler",
  recipeId: joernGeneratedSchemaModulesRecipeId,
  sourcePath: joernCodegenSourcePath,
  exportName: "runJoernCodegenViaLayer",
  layer: JoernCodegenGenerationLayer,
  emitsReceipts: ["joern.codegen.schema-modules.generated"],
  handler: (input) => runJoernCodegenViaLayer(input) as never,
})

export const JoernGeneratedFastCheckArbitrariesHandler = defineRecipeHandler<
  JoernCodegenRunInput,
  JoernCodegenRunOutput,
  Error,
  JoernCodegenGeneration
>({
  id: "joern-effect.codegen.fast-check-arbitraries.handler",
  recipeId: joernGeneratedFastCheckArbitrariesRecipeId,
  sourcePath: joernCodegenSourcePath,
  exportName: "runJoernCodegenViaLayer",
  layer: JoernCodegenGenerationLayer,
  emitsReceipts: ["joern.codegen.fast-check-arbitraries.generated"],
  handler: (input) => runJoernCodegenViaLayer(input) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedSchemaModulesRecipe = defineProjectionRecipe({
  id: joernGeneratedSchemaModulesRecipeId,
  projectId: "joern-effect",
  title: "Generate Joern schema, node, property, and traversal modules",
  inputSchema: JoernCodegenRunInputSchema as never,
  outputSchema: JoernCodegenRunOutputSchema as never,
  allowedFiles: [joernCodegenSourcePath],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenRunInputSchema as never,
    outputSchema: JoernCodegenRunOutputSchema as never,
    inputResources: [JoernSchemaExtractionResource],
    outputResources: [JoernGeneratedSchemaModulesResource],
  },
  handler: JoernGeneratedSchemaModulesHandler,
  alchemyDag: [{
    fromRecipeId: joernGeneratedSchemaModulesRecipeId,
    toRecipeId: joernGeneratedFastCheckArbitrariesRecipeId,
    resource: JoernGeneratedSchemaModulesResource,
    kind: "projects",
    modes: ["project", "write", "check"],
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernGeneratedFastCheckArbitrariesRecipe = defineProjectionRecipe({
  id: joernGeneratedFastCheckArbitrariesRecipeId,
  projectId: "joern-effect",
  title: "Generate FastCheck arbitraries from Joern schema modules",
  inputSchema: JoernCodegenRunInputSchema as never,
  outputSchema: JoernCodegenRunOutputSchema as never,
  allowedFiles: [joernCodegenSourcePath],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernCodegenRunInputSchema as never,
    outputSchema: JoernCodegenRunOutputSchema as never,
    inputResources: [JoernGeneratedSchemaModulesResource],
    outputResources: [JoernGeneratedFastCheckArbitrariesResource],
  },
  handler: JoernGeneratedFastCheckArbitrariesHandler,
})

export const JoernCodegenRecipes = [
  JoernGeneratedSchemaModulesRecipe,
  JoernGeneratedFastCheckArbitrariesRecipe,
] as const
