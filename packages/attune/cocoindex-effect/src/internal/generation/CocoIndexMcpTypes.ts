import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema, Scope } from "effect"

import {
  CocoIndexMcpStdioResource,
  startMcpStdioClient,
} from "../../mcp/stdio.js"

type ToolDefinition = Readonly<{
  readonly name: string
  readonly inputSchema?: unknown
}>

const sourceDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(sourceDir, "../../..")
export const generatedCocoIndexMcpSchemaPath =
  ".attune/cache/generated/cocoindex-effect/cocoindex-code-mcp.ts"
const outputPath = resolve(projectRoot, "../../../", generatedCocoIndexMcpSchemaPath)
const CocoIndexProjectId = "cocoindex-effect" as const
export const CocoIndexEmitMcpSchemaRecipeId =
  "cocoindex-effect.emit-mcp-schema" as const
const CocoIndexMcpToolGenerationRecipeId =
  "cocoindex-effect.mcp-tool-generation" as const
const GeneratedCocoIndexMcpSchemaResourceId =
  "cocoindex-effect.generated-mcp-schema" as const
const CocoIndexMcpSchemaGenerationHandlerId =
  "cocoindex-effect.emit-mcp-schema.handler" as const
const CocoIndexMcpSchemaGenerationSourcePath =
  "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts" as const
const CocoIndexMcpSchemaGenerationLayerId =
  "cocoindex-effect.emit-mcp-schema.layer" as const
const CocoIndexMcpSchemaGenerationServiceId =
  "cocoindex-effect.emit-mcp-schema.runtime" as const

export const CocoIndexMcpSchemaGenerationInput = Schema.Struct({
  projectRoot: Schema.String,
  outputPath: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
})
export type CocoIndexMcpSchemaGenerationInput =
  typeof CocoIndexMcpSchemaGenerationInput.Type

export const CocoIndexMcpSchemaGenerationOutput = Schema.Struct({
  generatedFiles: Schema.Array(Schema.String),
  sourceTool: Schema.Literal("search"),
  snapshotFallbackAllowed: Schema.Boolean,
})
export type CocoIndexMcpSchemaGenerationOutput =
  typeof CocoIndexMcpSchemaGenerationOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const GeneratedCocoIndexMcpSchemaResource = defineAlchemyResource({
  id: GeneratedCocoIndexMcpSchemaResourceId,
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  ownerRecipeId: CocoIndexEmitMcpSchemaRecipeId,
  producedBy: [CocoIndexEmitMcpSchemaRecipeId],
  consumedBy: [
    "cocoindex-effect.scaffold-mcp-tool",
    CocoIndexMcpToolGenerationRecipeId,
    "cocoindex-effect.generated-surface-check",
  ],
  addressFields: ["projectRoot", "outputPath"],
  addressSchema: CocoIndexMcpSchemaGenerationInput,
  stateSchema: CocoIndexMcpSchemaGenerationOutput,
  modes: ["project", "read"],
  programmaticResourceExport: "runCocoIndexMcpTypesGeneration",
  programmaticProviderExport: "CocoIndexMcpSchemaGenerationHandler",
  programmaticBridgeSourcePath: CocoIndexMcpSchemaGenerationSourcePath,
})

const main = Effect.gen(function* generateCocoIndexMcpTypes() {
  const tools = yield* Effect.scoped(inspectTools()).pipe(
    Effect.catch(() =>
      process.env.COCOINDEX_MCP_GENERATOR_ALLOW_SNAPSHOT === "0"
        ? Effect.fail(new Error("CocoIndex MCP inspection failed"))
        : Effect.succeed(snapshotTools),
    ),
  )
  const searchTool = tools.find((tool) => tool.name === "search")
  if (!searchTool) {
    return yield* Effect.fail(new Error("cocoindex-code MCP did not expose a search tool"))
  }

  yield* Effect.promise(async () => {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, renderGeneratedModule(searchTool), "utf8")
  })
})

