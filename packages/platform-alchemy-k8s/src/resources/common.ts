import type { KubernetesObject, PlatformResourceSet, RenderedResourceSet } from "../provider/alchemy-k8s-provider.js"

export interface AttuneCondition {
  readonly type: string
  readonly status: "True" | "False" | "Unknown"
  readonly reason?: string
  readonly message?: string
  readonly observedGeneration?: number
  readonly lastTransitionTime?: string
}

export interface ObjectReference {
  readonly apiVersion?: string
  readonly kind: string
  readonly name: string
  readonly namespace?: string
}

export interface ArtifactReference {
  readonly name: string
  readonly uri?: string
  readonly digest?: string
}

export interface BudgetEnvelope {
  readonly resourceClass: string
  readonly maxCpu?: string
  readonly maxMemory?: string
  readonly maxDurationSeconds?: number
  readonly maxTokens?: number
  readonly maxGpuSeconds?: number
}

export const attuneLabels = (component: string, extra: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> => ({
  "app.kubernetes.io/managed-by": "attune",
  "app.kubernetes.io/part-of": "attune-local-compute",
  "attune.dev/component": component,
  ...extra,
})

export const dnsLabel = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63)
  return normalized.length === 0 ? "attune" : normalized
}

export const resourceSet = (id: string, objects: readonly KubernetesObject[]): PlatformResourceSet => ({
  id,
  render: (): RenderedResourceSet => ({ id, objects }),
})

export const mergeResourceSets = (id: string, sets: readonly PlatformResourceSet[]): PlatformResourceSet =>
  resourceSet(
    id,
    sets.flatMap((set) => set.render().objects),
  )

export const configMap = (
  name: string,
  namespace: string,
  labels: Readonly<Record<string, string>>,
  data: Readonly<Record<string, string>>,
): KubernetesObject => ({
  apiVersion: "v1",
  kind: "ConfigMap",
  metadata: {
    name,
    namespace,
    labels,
  },
  data,
})
