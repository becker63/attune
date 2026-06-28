import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  TendCoreRecipes,
  TendEventEnvelopeSchema,
  TendMagicContextDecisionSchema,
  TendOpenRtkCompressionActionSchema,
  TendSessionSchema,
  TendToolCallSchema,
} from "../src/index.js"

describe("@attune/tend-core", () => {
  it("declares Tend core schemas and recipe surface", () => {
    expect(TendCoreRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-core.event-envelope",
    ])
    expect(TendCoreRecipes[0]?.sourcePath).toBe("tend/packages/core/src/index.ts")
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
      tokens: { totalTokens: 42 },
    }).toolName).toBe("tend.observe")

    expect(Schema.decodeUnknownSync(TendEventEnvelopeSchema)({
      eventId: "event-1",
      sessionId: "session-1",
      kind: "openrtk-action",
      occurredAt: "2026-06-28T00:00:02.000Z",
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
})
