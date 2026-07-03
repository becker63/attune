import * as Provider from "alchemy/Provider"
import { Resource, type Resource as AlchemyResource, type ResourceBinding } from "alchemy/Resource"
import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Schema } from "effect"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import {
  KubernetesObjectSchema,
  createAlchemyK8sProvider,
  type KubernetesObject,
  type PlatformResourceSet,
} from "./alchemy-k8s-provider.js"

export interface AttuneKubernetesGraphProps {
  readonly graph: PlatformResourceSet
}

export interface AttuneKubernetesGraphBinding {
  readonly type: "kubernetes-object"
  readonly object: KubernetesObject
}

export type AttuneKubernetesGraphResourceBinding = ResourceBinding<AttuneKubernetesGraphBinding>

export interface AttuneKubernetesGraphOutput {
  readonly provider: "attune:alchemy:kubernetes"
  readonly id: string
  readonly bindings?: readonly AttuneKubernetesGraphResourceBinding[]
  readonly objects: readonly KubernetesObject[]
}

export const PlatformAlchemyK8sProviderBridgeInput = Schema.Struct({
  providerId: Schema.Literal("platform-alchemy-k8s.provider-collection"),
  sourcePath: Schema.optional(Schema.String),
})
export type PlatformAlchemyK8sProviderBridgeInput = typeof PlatformAlchemyK8sProviderBridgeInput.Type

export const PlatformAlchemyK8sProviderBridgeOutput = Schema.Struct({
  providerId: Schema.Literal("platform-alchemy-k8s.provider-collection"),
  resourceExport: Schema.Literal("AttuneKubernetesGraph"),
  providerExport: Schema.Literal("platformAlchemyK8sProviders"),
  resourceContractId: Schema.Literal("platform-alchemy-k8s.kubernetes-graph.resource"),
  managedRecipeId: Schema.Literal("platform-alchemy-k8s.kubernetes-object-set"),
})
export type PlatformAlchemyK8sProviderBridgeOutput = typeof PlatformAlchemyK8sProviderBridgeOutput.Type

export const AttuneKubernetesGraphAddress = Schema.Struct({
  id: Schema.String,
})
export type AttuneKubernetesGraphAddress = typeof AttuneKubernetesGraphAddress.Type

