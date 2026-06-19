import { Scene } from "foldkit"
import { describe, expect, test } from "vitest"

import { mtxViewFixture } from "../src/fixtures/mtx-view-fixture.js"
import { appliedWorkbenchAtomFixture } from "../src/fixtures/workbench-atom-fixture.js"
import { init } from "../src/main.js"
import { SelectedFilter, SelectedRoute } from "../src/message.js"
import { update } from "../src/update.js"
import { view } from "../src/view.js"

const initialModel = () => {
  const [model] = init()

  return model
}

describe("React-to-FoldKit migration scene contract", () => {
  test("Dispatch renders the mobile-first event river and feed surface", () => {
    const model = initialModel()

    expect(view(model).title).toBe("Attune Dispatch")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.expect(Scene.role("heading", { name: "Attune Dispatch" })).toExist(),
      Scene.expect(Scene.text("Event river")).toExist(),
      Scene.expect(
        Scene.text("Codex app-server startup remains human-reviewed"),
      ).toExist(),
      Scene.expect(Scene.text("/feeds/dispatch.xml")).toExist(),
      Scene.expect(Scene.text("/feeds/safety.xml")).toExist(),
    )
  })

  test("FoldKit MDX primitives render as decoded component slots", () => {
    const model = initialModel()
    const componentNames = model.page.document.blocks
      .filter((block) => block._tag === "Component")
      .map((block) => block.name)

    expect(componentNames).toContain("DispatchRiver")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.expect(Scene.text("FoldKit MDX contract")).toExist(),
      Scene.expect(Scene.text("Agent-authored page grammar")).toExist(),
      Scene.expect(Scene.text("PageHeader")).toExist(),
      Scene.expect(Scene.text("StatStrip")).toExist(),
      Scene.expect(Scene.text("DispatchRiver")).toExist(),
      Scene.expect(Scene.text("ActionBar")).toExist(),
    )
  })

  test("Workbench route preserves the v0-style product information contract", () => {
    const model = initialModel()
    const [workbenchModel] = update(
      model,
      SelectedRoute({ route: "workbench" }),
    )

    expect(workbenchModel.route).toBe("workbench")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.click(Scene.role("button", { name: "Workbench" })),
      Scene.expect(
        Scene.role("heading", {
          name: "Server atoms derive meaning; FoldKit steers the lens",
        }),
      ).toExist(),
      Scene.expect(Scene.text("Looks like")).toExist(),
      Scene.expect(Scene.text("Does not look like")).toExist(),
      Scene.expect(Scene.text("Atom-derived snapshot")).toExist(),
      Scene.expect(
        Scene.text("FoldKit consumes typed WorkbenchSnapshot packets"),
      ).toExist(),
      Scene.expect(Scene.text("Deterministic rule")).toExist(),
      Scene.expect(Scene.text("Why it matters")).toExist(),
      Scene.expect(Scene.text("Revise with intent")).toExist(),
      Scene.expect(Scene.text("Copy YAML")).toExist(),
      Scene.expect(Scene.text("Promote rule")).toExist(),
    )
  })

  test("Discover route renders the editorial pattern candidate surface", () => {
    const model = initialModel()
    const [discoverModel] = update(model, SelectedRoute({ route: "discover" }))

    expect(discoverModel.route).toBe("discover")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.click(Scene.role("button", { name: "Discover" })),
      Scene.expect(
        Scene.role("heading", {
          name: "12 possible patterns in bulletproof-react",
        }),
      ).toExist(),
      Scene.expect(Scene.text("Ready to inspect")).toExist(),
      Scene.expect(Scene.text("Supporting examples")).toExist(),
      Scene.expect(Scene.text("Possible deterministic shape")).toExist(),
      Scene.expect(Scene.text("Known risk")).toExist(),
      Scene.expect(Scene.text("All patterns")).toExist(),
    )
  })

  test("Findings route keeps review decisions and code evidence visible", () => {
    const model = initialModel()
    const [findingsModel] = update(model, SelectedRoute({ route: "findings" }))

    expect(findingsModel.route).toBe("findings")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.click(Scene.role("button", { name: "Findings" })),
      Scene.expect(
        Scene.role("heading", { name: "Review what this candidate matched" }),
      ).toExist(),
      Scene.expect(Scene.text("src/components/Card.tsx")).toExist(),
      Scene.expect(Scene.text("Why it matched")).toExist(),
      Scene.expect(Scene.text("Deterministic selector")).toExist(),
      Scene.expect(Scene.text("Review decision")).toExist(),
      Scene.expect(Scene.text("True positive")).toExist(),
      Scene.expect(Scene.text("False positive")).toExist(),
    )
  })

  test("Safety filtering keeps human review visible without a React table", () => {
    const model = initialModel()
    const [safetyModel] = update(model, SelectedFilter({ filter: "safety" }))
    const safetyItems = safetyModel.items.filter(
      (item) => item.severity === "safety",
    )

    expect(safetyItems).toHaveLength(1)

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.click(Scene.role("button", { name: "Safety" })),
      Scene.expect(
        Scene.text("Codex app-server startup remains human-reviewed"),
      ).toExist(),
      Scene.expect(Scene.text("1 visible")).toExist(),
      Scene.expect(
        Scene.text("FoldKit MDX migration spec drafted"),
      ).toBeAbsent(),
    )
  })

  test("MTX view fixture documents the typed event fixture contract", () => {
    const componentNames = mtxViewFixture.page.document.blocks
      .filter((block) => block._tag === "Component")
      .map((block) => block.name)

    expect(componentNames).toEqual(mtxViewFixture.expectedComponents)
    expect(mtxViewFixture.expectedText).toContain("Atom-derived fixture")
    expect(appliedWorkbenchAtomFixture.runSummary.appendedEventCount).toBe(6)
    expect(
      appliedWorkbenchAtomFixture.trace.every((entry) =>
        entry.startsWith("append:"),
      ),
    ).toBe(true)

    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel(), route: "workbench" }),
      Scene.expect(Scene.text("Atom-derived snapshot")).toExist(),
      Scene.expect(
        Scene.text("Server atoms derive meaning; FoldKit steers the lens"),
      ).toExist(),
      Scene.expect(
        Scene.text("FoldKit consumes typed WorkbenchSnapshot packets"),
      ).toExist(),
    )
  })
})
