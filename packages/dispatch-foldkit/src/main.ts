import type { Runtime } from "foldkit"

import {
  compileFoldkitMdx,
  dispatchFixtureItems,
  dispatchWorkbenchMdx,
} from "@attune/dispatch-core"

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
    page: compileFoldkitMdx(dispatchWorkbenchMdx, "dispatch/index.mdx"),
    serverSnapshot: appliedWorkbenchAtomFixture.snapshot,
  }),
  [],
]
