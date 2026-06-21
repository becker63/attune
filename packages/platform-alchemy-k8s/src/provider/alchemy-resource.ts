import * as Provider from "alchemy/Provider"
import { Resource, type Resource as AlchemyResource, type ResourceBinding } from "alchemy/Resource"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { KubernetesObject, PlatformResourceSet } from "./alchemy-k8s-provider.js"
import { createAlchemyK8sProvider } from "./alchemy-k8s-provider.js"

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
