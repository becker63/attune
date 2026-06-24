import { describe, expect, it } from "vitest"
import {
  PackageContractInvariantClassifications,
  decodePackageContract,
  validatePackageContract,
} from "../src/project-facts/validation.js"

describe("project facts validation", () => {
  it("classifies invariants by their enforcement boundary", () => {
    expect(PackageContractInvariantClassifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ boundary: "typescript-contract-builder" }),
      expect.objectContaining({ boundary: "effect-schema-decoder" }),
      expect.objectContaining({ boundary: "nx-generated-sync" }),
      expect.objectContaining({ boundary: "fastcheck-provider-observation" }),
      expect.objectContaining({ boundary: "architecture-policy" }),
    ]))
  })

  it("decodes canonical service contracts and waived Context.Tag service boundaries", () => {
    const canonical = validatePackageContract(contractFixture({
      services: ["attune.policy"],
      packageLayer: { provides: ["attune.policy"] },
      testLayer: { provides: ["attune.policy"] },
    }))
    const waivedContextTag = validatePackageContract(contractFixture({
      services: ["joern.runtime"],
      packageLayer: { provides: ["joern.runtime"] },
      testLayer: { provides: ["joern.runtime"] },
      waivers: [{
        category: "legacy-boundary",
        owner: "fixture",
        reason: "Context.Tag service migration fixture.",
        review: "test",
      }],
    }))

    expect(canonical.diagnostics).toEqual([])
    expect(waivedContextTag.diagnostics).toEqual([])
  })

  it("accepts pure/minimal packages and private helpers that are excluded from operation metadata", () => {
    const purePackage = validatePackageContract({
      packageId: "pure-package",
      packageKind: "architecture-policy",
      views: { reactivityKeys: [], atoms: [] },
      operations: [],
      privateHelpers: ["parseInternalFixture"],
    })

    expect(purePackage.diagnostics).toEqual([])
  })

  it("reports duplicate operation ids, invalid law ids, and invalid view references as architecture-policy backstops", () => {
    const result = validatePackageContract(contractFixture({
      operations: [
        operationFixture({ id: "scan-policy", laws: ["schema.decode", "not.real"] }),
        operationFixture({
          id: "scan-policy",
          laws: ["resource.observed-idempotence"],
          views: { reactivityKeys: ["unknown.changed"], atoms: ["unknownAtom"] },
        }),
      ],
    }))

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "duplicate-operation-id" }),
      expect.objectContaining({ code: "invalid-law-id", path: ["operations", "scan-policy", "laws", "not.real"] }),
      expect.objectContaining({ code: "invalid-law-id", path: ["operations", "scan-policy", "laws", "resource.observed-idempotence"] }),
      expect.objectContaining({ code: "invalid-view-reference", path: ["operations", "scan-policy", "views", "reactivityKeys", "unknown.changed"] }),
      expect.objectContaining({ code: "invalid-view-reference", path: ["operations", "scan-policy", "views", "atoms", "unknownAtom"] }),
    ]))
  })

  it("reports missing kind metadata, layers, schemas, atom view graphs, and hidden configuration failures at the expected boundary", () => {
    const missingSchema = decodePackageContract(contractFixture({
      operations: [{ id: "missing-output", kind: "query", input: {} }],
    }))
    const missingLayerAndMetadata = validatePackageContract({
      packageId: "policy-package",
      packageKind: "architecture-policy",
      views: { reactivityKeys: ["policy.changed"], atoms: ["policyAtom"] },
      operations: [operationFixture({
        id: "scan-policy",
        kind: "policy-rule",
        metadata: { hiddenConfiguration: true },
      })],
    })
    const waivedHiddenConfiguration = validatePackageContract(contractFixture({
      operations: [operationFixture({
        id: "scan-policy",
        kind: "policy-rule",
        metadata: { policy: { findingSchema: "PolicyFinding" }, hiddenConfiguration: true },
      })],
      waivers: [{ category: "hidden-configuration", owner: "fixture", reason: "fixture", review: "test" }],
    }))

    expect(missingSchema.diagnostics).toEqual([
      expect.objectContaining({ code: "schema-decode-failed" }),
    ])
    expect(missingLayerAndMetadata.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing-kind-metadata", path: ["operations", "scan-policy", "policy"] }),
      expect.objectContaining({ code: "missing-layer-metadata", path: ["layers"] }),
      expect.objectContaining({ code: "hidden-configuration-without-waiver" }),
    ]))
    expect(waivedHiddenConfiguration.diagnostics).toEqual([])
  })
})

function contractFixture(input: {
  readonly services?: readonly string[]
  readonly operations?: readonly unknown[]
  readonly packageLayer?: unknown
  readonly testLayer?: unknown
  readonly waivers?: readonly unknown[]
} = {}): Record<string, unknown> {
  return {
    packageId: "policy-package",
    sourceRoot: "packages/policy-package",
    packageKind: "architecture-policy",
    views: { reactivityKeys: ["policy.changed"], atoms: ["policyAtom"] },
    services: input.services ?? [],
    operations: input.operations ?? [operationFixture()],
    packageLayer: input.packageLayer ?? { provides: [] },
    testLayer: input.testLayer ?? { provides: [] },
    waivers: input.waivers ?? [],
  }
}

function operationFixture(input: {
  readonly id?: string
  readonly kind?: string
  readonly views?: unknown
  readonly laws?: readonly string[]
  readonly metadata?: unknown
} = {}): Record<string, unknown> {
  return {
    id: input.id ?? "scan-policy",
    kind: input.kind ?? "query",
    input: {},
    output: {},
    views: input.views ?? { reactivityKeys: ["policy.changed"], atoms: ["policyAtom"] },
    laws: input.laws ?? ["schema.decode"],
    metadata: input.metadata ?? { source: "fixture" },
  }
}