export const runCocoIndexMcpTypesGeneration = (): Promise<void> =>
  Effect.runPromise(main)

export interface CocoIndexMcpSchemaGenerationService {
  readonly emit: () => Effect.Effect<void>
}

export class CocoIndexMcpSchemaGenerationRuntime extends Context.Service<
  CocoIndexMcpSchemaGenerationRuntime,
  CocoIndexMcpSchemaGenerationService
>()("cocoindex-effect/CocoIndexMcpSchemaGenerationRuntime") {}

export const CocoIndexMcpSchemaGenerationLive = Layer.succeed(CocoIndexMcpSchemaGenerationRuntime, {
  emit: () => Effect.promise(runCocoIndexMcpTypesGeneration),
})

export const CocoIndexMcpSchemaGenerationLayer = defineRecipeLayer({
  id: CocoIndexMcpSchemaGenerationLayerId,
  sourcePath: CocoIndexMcpSchemaGenerationSourcePath,
  exportName: "CocoIndexMcpSchemaGenerationLive",
  layer: CocoIndexMcpSchemaGenerationLive,
  provides: [{
    id: CocoIndexMcpSchemaGenerationServiceId,
    service: CocoIndexMcpSchemaGenerationRuntime,
  }],
})

export const CocoIndexMcpSchemaGenerationHandler = defineRecipeHandler<
  CocoIndexMcpSchemaGenerationInput,
  CocoIndexMcpSchemaGenerationOutput,
  never,
  CocoIndexMcpSchemaGenerationRuntime
>({
  id: CocoIndexMcpSchemaGenerationHandlerId,
  recipeId: CocoIndexEmitMcpSchemaRecipeId,
  sourcePath: CocoIndexMcpSchemaGenerationSourcePath,
  exportName: "runCocoIndexMcpTypesGeneration",
  handler: (input) =>
    Effect.gen(function* emitCocoIndexMcpSchema() {
      const runtime = yield* CocoIndexMcpSchemaGenerationRuntime
      yield* runtime.emit()
      return {
        generatedFiles: [input.outputPath ?? generatedCocoIndexMcpSchemaPath],
        sourceTool: "search" as const,
        snapshotFallbackAllowed:
          process.env.COCOINDEX_MCP_GENERATOR_ALLOW_SNAPSHOT !== "0",
      }
    }),
  layer: CocoIndexMcpSchemaGenerationLayer,
  emitsReceipts: ["cocoindex-effect.generated-mcp-schema"],
})

