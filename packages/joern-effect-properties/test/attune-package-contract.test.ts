import { describe, expect, expectTypeOf, it } from "vitest"
import { Schema } from "effect"

import {
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  decodePackageContract,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageAtomGraphCoverage,
  PackageEvidenceShapes,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTargetIntents,
  PackageTypeGuidance,
  PackageViews,
  ProofAtomGraphCoverageSummary,
  ProofPropertyEvidenceSummary,
  ProofTypedTargetIntent,
  coverageSearchFeedbackOperation,
  fuzzOracleOperation,
  propertyProofViewAtomsOperation,
  semanticFuzzSchedulerOperation,
  workerPropertyWrapperOperation,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "property-harness-runtime",
  "semantic-corpus-store",
  "counterexample-store",
  "semantic-mutator",
  "semantic-fuzz-scheduler",
  "joern-workspace-pool",
  "fuzz-oracle",
  "fuzz-telemetry",
  "coverage-search-feedback",
  "worker-property-wrapper",
  "property-proof-view-atoms",
] as const

type JoernEffectPropertiesOperationId = OperationIds<typeof PackageContract>

describe("joern-effect-properties package contract", () => {
  it("declares the property proof runtime boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("joern-effect-properties")
    expect(PackageContract.packageKind).toBe("property-proof-runtime")
    expect(PackageContract.sourceRoot).toBe("packages/joern-effect-properties/src")
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])

    expectTypeOf<JoernEffectPropertiesOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()

    const decoded = decodePackageContract(PackageContract)
    expect(decoded.contract?.packageId).toBe("joern-effect-properties")
    expect(decoded.contract?.operations.map((operation) => operation.kind)).toEqual([
      "command",
      "query",
      "command",
      "generator",
      "command",
      "resource-provider",
      "joern-template",
      "event-facade",
      "projection",
      "command",
      "atom-family",
    ])
  })

  it("records proof-runtime Reactivity keys and package view atoms", () => {
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "joern-effect-properties.fuzz-run.changed",
      "joern-effect-properties.property-run.changed",
      "joern-effect-properties.corpus.changed",
      "joern-effect-properties.counterexample.changed",
      "joern-effect-properties.worker-shard.changed",
      "joern-effect-properties.coverage-feedback.changed",
      "joern-effect-properties.weak-oracle.changed",
    ]))
    expect(PackageViews.atoms).toEqual(expect.arrayContaining([
      "fuzzRunAtom",
      "propertyRunAtom",
      "corpusAtom",
      "counterexampleAtom",
      "workerShardAtom",
      "coverageFeedbackAtom",
      "weakOracleFindingAtom",
    ]))
    expect(semanticFuzzSchedulerOperation.views?.atoms).toEqual(expect.arrayContaining([
      "fuzzRunAtom",
      "workerShardAtom",
      "workspacePoolAtom",
    ]))
    expect(fuzzOracleOperation.views?.atoms).toContain("weakOracleFindingAtom")
    expect(coverageSearchFeedbackOperation.views?.reactivityKeys).toContain(
      "joern-effect-properties.coverage-feedback.changed",
    )
    expect(workerPropertyWrapperOperation.views?.atoms).toContain("workerShardAtom")
    expect(propertyProofViewAtomsOperation.atom).toMatchObject({
      family: "property-proof-runtime",
    })
  })

  it("keeps exact handler/property maps, layers, and type guidance aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
    expect(Object.keys(PackageTypeGuidance.operations)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("keeps generated audits on dry fixture behavior", () => {
    expect(PackageTestLayer.metadata).toMatchObject({
      role: "dry-fixture-property-proof-boundary",
      eventRuntime: "local",
      liveJoern: false,
      workerResourceTier: "commit",
    })
    expect(PackageFuzzHandlers["semantic-fuzz-scheduler"]()).toMatchObject({
      mode: "smoke",
      accepted: 2,
      rejected: 0,
      workerShards: 1,
    })
    expect(PackageFuzzHandlers["joern-workspace-pool"]()).toMatchObject({
      imported: false,
      cleanedUp: true,
    })
    expect(PackageFuzzHandlers["worker-property-wrapper"]()).toMatchObject({
      randomSource: "main-thread",
      preservesShrinking: true,
      status: "passed",
    })
    expect(PackageContract.waivers?.map((waiver: { readonly id: string }) => waiver.id)).toEqual(
      expect.arrayContaining([
        "joern-effect-properties/context-tag-services",
        "joern-effect-properties/live-joern-oracle-boundary",
        "joern-effect-properties/typed-executor-migration",
      ]),
    )
  })

  it("records type-guidance partitions for proof evidence and weak-oracle coverage", () => {
    const partitions = packagePartitionIds(PackageTypeGuidance)

    expect(partitions["coverage-search-feedback"]).toEqual(expect.arrayContaining([
      "coverage-search-feedback.finding-kind",
      "coverageFeedbackAtom.moves",
      "weakOracleFindingAtom.moves",
    ]))
    expect(partitions["worker-property-wrapper"]).toEqual(expect.arrayContaining([
      "worker-property-wrapper.resource-tier",
      "workerShardAtom.moves",
      "propertyRunAtom.moves",
    ]))
    expect(partitions["fuzz-oracle"]).toEqual(expect.arrayContaining([
      "joern.evidence-schema",
      "joern.normalized-evidence",
      "weakOracleFindingAtom.moves",
    ]))
    expect(
      PackageTypeGuidance.operations["property-harness-runtime"].filters,
    ).toContainEqual(
      expect.objectContaining({
        id: "property-harness-runtime.fixture-events",
        kind: "operation-precondition",
      }),
    )
    expect(PackageTypeGuidance.operations["fuzz-oracle"].filters).toContainEqual(
      expect.objectContaining({
        id: "fuzz-oracle.fixture-joern",
        kind: "operation-precondition",
      }),
    )
  })

  it("connects proof targets to shared property evidence and atom graph coverage shapes", () => {
    const operationIds = new Set(requiredOperationIds)
    const decodeEvidence = Schema.decodeUnknownSync(ProofPropertyEvidenceSummary)
    const decodeCoverage = Schema.decodeUnknownSync(ProofAtomGraphCoverageSummary)
    const decodeTarget = Schema.decodeUnknownSync(ProofTypedTargetIntent)

    expect(Object.keys(PackageEvidenceShapes)).toEqual([...requiredOperationIds])
    for (const [operationId, evidence] of Object.entries(PackageEvidenceShapes)) {
      expect(operationIds.has(operationId as (typeof requiredOperationIds)[number])).toBe(true)
      expect(decodeEvidence(evidence)).toMatchObject({
        operationId,
        packageId: "joern-effect-properties",
        runId: "joern-effect-properties-fixture-run",
      })
      expect(evidence.reactivityKeys.length).toBeGreaterThan(0)
      expect(evidence.atomIds.length).toBeGreaterThan(0)
      expect(evidence.lawIds).toEqual(expect.arrayContaining(["schema.decode"]))
    }

    expect(Object.keys(PackageAtomGraphCoverage)).toEqual([
      "property-harness-runtime",
      "semantic-fuzz-scheduler",
      "coverage-search-feedback",
      "worker-property-wrapper",
    ])
    for (const coverage of Object.values(PackageAtomGraphCoverage)) {
      expect(decodeCoverage(coverage)).toMatchObject({
        missingEdges: [],
      })
      expect(operationIds.has(coverage.operationId as (typeof requiredOperationIds)[number]))
        .toBe(true)
      expect(coverage.movedEdges.length).toBeGreaterThan(0)
    }

    expect(PackageTargetIntents.map((target) => target.targetName)).toEqual([
      "property",
      "fuzz:smoke",
      "fuzz:workbench",
      "fuzz:campaign",
    ])
    for (const target of PackageTargetIntents) {
      expect(decodeTarget(target)).toMatchObject({
        commandSurfaceWaiverId: "joern-effect-properties/typed-executor-migration",
      })
      expect(target.operationIds.every((operationId) => operationIds.has(operationId)))
        .toBe(true)
    }
    expect(PackageTargetIntents.find((target) => target.targetName === "fuzz:campaign"))
      ?.toMatchObject({
        intendedExecutor: "attune:toolchain",
        resourceTier: "proof-pressure",
        typedOptions: {
          arion: true,
          nixImage: "joern-effect-property-image",
        },
      })
  })
})
