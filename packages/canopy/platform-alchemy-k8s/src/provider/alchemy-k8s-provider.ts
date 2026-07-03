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

import { Schema } from "effect"

import type { KubernetesObject as KubernetesObjectType } from "./kubernetes-types.js"

export const KubernetesObjectMeta = Schema.Struct({
  name: Schema.String,
  namespace: Schema.optional(Schema.String),
  labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  annotations: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})
export type KubernetesObjectMeta = typeof KubernetesObjectMeta.Type

export const KubernetesObjectSchema = Schema.Struct({
  apiVersion: Schema.String,
  kind: Schema.String,
  metadata: KubernetesObjectMeta,
  spec: Schema.optional(Schema.Unknown),
  rules: Schema.optional(Schema.Unknown),
  roleRef: Schema.optional(Schema.Unknown),
  subjects: Schema.optional(Schema.Unknown),
  data: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  stringData: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})

export const RenderedResourceSet = Schema.Struct({
  id: Schema.String,
  objects: Schema.Array(KubernetesObjectSchema),
})
export type RenderedResourceSet = {
  readonly id: string
  readonly objects: readonly KubernetesObjectType[]
}

export interface PlatformResourceSet {
  readonly id: string
  readonly render: () => RenderedResourceSet
}

export interface KubernetesProviderPlan {
  readonly provider: "attune:alchemy:kubernetes"
  readonly id: string
  readonly objects: readonly KubernetesObjectType[]
}

export interface AlchemyK8sProvider {
  readonly provider: "attune:alchemy:kubernetes"
  readonly plan: (resource: PlatformResourceSet) => KubernetesProviderPlan
}

export const createAlchemyK8sProvider = (): AlchemyK8sProvider => ({
  provider: "attune:alchemy:kubernetes",
  plan: (resource) => {
    const rendered = resource.render()
    Schema.decodeUnknownSync(RenderedResourceSet)(rendered)
    return {
      provider: "attune:alchemy:kubernetes",
      id: rendered.id,
      objects: rendered.objects,
    }
  },
})

export const objectKey = (object: KubernetesObjectType): string =>
  `${object.apiVersion ?? "_"}/${object.kind ?? "_"}/${object.metadata?.namespace ?? "_"}/${object.metadata?.name ?? "_"}`

export type { KubernetesObject } from "./kubernetes-types.js"


export const AlchemyK8sProviderContractRecipeId = "platform-alchemy-k8s.provider-contract" as const
const AlchemyK8sProviderContractHandlerId = "platform-alchemy-k8s.provider-contract.handler" as const
const AlchemyK8sProviderContractSourcePath = "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-k8s-provider.ts" as const

export const AlchemyK8sProviderContractHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AlchemyK8sProviderContractHandlerId,
  recipeId: AlchemyK8sProviderContractRecipeId,
  sourcePath: AlchemyK8sProviderContractSourcePath,
  exportName: "createAlchemyK8sProvider",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AlchemyK8sProviderContractRecipeId,
      sourcePath: AlchemyK8sProviderContractSourcePath,
      exportName: "createAlchemyK8sProvider",
      moduleKind: "Alchemy Kubernetes provider contract",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.provider-contract.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AlchemyK8sProviderContractRecipe = defineProjectionRecipe({
  id: AlchemyK8sProviderContractRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare Alchemy Kubernetes provider contract",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AlchemyK8sProviderContractSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AlchemyK8sProviderContractHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AlchemyK8sProviderContractRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AlchemyK8sProviderContractRecipes = [AlchemyK8sProviderContractRecipe] as const
