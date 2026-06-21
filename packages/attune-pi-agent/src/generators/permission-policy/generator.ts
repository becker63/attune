import { toNames } from "../internal/names.js"
import { joinPath, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../internal/tree.js"
import { renderPermissionPolicyArtifact } from "../renderers.js"

export interface PermissionPolicyGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function permissionPolicyGenerator(
  tree: GeneratorTree,
  schema: PermissionPolicyGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "policies/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.pi-policy.json`),
    renderPermissionPolicyArtifact(schema.name),
  )
}
