import { syncRegistry, type SyncRegistrySchema } from "../../internal/sync-registry.js"
import { type GeneratorTask, type GeneratorTree } from "../../internal/tree.js"

export type SyncK8sResourcesGeneratorSchema = SyncRegistrySchema

export default function syncK8sResourcesGenerator(
  tree: GeneratorTree,
  schema: SyncK8sResourcesGeneratorSchema = {},
): GeneratorTask {
  syncRegistry(tree, schema, {
    sourceLabel: "sync-k8s-resources",
    defaultDirectory: "src/resources",
    registryFileName: "ResourceRegistry.generated.ts",
    exportPattern: /export\s+const\s+([A-Z][A-Za-z0-9]*)\b/gu,
    registryConstName: "k8sResourceModules",
    registryTypeName: "K8sResourceModule",
  })
}
