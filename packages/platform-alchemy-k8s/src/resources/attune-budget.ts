import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, type BudgetEnvelope, resourceSet } from "./common.js"

export interface AttuneBudgetProps extends BudgetEnvelope {
  readonly name: string
  readonly namespace: string
  readonly runId: string
}

export const AttuneBudget = {
  make: (props: AttuneBudgetProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-budget", {
      "attune.dev/run-id": props.runId,
      "attune.dev/resource-class": props.resourceClass,
    })
    const data = {
      runId: props.runId,
      resourceClass: props.resourceClass,
      ...(props.maxCpu ? { maxCpu: props.maxCpu } : {}),
      ...(props.maxMemory ? { maxMemory: props.maxMemory } : {}),
      ...(props.maxDurationSeconds ? { maxDurationSeconds: String(props.maxDurationSeconds) } : {}),
      ...(props.maxTokens ? { maxTokens: String(props.maxTokens) } : {}),
      ...(props.maxGpuSeconds ? { maxGpuSeconds: String(props.maxGpuSeconds) } : {}),
    }

    return resourceSet(`attune-budget:${props.namespace}:${name}`, [
      configMap(`${name}-budget`, props.namespace, labels, data),
    ])
  },
} as const
