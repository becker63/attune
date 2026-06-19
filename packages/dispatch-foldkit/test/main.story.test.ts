import { Story } from "foldkit"
import { describe, expect, test } from "vitest"

import {
  RequestedPromotion,
  SelectedFilter,
  SelectedHypothesis,
  SelectedRoute,
} from "../src/message.js"
import { init } from "../src/main.js"
import { update } from "../src/update.js"

const initialModel = () => {
  const [model] = init()

  return model
}

describe("React-to-FoldKit migration story contract", () => {
  test("route selection stays in the FoldKit message/update loop", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedRoute({ route: "workbench" })),
      Story.model((model) => {
        expect(model.route).toBe("workbench")
      }),
      Story.Command.expectNone(),
    )
  })

  test("event-river filters are behavior, not React component state", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedFilter({ filter: "safety" })),
      Story.model((model) => {
        expect(model.filter).toBe("safety")
      }),
      Story.message(SelectedFilter({ filter: "failed" })),
      Story.model((model) => {
        expect(model.filter).toBe("failed")
      }),
      Story.Command.expectNone(),
    )
  })

  test("workbench hypothesis selection is explicit agent-facing state", () => {
    Story.story(
      update,
      Story.with(initialModel()),
      Story.message(SelectedHypothesis({ hypothesisId: "hyp-2" })),
      Story.model((model) => {
        expect(model.selectedHypothesisId).toBe("hyp-2")
        expect(model.pendingCommand).toBe("")
      }),
      Story.message(RequestedPromotion({ hypothesisId: "hyp-2" })),
      Story.model((model) => {
        expect(model.selectedHypothesisId).toBe("hyp-2")
        expect(model.pendingCommand).toBe("promote:hyp-2")
      }),
      Story.Command.expectNone(),
    )
  })
})
