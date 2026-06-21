import { describe, expect, it } from "vitest"

import {
  compileFoldkitMdx,
  deriveThreads,
  activityFixtureItems,
  activitySummaryCounts,
  workbenchMdx,
  filterActivityItems,
} from "../src/index.js"

describe("FoldKit activity helpers", () => {
  it("derives threads from fixture items", () => {
    const threads = deriveThreads(activityFixtureItems)

    expect(threads.length).toBeGreaterThan(1)
    expect(threads.some((thread) => thread.requiresHuman)).toBe(true)
  })

  it("computes filter counts", () => {
    const counts = activitySummaryCounts(activityFixtureItems)

    expect(counts.total).toBe(activityFixtureItems.length)
    expect(counts.safety).toBe(1)
    expect(counts.review).toBe(1)
  })

  it("filters human-review items", () => {
    const reviewItems = filterActivityItems(activityFixtureItems, "review")

    expect(reviewItems).toHaveLength(1)
    expect(reviewItems[0]?.severity).toBe("safety")
  })

  it("compiles constrained FoldKit MDX into page data", () => {
    const page = compileFoldkitMdx(workbenchMdx, "workbench/index.mdx")

    expect(page.route).toBe("workbench")
    expect(page.document.blocks.some((block) => block._tag === "Component")).toBe(
      true,
    )
  })
})
