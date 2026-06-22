import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  FrameworkNxActionPlanSchema,
  atomViewEdgeAction,
  createDescriptorHashRecord,
  createFrameworkMaterializationPlan,
  createGeneratedArtifact,
  createGeneratedArtifactRecord,
  detectCheckedInReportOutputs,
  frameworkDiagnosticsAction,
  hashGeneratedArtifactContent,
  operationRegistryAction,
  packageHarnessAction,
  propertyEvidenceAction,
  protocolMaterializeAction,
  typeGuidanceAction,
  type FrameworkNxGeneratedArtifactKind,
} from "../src/index.js"
import type { AttuneProtocolDescriptor } from "@attune/framework-protocol"

const descriptor: AttuneProtocolDescriptor = {
  protocolId: "attune/package/demo",
  packageId: "demo",
  packageKind: "core-discovery-runtime",
  descriptorHash: "descriptor-123",
  sourcePath: "packages/demo/src/attune.package.ts",
  services: ["DemoService"],
  views: {
    reactivityKeys: ["demo.changed"],
    atoms: ["demoView"],
  },
  operations: [{
    id: "project",
    kind: "projection",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demoView"],
    },
    laws: ["projection.deterministic-replay"],
    inputSchema: "DemoEvent",
    outputSchema: "DemoSnapshot",
  }],
}

