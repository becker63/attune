import type {
  AttuneArtifact,
  AttuneArtifactSpec,
  AttuneBudget,
  AttuneBudgetSpec,
  AttuneDiscoveryRun,
  AttuneDiscoveryRunSpec,
  AttunePhase,
  AttunePhaseSpec,
  AttunePolicy,
  AttunePolicySpec,
  AttuneRepoSandbox,
  AttuneRepoSandboxSpec,
  AttuneReport,
  AttuneReportSpec,
  AttuneToolJob,
  AttuneToolJobSpec,
  AttuneWorkerPool,
  AttuneWorkerPoolSpec,
  JoernQuery,
  JoernQuerySpec,
  KubernetesObjectMeta,
} from "../generated/crds.js"
import { attuneLabels, dnsLabel } from "./common.js"

export interface AttuneCustomResourceOptions {
  readonly name: string
  readonly namespace: string
  readonly labels?: Readonly<Record<string, string>>
  readonly annotations?: Readonly<Record<string, string>>
}

const metadata = (
  component: string,
  options: AttuneCustomResourceOptions,
  extraLabels: Readonly<Record<string, string>> = {},
): KubernetesObjectMeta => ({
  name: dnsLabel(options.name),
  namespace: options.namespace,
  labels: attuneLabels(component, {
    ...extraLabels,
    ...(options.labels ?? {}),
  }),
  ...(options.annotations ? { annotations: options.annotations } : {}),
})

export const AttuneCustomResources = {
  discoveryRun: (options: AttuneCustomResourceOptions, spec: AttuneDiscoveryRunSpec): AttuneDiscoveryRun => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneDiscoveryRun",
    metadata: metadata("attune-discovery-run", options, { "attune.dev/run-id": spec.runId }),
    spec,
  }),

  phase: (options: AttuneCustomResourceOptions, spec: AttunePhaseSpec): AttunePhase => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttunePhase",
    metadata: metadata("attune-phase", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/phase": spec.phase,
    }),
    spec,
  }),

  toolJob: (options: AttuneCustomResourceOptions, spec: AttuneToolJobSpec): AttuneToolJob => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneToolJob",
    metadata: metadata("attune-tool-job", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/tool": spec.tool,
    }),
    spec,
  }),

  joernQuery: (options: AttuneCustomResourceOptions, spec: JoernQuerySpec): JoernQuery => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "JoernQuery",
    metadata: metadata("joern-query", options, {
      "attune.dev/run-id": spec.runId,
    }),
    spec,
  }),

  artifact: (options: AttuneCustomResourceOptions, spec: AttuneArtifactSpec): AttuneArtifact => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneArtifact",
    metadata: metadata("attune-artifact", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/artifact-kind": spec.kind,
    }),
    spec,
  }),

  budget: (options: AttuneCustomResourceOptions, spec: AttuneBudgetSpec): AttuneBudget => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneBudget",
    metadata: metadata("attune-budget", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/resource-class": spec.resourceClass,
    }),
    spec,
  }),

  policy: (options: AttuneCustomResourceOptions, spec: AttunePolicySpec): AttunePolicy => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttunePolicy",
    metadata: metadata("attune-policy", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/repo-sandbox": spec.repoSandboxRef,
    }),
    spec,
  }),

  report: (options: AttuneCustomResourceOptions, spec: AttuneReportSpec): AttuneReport => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneReport",
    metadata: metadata("attune-report", options, { "attune.dev/run-id": spec.runId }),
    spec,
  }),

  workerPool: (options: AttuneCustomResourceOptions, spec: AttuneWorkerPoolSpec): AttuneWorkerPool => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneWorkerPool",
    metadata: metadata("attune-worker-pool", options, {
      "attune.dev/worker-class": spec.workerClass,
      "attune.dev/resource-class": spec.resourceClass,
    }),
    spec,
  }),

  repoSandbox: (options: AttuneCustomResourceOptions, spec: AttuneRepoSandboxSpec): AttuneRepoSandbox => ({
    apiVersion: "attune.dev/v1alpha1",
    kind: "AttuneRepoSandbox",
    metadata: metadata("attune-repo-sandbox", options, {
      "attune.dev/run-id": spec.runId,
      "attune.dev/trust": spec.trust,
    }),
    spec,
  }),
} as const
