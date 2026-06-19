import type { Runtime } from "foldkit"

import {
  compileFoldkitMdx,
  dispatchFixtureItems,
  dispatchSemanticWorkbenchSnapshot,
  dispatchWorkbenchMdx,
} from "@attune/dispatch-core"

import type { Message } from "./message.js"
import { Model } from "./model.js"

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "dispatch",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: dispatchSemanticWorkbenchSnapshot.runId,
    selectedHypothesisId: "",
    pendingCommand: "",
    items: [...dispatchFixtureItems],
    page: compileFoldkitMdx(dispatchWorkbenchMdx, "dispatch/index.mdx"),
    serverSnapshot: dispatchSemanticWorkbenchSnapshot,
  }),
  [],
]
