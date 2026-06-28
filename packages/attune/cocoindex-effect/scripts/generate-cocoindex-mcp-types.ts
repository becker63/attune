import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Scope } from "effect"
import { startMcpStdioClient } from "../src/mcp/stdio.js"

type ToolDefinition = Readonly<{
  readonly name: string
  readonly inputSchema?: unknown
}>

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, "..")
const outputPath = resolve(projectRoot, "src/generated/cocoindex-code-mcp.ts")

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

Effect.runPromise(main).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
