import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  makeEvent,
  makeInMemoryEventSink,
  makeNoopEventSink,
  makeRunId,
} from "../src/index.js"

describe("eventing sinks", () => {
  it("stores events in memory for tests", async () => {
    const sink = await Effect.runPromise(makeInMemoryEventSink())
    const event = makeEvent(
      {
        project: "joern-effect",
        runId: makeRunId("joern-effect", "harness"),
        target: "property:harness",
      },
      { eventType: "attune.property.suite_started", source: "property" },
    )

    await Effect.runPromise(sink.emit(event))
    await expect(Effect.runPromise(sink.events)).resolves.toHaveLength(1)
  })

  it("can drop events when no durable sink is configured", async () => {
    const sink = makeNoopEventSink()
    const event = makeEvent(
      {
        project: "joern-effect",
        runId: makeRunId("joern-effect", "harness"),
        target: "property:harness",
      },
      { eventType: "attune.property.suite_started", source: "property" },
    )

    await expect(Effect.runPromise(sink.emit(event))).resolves.toBeUndefined()
  })
})
