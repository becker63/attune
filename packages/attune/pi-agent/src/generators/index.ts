import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect } from "effect"

import { AttunePiPermissionPolicyGeneratorRecipes } from "./permission-policy/generator.js"
import { AttunePiGeneratorRendererRecipes } from "./renderers.js"
import { AttunePiSpecGeneratorRecipes } from "./spec/generator.js"
import { AttunePiTaskplaneTaskGeneratorRecipes } from "./taskplane-task/generator.js"
import { AttunePiTestObligationGeneratorRecipes } from "./test-obligation/generator.js"

export * from "./permission-policy/generator.js"
export * from "./renderers.js"
export * from "./spec/generator.js"
export * from "./taskplane-task/generator.js"
export * from "./test-obligation/generator.js"

export const AttunePiGeneratorRecipes = [
  ...AttunePiGeneratorRendererRecipes,
  ...AttunePiSpecGeneratorRecipes,
  ...AttunePiPermissionPolicyGeneratorRecipes,
  ...AttunePiTestObligationGeneratorRecipes,
  ...AttunePiTaskplaneTaskGeneratorRecipes,
] as const

export const attunePiGeneratorRecipeIds = (): readonly string[] =>
  AttunePiGeneratorRecipes.map((recipe) => recipe.id)

export const AttunePiGeneratorCatalogHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.generator-catalog.handler",
  recipeId: "attune-pi-agent.generator-artifacts",
  sourcePath: "packages/attune/pi-agent/src/generators/index.ts",
  exportName: "attunePiGeneratorRecipeIds",
  emitsReceipts: ["attune-pi-agent.generator-catalog.projected"],
  handler: () => Effect.succeed(attunePiGeneratorRecipeIds()),
})

export const AttunePiGeneratorRecipeModule = [
  AttunePiGeneratorCatalogHandler,
] as const
