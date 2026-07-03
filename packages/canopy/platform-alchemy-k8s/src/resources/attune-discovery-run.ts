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

import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { AttuneBudget } from "./attune-budget.js"
import { AttunePolicy } from "./attune-policy.js"
import { AttuneReport } from "./attune-report.js"
import { AttuneCustomResources } from "./custom-resources.js"
import { mergeResourceSets } from "./common.js"
import { RepoSandbox } from "./repo-sandbox.js"

export interface AttuneDiscoveryRunProps {
  readonly runId: string
  readonly namespace: string
  readonly image: string
  readonly repoUrl: string
  readonly workerPoolRef: string
  readonly resourceClass: string
}

export const AttuneDiscoveryRun = {
  make: (props: AttuneDiscoveryRunProps): PlatformResourceSet =>
    mergeResourceSets(`attune-discovery-run:${props.namespace}:${props.runId}`, [
      {
        id: `attune-discovery-run-cr:${props.namespace}:${props.runId}`,
        render: () => ({
          id: `attune-discovery-run-cr:${props.namespace}:${props.runId}`,
          objects: [
            AttuneCustomResources.discoveryRun(
              {
                name: props.runId,
                namespace: props.namespace,
              },
              {
                runId: props.runId,
                repoUrl: props.repoUrl,
                workerPoolRef: props.workerPoolRef,
                repoSandboxRef: props.runId,
                resourceClass: props.resourceClass,
                phaseRefs: [
                  `${props.runId}-discovery`,
                  `${props.runId}-indexing`,
                  `${props.runId}-joern-query`,
                  `${props.runId}-evidence-scoring`,
                  `${props.runId}-report-writing`,
                ],
                policyRef: props.runId,
                budgetRef: props.runId,
              },
            ),
          ],
        }),
      },
      RepoSandbox.untrustedRepo({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        repoUrl: props.repoUrl,
      }),
      AttuneBudget.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        resourceClass: props.resourceClass,
        maxCpu: "4",
        maxMemory: "8Gi",
        maxDurationSeconds: 3600,
      }),
      AttunePolicy.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        repoSandboxRef: props.runId,
        allowedTools: ["joern", "ast-grep", "oxlint"],
      }),
      AttuneReport.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        snapshotArtifactRef: `${props.runId}-report-snapshot`,
      }),
    ]),
} as const


export const AttuneDiscoveryRunResourceRecipeId = "platform-alchemy-k8s.attune-discovery-run-resource" as const
const AttuneDiscoveryRunResourceHandlerId = "platform-alchemy-k8s.attune-discovery-run-resource.handler" as const
const AttuneDiscoveryRunResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-discovery-run.ts" as const

export const AttuneDiscoveryRunResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttuneDiscoveryRunResourceHandlerId,
  recipeId: AttuneDiscoveryRunResourceRecipeId,
  sourcePath: AttuneDiscoveryRunResourceSourcePath,
  exportName: "AttuneDiscoveryRun",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttuneDiscoveryRunResourceRecipeId,
      sourcePath: AttuneDiscoveryRunResourceSourcePath,
      exportName: "AttuneDiscoveryRun",
      moduleKind: "attune discovery run Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-discovery-run-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneDiscoveryRunResourceRecipe = defineProjectionRecipe({
  id: AttuneDiscoveryRunResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune discovery run Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttuneDiscoveryRunResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttuneDiscoveryRunResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttuneDiscoveryRunResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttuneDiscoveryRunResourceRecipes = [AttuneDiscoveryRunResourceRecipe] as const
