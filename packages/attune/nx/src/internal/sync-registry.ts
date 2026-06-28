import { generatedHeader, upsertExport } from "./barrel.js"
import { joinPath, relativeModulePath } from "./paths.js"
import { listFiles, readText, type GeneratorTree, writeTextIfChanged } from "./tree.js"

export interface SyncRegistrySchema {
  readonly directory?: string
  readonly registry?: string
  readonly export?: boolean
}

export interface SyncRegistryOptions {
  readonly sourceLabel: string
  readonly defaultDirectory: string
  readonly registryFileName: string
  readonly exportPattern: RegExp
  readonly registryConstName: string
  readonly registryTypeName: string
}

interface SyncRegistryEntry {
  readonly name: string
  readonly path: string
}

const findRegistryExports = (
  tree: GeneratorTree,
  directory: string,
  exportPattern: RegExp,
): SyncRegistryEntry[] =>
  listFiles(tree, directory)
    .filter((file) => !file.endsWith(".generated.ts") && file !== "index.ts")
    .flatMap((file) => {
      const path = joinPath(directory, file)
      const source = readText(tree, path) ?? ""
      return [...source.matchAll(exportPattern)].map((match) => ({
        name: match[1] ?? "",
        path,
      }))
    })
    .filter((entry) => entry.name.length > 0)

const renderRegistry = (
  options: SyncRegistryOptions,
  registry: string,
  entries: ReadonlyArray<SyncRegistryEntry>,
): string => {
  const imports = entries
    .map((entry) => `import { ${entry.name} } from "${relativeModulePath(registry, entry.path)}"`)
    .join("\n")
  const names = entries.map((entry) => entry.name).join(", ")
  const body =
    entries.length === 0
      ? `export const ${options.registryConstName} = [] as const`
      : `export const ${options.registryConstName} = [${names}] as const`

  return `${generatedHeader(options.sourceLabel)}${imports}${imports.length > 0 ? "\n\n" : ""}${body}

export type ${options.registryTypeName} = (typeof ${options.registryConstName})[number]
`
}

export const syncRegistry = (tree: GeneratorTree, schema: SyncRegistrySchema, options: SyncRegistryOptions): void => {
  const directory = schema.directory ?? options.defaultDirectory
  const registry = schema.registry ?? joinPath(directory, options.registryFileName)
  const entries = findRegistryExports(tree, directory, options.exportPattern)

  writeTextIfChanged(tree, registry, renderRegistry(options, registry, entries))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, registry))
  }
}
