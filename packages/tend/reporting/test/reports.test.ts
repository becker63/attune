import { describe, expect, it } from "vitest"
import { renderTendTokenReport } from "../src/index.js"
import { TendReportRecipes } from "../src/recipes.js"

describe("@attune/tend-reporting", () => {
  it("renders a report from receipt and token data", () => {
    const report = renderTendTokenReport({
      sessionId: "session-1",
      receipts: [{
        receiptId: "receipt-1",
        recipeId: "framework-runtime.local-timescaledb",
        runId: "run-1",
        status: "passed",
        startedAt: "2026-06-28T00:00:00.000Z",
      }],
      events: [{
        eventId: "event-1",
        sessionId: "session-1",
        kind: "openrtk-action",
        occurredAt: "2026-06-28T00:00:00.000Z",
        payload: { actionId: "openrtk-1" },
      }],
      tokenMetrics: {
        tokensPerAcceptedRepair: 10,
        tokensPerValidDiff: 5,
        searchCallsPerRepair: 1,
        broadSearchCount: 0,
        validationAttemptsPerAcceptedDiff: 1,
        longJobPollingTokens: 0,
        openRtkCompressionEstimate: 750,
        magicContextRetainedTokenEstimate: 100,
        magicContextDroppedTokenEstimate: 200,
      },
    })

    expect(TendReportRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-reporting.token-report-renderer",
      "tend-reporting.markdown-view",
      "tend-reporting.test-suite",
    ])
    expect(
      TendReportRecipes.some((recipe) => recipe.sourcePath === "packages/tend/reporting/src/recipes.ts"),
    ).toBe(false)
    expect(report.markdown).toContain("OpenRTK saved tokens: 750")
    expect(report.markdown).toContain("Magic Context dropped tokens: 200")
  })
})
