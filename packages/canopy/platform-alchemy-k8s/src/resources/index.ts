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

export * from "./registry.js"


export const K8sResourcesBarrelRecipeId = "platform-alchemy-k8s.resources-barrel" as const
const K8sResourcesBarrelHandlerId = "platform-alchemy-k8s.resources-barrel.handler" as const
const K8sResourcesBarrelSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/index.ts" as const

export const K8sResourcesBarrelHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: K8sResourcesBarrelHandlerId,
  recipeId: K8sResourcesBarrelRecipeId,
  sourcePath: K8sResourcesBarrelSourcePath,
  exportName: "resources",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: K8sResourcesBarrelRecipeId,
      sourcePath: K8sResourcesBarrelSourcePath,
      exportName: "resources",
      moduleKind: "Kubernetes resources public barrel",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.resources-barrel.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const K8sResourcesBarrelRecipe = defineProjectionRecipe({
  id: K8sResourcesBarrelRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare Kubernetes resources public barrel",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [K8sResourcesBarrelSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: K8sResourcesBarrelHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: K8sResourcesBarrelRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const K8sResourcesBarrelRecipes = [K8sResourcesBarrelRecipe] as const
