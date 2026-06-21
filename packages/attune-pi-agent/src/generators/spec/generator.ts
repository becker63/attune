import { toNames } from "../internal/names.js"
import { joinPath, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../internal/tree.js"
import { renderImplementationSpecDraft } from "../renderers.js"

export interface SpecGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function specGenerator(
  tree: GeneratorTree,
  schema: SpecGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "specs/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.implementation-spec.json`),
    renderImplementationSpecDraft(schema.name),
  )
}
