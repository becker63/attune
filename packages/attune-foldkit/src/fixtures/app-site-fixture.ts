import { fixtureRun } from "@attune/attuned-discovery";

import { activityFixtureItems } from "../activity.js";
import type { FoldkitSiteFixture } from "../fixture-types.js";
import type { ActivityItem, AttuneRoute } from "../schema.js";
import { foldkitAppPageFixtures, pageForRoute } from "./app-mdx-fixture.js";

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
