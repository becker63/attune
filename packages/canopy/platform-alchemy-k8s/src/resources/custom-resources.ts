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
} from "./common.js"

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
} from "../crds/types.js"
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


export const AttuneCustomResourcesResourceRecipeId = "platform-alchemy-k8s.custom-resources-resource" as const
const AttuneCustomResourcesResourceHandlerId = "platform-alchemy-k8s.custom-resources-resource.handler" as const
const AttuneCustomResourcesResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/custom-resources.ts" as const

export const AttuneCustomResourcesResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttuneCustomResourcesResourceHandlerId,
  recipeId: AttuneCustomResourcesResourceRecipeId,
  sourcePath: AttuneCustomResourcesResourceSourcePath,
  exportName: "AttuneCustomResources",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttuneCustomResourcesResourceRecipeId,
      sourcePath: AttuneCustomResourcesResourceSourcePath,
      exportName: "AttuneCustomResources",
      moduleKind: "attune custom resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.custom-resources-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneCustomResourcesResourceRecipe = defineProjectionRecipe({
  id: AttuneCustomResourcesResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune custom resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttuneCustomResourcesResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttuneCustomResourcesResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttuneCustomResourcesResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttuneCustomResourcesResourceRecipes = [AttuneCustomResourcesResourceRecipe] as const
