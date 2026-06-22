import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import {
  PackageContractGraphError,
  createPackageContractGraphNode,
  derivePackageContractWorkspaceGraph,
  discoverPackageContractSourceViews,
  discoverPackageContracts,
  inferPackageContractTargetSemantics,
  packageContractTargetSemantics,
  readPackageContractRuntimeFacts,
  summarizePackageContract,
  summarizePackageContractAtomGraph,
  summarizePackageContractDependencies,
  summarizePackageContractModule,
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
      layerServiceEdges: [{
        layerId: "layer:0",
        provides: ["DiscoveryPackageLayer"],
        requires: ["Clock"],
      }],
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
      sourceDiscoveredReactivityKeys: [],
      sourceDiscoveredAtoms: [],
      sourceViewFiles: [],
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

  it("summarizes module layer requirements and static source-discovered view facts", () => {
    const source = {
      path: "packages/demo/src/attune.package.ts",
      text: `
        const sharedKeys = ["demo.shared"] as const
        export const PackageViews = definePackageViews({
          reactivityKeys: [...sharedKeys, "demo.changed"],
          atoms: ["demoAtom"] as const,
        } as const)
        export const project = defineOperation({
          id: "project",
          views: touches(PackageViews, {
            reactivityKeys: sharedKeys,
            atoms: ["projectAtom"],
          } as const),
        } as const)
      `,
    }
    const summary = summarizePackageContractModule({
      PackageContract: {
        packageId: "demo",
        packageKind: "core-discovery-runtime",
        views: {
          reactivityKeys: ["demo.changed"],
          atoms: ["demoAtom"],
        },
        services: ["DemoService"],
        operations: [],
      },
      PackageLayer: {
        provides: ["DemoService"],
        requires: ["Clock"],
        metadata: { role: "demo-live" },
      },
      PackageTestLayer: {
        provides: ["DemoService"],
        requires: ["FixtureStore"],
        metadata: { role: "demo-test" },
      },
    }, {
      sourceFiles: [source],
    })

    expect(discoverPackageContractSourceViews(source)).toEqual({
      sourcePath: "packages/demo/src/attune.package.ts",
      reactivityKeys: ["demo.changed", "demo.shared"],
      atoms: ["demoAtom", "projectAtom"],
    })
    expect(summary.dependencies.layerServiceEdges).toEqual([
      {
        layerId: "demo-live",
        provides: ["DemoService"],
        requires: ["Clock"],
      },
      {
        layerId: "demo-test",
        provides: ["DemoService"],
        requires: ["FixtureStore"],
      },
    ])
    expect(summary.dependencies.requiredServiceIds).toEqual(["Clock", "FixtureStore"])
    expect(summary.atomGraph.sourceDiscoveredAtoms).toEqual(["demoAtom", "projectAtom"])
  })

  it("derives workspace graph metadata and DI edges from decoded contract modules", () => {
    const graph = derivePackageContractWorkspaceGraph([
      {
        projectName: "provider",
        projectRoot: "packages/provider",
        contractPath: "packages/provider/src/attune.package.ts",
        module: {
          PackageContract: {
            packageId: "provider",
            packageKind: "core-discovery-runtime",
            views: { reactivityKeys: ["provider.changed"], atoms: ["providerAtom"] },
            services: ["ProviderService"],
            operations: [{
              id: "provide",
              kind: "query",
              input: "ProviderInput",
              output: "ProviderOutput",
            }],
          },
          PackageLayer: {
            provides: ["ProviderService"],
            requires: [],
            metadata: { role: "provider-live" },
          },
        },
      },
      {
        projectName: "consumer",
        projectRoot: "packages/consumer",
        contractPath: "packages/consumer/src/attune.package.ts",
        module: {
          PackageContract: {
            packageId: "consumer",
            packageKind: "agent-extension",
            views: { reactivityKeys: ["consumer.changed"], atoms: ["consumerAtom"] },
            services: ["ConsumerService"],
            operations: [{
              id: "consume",
              kind: "command",
              input: "ConsumerInput",
              output: "ConsumerOutput",
              dependencies: ["ProviderService"],
              views: { reactivityKeys: ["consumer.changed"], atoms: ["consumerAtom"] },
            }],
          },
          PackageLayer: {
            provides: ["ConsumerService"],
            requires: ["ProviderService", "external.Clock"],
            metadata: { role: "consumer-live" },
          },
        },
      },
    ])

    expect(graph.projectMetadata.consumer?.attune.packageContract.packageId).toBe("consumer")
    expect(graph.serviceOwners).toEqual([
      { serviceId: "ConsumerService", projectName: "consumer", packageId: "consumer" },
      { serviceId: "ProviderService", projectName: "provider", packageId: "provider" },
    ])
    expect(graph.dependencyEdges).toEqual([
      {
        type: "attune-di",
        sourceProjectName: "consumer",
        sourcePackageId: "consumer",
        targetProjectName: "provider",
        targetPackageId: "provider",
        serviceIds: ["ProviderService"],
        operationIds: ["consume"],
        layerIds: ["consumer-live"],
      },
    ])
    expect(graph.unresolvedServiceRequirements).toEqual([
      {
        projectName: "consumer",
        packageId: "consumer",
        serviceId: "external.Clock",
        operationIds: [],
        layerIds: ["consumer-live"],
      },
    ])
  })

  it("fails graph node derivation with project context for invalid contracts", () => {
    expect(() =>
      createPackageContractGraphNode({
        projectName: "bad-project",
        projectRoot: "packages/bad-project",
        contractPath: "packages/bad-project/src/attune.package.ts",
        module: {
          PackageContract: {
            packageId: "bad-project",
            views: { reactivityKeys: [], atoms: [] },
            operations: [],
          },
        },
      })
    ).toThrow(PackageContractGraphError)
  })

  it("reads framework runtime facts through ProtocolQuery-shaped services", async () => {
    const facts = await readPackageContractRuntimeFacts({
      getPackageSummary: (packageId) =>
        Effect.succeed({
          packageId,
          protocolId: `attune/package/${packageId}`,
          descriptorHash: "descriptor-hash",
          operationCount: 2,
          obligationCount: 7,
          evidenceCount: 3,
          staleGeneratedArtifactCount: 1,
        }),
      listDeltas: (packageId) =>
        Effect.succeed([{
          deltaId: "delta:demo:generated-artifact",
          protocolId: `attune/package/${packageId}`,
          packageId,
          kind: "stale-generated-source",
          sourcePath: "packages/demo/src/generated/attune-operation-registry.ts",
          explanation: "Generated artifact is stale.",
          repairActions: [{
            id: "refresh-protocol-materialization",
            title: "Refresh protocol materialization",
            kind: "nx-generator",
            target: "@attune/framework-nx:protocol-materialize",
            options: { packageId },
          }],
        }]),
    }, "demo", {
      generatedArtifacts: [{
        artifactId: "demo:registry",
        protocolId: "attune/package/demo",
        packageId: "demo",
        path: "packages/demo/src/generated/attune-operation-registry.ts",
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })

    expect(facts).toMatchObject({
      packageId: "demo",
      descriptorHash: "descriptor-hash",
      deltaKinds: ["stale-generated-source"],
      repairTargets: ["@attune/framework-nx:protocol-materialize"],
      generatedArtifactHashes: [{
        artifactId: "demo:registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })
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
