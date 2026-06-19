import { generatedHeader, upsertExport } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { listFiles, readText, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"

export interface SyncCocoIndexMcpToolsGeneratorSchema {
  readonly directory?: string
  readonly registry?: string
  readonly export?: boolean
}

const toolExportPattern = /export\s+const\s+([A-Za-z][A-Za-z0-9]*Tool)\b/gu

const findToolExports = (
  tree: GeneratorTree,
  directory: string,
): Array<{ readonly name: string; readonly path: string }> =>
  listFiles(tree, directory)
    .filter((file) => !file.endsWith(".generated.ts") && file !== "index.ts")
    .flatMap((file) => {
      const path = joinPath(directory, file)
      const source = readText(tree, path) ?? ""
      return [...source.matchAll(toolExportPattern)].map((match) => ({
        name: match[1] ?? "",
        path,
      }))
    })
    .filter((entry) => entry.name.length > 0)

const renderRegistry = (
  registry: string,
  entries: ReadonlyArray<{ readonly name: string; readonly path: string }>,
): string => {
  const imports = entries
    .map((entry) => `import { ${entry.name} } from "${relativeModulePath(registry, entry.path)}"`)
    .join("\n")
  const names = entries.map((entry) => entry.name).join(", ")
  const body =
    entries.length === 0
      ? "export const cocoindexMcpTools = [] as const"
      : `export const cocoindexMcpTools = [${names}] as const`

  return `${generatedHeader("sync-cocoindex-mcp-tools")}${imports}${imports.length > 0 ? "\n\n" : ""}${body}

export type CocoIndexMcpTool = (typeof cocoindexMcpTools)[number]
`
}

export default function syncCocoIndexMcpToolsGenerator(
  tree: GeneratorTree,
  schema: SyncCocoIndexMcpToolsGeneratorSchema = {},
): GeneratorTask {
  const directory = schema.directory ?? "src/cocoindex/tools"
  const registry = schema.registry ?? joinPath(directory, "ToolRegistry.generated.ts")
  const entries = findToolExports(tree, directory)

  writeTextIfChanged(tree, registry, renderRegistry(registry, entries))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, registry))
  }
}