export const cocoIndexMcpSchemaGenerationRecipeInvocation = (): RecipeInvocation => ({
  recipeId: CocoIndexEmitMcpSchemaRecipeId,
  action: "generate",
  input: {
    projectRoot,
    outputPath: generatedCocoIndexMcpSchemaPath,
  },
  source: {
    surface: "nx",
    projectId: CocoIndexProjectId,
    target: "cocoindex-effect:generate",
  },
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexEmitMcpSchemaRecipe = defineProjectionRecipe({
  id: CocoIndexEmitMcpSchemaRecipeId,
  projectId: CocoIndexProjectId,
  title: "Generate typed CocoIndex MCP schema from tool inspection",
  inputSchema: CocoIndexMcpSchemaGenerationInput,
  outputSchema: CocoIndexMcpSchemaGenerationOutput,
  nxTarget: "cocoindex-effect:generate",
  allowedFiles: [
    "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
    generatedCocoIndexMcpSchemaPath,
  ],
  validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  io: {
    inputSchema: CocoIndexMcpSchemaGenerationInput,
    outputSchema: CocoIndexMcpSchemaGenerationOutput,
    inputResources: [CocoIndexMcpStdioResource],
    outputResources: [GeneratedCocoIndexMcpSchemaResource],
  },
  handler: CocoIndexMcpSchemaGenerationHandler,
  alchemyDag: [{
    fromRecipeId: "cocoindex-effect.mcp-stdio",
    toRecipeId: CocoIndexEmitMcpSchemaRecipeId,
    resource: CocoIndexMcpStdioResource,
    kind: "invokes",
    modes: ["read", "apply"],
  }],
})

export const CocoIndexMcpTypesRecipes = [CocoIndexEmitMcpSchemaRecipe] as const

const inspectTools = (): Effect.Effect<ReadonlyArray<ToolDefinition>, unknown, Scope.Scope> =>
  Effect.acquireRelease(
    startMcpStdioClient({
      command: process.env.COCOINDEX_MCP_COMMAND ?? "ccc",
      args: (process.env.COCOINDEX_MCP_ARGS ?? "mcp").split(" ").filter(Boolean),
      cwd: process.env.COCOINDEX_MCP_REPO_PATH ?? projectRoot,
      startupTimeoutMs: Number(process.env.COCOINDEX_MCP_STARTUP_TIMEOUT_MS ?? "30000"),
    }),
    (client) => Effect.promise(() => client.close()),
  ).pipe(
    Effect.flatMap((client) =>
      Effect.tryPromise(async () => {
        const result = await client.request("tools/list")
        const tools = asRecord(result).tools
        return Array.isArray(tools) ? tools.map(readTool) : []
      }),
    ),
  )

const readTool = (tool: unknown): ToolDefinition => {
  const record = asRecord(tool)
  return {
    name: String(record.name ?? ""),
    inputSchema: record.inputSchema,
  }
}

const snapshotTools: ReadonlyArray<ToolDefinition> = [
  {
    name: "search",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 5 },
        offset: { type: "integer", minimum: 0, default: 0 },
        refresh_index: { type: "boolean", default: true },
        languages: {
          anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
          default: null,
        },
        paths: {
          anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
          default: null,
        },
      },
      required: ["query"],
    },
  },
]

const renderGeneratedModule = (tool: ToolDefinition): string => `import { Schema } from "effect"

export const CocoIndexCodeMcpToolName = Schema.Literal("search")
export type CocoIndexCodeMcpToolName = typeof CocoIndexCodeMcpToolName.Type

export const CocoIndexMcpSearchInput = Schema.Struct({
  query: Schema.String,
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
  refresh_index: Schema.optional(Schema.Boolean),
  languages: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  paths: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
})
export type CocoIndexMcpSearchInput = typeof CocoIndexMcpSearchInput.Type

export const CocoIndexCodeChunkResult = Schema.Struct({
  file_path: Schema.String,
  language: Schema.String,
  content: Schema.String,
  start_line: Schema.Number,
  end_line: Schema.Number,
  score: Schema.Number,
})
export type CocoIndexCodeChunkResult = typeof CocoIndexCodeChunkResult.Type

export const CocoIndexMcpSearchResult = Schema.Struct({
  success: Schema.Boolean,
  results: Schema.Array(CocoIndexCodeChunkResult),
  total_returned: Schema.Number,
  offset: Schema.Number,
  message: Schema.optional(Schema.NullOr(Schema.String)),
})
export type CocoIndexMcpSearchResult = typeof CocoIndexMcpSearchResult.Type

export const CocoIndexCodeMcpGeneratedFrom = {
  repository: "https://github.com/cocoindex-io/cocoindex-code",
  command: "ccc mcp",
  tool: ${JSON.stringify(tool.name)},
  inputSchema: ${JSON.stringify(tool.inputSchema ?? null, null, 2)},
  sourceFiles: [
    "src/cocoindex_code/server.py",
    "src/cocoindex_code/protocol.py",
  ],
} as const
`

const asRecord = (input: unknown): Record<string, unknown> =>
  input !== null && typeof input === "object" ? input as Record<string, unknown> : {}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCocoIndexMcpTypesGeneration().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
