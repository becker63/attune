import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import {
  K8sResourceModuleCatalogResource,
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport,
  PlatformAlchemyK8sProjectId,
  PlatformAlchemyK8sResourceRegistryRecipeId,
  k8sResourceModuleReport,
} from "../resources/common.js"

// Source-owned CRD type facade for Attune Kubernetes resources.
// Emitted CRD manifests and generated type snapshots are projection outputs
// under .attune/cache/generated/platform-alchemy-k8s.

export interface KubernetesObjectMeta {
  readonly name: string
  readonly namespace?: string
  readonly labels?: Readonly<Record<string, string>>
  readonly annotations?: Readonly<Record<string, string>>
}

export const attuneArtifactCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneArtifact",
  plural: "attuneartifacts",
  scope: "Namespaced",
} as const

export interface AttuneArtifact {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneArtifact"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneArtifactSpec
  readonly status?: AttuneArtifactStatus
}

export interface AttuneArtifactSpec {
  readonly runId: string
  readonly kind: "cpg" | "index" | "evidence-bundle" | "report-snapshot" | "diagnostics"
  readonly producerRef: string
  readonly uri?: string
  readonly digest?: string
}

export interface AttuneArtifactStatus {
  readonly phase?: "Pending" | "Available" | "Expired" | "Failed"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly sizeBytes?: number
}



export const attuneBudgetCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneBudget",
  plural: "attunebudgets",
  scope: "Namespaced",
} as const

export interface AttuneBudget {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneBudget"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneBudgetSpec
  readonly status?: AttuneBudgetStatus
}

export interface AttuneBudgetSpec {
  readonly runId: string
  readonly resourceClass: string
  readonly maxCpu?: string
  readonly maxMemory?: string
  readonly maxDurationSeconds?: number
  readonly maxTokens?: number
  readonly maxGpuSeconds?: number
}

export interface AttuneBudgetStatus {
  readonly phase?: "Pending" | "Reserved" | "Exceeded" | "Released"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly reserved?: boolean
  readonly spentCpuSeconds?: number
  readonly spentTokens?: number
}



export const attuneDiscoveryRunCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneDiscoveryRun",
  plural: "attunediscoveryruns",
  scope: "Namespaced",
} as const

export interface AttuneDiscoveryRun {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneDiscoveryRun"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneDiscoveryRunSpec
  readonly status?: AttuneDiscoveryRunStatus
}

export interface AttuneDiscoveryRunSpec {
  readonly runId: string
  readonly repoUrl: string
  readonly workerPoolRef: string
  readonly repoSandboxRef?: string
  readonly resourceClass: string
  readonly phaseRefs?: ReadonlyArray<string>
  readonly policyRef?: string
  readonly budgetRef?: string
}

export interface AttuneDiscoveryRunStatus {
  readonly phase?: "Pending" | "Admitted" | "Running" | "Succeeded" | "Failed"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly artifactRefs?: ReadonlyArray<string>
  readonly observedGeneration?: number
}



export const attunePhaseCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttunePhase",
  plural: "attunephases",
  scope: "Namespaced",
} as const

export interface AttunePhase {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttunePhase"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttunePhaseSpec
  readonly status?: AttunePhaseStatus
}

export interface AttunePhaseSpec {
  readonly runId: string
  readonly phase: "discovery" | "indexing" | "joern-query" | "evidence-scoring" | "report-writing"
  readonly dependsOn?: ReadonlyArray<string>
  readonly expectedArtifactRefs?: ReadonlyArray<string>
}

export interface AttunePhaseStatus {
  readonly phase?: "Pending" | "Blocked" | "Running" | "Succeeded" | "Failed"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly startedAt?: string
  readonly completedAt?: string
}



export const attunePolicyCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttunePolicy",
  plural: "attunepolicies",
  scope: "Namespaced",
} as const

export interface AttunePolicy {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttunePolicy"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttunePolicySpec
  readonly status?: AttunePolicyStatus
}

export interface AttunePolicySpec {
  readonly runId: string
  readonly repoSandboxRef: string
  readonly allowedTools: ReadonlyArray<string>
  readonly allowNetworkEgress?: boolean
  readonly requiresHumanReview?: boolean
}

export interface AttunePolicyStatus {
  readonly phase?: "Pending" | "Admitted" | "Denied"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly admitted?: boolean
  readonly reason?: string
}



export const attuneReportCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneReport",
  plural: "attunereports",
  scope: "Namespaced",
} as const

export interface AttuneReport {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneReport"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneReportSpec
  readonly status?: AttuneReportStatus
}

export interface AttuneReportSpec {
  readonly runId: string
  readonly snapshotArtifactRef?: string
  readonly mdxState?: string
}

export interface AttuneReportStatus {
  readonly phase?: "Drafting" | "Ready" | "Failed"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly lastComposedAt?: string
}



