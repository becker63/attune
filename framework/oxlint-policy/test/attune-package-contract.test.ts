import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  assertExactHandlers,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageContractSchema,
  PackageFuzzHandlers,
  PackageProperties,
  PackageTypeGuidance,
  PackageViews,
  PolicyRuleIds,
} from "../../architecture/src/generated/package-contracts/effect-oxlint-policy/attune.contract.generated.js"

describe("effect-oxlint-policy package contract", () => {
  it("declares the policy-plugin package and policy-rule operation ids", () => {
    expect(PackageContract.packageId).toBe("effect-oxlint-policy")
    expect(PackageContract.packageKind).toBe("policy-plugin")
    expect(PackageContract.sourceRoot).toBe("framework/oxlint-policy")
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual([
      "no-raw-process-env",
      "no-raw-node-apis",
      "no-arbitrary-package-manager-surfaces",
      "no-hand-authored-architecture-shapes",
    ])
    expect(PackageContract.operations.every((operation) => operation.kind === "policy-rule")).toBe(true)
    expect(PolicyRuleIds).toEqual(PackageContract.operations.map((operation) => operation.id))

    expectTypeOf<OperationIds<typeof PackageContract>>().toEqualTypeOf<
      | "no-raw-process-env"
      | "no-raw-node-apis"
      | "no-arbitrary-package-manager-surfaces"
      | "no-hand-authored-architecture-shapes"
    >()
  })

  it("decodes through the shared Effect Schema contract surface", () => {
    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)

    expect(decoded.packageId).toBe("effect-oxlint-policy")
    expect(decoded.packageKind).toBe("policy-plugin")
    expect(decoded.operations).toHaveLength(4)
    expect(decoded.operations.map((operation) => operation.kind)).toEqual([
      "policy-rule",
      "policy-rule",
      "policy-rule",
      "policy-rule",
    ])
  })

  it("declares policy result, finding, waiver, and source Reactivity views", () => {
    expect(PackageViews.reactivityKeys).toEqual([
      "effect-oxlint-policy.rule-source.changed",
      "effect-oxlint-policy.oxlint-config.changed",
      "effect-oxlint-policy.adapter-allowlist.changed",
      "effect-oxlint-policy.scanned-source-partitions.changed",
      "effect-oxlint-policy.policy-results.changed",
    ])
    expect(PackageViews.atoms).toEqual([
      "policyRuleRegistryAtom",
      "adapterAllowlistAtom",
      "policyResultAtom",
      "ruleFindingAtom",
      "waiverSummaryAtom",
      "rawEnvFindingAtom",
      "rawNodeApiFindingAtom",
      "packageManagerSurfaceFindingAtom",
      "serviceShapeFindingAtom",
    ])
    expect(PackageContract.operations[0]?.views?.atoms).toContain("rawEnvFindingAtom")
    expect(PackageContract.operations[1]?.views?.atoms).toContain("rawNodeApiFindingAtom")
    expect(PackageContract.operations[2]?.views?.atoms).toContain("packageManagerSurfaceFindingAtom")
    expect(PackageContract.operations[3]?.views?.atoms).toContain("serviceShapeFindingAtom")
  })

  it("attaches policy metadata and inferred law guidance to each operation", () => {
    for (const operation of PackageContract.operations) {
      expect(operation).toMatchObject({
        kind: "policy-rule",
        policy: {
          findingSchema: "PolicyFinding",
          ruleName: operation.id,
        },
      })
      expect(operation.laws).toEqual([
        "schema.decode",
        "schema.encode",
        "schema.error-decode",
        "determinism.same-input-same-output",
        "side-effect.readonly",
        "policy.finding-schema",
        "policy.deterministic-findings",
        "policy.stable-diagnostic-ids",
        "view.reactivity-key-moves",
        "view.atom-moves",
      ])
      expect(PackageTypeGuidance.operations[operation.id]?.lawPartitions.map((partition) => partition.id)).toEqual(operation.laws)
    }

    expect(PackageContract.operations[2]?.policy).toMatchObject({
      exportedRule: null,
      ruleFamily: "arbitrary-package-manager-script-surfaces",
    })
  })

  it("keeps type-guidance partitions and coverage search targets visible", () => {
    expect(packagePartitionIds(PackageTypeGuidance)).toMatchObject({
      "no-raw-process-env": expect.arrayContaining([
        "raw-env.member-expression",
        "raw-env.adapter-allowlist",
        "raw-env.findings.present",
        "rawEnvFindingAtom.moves",
      ]),
      "no-raw-node-apis": expect.arrayContaining([
        "raw-node.import-source",
        "raw-node.process-call",
        "rawNodeApiFindingAtom.moves",
      ]),
      "no-arbitrary-package-manager-surfaces": expect.arrayContaining([
        "command-surface.package-script",
        "command-surface.run-command",
        "packageManagerSurfaceFindingAtom.moves",
      ]),
      "no-hand-authored-architecture-shapes": expect.arrayContaining([
        "shape.effect-service",
        "shape.generator-provenance",
        "serviceShapeFindingAtom.moves",
      ]),
    })
    expect(PackageTypeGuidance.operations["no-hand-authored-architecture-shapes"].coverageSearch).toContainEqual(
      expect.objectContaining({
        id: "coverage:no-hand-authored-architecture-shapes:generator-use",
        targetPartitionId: "shape.generator-provenance",
      }),
    )
  })

  it("has exact fuzz handler and property maps for every policy operation", () => {
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...PolicyRuleIds])
    expect(Object.keys(PackageProperties)).toEqual([...PolicyRuleIds])
  })
})
