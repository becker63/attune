import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import {
  K8sResourceModuleCatalogResource,
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport,
  PlatformAlchemyK8sProjectId,
  PlatformAlchemyK8sResourceRegistryRecipeId,
  k8sResourceModuleReport,
} from "./common.js"

import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, dnsLabel, resourceSet } from "./common.js"

export interface RunNamespaceProps {
  readonly name: string
  readonly labels?: Readonly<Record<string, string>>
}

export const RunNamespace = {
  make: (props: RunNamespaceProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const namespace: KubernetesObject = {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name,
        labels: attuneLabels("run-namespace", props.labels),
      },
    }

    return resourceSet(`run-namespace:${name}`, [namespace])
  },
} as const


export const RunNamespaceResourceRecipeId = "platform-alchemy-k8s.run-namespace-resource" as const
const RunNamespaceResourceHandlerId = "platform-alchemy-k8s.run-namespace-resource.handler" as const
const RunNamespaceResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/run-namespace.ts" as const

export const RunNamespaceResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: RunNamespaceResourceHandlerId,
  recipeId: RunNamespaceResourceRecipeId,
  sourcePath: RunNamespaceResourceSourcePath,
  exportName: "RunNamespace",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: RunNamespaceResourceRecipeId,
      sourcePath: RunNamespaceResourceSourcePath,
      exportName: "RunNamespace",
      moduleKind: "run namespace Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.run-namespace-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const RunNamespaceResourceRecipe = defineProjectionRecipe({
  id: RunNamespaceResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare run namespace Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [RunNamespaceResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: RunNamespaceResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: RunNamespaceResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const RunNamespaceResourceRecipes = [RunNamespaceResourceRecipe] as const
