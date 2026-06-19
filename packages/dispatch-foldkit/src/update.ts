import type { Command } from "foldkit";

import { AdvanceFixtureStep, StartFixtureRun } from "./fixture-commands.js";
import { pageForRoute } from "./fixtures/app-mdx-fixture.js";
import type { Message } from "./message.js";
import type { Model } from "./model.js";

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>];
type MessageByTag<TTag extends Message["_tag"]> = Extract<
  Message,
  Readonly<{ _tag: TTag }>
>;

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case "SelectedRoute": {
      const selected = message as MessageByTag<"SelectedRoute">;
      return [
        { ...model, route: selected.route, page: pageForRoute(selected.route) },
        [],
      ];
    }
    case "SelectedFilter": {
      const selected = message as MessageByTag<"SelectedFilter">;
      return [{ ...model, filter: selected.filter }, []];
    }
    case "SelectedThread": {
      const selected = message as MessageByTag<"SelectedThread">;
      return [{ ...model, selectedThreadId: selected.threadId }, []];
    }
    case "SelectedHypothesis": {
      const selected = message as MessageByTag<"SelectedHypothesis">;
      return [{ ...model, selectedHypothesisId: selected.hypothesisId }, []];
    }
    case "RequestedPromotion": {
      const selected = message as MessageByTag<"RequestedPromotion">;
      return [
        {
          ...model,
          selectedHypothesisId: selected.hypothesisId,
          pendingCommand: `promote:${selected.hypothesisId}`,
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "advancing",
            lastError: "",
          },
        },
        [AdvanceFixtureStep({ step: "request-promotion" })],
      ];
    }
    case "FixtureStartRequested": {
      return [
        {
          ...model,
          pendingCommand: "fixture:start",
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "loading",
            lastError: "",
          },
        },
        [StartFixtureRun()],
      ];
    }
    case "FixtureStepRequested": {
      const selected = message as MessageByTag<"FixtureStepRequested">;
      return [
        {
          ...model,
          pendingCommand: `fixture:${selected.step}`,
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "advancing",
            lastError: "",
          },
        },
        [AdvanceFixtureStep({ step: selected.step })],
      ];
    }
    case "SelectedFixtureAnchor": {
      const selected = message as MessageByTag<"SelectedFixtureAnchor">;
      return [
        {
          ...model,
          fixtureRoute: {
            ...model.fixtureRoute,
            selectedAnchorId: selected.anchorId,
            status: "advancing",
            lastError: "",
          },
        },
        [AdvanceFixtureStep({ step: "select-anchor" })],
      ];
    }
    case "FixtureStepApplied": {
      const selected = message as MessageByTag<"FixtureStepApplied">;
      const anchorId =
        selected.result.step === "select-anchor"
          ? model.fixtureRoute.selectedAnchorId ||
            selected.result.snapshot.decisionPacket.anchors[0]?.anchorId ||
            ""
          : model.fixtureRoute.selectedAnchorId;
      return [
        {
          ...model,
          selectedRunId: selected.result.runId,
          serverSnapshot: selected.result.snapshot,
          pendingCommand: "",
          fixtureRoute: {
            ...model.fixtureRoute,
            scenarioId: selected.result.scenarioId,
            runId: selected.result.runId,
            routeStepCount: selected.result.routeStepCount,
            selectedAnchorId: anchorId,
            status: "ready",
            lastError: "",
            routeEvents: selected.result.routeEvents,
            trace: selected.result.trace,
            summary: selected.result.summary,
          },
        },
        [],
      ];
    }
    case "FixtureStepFailed": {
      const selected = message as MessageByTag<"FixtureStepFailed">;
      return [
        {
          ...model,
          pendingCommand: "",
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "failed",
            lastError: `${selected.step}: ${selected.reason}`,
          },
        },
        [],
      ];
    }
    case "ServerSnapshotChanged": {
      const selected = message as MessageByTag<"ServerSnapshotChanged">;
      return [
        {
          ...model,
          serverSnapshot: selected.snapshot,
          selectedRunId: selected.snapshot.runId,
          pendingCommand: "",
          fixtureRoute: {
            ...model.fixtureRoute,
            runId: selected.snapshot.runId,
            status: "ready",
            lastError: "",
          },
        },
        [],
      ];
    }
  }

  return [model, []];
};
