import { defineRecipePackage } from "@attune/framework-protocol"

import { LocalClusterRecipes } from "./cluster/local-cluster.js"
import { K8sCrdDefinitionsRecipes } from "./crds/definitions.js"
import { K8sCrdTypesRecipes } from "./crds/types.js"
import { CrdGenerationRecipes } from "./internal/generation/CrdGenerationCli.js"
import { AlchemyK8sProviderContractRecipes } from "./provider/alchemy-k8s-provider.js"
import { PlatformAlchemyK8sProviderBridgeRecipes } from "./provider/alchemy-resource.js"
import { EffectK8sClientBoundaryRecipes } from "./provider/effect-k8s-client.js"
import { KubernetesObjectSetRecipes } from "./provider/kubernetes-object-set.js"
import { KubernetesTypesContractRecipes } from "./provider/kubernetes-types.js"
import { AttuneArtifactResourceRecipes } from "./resources/attune-artifact.js"
import { AttuneBudgetResourceRecipes } from "./resources/attune-budget.js"
import { AttuneDiscoveryRunResourceRecipes } from "./resources/attune-discovery-run.js"
import { AttunePhaseResourceRecipes } from "./resources/attune-phase.js"
import { AttunePolicyResourceRecipes } from "./resources/attune-policy.js"
import { AttuneReportResourceRecipes } from "./resources/attune-report.js"
import { AttuneToolJobResourceRecipes } from "./resources/attune-tool-job.js"
import { BudgetPolicyResourceRecipes } from "./resources/budget-policy.js"
import { K8sResourceCommonRecipes } from "./resources/common.js"
import { AttuneControlPlaneResourceRecipes } from "./resources/control-plane.js"
import { AttuneCustomResourcesResourceRecipes } from "./resources/custom-resources.js"
import { DiscoveryWorkflowRecipes } from "./resources/discovery-workflow.js"
import { K8sResourcesBarrelRecipes } from "./resources/index.js"
import { JoernQueryResourceRecipes } from "./resources/joern-query.js"
import { LocalComputeStackRecipes } from "./resources/local-compute-stack.js"
import { LocalPostgresResourceRecipes } from "./resources/postgres.js"
import { RepoSandboxResourceRecipes } from "./resources/repo-sandbox.js"
import { K8sResourceRegistryRecipes } from "./resources/registry.js"
import { ResourceClassResourceRecipes } from "./resources/resource-class.js"
import { RunNamespaceResourceRecipes } from "./resources/run-namespace.js"
import { WorkerPoolResourceRecipes } from "./resources/worker-pool.js"
import { PlatformAlchemyK8sTestRecipes } from "./test-recipes.js"

export const PlatformAlchemyK8sRecipes = [
  ...CrdGenerationRecipes,
  ...LocalClusterRecipes,
  ...K8sCrdDefinitionsRecipes,
  ...K8sCrdTypesRecipes,
  ...AlchemyK8sProviderContractRecipes,
  ...EffectK8sClientBoundaryRecipes,
  ...KubernetesTypesContractRecipes,
  ...K8sResourceCommonRecipes,
  ...AttuneArtifactResourceRecipes,
  ...AttuneBudgetResourceRecipes,
  ...AttuneDiscoveryRunResourceRecipes,
  ...AttunePhaseResourceRecipes,
  ...AttunePolicyResourceRecipes,
  ...AttuneReportResourceRecipes,
  ...AttuneToolJobResourceRecipes,
  ...BudgetPolicyResourceRecipes,
  ...AttuneControlPlaneResourceRecipes,
  ...AttuneCustomResourcesResourceRecipes,
  ...K8sResourcesBarrelRecipes,
  ...JoernQueryResourceRecipes,
  ...LocalPostgresResourceRecipes,
  ...RepoSandboxResourceRecipes,
  ...ResourceClassResourceRecipes,
  ...RunNamespaceResourceRecipes,
  ...WorkerPoolResourceRecipes,
  ...K8sResourceRegistryRecipes,
  ...PlatformAlchemyK8sProviderBridgeRecipes,
  ...LocalComputeStackRecipes,
  ...DiscoveryWorkflowRecipes,
  ...KubernetesObjectSetRecipes,
  ...PlatformAlchemyK8sTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sRecipePackage = defineRecipePackage({
  packageId: "platform-alchemy-k8s",
  kind: "platform-resource-provider",
  title: "Platform Alchemy Kubernetes resource recipes",
  sourceRoot: "packages/canopy/platform-alchemy-k8s/src",
  recipes: PlatformAlchemyK8sRecipes,
})
