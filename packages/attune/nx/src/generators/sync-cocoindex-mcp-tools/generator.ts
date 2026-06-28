import { syncRegistry, type SyncRegistrySchema } from "../../internal/sync-registry.js"
import { type GeneratorTask, type GeneratorTree } from "../../internal/tree.js"

export type SyncCocoIndexMcpToolsGeneratorSchema = SyncRegistrySchema

export default function syncCocoIndexMcpToolsGenerator(
  tree: GeneratorTree,
  schema: SyncCocoIndexMcpToolsGeneratorSchema = {},
): GeneratorTask {
  syncRegistry(tree, schema, {
    sourceLabel: "sync-cocoindex-mcp-tools",
    defaultDirectory: "src/cocoindex/tools",
    registryFileName: "ToolRegistry.generated.ts",
    exportPattern: /export\s+const\s+([A-Za-z][A-Za-z0-9]*Tool)\b/gu,
    registryConstName: "cocoindexMcpTools",
    registryTypeName: "CocoIndexMcpTool",
  })
}
