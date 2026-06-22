import { describe, expect, it } from "vitest"
import {
  atomMovementEvidence,
  defineEvidenceProducer,
  defineOperationRegistry,
  observedMovement,
  propertyRunEvidence,
} from "../src/index.js"

describe("@attune/framework-testing", () => {
  it("defines operation registries and evidence producers for generated harnesses", () => {
    const registry = defineOperationRegistry({
      packageId: "demo",
      handlers: {
        operation: () => "ok",
      },
    })
    const producer = defineEvidenceProducer({
      id: "demo-evidence",
      operationId: "operation",
      produce: () => [{ ok: true }],
    })

    expect(registry.handlers["operation"]?.()).toBe("ok")
    expect(producer.produce()).toEqual([{ ok: true }])
    expect(observedMovement({ packageViewAtom: "demoAtom", changed: true })).toBe(true)
  })

  it("turns property and atom observations into protocol evidence events", () => {
    const context = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      runId: "run-1",
      observedAt: "2026-06-22T00:00:00.000Z",
      replay: { seed: 123 },
    } as const

    expect(propertyRunEvidence(context, "operation").kind).toBe("property-run")
    expect(atomMovementEvidence(context, "operation", [
      { packageViewAtom: "demoAtom", changed: true },
      { packageViewAtom: "idleAtom", changed: false },
    ])).toHaveLength(1)
  })
})
