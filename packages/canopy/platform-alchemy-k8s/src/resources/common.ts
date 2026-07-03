import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import type { KubernetesObject, PlatformResourceSet, RenderedResourceSet } from "../provider/alchemy-k8s-provider.js"

export const PlatformAlchemyK8sProjectId = "platform-alchemy-k8s" as const
export const PlatformAlchemyK8sResourceRegistryRecipeId =
  "platform-alchemy-k8s.resource-registry" as const
export const K8sResourceCommonSourcePath =
  "packages/canopy/platform-alchemy-k8s/src/resources/common.ts" as const
export const K8sResourceCommonRecipeId =
  "platform-alchemy-k8s.resource-common" as const
const K8sResourceCommonHandlerId =
  "platform-alchemy-k8s.resource-common.handler" as const

export const K8sResourceModuleRecipeInput = Schema.Struct({
  sourcePath: Schema.optional(Schema.String),
  exportName: Schema.optional(Schema.String),
})
export type K8sResourceModuleRecipeInput = typeof K8sResourceModuleRecipeInput.Type

export const K8sResourceModuleReport = Schema.Struct({
  packageId: Schema.Literal(PlatformAlchemyK8sProjectId),
  recipeId: Schema.String,
  sourcePath: Schema.String,
  exportName: Schema.String,
  moduleKind: Schema.String,
})
export type K8sResourceModuleReport = typeof K8sResourceModuleReport.Type

export const k8sResourceModuleReport = (input: {
  readonly recipeId: string
  readonly sourcePath: string
  readonly exportName: string
  readonly moduleKind: string
}): K8sResourceModuleReport => ({
  packageId: PlatformAlchemyK8sProjectId,
  recipeId: input.recipeId,
  sourcePath: input.sourcePath,
  exportName: input.exportName,
  moduleKind: input.moduleKind,
})

// @attune-packet-target generated-runtime-projection eligible
export const K8sResourceModuleCatalogResource = defineAlchemyResource({
  id: "platform-alchemy-k8s.resource-module-catalog.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: K8sResourceCommonRecipeId,
  producedBy: [K8sResourceCommonRecipeId],
  consumedBy: [PlatformAlchemyK8sResourceRegistryRecipeId],
  addressFields: ["sourcePath", "exportName"],
  addressSchema: K8sResourceModuleRecipeInput as never,
  stateSchema: K8sResourceModuleReport as never,
  modes: ["project", "read"],
})

export const K8sResourceCommonHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: K8sResourceCommonHandlerId,
  recipeId: K8sResourceCommonRecipeId,
  sourcePath: K8sResourceCommonSourcePath,
  exportName: "resourceSet",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: K8sResourceCommonRecipeId,
      sourcePath: K8sResourceCommonSourcePath,
      exportName: "resourceSet",
      moduleKind: "kubernetes-resource-common",
    })) as never,
  emitsReceipts: [`${K8sResourceCommonRecipeId}.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const K8sResourceCommonRecipe = defineProjectionRecipe({
  id: K8sResourceCommonRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare shared Kubernetes resource helpers",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [K8sResourceCommonSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: K8sResourceCommonHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: K8sResourceCommonRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const K8sResourceCommonRecipes = [K8sResourceCommonRecipe] as const

export interface AttuneCondition {
  readonly type: string
  readonly status: "True" | "False" | "Unknown"
  readonly reason?: string
  readonly message?: string
  readonly observedGeneration?: number
  readonly lastTransitionTime?: string
}

export interface ObjectReference {
  readonly apiVersion?: string
  readonly kind: string
  readonly name: string
  readonly namespace?: string
}

export interface ArtifactReference {
  readonly name: string
  readonly uri?: string
  readonly digest?: string
}

export interface BudgetEnvelope {
  readonly resourceClass: string
  readonly maxCpu?: string
  readonly maxMemory?: string
  readonly maxDurationSeconds?: number
  readonly maxTokens?: number
  readonly maxGpuSeconds?: number
}

export const attuneLabels = (component: string, extra: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> => ({
  "app.kubernetes.io/managed-by": "attune",
  "app.kubernetes.io/part-of": "attune-local-compute",
  "attune.dev/component": component,
  ...extra,
})

export const dnsLabel = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63)
  return normalized.length === 0 ? "attune" : normalized
}

export const resourceSet = (id: string, objects: readonly KubernetesObject[]): PlatformResourceSet => ({
  id,
  render: (): RenderedResourceSet => ({ id, objects }),
})

export const mergeResourceSets = (id: string, sets: readonly PlatformResourceSet[]): PlatformResourceSet =>
  resourceSet(
    id,
    sets.flatMap((set) => set.render().objects),
  )

export const configMap = (
  name: string,
  namespace: string,
  labels: Readonly<Record<string, string>>,
  data: Readonly<Record<string, string>>,
): KubernetesObject => ({
  apiVersion: "v1",
  kind: "ConfigMap",
  metadata: {
    name,
    namespace,
    labels,
  },
  data,
})
