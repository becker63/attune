import { generatedHeader } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { listFiles, readText, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"

export interface SyncEffectLayersGeneratorSchema {
  readonly directory?: string
  readonly output?: string
}

const liveExportPattern = /export\s+const\s+([A-Za-z][A-Za-z0-9]*Live)\b/gu

const findLiveExports = (tree: GeneratorTree, directory: string): Array<{ readonly name: string; readonly path: string }> =>
  listFiles(tree, directory)
    .filter((file) => file !== "index.ts")
    .flatMap((file) => {
      const path = joinPath(directory, file)
      const source = readText(tree, path) ?? ""
      return [...source.matchAll(liveExportPattern)].map((match) => ({
        name: match[1] ?? "",
        path,
      }))
    })
    .filter((entry) => entry.name.length > 0)

const renderLayers = (
  output: string,
  entries: ReadonlyArray<{ readonly name: string; readonly path: string }>,
): string => {
  if (entries.length === 0) {
    return `${generatedHeader("sync-effect-layers")}export const liveLayers = [] as const
`
  }

  const imports = entries
    .map((entry) => `import { ${entry.name} } from "${relativeModulePath(output, entry.path)}"`)
    .join("\n")
  const names = entries.map((entry) => entry.name).join(", ")

  return `${generatedHeader("sync-effect-layers")}import { Layer } from "effect"
${imports}

export const liveLayers = [${names}] as const
export const AppLive = Layer.mergeAll(...liveLayers)
`
}

export default function syncEffectLayersGenerator(
  tree: GeneratorTree,
  schema: SyncEffectLayersGeneratorSchema = {},
): GeneratorTask {
  const directory = schema.directory ?? "src/effect/services"
  const output = schema.output ?? "src/effect/layers.generated.ts"
  const entries = findLiveExports(tree, directory)

  writeTextIfChanged(tree, output, renderLayers(output, entries))
}
