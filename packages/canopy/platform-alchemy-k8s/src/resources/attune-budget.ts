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
import { attuneLabels, configMap, dnsLabel, type BudgetEnvelope, resourceSet } from "./common.js"

export interface AttuneBudgetProps extends BudgetEnvelope {
  readonly name: string
  readonly namespace: string
  readonly runId: string
}

export const AttuneBudget = {
  make: (props: AttuneBudgetProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-budget", {
      "attune.dev/run-id": props.runId,
      "attune.dev/resource-class": props.resourceClass,
    })
    const data = {
      runId: props.runId,
      resourceClass: props.resourceClass,
      ...(props.maxCpu ? { maxCpu: props.maxCpu } : {}),
      ...(props.maxMemory ? { maxMemory: props.maxMemory } : {}),
      ...(props.maxDurationSeconds ? { maxDurationSeconds: String(props.maxDurationSeconds) } : {}),
      ...(props.maxTokens ? { maxTokens: String(props.maxTokens) } : {}),
      ...(props.maxGpuSeconds ? { maxGpuSeconds: String(props.maxGpuSeconds) } : {}),
    }

    return resourceSet(`attune-budget:${props.namespace}:${name}`, [
      configMap(`${name}-budget`, props.namespace, labels, data),
    ])
  },
} as const


export const AttuneBudgetResourceRecipeId = "platform-alchemy-k8s.attune-budget-resource" as const
const AttuneBudgetResourceHandlerId = "platform-alchemy-k8s.attune-budget-resource.handler" as const
const AttuneBudgetResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-budget.ts" as const

export const AttuneBudgetResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttuneBudgetResourceHandlerId,
  recipeId: AttuneBudgetResourceRecipeId,
  sourcePath: AttuneBudgetResourceSourcePath,
  exportName: "AttuneBudget",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttuneBudgetResourceRecipeId,
      sourcePath: AttuneBudgetResourceSourcePath,
      exportName: "AttuneBudget",
      moduleKind: "attune budget Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-budget-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneBudgetResourceRecipe = defineProjectionRecipe({
  id: AttuneBudgetResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune budget Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttuneBudgetResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttuneBudgetResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttuneBudgetResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttuneBudgetResourceRecipes = [AttuneBudgetResourceRecipe] as const
