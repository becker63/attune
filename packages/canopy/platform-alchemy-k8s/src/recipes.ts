import {
  defineExternalSchemaManagedRecipe,
  defineExternalSchemaRecipe,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  LocalClusterPlan,
} from "./cluster/local-cluster.js"
import {
  RenderedResourceSet,
} from "./provider/alchemy-k8s-provider.js"

export const LocalClusterRecipeInput = Schema.Struct({
  name: Schema.optional(Schema.String),
  driver: Schema.optional(Schema.Literals(["k3d", "kind"] as const)),
  agents: Schema.optional(Schema.Number),
})
export type LocalClusterRecipeInput = typeof LocalClusterRecipeInput.Type

export const LocalComputeStackRecipeInput = Schema.Struct({
  namespace: Schema.optional(Schema.String),
  controlPlaneImage: Schema.optional(Schema.String),
  workerImage: Schema.optional(Schema.String),
  gpuWorkerImage: Schema.optional(Schema.String),
})
export type LocalComputeStackRecipeInput = typeof LocalComputeStackRecipeInput.Type

export const DiscoveryWorkflowRecipeInput = Schema.Struct({
  runId: Schema.String,
  namespace: Schema.String,
  repoUrl: Schema.String,
  workerImage: Schema.String,
  workerPoolRef: Schema.optional(Schema.String),
  resourceClass: Schema.optional(Schema.String),
})
export type DiscoveryWorkflowRecipeInput = typeof DiscoveryWorkflowRecipeInput.Type

export const KubernetesObjectSetRecipeInput = Schema.Struct({
  id: Schema.String,
  objects: Schema.Array(Schema.Unknown),
  mode: Schema.Literals(["DryRun", "Test", "Live"] as const),
})
export type KubernetesObjectSetRecipeInput = typeof KubernetesObjectSetRecipeInput.Type

export const KubernetesObjectSetRecipeOutput = Schema.Struct({
  provider: Schema.Literal("KubernetesProvider"),
  mode: Schema.Literals(["DryRun", "Test", "Live"] as const),
  action: Schema.Literals(["render", "validate", "read", "diff", "apply", "delete"] as const),
  id: Schema.String,
  mutated: Schema.Boolean,
  evidenceRefs: Schema.Array(Schema.String),
})
export type KubernetesObjectSetRecipeOutput = typeof KubernetesObjectSetRecipeOutput.Type

export const KubernetesGeneratedArtifactRecipeInput = Schema.Struct({
  stage: Schema.String,
  projectRoot: Schema.String,
})
export type KubernetesGeneratedArtifactRecipeInput = typeof KubernetesGeneratedArtifactRecipeInput.Type

export const KubernetesGeneratedArtifactRecipeOutput = Schema.Struct({
  generatedFiles: Schema.Array(Schema.String),
  recipeId: Schema.String,
})
export type KubernetesGeneratedArtifactRecipeOutput = typeof KubernetesGeneratedArtifactRecipeOutput.Type

export const kubernetesObjectSetDriftRepair: RecipeRepair = {
  repairId: "recipe-repair:platform-alchemy-k8s.kubernetes-object-set:drift",
  recipeId: "platform-alchemy-k8s.kubernetes-object-set",
  title: "Repair rendered Kubernetes object-set drift",
  kind: "managed-lifecycle",
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: ["packages/canopy/platform-alchemy-k8s/**"],
  risk: "needs-review",
  evidenceRequirements: ["platform-alchemy-k8s:test", "workspace:policy-fast"],
}

export const PlatformAlchemyK8sRecipes = [
  defineExternalSchemaRecipe({
    id: "platform-alchemy-k8s.crd-type-generation",
    projectId: "platform-alchemy-k8s",
    title: "Generate Kubernetes CRD types and manifests through a recipe-backed stage",
    inputSchema: KubernetesGeneratedArtifactRecipeInput,
    outputSchema: KubernetesGeneratedArtifactRecipeOutput,
    nxTarget: "platform-alchemy-k8s:generate",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
    allowedFiles: [
      "packages/canopy/platform-alchemy-k8s/scripts/generationStage.ts",
      "packages/canopy/platform-alchemy-k8s/scripts/generate-crd-types.ts",
      "packages/canopy/platform-alchemy-k8s/src/crds/**",
      "packages/canopy/platform-alchemy-k8s/src/generated/**",
      "packages/canopy/platform-alchemy-k8s/project.json",
    ],
    validationEvidence: ["platform-alchemy-k8s:generate", "platform-alchemy-k8s:test"],
  }),
  defineExternalSchemaRecipe({
    id: "platform-alchemy-k8s.local-cluster-plan",
    projectId: "platform-alchemy-k8s",
    title: "Render local Kubernetes cluster command plan",
    inputSchema: LocalClusterRecipeInput,
    outputSchema: LocalClusterPlan,
    nxTarget: "platform-alchemy-k8s:test",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
    allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/cluster/**"],
    validationEvidence: ["platform-alchemy-k8s:test"],
  }),
  defineExternalSchemaRecipe({
    id: "platform-alchemy-k8s.local-compute-stack",
    projectId: "platform-alchemy-k8s",
    title: "Render local compute stack resource set",
    inputSchema: LocalComputeStackRecipeInput,
    outputSchema: RenderedResourceSet,
    nxTarget: "platform-alchemy-k8s:test",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
    allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/resources/**"],
    validationEvidence: ["platform-alchemy-k8s:test"],
  }),
  defineExternalSchemaRecipe({
    id: "platform-alchemy-k8s.discovery-workflow",
    projectId: "platform-alchemy-k8s",
    title: "Render discovery workflow resource set",
    inputSchema: DiscoveryWorkflowRecipeInput,
    outputSchema: RenderedResourceSet,
    dependencies: [{ recipeId: "platform-alchemy-k8s.local-compute-stack" }],
    nxTarget: "platform-alchemy-k8s:test",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
    allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/resources/**"],
    validationEvidence: ["platform-alchemy-k8s:test"],
  }),
  defineExternalSchemaManagedRecipe({
    id: "platform-alchemy-k8s.kubernetes-object-set",
    projectId: "platform-alchemy-k8s",
    title: "Manage rendered Kubernetes object-set lifecycle",
    inputSchema: KubernetesObjectSetRecipeInput,
    outputSchema: KubernetesObjectSetRecipeOutput,
    dependencies: [{ recipeId: "platform-alchemy-k8s.discovery-workflow" }],
    nxTarget: "platform-alchemy-k8s:test",
    sourcePath: "packages/canopy/platform-alchemy-k8s/src/recipes.ts",
    allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/provider/**", "packages/canopy/platform-alchemy-k8s/src/resources/**"],
    validationEvidence: ["platform-alchemy-k8s:test", "workspace:policy-fast"],
    lifecycle: ["plan", "apply", "check", "destroy"],
    resourceKind: "kubernetes-object-set",
    lifecycleSubstrates: [
      {
        id: "platform-alchemy-k8s.alchemy-provider",
        kind: "container-runtime",
        tool: "alchemy",
        lifecycleActions: ["plan", "apply", "check", "destroy"],
        evidence: ["platform-alchemy-k8s:test"],
      },
    ],
    observedState: { status: "unknown" },
    driftRepair: kubernetesObjectSetDriftRepair,
    humanReviewRequired: true,
  }),
] as const
