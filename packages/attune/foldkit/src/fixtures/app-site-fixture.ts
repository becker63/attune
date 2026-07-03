import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol";
import { fixtureRun } from "@attune/attuned-discovery";
import { Effect } from "effect";

import { activityFixtureItems } from "../activity.js";
import type { FoldkitSiteFixture } from "../fixture-types.js";
import type { ActivityItem, AttuneRoute } from "../schema.js";
import {
  FoldKitAppSiteFixtureRecipeId,
  FoldKitFixtureRouteRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "../schema.js";
import { foldkitAppPageFixtures, pageForRoute } from "./app-mdx-fixture.js";
import { FoldKitAppMdxFixtureResource } from "./app-mdx-fixture.js";

export type AttuneFoldkitSurfaceId =
  | "workbench"
  | "discover"
  | "findings"
  | "lineage"
  | "exports"
  | "settings"
  | "mdx";

export type AttuneFoldkitSurfaceFixture = Readonly<{
  readonly surfaceId: AttuneFoldkitSurfaceId;
  readonly route: AttuneRoute;
  readonly sourcePath: string;
  readonly expectedText: ReadonlyArray<string>;
}>;

export type AttuneFoldkitSiteFixture = Readonly<{
  readonly fixtureId: string;
  readonly scenarioId: "foldkit-fixture-closed-loop";
  readonly runId: string;
  readonly routes: ReadonlyArray<AttuneRoute>;
  readonly items: ReadonlyArray<ActivityItem>;
  readonly surfaces: ReadonlyArray<AttuneFoldkitSurfaceFixture>;
}>;

export const attuneFoldkitSiteFixture = {
  fixtureId: "attune-foldkit-fixtured-site",
  scenarioId: "foldkit-fixture-closed-loop",
  runId: fixtureRun.runId,
  routes: foldkitAppPageFixtures.map((fixture) => fixture.route),
  items: activityFixtureItems,
  surfaces: [
    {
      surfaceId: "workbench",
      route: "workbench",
      sourcePath: "fixtures/workbench.mdx",
      expectedText: ["Atom-derived snapshot", "Promote rule"],
    },
    {
      surfaceId: "discover",
      route: "discover",
      sourcePath: "fixtures/discover.mdx",
      expectedText: ["Ready to inspect", "All patterns"],
    },
    {
      surfaceId: "findings",
      route: "findings",
      sourcePath: "fixtures/findings.mdx",
      expectedText: ["Review decision", "True positive"],
    },
    {
      surfaceId: "lineage",
      route: "lineage",
      sourcePath: "fixtures/lineage.mdx",
      expectedText: ["Scene graph", "Route trace"],
    },
    {
      surfaceId: "exports",
      route: "exports",
      sourcePath: "fixtures/exports.mdx",
      expectedText: ["Run summary", "Export packet"],
    },
    {
      surfaceId: "settings",
      route: "settings",
      sourcePath: "fixtures/settings.mdx",
      expectedText: ["Fixture settings", "Safety gate"],
    },
    {
      surfaceId: "mdx",
      route: "workbench",
      sourcePath: "fixtures/workbench-atom-fixture.mdx",
      expectedText: ["FoldKit typed fixture route"],
    },
  ],
} satisfies AttuneFoldkitSiteFixture & FoldkitSiteFixture;

export const sitePageForRoute = (route: AttuneRoute) => pageForRoute(route);

export const FoldKitAppSiteFixtureSourcePath =
  "packages/attune/foldkit/src/fixtures/app-site-fixture.ts" as const;

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitAppSiteFixtureResource = defineAlchemyResource({
  id: "attune-foldkit.app-site-fixture.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitAppSiteFixtureRecipeId,
  producedBy: [FoldKitAppSiteFixtureRecipeId],
  consumedBy: [FoldKitFixtureRouteRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
});

export const describeFoldKitAppSiteFixture = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitAppSiteFixtureRecipeId,
    sourcePath: FoldKitAppSiteFixtureSourcePath,
    surface: "Site fixture route map and activity-backed FoldKit page surface",
    exportedSymbols: ["attuneFoldkitSiteFixture", "sitePageForRoute"],
  });

export const FoldKitAppSiteFixtureHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.app-site-fixture.handler",
  recipeId: FoldKitAppSiteFixtureRecipeId,
  sourcePath: FoldKitAppSiteFixtureSourcePath,
  exportName: "describeFoldKitAppSiteFixture",
  handler: () => Effect.succeed(describeFoldKitAppSiteFixture()),
  emitsReceipts: ["attune-foldkit.app-site-fixture.report"],
});

export const FoldKitAppSiteFixtureDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitAppSiteFixtureRecipeId,
  toRecipeId: FoldKitFixtureRouteRecipeId,
  resource: FoldKitAppSiteFixtureResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
});

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitAppSiteFixtureRecipe = defineProjectionRecipe({
  id: FoldKitAppSiteFixtureRecipeId,
  projectId: FoldKitProjectId,
  title: "Project FoldKit site fixture routes",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitAppSiteFixtureSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitAppMdxFixtureResource,
    ],
    outputResources: [FoldKitAppSiteFixtureResource],
  },
  handler: FoldKitAppSiteFixtureHandler,
  alchemyDag: [FoldKitAppSiteFixtureDagEdge],
});

export const FoldKitAppSiteFixtureRecipes = [
  FoldKitAppSiteFixtureRecipe,
] as const;
