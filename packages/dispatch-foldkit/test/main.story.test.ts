import { Effect } from "effect";
import { Story } from "foldkit";
import { afterEach, describe, expect, test } from "vitest";

import {
  AdvanceFixtureStep,
  StartFixtureRun,
} from "../src/fixture-commands.js";
import { resetFixtureRouteRuntimeForTest } from "../src/fixture-route.js";
import {
  FixtureStepFailed,
  FixtureStepRequested,
  RequestedPromotion,
  SelectedFilter,
  SelectedHypothesis,
  SelectedRoute,
} from "../src/message.js";
import { init } from "../src/main.js";
import { update } from "../src/update.js";
import { view } from "../src/view.js";

const initialModel = () => {
  const [model] = init();

  return model;
};

afterEach(() => {
  resetFixtureRouteRuntimeForTest();
});

describe("React-to-FoldKit migration story contract", () => {
  test("fixture startup is a named FoldKit command", () => {
    const [, commands] = init();

    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe(StartFixtureRun.name);
  });

  test("route selection stays in the FoldKit message/update loop", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedRoute({ route: "workbench" })),
      Story.model((model) => {
        expect(model.route).toBe("workbench");
      }),
      Story.Command.expectNone(),
    );
  });

  test("event-river filters are behavior, not React component state", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedFilter({ filter: "safety" })),
      Story.model((model) => {
        expect(model.filter).toBe("safety");
      }),
      Story.message(SelectedFilter({ filter: "failed" })),
      Story.model((model) => {
        expect(model.filter).toBe("failed");
      }),
      Story.Command.expectNone(),
    );
  });

  test("workbench hypothesis selection is explicit agent-facing state", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedHypothesis({ hypothesisId: "hyp-2" })),
      Story.model((model) => {
        expect(model.selectedHypothesisId).toBe("hyp-2");
        expect(model.pendingCommand).toBe("start");
      }),
      Story.message(RequestedPromotion({ hypothesisId: "hyp-2" })),
      Story.model((model) => {
        expect(model.selectedHypothesisId).toBe("hyp-2");
        expect(model.pendingCommand).toBe("request-promotion");
        expect(model.fixtureRoute.status).toBe("advancing");
      }),
      Story.Command.expectHas(AdvanceFixtureStep),
      Story.Command.resolve(
        AdvanceFixtureStep,
        FixtureStepFailed({
          step: "request-promotion",
          reason: "test resolver",
        }),
      ),
    );
  });

  test("fixture command advances projection, atom snapshot, model, and render", async () => {
    const [model, startupCommands] = init();
    const startupMessage = await Effect.runPromise(startupCommands[0]!.effect);

    expect(startupMessage._tag).toBe("FixtureStepApplied");
    if (startupMessage._tag !== "FixtureStepApplied") {
      throw new Error("expected fixture startup to apply");
    }
    expect(startupMessage.result.snapshot.version).toBe(3);
    expect(startupMessage.result.snapshot.decisionPacket.evidence).toHaveLength(
      0,
    );

    const [started] = update(model, startupMessage);
    const [requestingProof, proofCommands] = update(
      started,
      FixtureStepRequested({ step: "complete-proof" }),
    );
    const proofMessage = await Effect.runPromise(proofCommands[0]!.effect);

    expect(proofMessage._tag).toBe("FixtureStepApplied");
    if (proofMessage._tag !== "FixtureStepApplied") {
      throw new Error("expected fixture proof step to apply");
    }

    const [advancedDispatch] = update(requestingProof, proofMessage);
    const [advanced] = update(
      advancedDispatch,
      SelectedRoute({ route: "workbench" }),
    );
    const renderedText = JSON.stringify(view(advanced));

    expect(advanced.serverSnapshot?.version).toBeGreaterThan(
      startupMessage.result.snapshot.version,
    );
    expect(advanced.serverSnapshot?.decisionPacket.evidence).toHaveLength(1);
    expect(advanced.fixtureRoute.trace.at(-1)?.semanticEventTags).toEqual([
      "JoernEvidenceScored",
      "AgentDecisionRecorded",
      "HumanReviewRequested",
    ]);
    expect(advanced.fixtureRoute.trace.at(-1)?.invalidatedKeys).toContain(
      "attuned-discovery/evidence",
    );
    expect(renderedText).toContain("Known Joern template found");
    expect(renderedText).toContain("snapshot v6");
  });
});
