import { describe, expect, it } from "vitest"

import { dispatchFixtureItems } from "@attune/dispatch-core"

import {
  renderDispatchAtomFeed,
  renderDispatchJsonFeed,
  renderDispatchRssFeed,
  selectSafetyFeedItems,
} from "../src/index.js"

describe("Dispatch feed renderers", () => {
  it("renders JSON Feed", () => {
    const feed = renderDispatchJsonFeed(dispatchFixtureItems)

    expect(feed).toContain("https://jsonfeed.org/version/1.1")
    expect(feed).toContain("FoldKit MDX migration spec drafted")
  })

  it("renders RSS and Atom", () => {
    expect(renderDispatchRssFeed(dispatchFixtureItems)).toContain("<rss")
    expect(renderDispatchAtomFeed(dispatchFixtureItems)).toContain("<feed")
  })

  it("selects safety feed items", () => {
    expect(selectSafetyFeedItems(dispatchFixtureItems)).toHaveLength(1)
  })
})
