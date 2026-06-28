import type { Runtime } from "foldkit"

import { StartFixtureRun } from "./fixture-commands.js"
import { initialFixtureRouteModel } from "./fixture-route.js"
import {
  attuneFoldkitSiteFixture,
  sitePageForRoute,
} from "./fixtures/app-site-fixture.js"
import type { Message } from "./message.js"
import { Model } from "./model.js"

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "workbench",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: attuneFoldkitSiteFixture.runId,
    selectedHypothesisId: "",
    selectedEvidenceId: "",
    pendingCommand: "",
    items: [...attuneFoldkitSiteFixture.items],
    page: sitePageForRoute("workbench"),
    serverSnapshot: null,
    fixtureRoute: initialFixtureRouteModel(),
  }),
  [StartFixtureRun()],
]
