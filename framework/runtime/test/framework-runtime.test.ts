import { describe, expect, it } from "vitest"
import {
  ProtocolQueryLive,
  computeProtocolDeltas,
  diagnosticsForProtocol,
  explainObligation,
  getPackageSummary,
  getRepairPlan,
} from "../src/index.js"

describe("@attune/framework-runtime", () => {
  it("turns missing evidence and stale generated source into private deltas", () => {
    const deltas = computeProtocolDeltas({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:property",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "property",
        reason: "projection operation requires property evidence",
      }],
      generatedArtifacts: [{
        artifactId: "demo:registry",
        protocolId: "attune/package/demo",
        packageId: "demo",
        path: "packages/demo/src/generated/operation-registry.ts",
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })

    expect(deltas.map((delta) => delta.kind)).toEqual([
      "missing-obligation",
      "stale-generated-source",
    ])
  })

  it("projects deltas as framework diagnostics", () => {
    const diagnostics = diagnosticsForProtocol({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:law",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "law",
        reason: "law evidence missing",
      }],
      generatedArtifacts: [],
    })

    expect(diagnostics[0]?.code).toBe("attune/protocol/missing-obligation")
  })

  it("explains obligations and repair plans without exposing store rows", () => {
    const input = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:view-movement",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "view-movement" as const,
        reason: "view movement evidence missing",
      }],
      generatedArtifacts: [],
    }

    expect(getPackageSummary(input)).toMatchObject({
      packageId: "demo",
      obligationCount: 1,
      evidenceCount: 0,
    })
    expect(explainObligation(input, "demo:project:view-movement")?.expectedEvidenceKinds).toContain(
      "atom-movement",
    )
    expect(getRepairPlan(input, "delta:demo:project:view-movement")?.actions[0]?.target).toBe(
      "@attune/framework-nx:atom-view-edge",
    )
    expect(ProtocolQueryLive.diagnosticsFor(input)[0]?.sourcePath).toBe(
      "packages/demo/src/attune.package.ts",
    )
  })
})
