import { upsertExport } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"
import { toNames } from "../../internal/names.js"

export interface JoernTemplateGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly export?: boolean
  readonly templateId?: string
}

const templateSource = (names: ReturnType<typeof toNames>, templateId: string): string => `import { Schema } from "effect"

export const ${names.className}Bindings = Schema.Struct({})
export type ${names.className}Bindings = Schema.Schema.Type<typeof ${names.className}Bindings>

export const ${names.className}Evidence = Schema.Struct({
  templateId: Schema.Literal("${templateId}"),
  rows: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})
export type ${names.className}Evidence = Schema.Schema.Type<typeof ${names.className}Evidence>

export const ${names.propertyName}Template = {
  id: "${templateId}",
  bindings: ${names.className}Bindings,
  evidence: ${names.className}Evidence,
  render: (_bindings: ${names.className}Bindings): string => [
    "// TODO: render known Joern CPGQL for ${templateId}",
    "cpg",
  ].join("\\n"),
} as const
`

export default function joernTemplateGenerator(
  tree: GeneratorTree,
  schema: JoernTemplateGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "src/joern/templates"
  const templateId = schema.templateId ?? names.fileName
  const filePath = joinPath(directory, `${names.fileName}.ts`)

  writeTextIfChanged(tree, filePath, templateSource(names, templateId))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, filePath))
  }
}
