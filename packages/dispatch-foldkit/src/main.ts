import type { Runtime } from "foldkit"

import { StartFixtureRun } from "./fixture-commands.js"
import { initialFixtureRouteModel } from "./fixture-route.js"
import {
  dispatchFoldkitSiteFixture,
  sitePageForRoute,
} from "./fixtures/app-site-fixture.js"
import type { Message } from "./message.js"
import { Model } from "./model.js"

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "dispatch",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: dispatchFoldkitSiteFixture.runId,
    selectedHypothesisId: "",
    pendingCommand: "",
    items: [...dispatchFoldkitSiteFixture.items],
    page: sitePageForRoute("dispatch"),
    serverSnapshot: null,
    fixtureRoute: initialFixtureRouteModel(),
  }),
  [StartFixtureRun()],
]
