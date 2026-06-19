import { Schema as S } from "effect";

import { WorkbenchSnapshot } from "@attune/attuned-discovery";
import {
  DispatchFilter,
  DispatchItem,
  DispatchMdxPage,
  DispatchRoute,
} from "@attune/dispatch-schema";

import { FixtureRouteModel } from "./fixture-route.js";

export const Model = S.Struct({
  route: DispatchRoute,
  filter: DispatchFilter,
  selectedThreadId: S.String,
  selectedRunId: S.String,
  selectedHypothesisId: S.String,
  pendingCommand: S.String,
  items: S.Array(DispatchItem),
  page: DispatchMdxPage,
  serverSnapshot: S.NullOr(WorkbenchSnapshot),
  fixtureRoute: FixtureRouteModel,
});
export type Model = typeof Model.Type;
