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

import { Schema } from "effect"

export const BudgetClass = Schema.Literals(["free", "standard", "expensive"])
export type BudgetClass = typeof BudgetClass.Type

export interface BudgetPolicyRequired {
  readonly budgetClass: BudgetClass
  readonly reservationRequired: true
}

export const BudgetPolicy = {
  required: (budgetClass: BudgetClass = "standard"): BudgetPolicyRequired => ({
    budgetClass,
    reservationRequired: true,
  }),
  labels: (policy: BudgetPolicyRequired): Readonly<Record<string, string>> => ({
    "attune.dev/budget-class": policy.budgetClass,
    "attune.dev/budget-reservation-required": String(policy.reservationRequired),
  }),
} as const


export const BudgetPolicyResourceRecipeId = "platform-alchemy-k8s.budget-policy-resource" as const
const BudgetPolicyResourceHandlerId = "platform-alchemy-k8s.budget-policy-resource.handler" as const
const BudgetPolicyResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/budget-policy.ts" as const

export const BudgetPolicyResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: BudgetPolicyResourceHandlerId,
  recipeId: BudgetPolicyResourceRecipeId,
  sourcePath: BudgetPolicyResourceSourcePath,
  exportName: "BudgetPolicy",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: BudgetPolicyResourceRecipeId,
      sourcePath: BudgetPolicyResourceSourcePath,
      exportName: "BudgetPolicy",
      moduleKind: "budget policy resource metadata",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.budget-policy-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const BudgetPolicyResourceRecipe = defineProjectionRecipe({
  id: BudgetPolicyResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare budget policy resource metadata",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [BudgetPolicyResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: BudgetPolicyResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: BudgetPolicyResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const BudgetPolicyResourceRecipes = [BudgetPolicyResourceRecipe] as const
