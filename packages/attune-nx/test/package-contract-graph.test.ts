import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import {
  PackageContractGraphError,
  createPackageContractGraphNode,
  derivePackageContractAffectedTargets,
  derivePackageContractWorkspaceGraph,
  discoverPackageContractSourceViews,
  discoverPackageContracts,
  inferDeterministicMergeTargetMetadata,
  inferPackageContractTargetSemantics,
  inferWorkerizedPropertyShardMetadata,
  mergePackageContractShardSummaries,
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
      diagnosticCodes: [],
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
      "protocol-materialize",
      "framework-diagnostics",
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
        affectedBy: expect.arrayContaining(["schema", "service", "reactivity-key", "atom-graph"]),
        runtimeInputs: expect.arrayContaining(["descriptor-hash", "evidence-state"]),
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

  it("propagates affected targets through derived DI dependencies and atom graph changes", () => {
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
        },
      },
    ])

    const affected = derivePackageContractAffectedTargets(graph, [
      {
        projectName: "provider",
        kind: "service",
        serviceIds: ["ProviderService"],
      },
      {
        packageId: "consumer",
        kind: "reactivity-key",
        reactivityKeys: ["consumer.changed"],
      },
    ])

    expect(affected).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectName: "consumer",
        targetName: "service-conformance",
        changeKind: "service",
        propagatedFromProjectName: "provider",
        runtimeInputs: expect.arrayContaining(["descriptor-hash", "internal-protocol-delta"]),
      }),
      expect.objectContaining({
        projectName: "consumer",
        targetName: "property",
        changeKind: "reactivity-key",
      }),
      expect.objectContaining({
        projectName: "consumer",
        targetName: "atom-graph-conformance",
        changeKind: "reactivity-key",
      }),
    ]))
  })

  it("derives workerized property shard metadata and deterministic merge targets", () => {
    const node = createPackageContractGraphNode({
      projectName: "demo",
      projectRoot: "packages/demo",
      contractPath: "packages/demo/src/attune.package.ts",
      module: {
        PackageContract: {
          packageId: "demo",
          packageKind: "core-discovery-runtime",
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
          services: ["DemoService"],
          operations: [
            { id: "alpha", kind: "query", input: "Input", output: "Output" },
            { id: "beta", kind: "command", input: "Input", output: "Output" },
          ],
        },
      },
    })

    const shards = inferWorkerizedPropertyShardMetadata(node, {
      operationIds: ["beta"],
      shardCount: 2,
      seedsPerShard: 50,
      seedStart: 1_000,
      workerCount: 4,
      timeoutMs: 45_000,
      isolationLevel: "worker-thread",
      resourceTier: "proof-pressure",
    })

    expect(shards).toEqual([
      expect.objectContaining({
        targetName: "property:beta:shard-0-of-2",
        packageId: "demo",
        operationId: "beta",
        seedRange: { start: 1_000, end: 1_049 },
        workerCount: 4,
        timeoutMs: 45_000,
        isolationLevel: "worker-thread",
        resourceTier: "proof-pressure",
        randomSource: "worker",
        evidenceOutput: ".attune/cache/property-evidence/demo/beta/shard-0-of-2.json",
      }),
      expect.objectContaining({
        targetName: "property:beta:shard-1-of-2",
        seedRange: { start: 1_050, end: 1_099 },
      }),
    ])

    expect(inferDeterministicMergeTargetMetadata(node)).toEqual([
      expect.objectContaining({
        targetName: "property-evidence-merge",
        reads: [".attune/cache/property-evidence/demo/**/*.json"],
        writes: [".attune/cache/property-evidence/demo/merged.json"],
        deterministicOrder: ["packageId", "operationId", "shardId", "workerId"],
      }),
      expect.objectContaining({
        targetName: "atom-graph-coverage-merge",
        writes: [".attune/cache/atom-graph/demo/coverage-summary.json"],
        deterministicOrder: ["packageId", "operationId", "shardId", "workerId", "atomGraphEdge"],
      }),
    ])
  })

  it("merges workerized shard summaries deterministically regardless of completion order", () => {
    const left = mergePackageContractShardSummaries([
      {
        packageId: "demo",
        operationId: "beta",
        shardId: "shard-1-of-2",
        workerId: "worker-b",
        propertyEvidenceArtifacts: [".attune/cache/property-evidence/demo/beta/shard-1-of-2.json"],
        atomGraphCoverageArtifacts: [".attune/cache/atom-graph/demo/beta/shard-1-of-2.json"],
        status: "passed",
      },
      {
        packageId: "demo",
        operationId: "alpha",
        shardId: "shard-0-of-2",
        workerId: "worker-a",
        propertyEvidenceArtifacts: [".attune/cache/property-evidence/demo/alpha/shard-0-of-2.json"],
        atomGraphCoverageArtifacts: [".attune/cache/atom-graph/demo/alpha/shard-0-of-2.json"],
        status: "passed",
      },
    ])
    const right = mergePackageContractShardSummaries([
      {
        packageId: "demo",
        operationId: "alpha",
        shardId: "shard-0-of-2",
        workerId: "worker-a",
        propertyEvidenceArtifacts: [".attune/cache/property-evidence/demo/alpha/shard-0-of-2.json"],
        atomGraphCoverageArtifacts: [".attune/cache/atom-graph/demo/alpha/shard-0-of-2.json"],
        status: "passed",
      },
      {
        packageId: "demo",
        operationId: "beta",
        shardId: "shard-1-of-2",
        workerId: "worker-b",
        propertyEvidenceArtifacts: [".attune/cache/property-evidence/demo/beta/shard-1-of-2.json"],
        atomGraphCoverageArtifacts: [".attune/cache/atom-graph/demo/beta/shard-1-of-2.json"],
        status: "passed",
      },
    ])

    expect(left).toEqual(right)
    expect(left).toEqual([{
      packageId: "demo",
      shardIds: ["shard-0-of-2", "shard-1-of-2"],
      workerIds: ["worker-a", "worker-b"],
      propertyEvidenceArtifacts: [
        ".attune/cache/property-evidence/demo/alpha/shard-0-of-2.json",
        ".attune/cache/property-evidence/demo/beta/shard-1-of-2.json",
      ],
      atomGraphCoverageArtifacts: [
        ".attune/cache/atom-graph/demo/alpha/shard-0-of-2.json",
        ".attune/cache/atom-graph/demo/beta/shard-1-of-2.json",
      ],
      statuses: ["passed"],
    }])
  })

  it("reads generated artifact hashes and diagnostics from framework runtime read models", async () => {
    const facts = await readPackageContractRuntimeFacts({
      getPackageSummary: (packageId) =>
        Effect.succeed({
          packageId,
          protocolId: `attune/package/${packageId}`,
          descriptorHash: "descriptor-hash",
          operationCount: 1,
          obligationCount: 2,
          evidenceRunCount: 1,
          evidenceCount: 4,
          replayMetadataCount: 1,
          coverageFeedbackCount: 3,
          activeWaiverCount: 1,
          waiverIssueCount: 1,
          staleGeneratedArtifactCount: 1,
        }),
      listDeltas: (packageId) =>
        Effect.succeed([{
          deltaId: "delta:demo:waiver",
          protocolId: `attune/package/${packageId}`,
          packageId,
          kind: "waiver-issue",
          sourcePath: "packages/demo/src/attune.package.ts",
          explanation: "Waiver needs review.",
          repairActions: [{
            id: "refresh-waiver-state",
            title: "Review package waiver state",
            kind: "nx-check",
            target: "workspace:package-contracts-check",
            options: { packageId },
          }],
        }]),
      getPackageEvidenceState: (packageId) =>
        Effect.succeed({
          generatedArtifacts: [{
            artifactId: "demo:typecheck",
            protocolId: `attune/package/${packageId}`,
            packageId,
            path: "packages/demo/src/attune.package.typecheck.ts",
            generatorId: "@attune/framework-nx:typecheck",
            expectedHash: "expected",
            actualHash: "actual",
            status: "stale",
          }],
        }),
      getDiagnosticsForFile: () =>
        Effect.succeed([
          { code: "attune/protocol/waiver-issue" },
          { code: "attune/protocol/stale-generated-source" },
        ]),
    }, "demo", {
      sourcePath: "packages/demo/src/attune.package.ts",
    })

    expect(facts).toMatchObject({
      packageId: "demo",
      descriptorHash: "descriptor-hash",
      evidenceRunCount: 1,
      replayMetadataCount: 1,
      coverageFeedbackCount: 3,
      activeWaiverCount: 1,
      waiverIssueCount: 1,
      deltaKinds: ["waiver-issue"],
      repairTargets: ["workspace:package-contracts-check"],
      diagnosticCodes: [
        "attune/protocol/stale-generated-source",
        "attune/protocol/waiver-issue",
      ],
      generatedArtifactHashes: [{
        artifactId: "demo:typecheck",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })
  })
})
