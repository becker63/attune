import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, resourceSet, type ArtifactReference } from "./common.js"

export type AttunePhaseKind = "discovery" | "indexing" | "joern-query" | "evidence-scoring" | "report-writing"

export interface AttunePhaseProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly phase: AttunePhaseKind
  readonly dependsOn?: readonly string[]
  readonly expectedArtifacts?: readonly ArtifactReference[]
}

export const AttunePhase = {
  make: (props: AttunePhaseProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-phase", {
      "attune.dev/run-id": props.runId,
      "attune.dev/phase": props.phase,
    })

    return resourceSet(`attune-phase:${props.namespace}:${name}`, [
      configMap(`${name}-phase`, props.namespace, labels, {
        runId: props.runId,
        phase: props.phase,
        dependsOn: (props.dependsOn ?? []).join(","),
        expectedArtifacts: JSON.stringify(props.expectedArtifacts ?? []),
      }),
    ])
  },
} as const