describe("@attune/framework-nx", () => {
  it("describes deterministic Nx actions for language-service code actions", () => {
    const plan = protocolMaterializeAction("demo", "packages/demo/src/attune.package.ts")

    expect(plan.generatorOrTarget).toBe("@attune/framework-nx:protocol-materialize")
    expect(plan.validationTarget).toBe("demo:check-generated")
    expect(Schema.decodeUnknownSync(FrameworkNxActionPlanSchema)(plan).packageId).toBe("demo")
  })

  it("plans the deterministic code actions the language service can offer", () => {
    expect(operationRegistryAction("demo", "packages/demo/src/attune.package.ts", "op").generatorOrTarget).toBe(
      "@attune/framework-nx:operation-registry",
    )
    expect(packageHarnessAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:package-harness",
    )
    expect(propertyEvidenceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:protocol-evidence",
    )
    expect(atomViewEdgeAction("demo", "packages/demo/src/attune.package.ts").title).toContain("atom view")
    expect(typeGuidanceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:type-guidance",
    )
    expect(frameworkDiagnosticsAction("demo", "packages/demo/src/attune.package.ts")).toMatchObject({
      generatorOrTarget: "workspace:package-contracts-check",
      validationTarget: "workspace:package-contracts-check",
    })
  })

  it("generates Schema-coded package harness content", () => {
    const artifact = createGeneratedArtifact(descriptor, "package-harness")

    expect(artifact.path).toBe("packages/demo/src/generated/attune-package-harness.ts")
    expect(artifact.generatorId).toBe("@attune/framework-nx:package-harness")
    expect(artifact.content).toContain("createPackageHarnessClient")
    expect(artifact.content).toContain("definePackageHarnessHandlers")
    expect(artifact.content).toContain("publicAccessorHandler(\"project\")")
    expect(artifact.content).toContain("PackageHarnessEvidenceProducers")
    expect(artifact.content).toContain('"rpcId": "demo.operation.project"')
    expect(artifact.content).toContain('"status": "optional"')
  })

  it("generates operation registry content without source-local runtime imports", () => {
    const artifact = createGeneratedArtifact(descriptor, "operation-registry")

    expect(artifact.path).toBe("packages/demo/src/generated/attune-operation-registry.ts")
    expect(artifact.generatorId).toBe("@attune/framework-nx:operation-registry")
    expect(artifact.content).toContain("export const OperationRegistry")
    expect(artifact.content).toContain('"id": "project"')
    expect(artifact.content).toContain('"kind": "projection"')
    expect(artifact.content).not.toMatch(/from "\.\.\/attune\.package\.js"/)
    expect(artifact.contentHash).toBe(hashGeneratedArtifactContent(artifact.content))
  })

  it("generates property evidence scaffold content", () => {
    const artifact = createGeneratedArtifact(descriptor, "property-evidence")

    expect(artifact.content).toContain("export const PropertyEvidenceScaffold")
    expect(artifact.content).toContain('"property-run"')
    expect(artifact.content).toContain('"law-observed"')
    expect(artifact.content).toContain('"atom-movement"')
  })

  it("generates atom view edge content", () => {
    const artifact = createGeneratedArtifact(descriptor, "atom-view-edges")

    expect(artifact.content).toContain("export const AtomViewEdges")
    expect(artifact.content).toContain('"reactivityKey": "demo.changed"')
    expect(artifact.content).toContain('"atomId": "demoView"')
  })

  it("generates type-guidance refresh content", () => {
    const artifact = createGeneratedArtifact(descriptor, "type-guidance")

    expect(artifact.content).toContain("export const PackageTypeGuidance")
    expect(artifact.content).toContain('"schema": "DemoEvent"')
    expect(artifact.content).toContain('"project.atom-graph-movement"')
    expect(artifact.content).toContain('"project.law.projection.deterministic-replay"')
  })

  it("records descriptor hash and generated artifact hash state", () => {
    const artifact = createGeneratedArtifact(descriptor, "operation-registry")
    const current = createGeneratedArtifactRecord(descriptor, artifact, artifact.content)
    const stale = createGeneratedArtifactRecord(descriptor, artifact, `${artifact.content}\n// stale`)
    const missing = createGeneratedArtifactRecord(descriptor, artifact)

    expect(createDescriptorHashRecord(descriptor)).toEqual({
      recordId: "attune/package/demo:descriptor-hash",
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      descriptorHash: "descriptor-123",
      status: "current",
    })
    expect(current).toMatchObject({ status: "current", actualHash: artifact.contentHash })
    expect(stale.status).toBe("stale")
    expect(missing.status).toBe("missing")
  })

  it("builds a full protocol materialization plan", () => {
    const existingContent = createGeneratedArtifact(descriptor, "operation-registry").content
    const plan = createFrameworkMaterializationPlan(descriptor, {
      "packages/demo/src/generated/attune-operation-registry.ts": existingContent,
    })

    expect(plan.actions.map((action) => action.actionId)).toEqual([
      "attune.protocol.materialize",
      "attune.protocol.framework-diagnostics",
      "attune.protocol.package-harness",
      "attune.protocol.operation-registry",
      "attune.protocol.property-evidence",
      "attune.protocol.atom-view-edge",
      "attune.protocol.type-guidance",
    ])
    expect(plan.generatedArtifacts.map((artifact) => artifact.kind satisfies FrameworkNxGeneratedArtifactKind)).toEqual([
      "package-harness",
      "operation-registry",
      "property-evidence",
      "atom-view-edges",
      "type-guidance",
    ])
    expect(plan.generatedArtifactRecords.map((record) => record.status)).toEqual([
      "missing",
      "current",
      "missing",
      "missing",
      "missing",
    ])
    expect(plan.checkedInReportFindings).toEqual([])
  })

  it("rejects checked-in report outputs but allows gitignored cache output", () => {
    const findings = detectCheckedInReportOutputs([
      "packages/demo/protocol-delta-report.json",
      "packages/demo/evidence-summary.md",
      ".attune/cache/protocol-delta-report.json",
      "packages/demo/src/generated/attune-operation-registry.ts",
    ])

    expect(findings.map((finding) => finding.path)).toEqual([
      "packages/demo/protocol-delta-report.json",
      "packages/demo/evidence-summary.md",
    ])
    expect(findings[0]?.suggestedTarget).toBe("workspace:package-contracts-check")
  })
})
