import type { Command } from "foldkit";

import { AdvanceFixtureStep, StartFixtureRun } from "./fixture-commands.js";
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
      return [{ ...model, route: selected.route }, []];
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
          pendingCommand: "request-promotion",
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
          pendingCommand: "start",
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
      const requested = message as MessageByTag<"FixtureStepRequested">;
      return [
        {
          ...model,
          pendingCommand: requested.step,
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "advancing",
            lastError: "",
          },
        },
        [
          requested.step === "start"
            ? StartFixtureRun()
            : AdvanceFixtureStep({ step: requested.step }),
        ],
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
          },
        },
        [AdvanceFixtureStep({ step: "select-anchor" })],
      ];
    }
    case "FixtureStepApplied": {
      const applied = message as MessageByTag<"FixtureStepApplied">;
      return [
        {
          ...model,
          serverSnapshot: applied.result.snapshot,
          selectedRunId: applied.result.runId,
          pendingCommand: "",
          fixtureRoute: {
            ...model.fixtureRoute,
            scenarioId: applied.result.scenarioId,
            runId: applied.result.runId,
            routeStepCount: applied.result.routeStepCount,
            status: "ready",
            lastError: "",
            routeEvents: [...applied.result.routeEvents],
            trace: [...applied.result.trace],
            summary: applied.result.summary,
          },
        },
        [],
      ];
    }
    case "FixtureStepFailed": {
      const failed = message as MessageByTag<"FixtureStepFailed">;
      return [
        {
          ...model,
          pendingCommand: "",
          fixtureRoute: {
            ...model.fixtureRoute,
            status: "failed",
            lastError: `${failed.step}: ${failed.reason}`,
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
