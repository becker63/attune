export { K8sHttpClient } from "effect/unstable/cluster"

export interface KubernetesApplyBoundary {
  readonly mode: "plan-only" | "in-cluster-effect-http"
}

export const planOnlyBoundary: KubernetesApplyBoundary = {
  mode: "plan-only",
}
