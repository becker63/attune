import { describe, expect, it } from "vitest"
import { protocolMaterializeAction } from "../src/index.js"

describe("@attune/framework-nx", () => {
  it("describes deterministic Nx actions for language-service code actions", () => {
    const plan = protocolMaterializeAction("demo", "packages/demo/src/attune.package.ts")

    expect(plan.generatorOrTarget).toBe("@attune/framework-nx:protocol-materialize")
    expect(plan.validationTarget).toBe("demo:check")
  })
})
