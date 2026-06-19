import type { Runtime } from "foldkit"

import { dispatchFixtureItems } from "@attune/dispatch-core"

import { pageForRoute } from "./fixtures/app-mdx-fixture.js"
import { initialFixtureRouteModel } from "./fixture-route.js"
import { appliedWorkbenchAtomFixture } from "./fixtures/workbench-atom-fixture.js"
import type { Message } from "./message.js"
import { Model } from "./model.js"

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "dispatch",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: appliedWorkbenchAtomFixture.snapshot.runId,
    selectedHypothesisId: "",
    pendingCommand: "",
    items: [...dispatchFixtureItems],
    page: pageForRoute("dispatch"),
    serverSnapshot: appliedWorkbenchAtomFixture.snapshot,
    fixtureRoute: initialFixtureRouteModel(),
  }),
  [],
]
