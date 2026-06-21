import { toNames } from "../internal/names.js"
import { joinPath, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../internal/tree.js"
import { renderTestObligationArtifact } from "../renderers.js"

export interface TestObligationGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function testObligationGenerator(
  tree: GeneratorTree,
  schema: TestObligationGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "obligations/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.test-obligation.json`),
    renderTestObligationArtifact(schema.name),
  )
}
