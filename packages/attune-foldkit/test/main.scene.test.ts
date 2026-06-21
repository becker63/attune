import { Scene } from "foldkit"
import { describe, expect, test } from "vitest"

import { AdvanceFixtureStep } from "../src/fixture-commands.js"
import { advanceFixtureStep, startFixtureRoute } from "../src/fixture-route.js"
import { mdxViewFixture } from "../src/fixtures/mdx-view-fixture.js"
import { appliedWorkbenchAtomFixture } from "../src/fixtures/workbench-atom-fixture.js"
import { init } from "../src/main.js"
import { FixtureStepApplied, SelectedFilter, SelectedRoute } from "../src/message.js"
import { update } from "../src/update.js"
import { view } from "../src/view.js"

const initialModel = () => {
  const [model] = init()

  return model
}

const startedModel = async () => {
  const [model] = init()
  const result = await startFixtureRoute()
  const [started] = update(model, FixtureStepApplied({ result }))

  return started
}

describe("React-to-FoldKit migration scene contract", () => {
  test("Workbench renders as the first product surface", () => {
    const model = initialModel()

    expect(view(model).title).toBe("Attune Workbench")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.expect(
        Scene.role("heading", {
          name: "Fixture workbench",
        }),
      ).toExist(),
      Scene.expect(Scene.role("button", { name: "Discover" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Findings" })).toExist(),
    )
  })

  test("FoldKit MDX primitives drive the workbench page fixture", () => {
    const model = initialModel()
    const componentNames = model.page.document.blocks
      .filter((block) => block._tag === "Component")
      .map((block) => block.name)

    expect(componentNames).toContain("OptimizationPacket")
    expect(componentNames).toContain("AnchorList")
    expect(componentNames).toContain("EvidenceList")
    expect(componentNames).toContain("PatternDossier")
    expect(componentNames).toContain("ActionBar")

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.expect(
        Scene.role("heading", {
          name: "Fixture workbench",
        }),
      ).toExist(),
      Scene.expect(Scene.role("button", { name: "Discover" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Findings" })).toExist(),
    )
  })

  test("Workbench route preserves the atom-derived product information contract", async () => {
    const model = await startedModel()
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
      Scene.expect(Scene.text("Anchors")).toExist(),
      Scene.expect(Scene.text("Hypotheses")).toExist(),
      Scene.expect(Scene.text("Evidence")).toExist(),
      Scene.expect(Scene.role("button", { name: "Run proof" })).toExist(),
      Scene.expect(Scene.role("button", { name: "View findings" })).toExist(),
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
          name: "Candidate semantic patterns",
        }),
      ).toExist(),
      Scene.expect(Scene.text("Anchors")).toExist(),
      Scene.expect(Scene.text("Hypotheses")).toExist(),
      Scene.expect(Scene.role("button", { name: "Open workbench" })).toExist(),
      Scene.expect(Scene.role("button", { name: "Select first anchor" })).toExist(),
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

  test("Safety filtering remains explicit model behavior", () => {
    const model = initialModel()
    const [safetyModel] = update(model, SelectedFilter({ filter: "safety" }))
    const safetyItems = safetyModel.items.filter(
      (item) => item.severity === "safety",
    )

    expect(safetyItems).toHaveLength(1)
    expect(safetyModel.filter).toBe("safety")
  })

  test("Lineage, exports, and settings pages keep clickable route flow", () => {
    const model = initialModel()

    Scene.scene(
      { update, view },
      Scene.with(model),
      Scene.click(Scene.role("button", { name: "Lineage" })),
      Scene.expect(Scene.role("heading", { name: "Candidate lineage" })).toExist(),
      Scene.expect(Scene.text("Scene graph")).toExist(),
      Scene.expect(Scene.text("Route trace")).toExist(),
      Scene.click(Scene.role("button", { name: "Open exports" })),
      Scene.expect(
        Scene.role("heading", { name: "Export promoted rule packet" }),
      ).toExist(),
      Scene.expect(Scene.text("Run summary")).toExist(),
      Scene.expect(Scene.text("Export packet")).toExist(),
      Scene.click(Scene.role("button", { name: "Settings" })),
      Scene.expect(Scene.role("heading", { name: "Workspace settings" })).toExist(),
      Scene.expect(Scene.text("Fixture settings")).toExist(),
      Scene.expect(Scene.role("button", { name: "Restart fixture" })).toExist(),
      Scene.click(Scene.role("button", { name: "Open workbench" })),
      Scene.expect(Scene.role("heading", { name: "Fixture workbench" })).toExist(),
    )
  })

  test("existing promotion and findings actions advance the fixture route", async () => {
    const model = await startedModel()
    const [workbenchModel] = update(model, SelectedRoute({ route: "workbench" }))
    const promotionResult = await advanceFixtureStep("request-promotion")

    Scene.scene(
      { update, view },
      Scene.with(workbenchModel),
      Scene.click(Scene.role("button", { name: "Promote rule" })),
      Scene.Command.expectExact(
        AdvanceFixtureStep({ step: "request-promotion" }),
      ),
      Scene.Command.resolve(
        AdvanceFixtureStep({ step: "request-promotion" }),
        FixtureStepApplied({ result: promotionResult }),
      ),
      Scene.expect(Scene.text("Atom-derived snapshot")).toExist(),
      Scene.Command.expectNone(),
    )

    const [findingsModel] = update(model, SelectedRoute({ route: "findings" }))
    const proofResult = await advanceFixtureStep("complete-proof")

    Scene.scene(
      { update, view },
      Scene.with(findingsModel),
      Scene.click(Scene.role("button", { name: "True positive" })),
      Scene.Command.expectExact(AdvanceFixtureStep({ step: "complete-proof" })),
      Scene.Command.resolve(
        AdvanceFixtureStep({ step: "complete-proof" }),
        FixtureStepApplied({ result: proofResult }),
      ),
      Scene.expect(Scene.text("Review decision")).toExist(),
      Scene.Command.expectNone(),
    )
  })

  test("MDX view fixture documents the typed event fixture contract", () => {
    const componentNames = mdxViewFixture.page.document.blocks
      .filter((block) => block._tag === "Component")
      .map((block) => block.name)

    expect(componentNames).toEqual(mdxViewFixture.expectedComponents)
    expect(mdxViewFixture.expectedText).toContain("Atom-derived fixture")
    expect(appliedWorkbenchAtomFixture.runSummary.appendedEventCount).toBe(6)
    expect(
      appliedWorkbenchAtomFixture.trace.every((entry) =>
        entry.startsWith("append:"),
      ),
    ).toBe(true)

    Scene.scene(
      { update, view },
      Scene.with(update(initialModel(), SelectedRoute({ route: "workbench" }))[0]),
      Scene.expect(Scene.text("Atom-derived snapshot")).toExist(),
      Scene.expect(Scene.text("Typed WorkbenchSnapshot")).toExist(),
    )
  })
})
