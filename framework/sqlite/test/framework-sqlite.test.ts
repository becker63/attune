import { describe, expect, it } from "vitest"
import { createInMemoryProtocolStore, defaultProtocolCachePath } from "../src/index.js"

describe("@attune/framework-sqlite", () => {
  it("keeps the protocol cache path under the gitignored framework cache", () => {
    expect(defaultProtocolCachePath).toBe(".attune/cache/protocol.sqlite")
  })

  it("hides protocol state behind a store-shaped API", () => {
    const store = createInMemoryProtocolStore()
    store.putObligations([{
      obligationId: "demo:operation:property",
      protocolId: "attune/package/demo",
      packageId: "demo",
      operationId: "operation",
      kind: "property",
      reason: "property evidence required",
    }])

    expect(store.snapshot().obligations).toHaveLength(1)
  })
})
