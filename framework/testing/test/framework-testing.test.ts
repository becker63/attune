import { describe, expect, it } from "vitest"
import {
  defineEvidenceProducer,
  defineOperationRegistry,
  observedMovement,
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
})
