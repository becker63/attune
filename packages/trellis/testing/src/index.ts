import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"

export * from "./atom-graph-observer.js"
export * from "./coverage-guided-fuzzer.js"
export * from "./observation-producer.js"
export * from "./fastcheck.js"
export * from "./symbol-map.js"
export * from "./program-harness.js"
export * from "./recipe-contracts.js"
export * from "./replay-metadata.js"
export * from "./test-recipes.js"
export * from "./worker-metadata.js"
export * from "./recipes.js"

export const FrameworkTestingPublicApiRecipeId = "framework-testing.public-api" as const
export const FrameworkTestingPublicApiSourceRecipeId = "framework-testing.public-api.source" as const
export const FrameworkTestingPublicApiSourcePath = "packages/trellis/testing/src/index.ts" as const

export const describeFrameworkTestingPublicApi = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "public-api", {
    observationCount: input.symbolIds.length,
    replayMetadataCount: input.symbolIds.length,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingPublicApiSourceResource = defineAlchemyResource({
  id: "framework-testing.public-api.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingPublicApiSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingPublicApiRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingPublicApiReportResource = defineAlchemyResource({
  id: "framework-testing.public-api.report",
  kind: "report",
  alchemyType: "attune:resource:FrameworkTestingPublicApiReport",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: FrameworkTestingPublicApiRecipeId,
  producedBy: [FrameworkTestingPublicApiRecipeId],
})

export const FrameworkTestingPublicApiHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.public-api.handler",
  recipeId: FrameworkTestingPublicApiRecipeId,
  sourcePath: FrameworkTestingPublicApiSourcePath,
  exportName: "describeFrameworkTestingPublicApi",
  emitsReceipts: ["framework-testing.public-api.report"],
  handler: (input) => Effect.succeed(describeFrameworkTestingPublicApi(input)),
})

export const FrameworkTestingPublicApiDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FrameworkTestingPublicApiSourceRecipeId,
  toRecipeId: FrameworkTestingPublicApiRecipeId,
  resource: FrameworkTestingPublicApiReportResource,
  kind: "projects",
  modes: ["read", "project"],
  validationTargets: [FrameworkTestingTypecheckTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingPublicApiRecipe = defineProjectionRecipe({
  id: FrameworkTestingPublicApiRecipeId,
  projectId: FrameworkTestingProjectId,
  title: "Own framework testing public API barrel",
  inputSchema: FrameworkTestingSourceRecipeInput,
  outputSchema: FrameworkTestingSourceRecipeOutput,
  io: {
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    inputResources: [FrameworkTestingPublicApiSourceResource],
    outputResources: [FrameworkTestingPublicApiReportResource],
  },
  handler: FrameworkTestingPublicApiHandler,
  alchemyDag: [FrameworkTestingPublicApiDagEdge],
  nxTarget: FrameworkTestingTypecheckTarget,
  allowedFiles: [FrameworkTestingPublicApiSourcePath],
  validationEvidence: [FrameworkTestingTypecheckTarget],
})

export const FrameworkTestingPublicApiRecipes = [
  FrameworkTestingPublicApiRecipe,
] as const
