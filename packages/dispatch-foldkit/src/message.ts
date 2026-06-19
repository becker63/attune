import { Schema as S } from "effect";
import { m } from "foldkit/message";

import { WorkbenchSnapshot } from "@attune/attuned-discovery";
import { DispatchFilter, DispatchRoute } from "@attune/dispatch-schema";

import { FixtureStep, FixtureStepResult } from "./fixture-route.js";

export const SelectedRoute = m("SelectedRoute", { route: DispatchRoute });
export const SelectedFilter = m("SelectedFilter", { filter: DispatchFilter });
export const SelectedThread = m("SelectedThread", { threadId: S.String });
export const SelectedHypothesis = m("SelectedHypothesis", {
  hypothesisId: S.String,
});
export const RequestedPromotion = m("RequestedPromotion", {
  hypothesisId: S.String,
});
export const FixtureStartRequested = m("FixtureStartRequested");
export const FixtureStepRequested = m("FixtureStepRequested", {
  step: FixtureStep,
});
export const SelectedFixtureAnchor = m("SelectedFixtureAnchor", {
  anchorId: S.String,
});
export const FixtureStepApplied = m("FixtureStepApplied", {
  result: FixtureStepResult,
});
export const FixtureStepFailed = m("FixtureStepFailed", {
  step: FixtureStep,
  reason: S.String,
});
export const ServerSnapshotChanged = m("ServerSnapshotChanged", {
  snapshot: WorkbenchSnapshot,
});

export const Message = S.Union([
  SelectedRoute,
  SelectedFilter,
  SelectedThread,
  SelectedHypothesis,
  RequestedPromotion,
  FixtureStartRequested,
  FixtureStepRequested,
  SelectedFixtureAnchor,
  FixtureStepApplied,
  FixtureStepFailed,
  ServerSnapshotChanged,
]);
export type Message = typeof Message.Type;
