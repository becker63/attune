import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, resourceSet } from "./common.js"

export interface AttuneReportProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly snapshotArtifactRef?: string
  readonly mdxState?: string
}

export const AttuneReport = {
  make: (props: AttuneReportProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-report", {
      "attune.dev/run-id": props.runId,
    })

    return resourceSet(`attune-report:${props.namespace}:${name}`, [
      configMap(`${name}-report`, props.namespace, labels, {
        runId: props.runId,
        snapshotArtifactRef: props.snapshotArtifactRef ?? "",
        mdxState: props.mdxState ?? "",
      }),
    ])
  },
} as const
