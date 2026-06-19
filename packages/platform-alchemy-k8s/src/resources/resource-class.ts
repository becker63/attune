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
