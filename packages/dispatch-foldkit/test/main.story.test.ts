import { Story } from "foldkit";
import { describe, expect, test } from "vitest";

import {
  FixtureStartRequested,
  FixtureStepApplied,
  FixtureStepRequested,
  RequestedPromotion,
  SelectedFilter,
  SelectedHypothesis,
  SelectedRoute,
} from "../src/message.js";
import {
  advanceFixtureStep,
  resetFixtureRouteRuntimeForTest,
  startFixtureRoute,
} from "../src/fixture-route.js";
import { StartFixtureRun } from "../src/fixture-commands.js";
import { dispatchFoldkitSiteFixture } from "../src/fixtures/app-site-fixture.js";
import { appliedWorkbenchAtomFixture } from "../src/fixtures/workbench-atom-fixture.js";
import { init } from "../src/main.js";
import { update } from "../src/update.js";

const initialModel = () => {
  const [model] = init();

  return model;
};

describe("React-to-FoldKit migration story contract", () => {
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
    const [selectedModel, selectedCommands] = update(
      initialModel(),
      SelectedHypothesis({ hypothesisId: "hyp-2" }),
    );

    expect(selectedModel.selectedHypothesisId).toBe("hyp-2");
    expect(selectedModel.pendingCommand).toBe("");
    expect(selectedCommands).toHaveLength(0);

    const [promotionModel, promotionCommands] = update(
      selectedModel,
      RequestedPromotion({ hypothesisId: "hyp-2" }),
    );

    expect(promotionModel.selectedHypothesisId).toBe("hyp-2");
    expect(promotionModel.pendingCommand).toBe("promote:hyp-2");
    expect(promotionModel.fixtureRoute.status).toBe("advancing");
    expect(promotionCommands).toHaveLength(1);
  });

  test("typed workbench fixture appends DiscoveryEvent facts before snapshot projection", async () => {
    resetFixtureRouteRuntimeForTest();
    const [model, commands] = init();
    expect(model.serverSnapshot).toBeNull();
    expect(commands).toHaveLength(1);
    expect(appliedWorkbenchAtomFixture.appendedEvents).toHaveLength(6);
    expect(appliedWorkbenchAtomFixture.trace[0]).toContain(
      "append:DiscoveryRunStarted",
    );

    const result = await startFixtureRoute();

    Story.story(
      update,
      Story.with(model),
      Story.message(FixtureStartRequested()),
      Story.Command.expectExact(StartFixtureRun),
      Story.Command.resolve(StartFixtureRun, FixtureStepApplied({ result })),
      Story.model((startedModel) => {
        expect(startedModel.serverSnapshot?.version).toBe(
          result.snapshot.version,
        );
        expect(startedModel.fixtureRoute.summary?.eventCount).toBe(3);
        expect(
          startedModel.serverSnapshot?.decisionPacket.hypotheses[0]?.title,
        ).toBe("Server atoms derive meaning; FoldKit steers the lens");
      }),
      Story.Command.expectNone(),
    );
  });

  test("MDX route fixtures keep navigation and promotion in the FoldKit loop", () => {
    const [workbenchModel] = update(
      initialModel(),
      SelectedRoute({ route: "workbench" }),
    );
    expect(workbenchModel.route).toBe("workbench");
    expect(workbenchModel.page.document.sourcePath).toBe(
      "fixtures/workbench.mdx",
    );

    const [promotionModel, promotionCommands] = update(
      workbenchModel,
      RequestedPromotion({
        hypothesisId: "hypothesis-server-atoms-foldkit-lens",
      }),
    );
    expect(promotionModel.pendingCommand).toBe(
      "promote:hypothesis-server-atoms-foldkit-lens",
    );
    expect(promotionCommands).toHaveLength(1);

    const [findingsModel] = update(
      promotionModel,
      SelectedRoute({ route: "findings" }),
    );
    expect(findingsModel.route).toBe("findings");
    expect(findingsModel.page.document.sourcePath).toBe(
      "fixtures/findings.mdx",
    );
  });

  test("site fixture declares deterministic coverage for every existing route surface", () => {
    expect(dispatchFoldkitSiteFixture.routes).toEqual(
      expect.arrayContaining([
        "dispatch",
        "discover",
        "workbench",
        "findings",
        "lineage",
        "exports",
        "settings",
      ]),
    );
    expect(
      dispatchFoldkitSiteFixture.surfaces.map((surface) => surface.surfaceId),
    ).toEqual(
      expect.arrayContaining([
        "dispatch",
        "workbench",
        "discover",
        "findings",
        "mdx",
      ]),
    );
    expect(dispatchFoldkitSiteFixture.items.length).toBeGreaterThan(0);
  });

  test("fixture start and step requests return deterministic FoldKit commands", async () => {
    resetFixtureRouteRuntimeForTest();
    const model = initialModel();

    const [startingModel, startCommands] = update(
      model,
      FixtureStartRequested(),
    );

    expect(startingModel.pendingCommand).toBe("fixture:start");
    expect(startingModel.fixtureRoute.status).toBe("loading");
    expect(startCommands).toHaveLength(1);

    const startResult = await startFixtureRoute();
    const [startedModel] = update(
      startingModel,
      FixtureStepApplied({ result: startResult }),
    );

    expect(startedModel.serverSnapshot?.version).toBeGreaterThan(0);
    expect(startedModel.fixtureRoute.routeEvents).toHaveLength(2);
    expect(startedModel.fixtureRoute.summary?.eventCount).toBe(3);
    expect(
      startedModel.fixtureRoute.trace[0]?.atomLabels.length,
    ).toBeGreaterThan(0);

    const [advancingModel, stepCommands] = update(
      startedModel,
      FixtureStepRequested({ step: "complete-proof" }),
    );

    expect(advancingModel.pendingCommand).toBe("fixture:complete-proof");
    expect(advancingModel.fixtureRoute.status).toBe("advancing");
    expect(stepCommands).toHaveLength(1);

    const proofResult = await advanceFixtureStep("complete-proof");
    const [provedModel] = update(
      advancingModel,
      FixtureStepApplied({ result: proofResult }),
    );

    expect(provedModel.pendingCommand).toBe("");
    expect(provedModel.fixtureRoute.status).toBe("ready");
    expect(provedModel.fixtureRoute.routeEvents.length).toBeGreaterThan(2);
    expect(provedModel.fixtureRoute.trace.at(-1)?.semanticEventTags).toContain(
      "JoernEvidenceScored",
    );
    expect(
      provedModel.fixtureRoute.trace.at(-1)?.invalidatedKeys.length,
    ).toBeGreaterThan(0);
    expect(provedModel.serverSnapshot?.version).toBeGreaterThan(
      startedModel.serverSnapshot?.version ?? 0,
    );
  });
});