export const attuneRepoSandboxCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneRepoSandbox",
  plural: "attunereposandboxes",
  scope: "Namespaced",
} as const

export interface AttuneRepoSandbox {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneRepoSandbox"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneRepoSandboxSpec
  readonly status?: AttuneRepoSandboxStatus
}

export interface AttuneRepoSandboxSpec {
  readonly runId: string
  readonly repoUrl: string
  readonly trust: "untrusted" | "trusted-local"
  readonly workspaceClaim: string
  readonly allowNetworkEgress?: boolean
}

export interface AttuneRepoSandboxStatus {
  readonly phase?: "Pending" | "Cloning" | "Ready" | "Failed" | "Expired"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly workspaceUri?: string
}



export const attuneToolJobCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneToolJob",
  plural: "attunetooljobs",
  scope: "Namespaced",
} as const

export interface AttuneToolJob {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneToolJob"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneToolJobSpec
  readonly status?: AttuneToolJobStatus
}

export interface AttuneToolJobSpec {
  readonly runId: string
  readonly tool: "joern" | "cocoindex" | "ast-grep" | "oxlint" | "local-model"
  readonly repoSandboxRef: string
  readonly workerPoolRef: string
  readonly resourceClass: string
  readonly image: string
  readonly command: ReadonlyArray<string>
  readonly timeoutSeconds?: number
  readonly outputArtifactRefs?: ReadonlyArray<string>
}

export interface AttuneToolJobStatus {
  readonly phase?: "Pending" | "Running" | "Succeeded" | "Failed" | "TimedOut"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly startedAt?: string
  readonly completedAt?: string
  readonly resultArtifactRef?: string
  readonly diagnostics?: string
}



export const attuneWorkerPoolCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "AttuneWorkerPool",
  plural: "attuneworkerpools",
  scope: "Namespaced",
} as const

export interface AttuneWorkerPool {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "AttuneWorkerPool"
  readonly metadata: KubernetesObjectMeta
  readonly spec: AttuneWorkerPoolSpec
  readonly status?: AttuneWorkerPoolStatus
}

export interface AttuneWorkerPoolSpec {
  readonly workerClass: "thinkcentre-cpu" | "desktop-gpu" | "wsl-disposable"
  readonly resourceClass: string
  readonly nodeSelector?: Readonly<Record<string, string>>
  readonly intermittent?: boolean
  readonly gpu?: boolean
  readonly maxConcurrentLeases?: number
  readonly image: string
}

export interface AttuneWorkerPoolStatus {
  readonly phase?: "Pending" | "Ready" | "Degraded" | "Offline"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly observedNodes?: number
  readonly activeLeases?: number
}



export const joernQueryCrdMetadata = {
  apiVersion: "attune.dev/v1alpha1",
  group: "attune.dev",
  version: "v1alpha1",
  kind: "JoernQuery",
  plural: "joernqueries",
  scope: "Namespaced",
} as const

export interface JoernQuery {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: "JoernQuery"
  readonly metadata: KubernetesObjectMeta
  readonly spec: JoernQuerySpec
  readonly status?: JoernQueryStatus
}

export interface JoernQuerySpec {
  readonly runId: string
  readonly repoSandboxRef: string
  readonly queryTemplate: string
  readonly variables?: Readonly<Record<string, string>>
  readonly timeoutSeconds?: number
  readonly resourceClass: string
}

export interface JoernQueryStatus {
  readonly phase?: "Pending" | "Running" | "Succeeded" | "Failed" | "TimedOut"
  readonly conditions?: ReadonlyArray<Readonly<Record<string, unknown>>>
  readonly startedAt?: string
  readonly completedAt?: string
  readonly resultArtifactRef?: string
  readonly diagnostics?: string
}


export const K8sCrdTypesRecipeId = "platform-alchemy-k8s.crd-types" as const
const K8sCrdTypesHandlerId = "platform-alchemy-k8s.crd-types.handler" as const
const K8sCrdTypesSourcePath = "packages/canopy/platform-alchemy-k8s/src/crds/types.ts" as const

export const K8sCrdTypesHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: K8sCrdTypesHandlerId,
  recipeId: K8sCrdTypesRecipeId,
  sourcePath: K8sCrdTypesSourcePath,
  exportName: "KubernetesObjectMeta",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: K8sCrdTypesRecipeId,
      sourcePath: K8sCrdTypesSourcePath,
      exportName: "KubernetesObjectMeta",
      moduleKind: "source-owned Kubernetes CRD type facade",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.crd-types.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const K8sCrdTypesRecipe = defineProjectionRecipe({
  id: K8sCrdTypesRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare source-owned Kubernetes CRD type facade",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [K8sCrdTypesSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: K8sCrdTypesHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: K8sCrdTypesRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const K8sCrdTypesRecipes = [K8sCrdTypesRecipe] as const
