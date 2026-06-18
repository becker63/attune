import { describe, expect, it } from "vitest"
import { makeEvent, makeRunId } from "../src/index.js"

describe("eventing events", () => {
  it("creates normalized Attune events", () => {
    const runId = makeRunId("joern-effect", "pure")
    const event = makeEvent(
      {
        pack: "joern-effect",
        phase: "pure",
        project: "joern-effect",
        runId,
        target: "fork:pure",
      },
      {
        eventType: "attune.fork.phase_started",
        payload: { token: "xaat-secret" },
        source: "fork",
      },
    )

    expect(event.runId).toBe(runId)
    expect(event.project).toBe("joern-effect")
    expect(event.payload.token).toBe("[REDACTED]")
  })
})
