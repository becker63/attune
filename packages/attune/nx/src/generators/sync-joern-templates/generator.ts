import { syncRegistry, type SyncRegistrySchema } from "../../internal/sync-registry.js"
import { type GeneratorTask, type GeneratorTree } from "../../internal/tree.js"

export type SyncJoernTemplatesGeneratorSchema = SyncRegistrySchema

export default function syncJoernTemplatesGenerator(
  tree: GeneratorTree,
  schema: SyncJoernTemplatesGeneratorSchema = {},
): GeneratorTask {
  syncRegistry(tree, schema, {
    sourceLabel: "sync-joern-templates",
    ownerRecipeId: "joern-effect.generated-template-registry",
    projectionId: "sync-joern-templates",
    sourceDescriptor: "packages/attune/nx/src/generators/sync-joern-templates",
    defaultDirectory: "src/joern/templates",
    registryFileName: "TemplateRegistry.generated.ts",
    exportPattern: /export\s+const\s+([A-Za-z][A-Za-z0-9]*Template)\b/gu,
    registryConstName: "joernTemplates",
    registryTypeName: "JoernTemplate",
  })
}
