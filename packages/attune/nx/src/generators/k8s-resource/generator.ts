import { upsertExport } from "../../internal/barrel.js"
import { joinPath, relativeModulePath } from "../../internal/paths.js"
import { type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../../internal/tree.js"
import { toNames } from "../../internal/names.js"

export interface K8sResourceGeneratorSchema {
  readonly name: string
  readonly directory?: string
  readonly export?: boolean
}

const resourceSource = (names: ReturnType<typeof toNames>): string => `import { resourceSet } from "./common.js"

export type ${names.className}Input = Readonly<{
  readonly name: string
  readonly namespace: string
}>

export const ${names.className} = {
  make: (input: ${names.className}Input) =>
    resourceSet("${names.fileName}", [
      // TODO: add typed Kubernetes resources for ${names.className}.
    ]),
} as const
`

export default function k8sResourceGenerator(
  tree: GeneratorTree,
  schema: K8sResourceGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "src/resources"
  const filePath = joinPath(directory, `${names.fileName}.ts`)

  writeTextIfChanged(tree, filePath, resourceSource(names))

  if (schema.export ?? true) {
    const indexPath = joinPath(directory, "index.ts")
    upsertExport(tree, indexPath, relativeModulePath(indexPath, filePath))
  }
}
