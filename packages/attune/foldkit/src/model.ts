import { Schema as S } from "effect";

import { WorkbenchSnapshot } from "@attune/attuned-discovery";
import {
  ActivityFilter,
  ActivityItem,
  FoldkitPage,
  AttuneRoute,
} from "./schema.js";

import { FixtureRouteModel } from "./fixture-route.js";

export const Model = S.Struct({
  route: AttuneRoute,
  filter: ActivityFilter,
  selectedThreadId: S.String,
  selectedRunId: S.String,
  selectedHypothesisId: S.String,
  selectedEvidenceId: S.String,
  pendingCommand: S.String,
  items: S.Array(ActivityItem),
  page: FoldkitPage,
  serverSnapshot: S.NullOr(WorkbenchSnapshot),
  fixtureRoute: FixtureRouteModel,
});
export type Model = typeof Model.Type;
