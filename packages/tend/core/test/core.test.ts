import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  TendCoreRecipes,
  TendEventEnvelopeSchema,
  TendMagicContextDecisionSchema,
  TendOpenRtkCompressionActionSchema,
  TendSessionSchema,
  TendToolCallSchema,
  recipeObservationFromTendEvent,
  recipeObservationsFromTendEvents,
} from "../src/index.js"

describe("@attune/tend-core", () => {
  it("declares Tend core schemas and recipe surface", () => {
    expect(TendCoreRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-core.event-envelope",
    ])
    expect(TendCoreRecipes[0]?.sourcePath).toBe("packages/tend/core/src/index.ts")
  })

  it("decodes session, tool, event, Magic Context, and OpenRTK packets", () => {
    expect(Schema.decodeUnknownSync(TendSessionSchema)({
      sessionId: "session-1",
      agentKind: "opencode",
      startedAt: "2026-06-28T00:00:00.000Z",
      workspaceRoot: "/workspace",
    }).agentKind).toBe("opencode")

    expect(Schema.decodeUnknownSync(TendToolCallSchema)({
      toolCallId: "tool-1",
      sessionId: "session-1",
      toolName: "tend.observe",
      status: "succeeded",
      occurredAt: "2026-06-28T00:00:01.000Z",
      recipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      receiptId: "receipt-1",
      observationId: "observation-1",
      tokens: { totalTokens: 42 },
    }).toolName).toBe("tend.observe")

    expect(Schema.decodeUnknownSync(TendEventEnvelopeSchema)({
      eventId: "event-1",
      sessionId: "session-1",
      kind: "openrtk-action",
      occurredAt: "2026-06-28T00:00:02.000Z",
      recipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      observationId: "observation-2",
      payload: { actionId: "openrtk-1" },
    }).kind).toBe("openrtk-action")

    expect(Schema.decodeUnknownSync(TendMagicContextDecisionSchema)({
      decisionId: "magic-1",
      sessionId: "session-1",
      retainedContextRefs: ["recipe:tend-core.event-envelope"],
      droppedContextRefs: ["raw:rg-output"],
      retainedTokenEstimate: 120,
      droppedTokenEstimate: 880,
      policyDecisionId: "policy-1",
    }).droppedTokenEstimate).toBe(880)

    expect(Schema.decodeUnknownSync(TendOpenRtkCompressionActionSchema)({
      actionId: "openrtk-1",
      sessionId: "session-1",
      sourceObservationIds: ["command-1"],
      codec: "openrtk.command-output-v1",
      summary: "Compressed command output.",
      originalTokenEstimate: 1000,
      compressedTokenEstimate: 250,
      droppedTokenEstimate: 750,
    }).codec).toBe("openrtk.command-output-v1")
  })

  it("projects linked Tend events into framework recipe observations", () => {
    const event = Schema.decodeUnknownSync(TendEventEnvelopeSchema)({
      eventId: "event-1",
      sessionId: "session-1",
      kind: "command",
      occurredAt: "2026-06-28T00:00:02.000Z",
      recipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      receiptId: "receipt-1",
      observationId: "observation-1",
      payload: { command: "nx run framework-runtime:test" },
    })

    expect(recipeObservationFromTendEvent(event)).toMatchObject({
      observationId: "observation-1",
      recipeId: "framework-runtime.local-timescaledb",
      runId: "run-1",
      receiptId: "receipt-1",
      observationKind: "tend.command",
      source: "tend",
    })
    expect(recipeObservationsFromTendEvents([
      event,
      {
        eventId: "event-2",
        sessionId: "session-1",
        kind: "token-usage",
        occurredAt: "2026-06-28T00:00:03.000Z",
        payload: { totalTokens: 20 },
      },
    ])).toHaveLength(1)
  })
})
