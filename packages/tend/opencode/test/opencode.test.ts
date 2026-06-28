import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  OpenCodeSessionLogSchema,
  TendOpenCodeRecipes,
  decodeOpenCodeSessionLog,
  opencodeSessionLogFixture,
} from "../src/index.js"

describe("@attune/tend-opencode", () => {
  it("decodes OpenCode logs into Tend events and recipe receipts", () => {
    const log = Schema.decodeUnknownSync(OpenCodeSessionLogSchema)(opencodeSessionLogFixture)
    const decoded = decodeOpenCodeSessionLog(log)

    expect(TendOpenCodeRecipes[0]?.id).toBe("tend-opencode.decode-session")
    expect(decoded.session.agentKind).toBe("opencode")
    expect(decoded.toolCalls[0]?.toolName).toBe("tend.observe")
    expect(decoded.commands[0]?.command).toBe("nx test framework-runtime")
    expect(decoded.commands[0]).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
    })
    expect(decoded.receipts[0]).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
      status: "passed",
      command: "framework-runtime:test",
    })
    expect(decoded.observations.map((observation) => observation.observationKind)).toEqual(
      expect.arrayContaining(["tend.command", "tend.validation", "tend.openrtk-action"]),
    )
    expect(decoded.observations.find((observation) => observation.observationKind === "tend.validation")).toMatchObject({
      recipeId: "framework-runtime.local-timescaledb",
      runId: "opencode-run:opencode-session-1",
      receiptId: "opencode-receipt:validation-1",
      source: "tend",
    })
    expect(decoded.events.map((event) => event.kind)).toContain("openrtk-action")
    expect(decoded.events.map((event) => event.kind)).toContain("magic-context-decision")
  })
})
