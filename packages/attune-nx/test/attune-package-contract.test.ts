import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  PackageContractSchema,
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  generateEffectServiceOperation,
  normalizeExecutorIntentOperation,
  upsertSourceBomProvenanceOperation,
} from "../src/attune.package.js"

type AttuneNxOperationId = OperationIds<typeof PackageContract>

const operationIds = (): readonly AttuneNxOperationId[] =>
  PackageContract.operations.map((operation) => operation.id)

describe("attune-nx package contract", () => {
  it("declares the generator-tooling package boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("attune-nx")
    expect(PackageContract.packageKind).toBe("generator-tooling")
    expect(operationIds()).toEqual([
      "generate-effect-service",
      "generate-package-contract",
      "generate-atom-view",
      "query-generator-inventory",
      "infer-package-contract-graph",
      "upsert-source-bom-provenance",
      "normalize-executor-intent",
    ])
    expect(PackageViews.atoms).toContain("generatorPlanAtom")
    expect(PackageViews.atoms).toContain("contractGraphAtom")
    expect(PackageViews.reactivityKeys).toContain("attune-nx.provenance.changed")

    expectTypeOf<AttuneNxOperationId>().toEqualTypeOf<
      | "generate-effect-service"
      | "generate-package-contract"
      | "generate-atom-view"
      | "query-generator-inventory"
      | "infer-package-contract-graph"
      | "upsert-source-bom-provenance"
      | "normalize-executor-intent"
    >()
  })

  it("decodes the contract and keeps exact handler/property maps", () => {
    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)

    expect(decoded.packageId).toBe("attune-nx")
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
    expect(Object.keys(PackageFuzzHandlers).sort()).toEqual([...operationIds()].sort())
    expect(Object.keys(PackageProperties).sort()).toEqual([...operationIds()].sort())
  })

  it("keeps laws aligned with operation kind and metadata inference", () => {
    expect(
      inferLawIds({
        id: generateEffectServiceOperation.id,
        kind: generateEffectServiceOperation.kind,
        schemas: {
          input: generateEffectServiceOperation.input,
          output: generateEffectServiceOperation.output,
          error: generateEffectServiceOperation.error,
        },
        views: generateEffectServiceOperation.views,
        generator: {
          optionsSchema: generateEffectServiceOperation.input,
          virtualTreeSchema: "GeneratorTree",
          outputSchema: generateEffectServiceOperation.output,
          provenanceSchema: "SourceBomProvenance",
        },
      }),
    ).toEqual(generateEffectServiceOperation.laws)

    expect(
      inferLawIds({
        id: normalizeExecutorIntentOperation.id,
        kind: normalizeExecutorIntentOperation.kind,
        schemas: {
          input: normalizeExecutorIntentOperation.input,
          output: normalizeExecutorIntentOperation.output,
          error: normalizeExecutorIntentOperation.error,
        },
        views: normalizeExecutorIntentOperation.views,
        policy: normalizeExecutorIntentOperation.policy,
      }),
    ).toEqual(normalizeExecutorIntentOperation.laws)

    expect(upsertSourceBomProvenanceOperation.kind).toBe("command")
    expect(upsertSourceBomProvenanceOperation.laws).toContain("side-effect.declared-boundary")
  })

  it("records type-guidance partitions for FastCheck and agent coverage search", () => {
    const partitions = packagePartitionIds(PackageTypeGuidance)

    expect(partitions["generate-package-contract"]).toContain(
      "generate-package-contract.generated-contract",
    )
    expect(partitions["normalize-executor-intent"]).toContain(
      "normalize-executor-intent.diagnostics",
    )
    expect(
      PackageTypeGuidance.operations["normalize-executor-intent"].filters,
    ).toEqual([
      expect.objectContaining({
        id: "normalize-executor-intent.valid-executor-options",
        kind: "operation-precondition",
      }),
    ])
    expect(
      PackageTypeGuidance.operations["generate-effect-service"].coverageSearch[0],
    ).toMatchObject({
      tier: "commit",
      required: true,
    })
  })
})
