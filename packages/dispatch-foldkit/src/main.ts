import type { Runtime } from "foldkit";

import {
  compileFoldkitMdx,
  dispatchFixtureItems,
  dispatchWorkbenchMdx,
} from "@attune/dispatch-core";
import { fixtureRun } from "@attune/attuned-discovery";

import { StartFixtureRun } from "./fixture-commands.js";
import { initialFixtureRouteModel } from "./fixture-route.js";
import type { Message } from "./message.js";
import { Model } from "./model.js";

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "dispatch",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: fixtureRun.runId,
    selectedHypothesisId: "",
    pendingCommand: "start",
    items: [...dispatchFixtureItems],
    page: compileFoldkitMdx(dispatchWorkbenchMdx, "dispatch/index.mdx"),
    serverSnapshot: null,
    fixtureRoute: {
      ...initialFixtureRouteModel(),
      status: "loading",
    },
  }),
  [StartFixtureRun()],
];
