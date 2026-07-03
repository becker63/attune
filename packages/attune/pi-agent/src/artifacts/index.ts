import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect } from "effect"

import { AttunePiEvidenceMatrixRecipes } from "./evidence-matrix.js"
import { AttunePiRunArtifactRecipes } from "./run-artifacts.js"

export * from "./evidence-matrix.js"
export * from "./run-artifacts.js"

export const AttunePiArtifactRecipes = [
  ...AttunePiEvidenceMatrixRecipes,
  ...AttunePiRunArtifactRecipes,
] as const

export const attunePiArtifactRecipeIds = (): readonly string[] =>
  AttunePiArtifactRecipes.map((recipe) => recipe.id)

export const AttunePiArtifactCatalogHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.artifact-catalog.handler",
  recipeId: "attune-pi-agent.evidence-matrix",
  sourcePath: "packages/attune/pi-agent/src/artifacts/index.ts",
  exportName: "attunePiArtifactRecipeIds",
  emitsReceipts: ["attune-pi-agent.artifact-catalog.projected"],
  handler: () => Effect.succeed(attunePiArtifactRecipeIds()),
})

export const AttunePiArtifactRecipeModule = [
  AttunePiArtifactCatalogHandler,
] as const