export const AttuneKubernetesGraphState = Schema.Struct({
  provider: Schema.Literal("attune:alchemy:kubernetes"),
  id: Schema.String,
  objects: Schema.Array(KubernetesObjectSchema),
})
export type AttuneKubernetesGraphState = typeof AttuneKubernetesGraphState.Type

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sProviderCollectionResource = defineAlchemyResource({
  id: "platform-alchemy-k8s.provider-collection.resource",
  kind: "external-service",
  alchemyType: "alchemy:ProviderCollection",
  ownerRecipeId: "platform-alchemy-k8s.provider-bridge",
  producedBy: ["platform-alchemy-k8s.provider-bridge"],
  consumedBy: ["platform-alchemy-k8s.kubernetes-object-set"],
  addressFields: ["providerId"],
  addressSchema: PlatformAlchemyK8sProviderBridgeInput as never,
  stateSchema: PlatformAlchemyK8sProviderBridgeOutput as never,
  modes: ["read", "external"],
  programmaticResourceExport: "AttuneKubernetesGraph",
  programmaticProviderExport: "platformAlchemyK8sProviders",
  programmaticBridgeSourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-resource.ts",
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneKubernetesGraphResourceContract = defineAlchemyResource({
  id: "platform-alchemy-k8s.kubernetes-graph.resource",
  kind: "kubernetes-object-set",
  alchemyType: "attune:alchemy:KubernetesGraph",
  providerId: "platform-alchemy-k8s.provider-collection",
  ownerRecipeId: "platform-alchemy-k8s.kubernetes-object-set",
  producedBy: ["platform-alchemy-k8s.kubernetes-object-set"],
  consumedBy: ["platform-alchemy-k8s.kubernetes-object-set"],
  addressFields: ["id"],
  addressSchema: AttuneKubernetesGraphAddress as never,
  stateSchema: AttuneKubernetesGraphState as never,
  modes: ["plan", "apply", "check", "destroy", "read"],
  programmaticResourceExport: "AttuneKubernetesGraph",
  programmaticProviderExport: "platformAlchemyK8sProviders",
  programmaticBridgeSourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-resource.ts",
})

type AttuneKubernetesGraphResource = AlchemyResource<
  "attune:alchemy:KubernetesGraph",
  AttuneKubernetesGraphProps,
  AttuneKubernetesGraphOutput,
  AttuneKubernetesGraphBinding,
  PlatformAlchemyK8sProviders
>

const renderGraph = (
  props: AttuneKubernetesGraphProps,
  bindings: readonly AttuneKubernetesGraphResourceBinding[] = [],
): AttuneKubernetesGraphOutput => {
  const plan = createAlchemyK8sProvider().plan(props.graph)
  return {
    provider: plan.provider,
    id: plan.id,
    bindings,
    objects: plan.objects,
  }
}

const service: Provider.ProviderService<AttuneKubernetesGraphResource> = {
  version: 2,
  read: ({ output }) => Effect.succeed(output),
  reconcile: ({ news, bindings }) => Effect.sync(() => renderGraph(news, bindings)),
  delete: () => Effect.void,
  list: () => Effect.succeed([]),
}

export const AttuneKubernetesGraph = Resource<AttuneKubernetesGraphResource>("attune:alchemy:KubernetesGraph")

export const AttuneKubernetesGraphProvider = () =>
  Provider.succeed(AttuneKubernetesGraph, service)

export class PlatformAlchemyK8sProviders extends Provider.ProviderCollection<PlatformAlchemyK8sProviders>()(
  "PlatformAlchemyK8s",
) {}

export const platformAlchemyK8sProviders = () =>
  Layer.effect(
    PlatformAlchemyK8sProviders,
    Provider.collection([AttuneKubernetesGraph]),
  ).pipe(
    Layer.provide(AttuneKubernetesGraphProvider()),
  )

export const PlatformAlchemyK8sProviderBridgeHandler = defineRecipeHandler<
  PlatformAlchemyK8sProviderBridgeInput,
  PlatformAlchemyK8sProviderBridgeOutput
>({
  id: "platform-alchemy-k8s.provider-bridge.handler",
  recipeId: "platform-alchemy-k8s.provider-bridge",
  sourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-resource.ts",
  exportName: "platformAlchemyK8sProviders",
  handler: () =>
    Effect.succeed({
      providerId: "platform-alchemy-k8s.provider-collection",
      resourceExport: "AttuneKubernetesGraph",
      providerExport: "platformAlchemyK8sProviders",
      resourceContractId: "platform-alchemy-k8s.kubernetes-graph.resource",
      managedRecipeId: "platform-alchemy-k8s.kubernetes-object-set",
    }) as never,
  emitsReceipts: ["platform-alchemy-k8s.provider-bridge.bound"],
})

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sProviderBridgeRecipe = defineProjectionRecipe({
  id: "platform-alchemy-k8s.provider-bridge",
  projectId: "platform-alchemy-k8s",
  title: "Bind Alchemy Kubernetes provider exports to managed recipe resources",
  inputSchema: PlatformAlchemyK8sProviderBridgeInput as never,
  outputSchema: PlatformAlchemyK8sProviderBridgeOutput as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/provider/alchemy-resource.ts"],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: PlatformAlchemyK8sProviderBridgeInput as never,
    outputSchema: PlatformAlchemyK8sProviderBridgeOutput as never,
    inputResources: [PlatformAlchemyK8sProviderCollectionResource],
    outputResources: [AttuneKubernetesGraphResourceContract],
  },
  handler: PlatformAlchemyK8sProviderBridgeHandler,
})

export const PlatformAlchemyK8sProviderBridgeRecipes = [PlatformAlchemyK8sProviderBridgeRecipe] as const
