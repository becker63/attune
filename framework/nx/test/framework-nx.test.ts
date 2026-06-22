import { describe, expect, it } from "vitest"
import {
  FrameworkNxActionPlanSchema,
  atomViewEdgeAction,
  operationRegistryAction,
  propertyEvidenceAction,
  protocolMaterializeAction,
  typeGuidanceAction,
} from "../src/index.js"
import { Schema } from "effect"

describe("@attune/framework-nx", () => {
  it("describes deterministic Nx actions for language-service code actions", () => {
    const plan = protocolMaterializeAction("demo", "packages/demo/src/attune.package.ts")

    expect(plan.generatorOrTarget).toBe("@attune/framework-nx:protocol-materialize")
    expect(plan.validationTarget).toBe("demo:check")
    expect(Schema.decodeUnknownSync(FrameworkNxActionPlanSchema)(plan).packageId).toBe("demo")
  })

  it("plans the deterministic code actions the language service can offer", () => {
    expect(operationRegistryAction("demo", "packages/demo/src/attune.package.ts", "op").generatorOrTarget).toBe(
      "@attune/framework-nx:operation-registry",
    )
    expect(propertyEvidenceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:protocol-evidence",
    )
    expect(atomViewEdgeAction("demo", "packages/demo/src/attune.package.ts").title).toContain("atom view")
    expect(typeGuidanceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:type-guidance",
    )
  })
})
