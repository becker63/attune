import { upsertExport } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"
import { toNames } from "../../internal/names.js"

export interface CocoIndexMcpToolGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly export?: boolean
  readonly toolName?: string
}

const toolSource = (
  names: ReturnType<typeof toNames>,
  toolName: string,
): string => `import { Schema } from "effect"

export const ${names.className}Input = Schema.Struct({})
export type ${names.className}Input = Schema.Schema.Type<typeof ${names.className}Input>

export const ${names.className}Result = Schema.Struct({})
export type ${names.className}Result = Schema.Schema.Type<typeof ${names.className}Result>

export const ${names.propertyName}Tool = {
  name: "${toolName}",
  input: ${names.className}Input,
  result: ${names.className}Result,
} as const
`

export default function cocoindexMcpToolGenerator(
  tree: GeneratorTree,
  schema: CocoIndexMcpToolGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "src/cocoindex/tools"
  const toolName = schema.toolName ?? names.fileName
  const filePath = joinPath(directory, `${names.fileName}.ts`)

  writeTextIfChanged(tree, filePath, toolSource(names, toolName))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, filePath))
  }
}
