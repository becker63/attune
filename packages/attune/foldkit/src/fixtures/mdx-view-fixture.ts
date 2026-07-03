import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { compileFoldkitMdx } from "../activity.js"
import type { FoldkitMdxViewFixture } from "../fixture-types.js"
import {
  FoldKitAppMdxFixtureRecipeId,
  FoldKitMdxViewFixtureRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "../schema.js"
import { FoldKitWorkbenchAtomFixtureResource } from "./workbench-atom-fixture.js"

export const workbenchMdxSource = `---
title: FoldKit typed fixture route
---

# FoldKit typed fixture route

Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.

<PageHeader eyebrow="Workbench" title="Atom-derived fixture" />
<StatStrip label="Appended events" value="6" />
<ActivityList source="workbenchAtomFixture" />
<ActionBar primary="Promote rule" secondary="View trace" />
`

export const mdxViewFixture = {
  fixtureId: "foldkit-mdx-view-fixture",
  sourcePath: "fixtures/workbench-atom-fixture.mdx",
  page: compileFoldkitMdx(
    workbenchMdxSource,
    "fixtures/workbench-atom-fixture.mdx",
  ),
  expectedText: [
    "FoldKit typed fixture route",
    "Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.",
    "Atom-derived fixture",
  ],
  expectedComponents: ["PageHeader", "StatStrip", "ActivityList", "ActionBar"],
} satisfies FoldkitMdxViewFixture

export const FoldKitMdxViewFixtureSourcePath =
  "packages/attune/foldkit/src/fixtures/mdx-view-fixture.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitMdxViewFixtureResource = defineAlchemyResource({
  id: "attune-foldkit.mdx-view-fixture.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitMdxViewFixtureRecipeId,
  producedBy: [FoldKitMdxViewFixtureRecipeId],
  consumedBy: [FoldKitAppMdxFixtureRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitMdxViewFixture = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitMdxViewFixtureRecipeId,
    sourcePath: FoldKitMdxViewFixtureSourcePath,
    surface: "Compiled MDX view fixture and expected component contract",
    exportedSymbols: ["workbenchMdxSource", "mdxViewFixture"],
  })

export const FoldKitMdxViewFixtureHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.mdx-view-fixture.handler",
  recipeId: FoldKitMdxViewFixtureRecipeId,
  sourcePath: FoldKitMdxViewFixtureSourcePath,
  exportName: "describeFoldKitMdxViewFixture",
  handler: () => Effect.succeed(describeFoldKitMdxViewFixture()),
  emitsReceipts: ["attune-foldkit.mdx-view-fixture.report"],
})

export const FoldKitMdxViewFixtureDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitMdxViewFixtureRecipeId,
  toRecipeId: FoldKitAppMdxFixtureRecipeId,
  resource: FoldKitMdxViewFixtureResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitMdxViewFixtureRecipe = defineProjectionRecipe({
  id: FoldKitMdxViewFixtureRecipeId,
  projectId: FoldKitProjectId,
  title: "Project FoldKit MDX view fixture evidence",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitMdxViewFixtureSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitWorkbenchAtomFixtureResource,
    ],
    outputResources: [FoldKitMdxViewFixtureResource],
  },
  handler: FoldKitMdxViewFixtureHandler,
  alchemyDag: [FoldKitMdxViewFixtureDagEdge],
})

export const FoldKitMdxViewFixtureRecipes = [
  FoldKitMdxViewFixtureRecipe,
] as const
