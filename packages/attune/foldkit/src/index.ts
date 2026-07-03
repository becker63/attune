import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FoldKitEntryRecipeId,
  FoldKitIndexRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"

export { init } from "./main.js"
export { Message } from "./message.js"
export { Model } from "./model.js"
export { update } from "./update.js"
export { view } from "./view.js"
export {
  activityFixtureItems,
  activitySummaryCounts,
  compileFoldkitMdx,
  deriveThreads,
  filterActivityItems,
  workbenchMdx,
} from "./activity.js"
export {
  ActivityFilter,
  ActivityItem,
  ActivityKind,
  ActivityRef,
  ActivityRefKind,
  ActivityRisk,
  ActivitySeverity,
  ActivitySourceMode,
  AttuneRoute,
  FoldkitDocument,
  FoldkitMdxBlock,
  FoldkitMdxCode,
  FoldkitMdxComponent,
  FoldkitMdxComponentName,
  FoldkitMdxHeading,
  FoldkitMdxParagraph,
  FoldkitMdxProp,
  FoldkitMdxPropValue,
  FoldkitMdxText,
  FoldkitPage,
  FoldkitPageFrontmatter,
  WorkThread,
  WorkThreadStatus,
} from "./schema.js"
export {
  foldkitAppPageFixtures,
  foldkitAppPages,
  pageForRoute,
} from "./fixtures/app-mdx-fixture.js"
export { mdxViewFixture } from "./fixtures/mdx-view-fixture.js"
export {
  appliedWorkbenchAtomFixture,
  applyWorkbenchFixture,
  makeDiscoveryAtomWorkspace,
  workbenchAtomFixture,
} from "./fixtures/workbench-atom-fixture.js"
export * from "./recipes.js"
export type {
  AppliedWorkbenchFixture,
  FoldkitMdxViewFixture,
  FoldkitWorkbenchFixture,
  FoldkitWorkbenchFixtureStep,
} from "./fixture-types.js"

export const FoldKitIndexSourcePath =
  "packages/attune/foldkit/src/index.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitIndexResource = defineAlchemyResource({
  id: "attune-foldkit.public-api-barrel.report",
  kind: "package-metadata",
  alchemyType: "attune:resource:PackageMetadata",
  ownerRecipeId: FoldKitIndexRecipeId,
  producedBy: [FoldKitIndexRecipeId],
  consumedBy: [FoldKitEntryRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitPublicApi = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitIndexRecipeId,
    sourcePath: FoldKitIndexSourcePath,
    surface: "FoldKit public API barrel for runtime, activity, schema, fixture, and recipe exports",
    exportedSymbols: [
      "init",
      "Message",
      "Model",
      "update",
      "view",
      "FoldKitReportRecipes",
    ],
  })

export const FoldKitIndexHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.public-api-barrel.handler",
  recipeId: FoldKitIndexRecipeId,
  sourcePath: FoldKitIndexSourcePath,
  exportName: "describeFoldKitPublicApi",
  handler: () => Effect.succeed(describeFoldKitPublicApi()),
  emitsReceipts: ["attune-foldkit.public-api-barrel.report"],
})

export const FoldKitIndexDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitIndexRecipeId,
  toRecipeId: FoldKitEntryRecipeId,
  resource: FoldKitIndexResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitIndexRecipe = defineProjectionRecipe({
  id: FoldKitIndexRecipeId,
  projectId: FoldKitProjectId,
  title: "Expose the FoldKit public API barrel",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: [FoldKitIndexSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitIndexResource],
  },
  handler: FoldKitIndexHandler,
  alchemyDag: [FoldKitIndexDagEdge],
})

export const FoldKitIndexRecipes = [FoldKitIndexRecipe] as const
