import { describe, expect, it } from "vitest"
import {
  deriveProtocolObligations,
  defineAttunePackage,
  descriptorFromPackageContract,
  diagnosticFromDelta,
  hashProtocolValue,
  projection,
  protocolIdForPackage,
  views,
} from "../src/index.js"

describe("@attune/framework-protocol", () => {
  it("keeps package authoring on the public framework facade", () => {
    const PackageViews = views({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)

    const contract = defineAttunePackage({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        projection({
          id: "demo-projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
        }),
      ],
    } as const)

    expect(contract.packageId).toBe("demo")
    expect(contract.operations[0]?.kind).toBe("projection")
    expect(protocolIdForPackage(contract.packageId)).toBe("attune/package/demo")
  })

  it("projects protocol deltas into framework diagnostics", () => {
    const diagnostic = diagnosticFromDelta({
      deltaId: "delta-1",
      protocolId: "attune/package/demo",
      packageId: "demo",
      kind: "missing-obligation",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "missing generated evidence",
      repairActions: [{
        id: "generate-evidence",
        title: "Generate property evidence scaffold",
        kind: "nx-generator",
        target: "@attune/framework-nx:protocol-evidence",
      }],
    })

    expect(diagnostic.code).toBe("attune/protocol/missing-obligation")
    expect(diagnostic.suggestedActions[0]?.title).toContain("evidence")
  })

  it("derives stable descriptor hashes and obligations from package contracts", () => {
    const PackageViews = views({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = defineAttunePackage({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        projection({
          id: "demo-projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
          laws: ["projection.deterministic-replay"],
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        }),
      ],
    } as const)

    const descriptor = descriptorFromPackageContract({
      sourcePath: "packages/demo/src/attune.package.ts",
      contract,
    })
    expect(descriptor.descriptorHash).toBe(hashProtocolValue({
      protocolId: "attune/package/demo",
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      sourcePath: "packages/demo/src/attune.package.ts",
      views: PackageViews,
      services: [],
      operations: [{
        id: "demo-projection",
        kind: "projection",
        views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        laws: ["projection.deterministic-replay"],
        inputSchema: "demo-input-schema",
        outputSchema: "demo-output-schema",
      }],
    }))
    expect(deriveProtocolObligations(descriptor).map((obligation) => obligation.kind)).toEqual([
      "handler",
      "property",
      "law",
      "view-movement",
      "type-guidance",
      "generated-artifact",
    ])
  })
})
