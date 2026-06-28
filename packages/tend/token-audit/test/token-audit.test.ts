import { describe, expect, it } from "vitest"
import { TendTokenAuditRecipes, computeTendTokenMetrics } from "../src/index.js"

describe("@attune/tend-token-audit", () => {
  it("computes token, OpenRTK, and Magic Context metrics", () => {
    expect(TendTokenAuditRecipes[0]?.id).toBe("tend-token-audit.metrics")
    expect(computeTendTokenMetrics({
      toolCalls: [
        {
          toolCallId: "tool-1",
          sessionId: "session-1",
          toolName: "rg",
          status: "succeeded",
          occurredAt: "2026-06-28T00:00:00.000Z",
          tokens: { totalTokens: 20 },
        },
        {
          toolCallId: "tool-2",
          sessionId: "session-1",
          toolName: "tend.long-job.poll",
          status: "succeeded",
          occurredAt: "2026-06-28T00:00:01.000Z",
          tokens: { totalTokens: 30 },
        },
      ],
      commands: [{
        commandObservationId: "command-1",
        sessionId: "session-1",
        command: "rg .",
        status: "succeeded",
        occurredAt: "2026-06-28T00:00:02.000Z",
        tokens: { totalTokens: 50 },
      }],
      validations: [{
        validationObservationId: "validation-1",
        sessionId: "session-1",
        validationTarget: "framework-runtime:test",
        status: "succeeded",
        occurredAt: "2026-06-28T00:00:03.000Z",
        tokens: { totalTokens: 100 },
      }],
      openRtkActions: [{
        actionId: "openrtk-1",
        sessionId: "session-1",
        sourceObservationIds: ["command-1"],
        codec: "openrtk.command-output-v1",
        summary: "compressed",
        originalTokenEstimate: 1000,
        compressedTokenEstimate: 250,
        droppedTokenEstimate: 750,
      }],
      magicContextDecisions: [{
        decisionId: "magic-1",
        sessionId: "session-1",
        retainedContextRefs: ["a"],
        droppedContextRefs: ["b", "c"],
        retainedTokenEstimate: 100,
        droppedTokenEstimate: 200,
        policyDecisionId: "policy-1",
      }],
      acceptedRepairs: 2,
      validDiffs: 4,
      acceptedDiffs: 1,
    })).toMatchObject({
      tokensPerAcceptedRepair: 100,
      tokensPerValidDiff: 50,
      searchCallsPerRepair: 0.5,
      broadSearchCount: 1,
      validationAttemptsPerAcceptedDiff: 1,
      longJobPollingTokens: 30,
      openRtkCompressionEstimate: 750,
      magicContextDroppedTokenEstimate: 200,
    })
  })
})
