import { describe, expect, it } from "vitest"

import {
  compileFoldkitMdx,
  deriveThreads,
  dispatchFixtureItems,
  dispatchSummaryCounts,
  dispatchWorkbenchMdx,
  filterDispatchItems,
  renderDispatchAtomFeed,
  renderDispatchJsonFeed,
  renderDispatchRssFeed,
  selectSafetyFeedItems,
} from "../src/index.js"

describe("Dispatch core", () => {
  it("derives threads from fixture items", () => {
    const threads = deriveThreads(dispatchFixtureItems)

    expect(threads.length).toBeGreaterThan(1)
    expect(threads.some((thread) => thread.requiresHuman)).toBe(true)
  })

  it("computes filter counts", () => {
    const counts = dispatchSummaryCounts(dispatchFixtureItems)

    expect(counts.total).toBe(dispatchFixtureItems.length)
    expect(counts.safety).toBe(1)
    expect(counts.review).toBe(1)
  })

  it("filters human-review items", () => {
    const reviewItems = filterDispatchItems(dispatchFixtureItems, "review")

    expect(reviewItems).toHaveLength(1)
    expect(reviewItems[0]?.severity).toBe("safety")
  })

  it("compiles constrained FoldKit MDX into page data", () => {
    const page = compileFoldkitMdx(dispatchWorkbenchMdx, "dispatch/index.mdx")

    expect(page.route).toBe("dispatch")
    expect(page.document.blocks.some((block) => block._tag === "Component")).toBe(
      true,
    )
  })

  it("renders Dispatch operator feeds from core projections", () => {
    const feed = renderDispatchJsonFeed(dispatchFixtureItems)

    expect(JSON.parse(feed)).toMatchObject({
      title: "Attune Dispatch",
      feed_url: "/feeds/dispatch.json",
    })
    expect(renderDispatchRssFeed(dispatchFixtureItems)).toContain("<rss")
    expect(renderDispatchAtomFeed(dispatchFixtureItems)).toContain("<feed")
    expect(selectSafetyFeedItems(dispatchFixtureItems)).toHaveLength(1)
  })
})
