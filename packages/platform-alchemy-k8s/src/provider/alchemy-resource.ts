import { Resource } from "alchemy"

import type { KubernetesObject, PlatformResourceSet } from "./alchemy-k8s-provider.js"
import { createAlchemyK8sProvider } from "./alchemy-k8s-provider.js"

export interface AttuneKubernetesGraphProps {
  readonly graph: PlatformResourceSet
}

export interface AttuneKubernetesGraphOutput {
  readonly provider: "attune:alchemy:kubernetes"
  readonly id: string
  readonly objects: readonly KubernetesObject[]
}

export const AttuneKubernetesGraph = Resource(
  "attune:alchemy:KubernetesGraph",
  async function (_id: string, props: AttuneKubernetesGraphProps): Promise<AttuneKubernetesGraphOutput> {
    if (this.phase === "delete") {
      return this.destroy()
    }

    const plan = createAlchemyK8sProvider().plan(props.graph)
    return this.create({
      provider: plan.provider,
      id: plan.id,
      objects: plan.objects,
    })
  },
)
