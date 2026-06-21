import { toNames } from "../internal/names.js"
import { joinPath, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../internal/tree.js"
import { renderTaskplaneTaskArtifact } from "../renderers.js"

export interface TaskplaneTaskGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function taskplaneTaskGenerator(
  tree: GeneratorTree,
  schema: TaskplaneTaskGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "taskplane/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.taskplane-task.json`),
    renderTaskplaneTaskArtifact(schema.name),
  )
}
