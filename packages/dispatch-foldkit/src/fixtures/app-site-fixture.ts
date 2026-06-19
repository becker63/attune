import { dispatchFixtureItems } from "@attune/dispatch-core";
import { fixtureRun } from "@attune/attuned-discovery";
import type { DispatchItem, DispatchRoute } from "@attune/dispatch-schema";

import type { FoldkitSiteFixture } from "../fixture-types.js";
import { foldkitAppPageFixtures, pageForRoute } from "./app-mdx-fixture.js";

export type DispatchFoldkitSurfaceId =
  | "dispatch"
  | "workbench"
  | "discover"
  | "findings"
  | "mdx";

export type DispatchFoldkitSurfaceFixture = Readonly<{
  readonly surfaceId: DispatchFoldkitSurfaceId;
  readonly route: DispatchRoute;
  readonly sourcePath: string;
  readonly expectedText: ReadonlyArray<string>;
}>;

export type DispatchFoldkitSiteFixture = Readonly<{
  readonly fixtureId: string;
  readonly scenarioId: "foldkit-fixture-closed-loop";
  readonly runId: string;
  readonly routes: ReadonlyArray<DispatchRoute>;
  readonly items: ReadonlyArray<DispatchItem>;
  readonly surfaces: ReadonlyArray<DispatchFoldkitSurfaceFixture>;
}>;

export const dispatchFoldkitSiteFixture = {
  fixtureId: "dispatch-foldkit-fixtured-site",
  scenarioId: "foldkit-fixture-closed-loop",
  runId: fixtureRun.runId,
  routes: foldkitAppPageFixtures.map((fixture) => fixture.route),
  items: dispatchFixtureItems,
  surfaces: [
    {
      surfaceId: "dispatch",
      route: "dispatch",
      sourcePath: "fixtures/dispatch.mdx",
      expectedText: ["Attune Dispatch", "Event river"],
    },
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
      surfaceId: "mdx",
      route: "workbench",
      sourcePath: "fixtures/workbench-atom-fixture.mdx",
      expectedText: ["FoldKit typed fixture route"],
    },
  ],
} satisfies DispatchFoldkitSiteFixture & FoldkitSiteFixture;

export const sitePageForRoute = (route: DispatchRoute) => pageForRoute(route);
