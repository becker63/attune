import { describe, expect, it } from "vitest"

import {
  discoverPackageContracts,
  inferPackageContractTargetSemantics,
  packageContractTargetSemantics,
  summarizePackageContract,
  summarizePackageContractAtomGraph,
  summarizePackageContractDependencies,
} from "../src/package-contract-graph.js"

describe("package contract graph helpers", () => {
  it("discovers active project roots and contract paths from a supplied project map", () => {
    const discovery = discoverPackageContracts(
      {
        "attune-nx": {
          root: "packages/attune-nx",
          sourceRoot: "packages/attune-nx/src",
        },
        "old-slice": {
          root: "packages/old-slice",
          metadata: { attune: { active: false } },
        },
      },
      {
        existingFiles: ["packages/attune-nx/src/attune.package.ts"],
      },
    )

    expect(discovery.activeProjectRoots).toEqual(["packages/attune-nx"])
    expect(discovery.presentContracts).toEqual([
      "packages/attune-nx/src/attune.package.ts",
    ])
    expect(discovery.projects).toEqual([
      expect.objectContaining({
        projectName: "attune-nx",
        status: "present",
        metadata: {
          packageId: "attune-nx",
          projectName: "attune-nx",
          projectRoot: "packages/attune-nx",
          sourceRoot: "packages/attune-nx/src",
          contractPath: "packages/attune-nx/src/attune.package.ts",
        },
      }),
      expect.objectContaining({
        projectName: "old-slice",
        status: "inactive",
      }),
    ])
  })

  it("reports invalid project roots and missing contract paths", () => {
    const discovery = discoverPackageContracts(
      {
        bad: {},
        missing: {
          root: "./packages/missing/",
        },
      },
      {
        existingFiles: [],
      },
    )

    expect(discovery.invalidProjects).toEqual([
      expect.objectContaining({
        projectName: "bad",
        status: "invalid-project-root",
        reason: "project root is missing or empty",
      }),
    ])
    expect(discovery.missingContracts).toEqual([
      expect.objectContaining({
        projectName: "missing",
        contractPath: "packages/missing/src/attune.package.ts",
        sourceRoot: "packages/missing/src",
        status: "missing",
        reason: "src/attune.package.ts was not found for active project",
      }),
    ])
  })

  it("summarizes DI service dependencies from contract-like values", () => {
    const dependencies = summarizePackageContractDependencies({
      packageId: "attuned-discovery",
      services: ["DiscoveryEvents", "ProjectionStore"],
      requires: { EventLog: true },
      layers: { requires: ["Clock"], provides: ["DiscoveryPackageLayer"] },
      operations: [
        {
          id: "record-evidence",
          service: "DiscoveryEvents",
          dependencies: ["EventLog", "Reactivity"],
        },
        {
          id: "project-progress",
          metadata: {
            provides: ["ProgressProjection"],
            requires: { ProjectionStore: true },
          },
        },
      ],
    })

    expect(dependencies).toEqual({
      packageId: "attuned-discovery",
      providedServiceIds: [
        "DiscoveryEvents",
        "DiscoveryPackageLayer",
        "ProgressProjection",
        "ProjectionStore",
      ],
      requiredServiceIds: [
        "Clock",
        "EventLog",
        "ProjectionStore",
        "Reactivity",
      ],
      operationServiceEdges: [
        {
          operationId: "record-evidence",
          provides: ["DiscoveryEvents"],
          requires: ["EventLog", "Reactivity"],
        },
        {
          operationId: "project-progress",
          provides: ["ProgressProjection"],
          requires: ["ProjectionStore"],
        },
      ],
    })
  })

  it("summarizes operation-to-atom and operation-to-Reactivity graph facts", () => {
    const atomGraph = summarizePackageContractAtomGraph({
      id: "foldkit",
      views: {
        reactivityKeys: ["decision.packet", "workbench.progress"],
        atoms: ["decisionPacketAtom"],
      },
      operations: {
        "promote-packet": {
          views: {
            reactivityKeys: ["decision.packet"],
            atoms: ["decisionPacketAtom", "promotionAtom"],
          },
        },
        "refresh-workbench": {
          metadata: {
            views: {
              reactivityKeys: ["workbench.progress"],
              atoms: ["workbenchAtom"],
            },
          },
        },
      },
    })

    expect(atomGraph).toEqual({
      packageId: "foldkit",
      declaredReactivityKeys: ["decision.packet", "workbench.progress"],
      declaredAtoms: [
        "decisionPacketAtom",
        "promotionAtom",
        "workbenchAtom",
      ],
      operationViewEdges: [
        {
          operationId: "promote-packet",
          reactivityKeys: ["decision.packet"],
          atoms: ["decisionPacketAtom", "promotionAtom"],
        },
        {
          operationId: "refresh-workbench",
          reactivityKeys: ["workbench.progress"],
          atoms: ["workbenchAtom"],
        },
      ],
    })
  })

  it("combines DI and atom summaries for a package graph summary", () => {
    const summary = summarizePackageContract({
      packageId: "home-deployment",
      services: ["ThinkCentreDay0Resource"],
      views: {
        reactivityKeys: ["host-readiness"],
        atoms: ["hostReadinessAtom"],
      },
      operations: [
        {
          id: "nixos-anywhere-install",
          dependencies: ["OperatorPrompt"],
          views: {
            reactivityKeys: ["host-readiness"],
            atoms: ["hostReadinessAtom"],
          },
        },
      ],
    })

    expect(summary.packageId).toBe("home-deployment")
    expect(summary.dependencies.requiredServiceIds).toEqual(["OperatorPrompt"])
    expect(summary.atomGraph.declaredAtoms).toEqual(["hostReadinessAtom"])
  })

  it("describes inferred target metadata for package contract targets", () => {
    expect(packageContractTargetSemantics.map((target) => target.targetName)).toEqual([
      "sync-package-contract",
      "service-conformance",
      "property",
      "coverage-conformance",
      "atom-graph-conformance",
      "check-generated",
    ])

    const selected = inferPackageContractTargetSemantics([
      "property",
      "coverage-conformance",
    ])

    expect(selected).toEqual([
      expect.objectContaining({
        targetName: "property",
        category: "property",
        dependsOn: ["service-conformance"],
        evidence: expect.arrayContaining(["FastCheck seeds"]),
      }),
      expect.objectContaining({
        targetName: "coverage-conformance",
        category: "coverage",
        dependsOn: ["property"],
        evidence: expect.arrayContaining(["operation coverage matrix"]),
      }),
    ])
  })
})
