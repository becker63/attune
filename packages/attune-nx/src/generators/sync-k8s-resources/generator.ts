import { generatedHeader, upsertExport } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { listFiles, readText, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"

export interface SyncK8sResourcesGeneratorSchema {
  readonly directory?: string
  readonly registry?: string
  readonly export?: boolean
}

const resourceExportPattern = /export\s+const\s+([A-Z][A-Za-z0-9]*)\b/gu

const findResourceExports = (
  tree: GeneratorTree,
  directory: string,
): Array<{ readonly name: string; readonly path: string }> =>
  listFiles(tree, directory)
    .filter((file) => !file.endsWith(".generated.ts") && file !== "index.ts")
    .flatMap((file) => {
      const path = joinPath(directory, file)
      const source = readText(tree, path) ?? ""
      return [...source.matchAll(resourceExportPattern)].map((match) => ({
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
      ? "export const k8sResourceModules = [] as const"
      : `export const k8sResourceModules = [${names}] as const`

  return `${generatedHeader("sync-k8s-resources")}${imports}${imports.length > 0 ? "\n\n" : ""}${body}

export type K8sResourceModule = (typeof k8sResourceModules)[number]
`
}

export default function syncK8sResourcesGenerator(
  tree: GeneratorTree,
  schema: SyncK8sResourcesGeneratorSchema = {},
): GeneratorTask {
  const directory = schema.directory ?? "src/resources"
  const registry = schema.registry ?? joinPath(directory, "ResourceRegistry.generated.ts")
  const entries = findResourceExports(tree, directory)

  writeTextIfChanged(tree, registry, renderRegistry(registry, entries))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, registry))
  }
}
