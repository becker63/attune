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

import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, resourceSet } from "./common.js"

export interface AttunePolicyProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly repoSandboxRef: string
  readonly allowNetworkEgress?: boolean
  readonly allowedTools: readonly string[]
}

export const AttunePolicy = {
  make: (props: AttunePolicyProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-policy", {
      "attune.dev/run-id": props.runId,
      "attune.dev/repo-sandbox": props.repoSandboxRef,
    })

    return resourceSet(`attune-policy:${props.namespace}:${name}`, [
      configMap(`${name}-policy`, props.namespace, labels, {
        runId: props.runId,
        repoSandboxRef: props.repoSandboxRef,
        allowNetworkEgress: String(props.allowNetworkEgress ?? false),
        allowedTools: props.allowedTools.join(","),
      }),
    ])
  },
} as const


export const AttunePolicyResourceRecipeId = "platform-alchemy-k8s.attune-policy-resource" as const
const AttunePolicyResourceHandlerId = "platform-alchemy-k8s.attune-policy-resource.handler" as const
const AttunePolicyResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-policy.ts" as const

export const AttunePolicyResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttunePolicyResourceHandlerId,
  recipeId: AttunePolicyResourceRecipeId,
  sourcePath: AttunePolicyResourceSourcePath,
  exportName: "AttunePolicy",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttunePolicyResourceRecipeId,
      sourcePath: AttunePolicyResourceSourcePath,
      exportName: "AttunePolicy",
      moduleKind: "attune policy Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-policy-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePolicyResourceRecipe = defineProjectionRecipe({
  id: AttunePolicyResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune policy Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttunePolicyResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttunePolicyResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttunePolicyResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttunePolicyResourceRecipes = [AttunePolicyResourceRecipe] as const
