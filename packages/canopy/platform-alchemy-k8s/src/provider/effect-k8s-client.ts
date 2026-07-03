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

export { K8sHttpClient } from "effect/unstable/cluster"

export interface KubernetesApplyBoundary {
  readonly mode: "plan-only" | "in-cluster-effect-http"
}

export const planOnlyBoundary: KubernetesApplyBoundary = {
  mode: "plan-only",
}


export const EffectK8sClientBoundaryRecipeId = "platform-alchemy-k8s.effect-k8s-client-boundary" as const
const EffectK8sClientBoundaryHandlerId = "platform-alchemy-k8s.effect-k8s-client-boundary.handler" as const
const EffectK8sClientBoundarySourcePath = "packages/canopy/platform-alchemy-k8s/src/provider/effect-k8s-client.ts" as const

export const EffectK8sClientBoundaryHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: EffectK8sClientBoundaryHandlerId,
  recipeId: EffectK8sClientBoundaryRecipeId,
  sourcePath: EffectK8sClientBoundarySourcePath,
  exportName: "K8sHttpClient",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: EffectK8sClientBoundaryRecipeId,
      sourcePath: EffectK8sClientBoundarySourcePath,
      exportName: "K8sHttpClient",
      moduleKind: "Effect Kubernetes client boundary",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.effect-k8s-client-boundary.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const EffectK8sClientBoundaryRecipe = defineProjectionRecipe({
  id: EffectK8sClientBoundaryRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare Effect Kubernetes client boundary",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [EffectK8sClientBoundarySourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: EffectK8sClientBoundaryHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: EffectK8sClientBoundaryRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const EffectK8sClientBoundaryRecipes = [EffectK8sClientBoundaryRecipe] as const
