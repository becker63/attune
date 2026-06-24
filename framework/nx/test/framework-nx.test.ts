import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  AttuneRepairPlanSchema,
  FrameworkNxActionPlanSchema,
  atomViewEdgeAction,
  createDescriptorHashRecord,
  createFrameworkMaterializationPlan,
  createGeneratedArtifact,
  createGeneratedArtifactRecord,
  detectCheckedInReportOutputs,
  frameworkDiagnosticsAction,
  hashGeneratedArtifactContent,
  ingestNxProjectGraphRows,
  nxProjectGraphToProgramIndexRows,
  operationRegistryAction,
  programHarnessAction,
  propertyEvidenceAction,
  protocolMaterializeAction,
  repairPlanForDiagnostic,
  repairPlanFromProgramIndexRow,
  typeGuidanceAction,
  type FrameworkNxGeneratedArtifactKind,
} from "../src/index.js"
import type { AttuneProtocolDescriptor } from "@attune/framework-protocol"
import { createInMemoryProgramIndex } from "@attune/framework-sqlite"
import type { ProjectGraph } from "nx/src/devkit-exports"

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
  waivers: [],
  coverageExpectations: [],
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
    expect(programHarnessAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:program-harness",
    )
    expect(propertyEvidenceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:protocol-evidence",
    )
    expect(atomViewEdgeAction("demo", "packages/demo/src/attune.package.ts").title).toContain("atom view")
    expect(typeGuidanceAction("demo", "packages/demo/src/attune.package.ts").generatorOrTarget).toBe(
      "@attune/framework-nx:type-guidance",
    )
    expect(frameworkDiagnosticsAction("demo", "packages/demo/src/attune.package.ts")).toMatchObject({
      generatorOrTarget: "workspace:attune-check",
      validationTarget: "workspace:attune-check",
    })
  })

  it("generates Schema-coded package harness content", () => {
    const artifact = createGeneratedArtifact(descriptor, "program-harness")

    expect(artifact.path).toBe(".attune/cache/generated/demo/attune-program-harness.ts")
    expect(artifact.generatorId).toBe("@attune/framework-nx:program-harness")
    expect(artifact.content).toContain("createProgramHarnessClient")
    expect(artifact.content).toContain("defineProgramHarnessHandlers")
    expect(artifact.content).toContain("publicAccessorHandler(\"project\")")
    expect(artifact.content).toContain("ProgramHarnessObservationProducers")
    expect(artifact.content).toContain('"rpcId": "demo.operation.project"')
    expect(artifact.content).toContain('"status": "optional"')
  })

  it("generates operation registry content without source-local runtime imports", () => {
    const artifact = createGeneratedArtifact(descriptor, "operation-registry")

    expect(artifact.path).toBe(".attune/cache/generated/demo/attune-operation-registry.ts")
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
      ".attune/cache/generated/demo/attune-operation-registry.ts": existingContent,
    })

    expect(plan.actions.map((action) => action.actionId)).toEqual([
      "attune.protocol.materialize",
      "attune.protocol.framework-diagnostics",
      "attune.protocol.program-harness",
      "attune.protocol.operation-registry",
      "attune.protocol.property-evidence",
      "attune.protocol.atom-view-edge",
      "attune.protocol.type-guidance",
    ])
    expect(plan.generatedArtifacts.map((artifact) => artifact.kind satisfies FrameworkNxGeneratedArtifactKind)).toEqual([
      "program-harness",
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
    expect(findings[0]?.suggestedTarget).toBe("workspace:attune-check")
  })

  it("routes repairable diagnostics to public attune-repair targets", () => {
    const repair = repairPlanForDiagnostic({
      diagnosticId: "D123",
      code: "attune/protocol/missing-generated-registry",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "Operation registry is missing.",
    })

    expect(repair).toBeDefined()
    expect(repair?.command).toBe("nx run demo:attune-repair --diagnostic D123")
    expect(repair?.target).toBe("demo:attune-repair")
    expect(repair?.generator).toBe("@attune/framework-nx:operation-registry")
    expect(repair?.changes[0]).toMatchObject({
      path: ".attune/cache/generated/demo/attune-operation-registry.ts",
      generated: true,
    })
    expect(Schema.decodeUnknownSync(AttuneRepairPlanSchema)(repair).repairKind).toBe("operation-registry")
  })

  it("routes safe program-index repair rows to public Nx targets", () => {
    const repair = repairPlanFromProgramIndexRow({
      repair_id: "repair:demo:artifact",
      diagnostic_id: "diagnostic:demo:artifact",
      project_id: "demo",
      path: "packages/demo/src/attune.package.ts",
      code: "attune/program-index/artifact-missing",
      severity: "error",
      message: "artifact fact is missing for generated registry.",
      safety: "safe",
      nx_target: "demo:attune-repair",
      repair_kind: "artifact-refresh",
      route: "attune-repair-cli:generated",
      payload_json: JSON.stringify({
        cause: {
          path: ".attune/cache/generated/demo/attune-operation-registry.ts",
        },
      }),
      validation_after_targets_json: JSON.stringify([
        "demo:attune-check",
        "demo:typecheck",
      ]),
      created_at: "2026-06-24T00:00:00.000Z",
    })

    expect(repair).toMatchObject({
      diagnosticId: "diagnostic:demo:artifact",
      safety: "safe",
      target: "demo:attune-repair",
      command: "nx run demo:attune-repair --diagnostic diagnostic:demo:artifact",
      route: "attune-repair-cli:generated",
      repairKind: "artifact-refresh",
      changes: [{
        path: ".attune/cache/generated/demo/attune-operation-registry.ts",
        kind: "regenerate",
        generated: true,
      }],
      validateAfter: [
        "demo:attune-check",
        "demo:typecheck",
      ],
    })
    expect(Schema.decodeUnknownSync(AttuneRepairPlanSchema)(repair).route).toBe("attune-repair-cli:generated")
  })

  it("keeps needs-review and manual-only indexed repairs non-safe", () => {
    const review = repairPlanFromProgramIndexRow({
      repair_id: "repair:demo:review",
      diagnostic_id: "diagnostic:demo:review",
      project_id: "demo",
      message: "repair changes authored source_file facts.",
      safety: "needs-review",
      nx_target: "demo:attune-repair",
      repair_kind: "source-file-ownership-projection",
      route: "attune-repair-cli:generated",
      created_at: "2026-06-24T00:00:00.000Z",
    })
    const manual = repairPlanFromProgramIndexRow({
      repair_id: "repair:workspace:manual",
      diagnostic_id: "diagnostic:workspace:manual",
      project_id: "workspace",
      message: "checked-in report artifact requires human removal.",
      safety: "manual-only",
      nx_target: "workspace:attune-repair",
      repair_kind: "checked-in-report-removal",
      route: "manual:remove-checked-in-report",
      payload_json: JSON.stringify({
        cause: {
          path: "reports/protocol-delta-report.json",
        },
      }),
      created_at: "2026-06-24T00:00:00.000Z",
    })

    expect(review?.safety).toBe("needs-review")
    expect(manual).toMatchObject({
      safety: "manual-only",
      changes: [{
        path: "reports/protocol-delta-report.json",
        kind: "delete",
        generated: false,
      }],
    })
  })

  it("serializes Nx project graph facts into program-index rows", () => {
    const rows = nxProjectGraphToProgramIndexRows(fixtureProjectGraph, "2026-06-23T00:00:00.000Z")

    expect(rows.projects).toEqual([
      expect.objectContaining({
        id: "consumer",
        root: "packages/consumer",
        sourceRoot: "packages/consumer/src",
      }),
      expect.objectContaining({
        id: "provider",
        root: "framework/provider",
        sourceRoot: "framework/provider/src",
      }),
    ])
    expect(rows.targets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectId: "consumer",
        name: "attune-check",
        executor: "@attune/nx:package-check",
        optionsJson: "{\"checks\":[\"attune\"]}",
      }),
    ]))
    expect(rows.edges).toEqual([
      expect.objectContaining({
        fromSymbolId: "project:consumer",
        toSymbolId: "project:provider",
        kind: "project-dependency:static",
        source: "nx-project-graph",
      }),
    ])
  })

  it("ingests Nx graph rows into the program index action layer", () => {
    const index = createInMemoryProgramIndex()
    const rows = nxProjectGraphToProgramIndexRows(fixtureProjectGraph, "2026-06-23T00:00:00.000Z")

    Effect.runSync(ingestNxProjectGraphRows(index, rows))

    expect(Effect.runSync(index.listProjects()).map((project) => project.id)).toEqual([
      "consumer",
      "provider",
    ])
    expect(Effect.runSync(index.listTargets({ projectId: "consumer" }))).toEqual([
      expect.objectContaining({
        projectId: "consumer",
        name: "attune-check",
      }),
    ])
    expect(Effect.runSync(index.listEdges({ symbolId: "project:consumer" }))[0]).toMatchObject({
      toSymbolId: "project:provider",
    })
  })
})

const fixtureProjectGraph = {
  nodes: {
    consumer: {
      name: "consumer",
      type: "lib",
      data: {
        root: "packages/consumer",
        sourceRoot: "packages/consumer/src",
        projectType: "library",
        targets: {
          "attune-check": {
            executor: "@attune/nx:package-check",
            options: { checks: ["attune"] },
            configurations: {},
          },
        },
      },
    },
    provider: {
      name: "provider",
      type: "lib",
      data: {
        root: "framework/provider",
        sourceRoot: "framework/provider/src",
        projectType: "library",
        targets: {},
      },
    },
  },
  dependencies: {
    consumer: [{
      source: "consumer",
      target: "provider",
      type: "static",
    }],
    provider: [],
  },
} satisfies ProjectGraph
