import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  CommandSurfaceConformanceOperation,
  GeneratorShapeConformanceOperation,
  PackageContract,
  PackageContractSchema,
  PackageFuzzHandlers,
  PackageFuzzRpcGroup,
  PackageProperties,
  PackageTypeGuidance,
  PackageViews,
  TypeGuidanceValidationOperation,
  WorkspacePolicySummaryOperation,
  type ArchitectureOperationId,
} from "../src/attune.package.js"
import {
  assertExactHandlers,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  inferLawIds,
  packagePartitionIds,
} from "../src/package-contract/index.js"

const requiredOperationIds = [
  "package-contract-decode",
  "package-contract-assertions",
  "infer-operation-laws",
  "type-guidance-validate",
  "derive-rpc-descriptors",
  "command-surface-conformance",
  "generator-shape-conformance",
  "source-bom-policy-scan",
  "workspace-policy-summary",
] as const

describe("attune-architecture package contract", () => {
  it("declares the architecture package identity and auditable operations", () => {
    expect(PackageContract.packageId).toBe("attune-architecture")
    expect(PackageContract.packageKind).toBe("architecture-policy")
    expect(PackageContract.sourceRoot).toBe("packages/attune-architecture/src")
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual([...requiredOperationIds])

    expectTypeOf<ArchitectureOperationId>().toEqualTypeOf<(typeof requiredOperationIds)[number]>()

    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)
    expect(decoded.packageId).toBe("attune-architecture")
    expect(decoded.operations).toHaveLength(requiredOperationIds.length)
  })

  it("declares the policy, waiver, contract, command-surface, and generator-shape views", () => {
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "architecture.policy-findings",
      "architecture.waiver-summary",
      "architecture.package-contract-coverage",
      "architecture.command-surface-findings",
      "architecture.generator-shape-findings",
    ]))
    expect(PackageViews.atoms).toEqual(expect.arrayContaining([
      "policyFindingsAtom",
      "waiverSummaryAtom",
      "packageContractCoverageAtom",
      "commandSurfaceFindingsAtom",
      "generatorShapeFindingsAtom",
    ]))
    expect(CommandSurfaceConformanceOperation.views?.reactivityKeys).toContain("architecture.command-surface-findings")
    expect(GeneratorShapeConformanceOperation.views?.atoms).toContain("generatorShapeFindingsAtom")
    expect(WorkspacePolicySummaryOperation.views?.atoms).toContain("waiverSummaryAtom")
  })

  it("keeps exact handler/property maps and compile-time guidance helpers aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
  })

  it("records inferred law and type-guidance evidence for policy operations", () => {
    expect(TypeGuidanceValidationOperation.laws).toEqual(expect.arrayContaining([
      "policy.finding-schema",
      "policy.deterministic-findings",
      "policy.stable-diagnostic-ids",
      "view.reactivity-key-moves",
      "view.atom-moves",
    ]))

    const inferredPolicyLaws = inferLawIds({
      id: CommandSurfaceConformanceOperation.id,
      kind: CommandSurfaceConformanceOperation.kind,
      views: {
        reactivityKeys: CommandSurfaceConformanceOperation.views?.reactivityKeys,
        atoms: CommandSurfaceConformanceOperation.views?.atoms,
      },
      policy: {
        findingSchema: "ArchitectureFinding",
      },
    })

    expect(inferredPolicyLaws).toEqual(expect.arrayContaining([
      "policy.finding-schema",
      "view.reactivity-key-moves",
      "view.atom-moves",
    ]))

    expect(packagePartitionIds(PackageTypeGuidance)["command-surface-conformance"]).toEqual(expect.arrayContaining([
      "policy.finding-schema",
      "policy.deterministic-findings",
      "policy.stable-diagnostic-ids",
      "architecture.command-surface-findings.moves",
      "commandSurfaceFindingsAtom.moves",
    ]))
  })

  it("derives package RPC descriptor metadata without importing the runtime adapter", () => {
    expect(PackageFuzzRpcGroup.packageId).toBe("attune-architecture")
    expect(PackageFuzzRpcGroup.operations.map((descriptor) => descriptor.operationId)).toEqual([
      ...requiredOperationIds,
    ])
    expect(PackageFuzzRpcGroup.adapterCompatibility).toMatchObject({
      adapter: "@effect/rpc",
      status: "blocked",
    })
  })
})
