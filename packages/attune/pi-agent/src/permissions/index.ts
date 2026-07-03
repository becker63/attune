import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect } from "effect"

import { AttunePiDefaultPermissionProfileRecipes } from "./default-profile.js"
import { AttunePiPermissionDecisionRecipes } from "./permission-decision.js"

export * from "./default-profile.js"
export * from "./permission-decision.js"

export const AttunePiPermissionRecipes = [
  ...AttunePiDefaultPermissionProfileRecipes,
  ...AttunePiPermissionDecisionRecipes,
] as const

export const attunePiPermissionRecipeIds = (): readonly string[] =>
  AttunePiPermissionRecipes.map((recipe) => recipe.id)

export const AttunePiPermissionCatalogHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.permission-catalog.handler",
  recipeId: "attune-pi-agent.permission-profile",
  sourcePath: "packages/attune/pi-agent/src/permissions/index.ts",
  exportName: "attunePiPermissionRecipeIds",
  emitsReceipts: ["attune-pi-agent.permission-catalog.projected"],
  handler: () => Effect.succeed(attunePiPermissionRecipeIds()),
})

export const AttunePiPermissionRecipeModule = [
  AttunePiPermissionCatalogHandler,
] as const
