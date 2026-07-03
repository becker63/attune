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

export interface ResourceClassProps {
  readonly name: string
  readonly namespace: string
  readonly cpu: string
  readonly memory: string
  readonly pods?: string
}

export const ResourceClass = {
  make: (props: ResourceClassProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("resource-class", {
      "attune.dev/resource-class": name,
    })
    const quota: KubernetesObject = {
      apiVersion: "v1",
      kind: "ResourceQuota",
      metadata: {
        name: `${name}-quota`,
        namespace: props.namespace,
        labels,
      },
      spec: {
        hard: {
          "limits.cpu": props.cpu,
          "limits.memory": props.memory,
          pods: props.pods ?? "16",
        },
      },
    }
    const limitRange: KubernetesObject = {
      apiVersion: "v1",
      kind: "LimitRange",
      metadata: {
        name: `${name}-limits`,
        namespace: props.namespace,
        labels,
      },
      spec: {
        limits: [
          {
            type: "Container",
            defaultRequest: {
              cpu: "250m",
              memory: "256Mi",
            },
            default: {
              cpu: "1",
              memory: "1Gi",
            },
          },
        ],
      },
    }

    return resourceSet(`resource-class:${props.namespace}:${name}`, [quota, limitRange])
  },
} as const


export const ResourceClassResourceRecipeId = "platform-alchemy-k8s.resource-class-resource" as const
const ResourceClassResourceHandlerId = "platform-alchemy-k8s.resource-class-resource.handler" as const
const ResourceClassResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/resource-class.ts" as const

export const ResourceClassResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: ResourceClassResourceHandlerId,
  recipeId: ResourceClassResourceRecipeId,
  sourcePath: ResourceClassResourceSourcePath,
  exportName: "ResourceClass",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: ResourceClassResourceRecipeId,
      sourcePath: ResourceClassResourceSourcePath,
      exportName: "ResourceClass",
      moduleKind: "resource class Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.resource-class-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const ResourceClassResourceRecipe = defineProjectionRecipe({
  id: ResourceClassResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare resource class Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [ResourceClassResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: ResourceClassResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: ResourceClassResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const ResourceClassResourceRecipes = [ResourceClassResourceRecipe] as const
