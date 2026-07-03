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
} from "../resources/common.js"

import type { CustomResourceDefinition } from "kubernetes-types/apiextensions/v1.d.ts"
import type { Job } from "kubernetes-types/batch/v1.d.ts"
import type { Deployment, StatefulSet } from "kubernetes-types/apps/v1.d.ts"
import type {
  ConfigMap,
  LimitRange,
  Namespace,
  PersistentVolumeClaim,
  ResourceQuota,
  Secret,
  Service,
  ServiceAccount,
} from "kubernetes-types/core/v1.d.ts"
import type { NetworkPolicy } from "kubernetes-types/networking/v1.d.ts"
import type { Role, RoleBinding } from "kubernetes-types/rbac/v1.d.ts"

export type BuiltInKubernetesObject =
  | ConfigMap
  | CustomResourceDefinition
  | Deployment
  | Job
  | LimitRange
  | Namespace
  | NetworkPolicy
  | PersistentVolumeClaim
  | ResourceQuota
  | Role
  | RoleBinding
  | Secret
  | Service
  | ServiceAccount
  | StatefulSet

export interface AttuneCustomResourceObject {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: string
  readonly metadata: {
    readonly name?: string
    readonly namespace?: string
    readonly labels?: Readonly<Record<string, string>>
    readonly annotations?: Readonly<Record<string, string>>
  }
  readonly spec?: unknown
  readonly status?: unknown
}

export type KubernetesObject = BuiltInKubernetesObject | AttuneCustomResourceObject


export const KubernetesTypesContractRecipeId = "platform-alchemy-k8s.kubernetes-types-contract" as const
const KubernetesTypesContractHandlerId = "platform-alchemy-k8s.kubernetes-types-contract.handler" as const
const KubernetesTypesContractSourcePath = "packages/canopy/platform-alchemy-k8s/src/provider/kubernetes-types.ts" as const

export const KubernetesTypesContractHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: KubernetesTypesContractHandlerId,
  recipeId: KubernetesTypesContractRecipeId,
  sourcePath: KubernetesTypesContractSourcePath,
  exportName: "KubernetesObject",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: KubernetesTypesContractRecipeId,
      sourcePath: KubernetesTypesContractSourcePath,
      exportName: "KubernetesObject",
      moduleKind: "Kubernetes object type contract",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.kubernetes-types-contract.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const KubernetesTypesContractRecipe = defineProjectionRecipe({
  id: KubernetesTypesContractRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare Kubernetes object type contract",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [KubernetesTypesContractSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: KubernetesTypesContractHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: KubernetesTypesContractRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const KubernetesTypesContractRecipes = [KubernetesTypesContractRecipe] as const
