import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, resourceSet } from "./common.js"

export type AttuneArtifactKind = "cpg" | "index" | "evidence-bundle" | "report-snapshot" | "diagnostics"

export interface AttuneArtifactProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly kind: AttuneArtifactKind
  readonly producerRef: string
  readonly uri?: string
  readonly digest?: string
}

export const AttuneArtifact = {
  make: (props: AttuneArtifactProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-artifact", {
      "attune.dev/run-id": props.runId,
      "attune.dev/artifact-kind": props.kind,
      "attune.dev/producer": props.producerRef,
    })

    return resourceSet(`attune-artifact:${props.namespace}:${name}`, [
      configMap(`${name}-artifact`, props.namespace, labels, {
        runId: props.runId,
        kind: props.kind,
        producerRef: props.producerRef,
        ...(props.uri ? { uri: props.uri } : {}),
        ...(props.digest ? { digest: props.digest } : {}),
      }),
    ])
  },
} as const
