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
} from "./resources/common.js"

export * from "./cluster/local-cluster.js"
export * as AttuneCrds from "./crds/types.js"
export type {
  AttuneArtifact as GeneratedAttuneArtifact,
  AttuneArtifactSpec,
  AttuneArtifactStatus,
  AttuneBudget as GeneratedAttuneBudget,
  AttuneBudgetSpec,
  AttuneBudgetStatus,
  AttuneDiscoveryRun as GeneratedAttuneDiscoveryRun,
  AttuneDiscoveryRunSpec,
  AttuneDiscoveryRunStatus,
  AttunePhase as GeneratedAttunePhase,
  AttunePhaseSpec,
  AttunePhaseStatus,
  AttunePolicy as GeneratedAttunePolicy,
  AttunePolicySpec,
  AttunePolicyStatus,
  AttuneRepoSandbox as GeneratedAttuneRepoSandbox,
  AttuneRepoSandboxSpec,
  AttuneRepoSandboxStatus,
  AttuneReport as GeneratedAttuneReport,
  AttuneReportSpec,
  AttuneReportStatus,
  AttuneToolJob as GeneratedAttuneToolJob,
  AttuneToolJobSpec,
  AttuneToolJobStatus,
  AttuneWorkerPool as GeneratedAttuneWorkerPool,
  AttuneWorkerPoolSpec,
  AttuneWorkerPoolStatus,
  JoernQuery as GeneratedJoernQuery,
  JoernQuerySpec,
  JoernQueryStatus,
} from "./crds/types.js"
export * from "./provider/alchemy-k8s-provider.js"
export * from "./provider/alchemy-resource.js"
export * from "./provider/effect-k8s-client.js"
export * from "./provider/kubernetes-object-set.js"
export * from "./resources/attune-artifact.js"
export * from "./resources/attune-budget.js"
export * from "./resources/attune-discovery-run.js"
export * from "./resources/attune-phase.js"
export * from "./resources/attune-policy.js"
export * from "./resources/attune-report.js"
export * from "./resources/attune-tool-job.js"
export * from "./resources/budget-policy.js"
export * from "./resources/common.js"
export * from "./resources/control-plane.js"
export * from "./resources/custom-resources.js"
export * from "./resources/discovery-workflow.js"
export * from "./resources/joern-query.js"
export * from "./resources/local-compute-stack.js"
export * from "./resources/postgres.js"
export * from "./resources/repo-sandbox.js"
export * from "./resources/resource-class.js"
export * from "./resources/run-namespace.js"
export * from "./resources/worker-pool.js"
export * from "./recipes.js"


export const PlatformAlchemyK8sIndexRecipeId = "platform-alchemy-k8s.public-api-barrel" as const
const PlatformAlchemyK8sIndexHandlerId = "platform-alchemy-k8s.public-api-barrel.handler" as const
const PlatformAlchemyK8sIndexSourcePath = "packages/canopy/platform-alchemy-k8s/src/index.ts" as const

export const PlatformAlchemyK8sIndexHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: PlatformAlchemyK8sIndexHandlerId,
  recipeId: PlatformAlchemyK8sIndexRecipeId,
  sourcePath: PlatformAlchemyK8sIndexSourcePath,
  exportName: "PlatformAlchemyK8sRecipes",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: PlatformAlchemyK8sIndexRecipeId,
      sourcePath: PlatformAlchemyK8sIndexSourcePath,
      exportName: "PlatformAlchemyK8sRecipes",
      moduleKind: "platform Kubernetes public API barrel",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.public-api-barrel.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sIndexRecipe = defineProjectionRecipe({
  id: PlatformAlchemyK8sIndexRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare platform Kubernetes public API barrel",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [PlatformAlchemyK8sIndexSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: PlatformAlchemyK8sIndexHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: PlatformAlchemyK8sIndexRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const PlatformAlchemyK8sIndexRecipes = [PlatformAlchemyK8sIndexRecipe] as const
