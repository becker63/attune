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
