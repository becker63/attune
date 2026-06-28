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
