import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { compileFoldkitMdx } from "../activity.js"
import type { AttuneRoute } from "../schema.js"
import {
  FoldKitAppMdxFixtureRecipeId,
  FoldKitAppSiteFixtureRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "../schema.js"
import { FoldKitMdxViewFixtureResource } from "./mdx-view-fixture.js"

export type FoldkitAppPageFixture = Readonly<{
  readonly route: AttuneRoute
  readonly sourcePath: string
  readonly source: string
}>

export const foldkitAppPageFixtures = [
  {
    route: "workbench",
    sourcePath: "fixtures/workbench.mdx",
    source: `---
route: workbench
title: Workbench
description: Atom-derived fixture workbench.
---

<PageHeader eyebrow="Workbench" title="Fixture workbench" subtitle="FoldKit reads the atom-derived snapshot produced by the local route." />
<StatStrip items={["0 events", "0 snapshot version", "0 ms", "0 reviews"]} />
<OptimizationPacket />
<AnchorList />
<HypothesisList />
<EvidenceList />
<ReviewQueue />
<PatternDossier title="Typed WorkbenchSnapshot" evidence="Evidence pending" />
<ExamplePair positive="Looks like" negative="Does not look like" />
<ActionBar primary="Run proof" command="complete-proof" secondary="View findings" secondaryRoute="findings" />
<ActionBar primary="Promote rule" command="promote" secondary="Open exports" secondaryRoute="exports" />
`,
  },
  {
    route: "discover",
    sourcePath: "fixtures/discover.mdx",
    source: `---
route: discover
title: Discover
description: Candidate semantic patterns.
---

<PageHeader eyebrow="Discover" title="Candidate semantic patterns" subtitle="Anchor cards and hypotheses come from the current atom snapshot." />
<PatternList />
<AnchorList />
<HypothesisList />
<ActionBar primary="Select first anchor" command="select-anchor" secondary="Open workbench" secondaryRoute="workbench" />
`,
  },
  {
    route: "findings",
    sourcePath: "fixtures/findings.mdx",
    source: `---
route: findings
title: Findings
description: Review matched evidence.
---

<PageHeader eyebrow="Findings" title="Review what this candidate matched" subtitle="Confirm true positives and weed out noise before promoting the rule." />
<EvidenceList />
<FuzzerFinding path="src/components/Card.tsx" />
<ActionBar primary="True positive" command="complete-proof" secondary="Open lineage" secondaryRoute="lineage" />
`,
  },
  {
    route: "lineage",
    sourcePath: "fixtures/lineage.mdx",
    source: `---
route: lineage
title: Lineage
description: Candidate lineage.
---

<PageHeader eyebrow="Lineage" title="Candidate lineage" subtitle="Track how examples, selectors, and evidence changed before promotion." />
<SceneGraph />
<RouteTrace />
<ActionBar primary="Open exports" primaryRoute="exports" secondary="Back to workbench" secondaryRoute="workbench" />
`,
  },
  {
    route: "exports",
    sourcePath: "fixtures/exports.mdx",
    source: `---
route: exports
title: Exports
description: Export promoted rule packet.
---

<PageHeader eyebrow="Exports" title="Export promoted rule packet" subtitle="Ship ast-grep rules, prompts, examples, and review evidence as one artifact." />
<RunSummaryPanel />
<ExportPacket />
<ActionBar primary="Promote rule" command="promote" secondary="Settings" secondaryRoute="settings" />
`,
  },
  {
    route: "settings",
    sourcePath: "fixtures/settings.mdx",
    source: `---
route: settings
title: Settings
description: Workspace settings.
---

<PageHeader eyebrow="Settings" title="Workspace settings" subtitle="Keep scan paths, model routing, and promotion thresholds explicit." />
<SettingsPanel />
<SafetyGate />
<ActionBar primary="Restart fixture" command="fixture-start" secondary="Open workbench" secondaryRoute="workbench" />
`,
  },
] satisfies ReadonlyArray<FoldkitAppPageFixture>

export const foldkitAppPages = foldkitAppPageFixtures.map((page) =>
  compileFoldkitMdx(page.source, page.sourcePath),
)

export const pageForRoute = (route: AttuneRoute) =>
  foldkitAppPages.find((page) => page.route === route) ?? foldkitAppPages[0]!

export const FoldKitAppMdxFixtureSourcePath =
  "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitAppMdxFixtureResource = defineAlchemyResource({
  id: "attune-foldkit.app-mdx-fixture.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitAppMdxFixtureRecipeId,
  producedBy: [FoldKitAppMdxFixtureRecipeId],
  consumedBy: [FoldKitAppSiteFixtureRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitAppMdxFixture = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitAppMdxFixtureRecipeId,
    sourcePath: FoldKitAppMdxFixtureSourcePath,
    surface: "Route-indexed MDX page fixtures compiled into FoldKit pages",
    exportedSymbols: [
      "foldkitAppPageFixtures",
      "foldkitAppPages",
      "pageForRoute",
    ],
  })

export const FoldKitAppMdxFixtureHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.app-mdx-fixture.handler",
  recipeId: FoldKitAppMdxFixtureRecipeId,
  sourcePath: FoldKitAppMdxFixtureSourcePath,
  exportName: "describeFoldKitAppMdxFixture",
  handler: () => Effect.succeed(describeFoldKitAppMdxFixture()),
  emitsReceipts: ["attune-foldkit.app-mdx-fixture.report"],
})

export const FoldKitAppMdxFixtureDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitAppMdxFixtureRecipeId,
  toRecipeId: FoldKitAppSiteFixtureRecipeId,
  resource: FoldKitAppMdxFixtureResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitAppMdxFixtureRecipe = defineProjectionRecipe({
  id: FoldKitAppMdxFixtureRecipeId,
  projectId: FoldKitProjectId,
  title: "Project FoldKit route MDX fixtures",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitAppMdxFixtureSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitMdxViewFixtureResource,
    ],
    outputResources: [FoldKitAppMdxFixtureResource],
  },
  handler: FoldKitAppMdxFixtureHandler,
  alchemyDag: [FoldKitAppMdxFixtureDagEdge],
})

export const FoldKitAppMdxFixtureRecipes = [
  FoldKitAppMdxFixtureRecipe,
] as const
