import { describe, expect, it } from "vitest"
import {
  PackageDeclaration,
  PackageViewRoots,
} from "../src/attune.package.js"

const operationIds = [
  "generate-effect-service",
  "generate-package-contract",
  "generate-atom-view",
  "query-generator-inventory",
  "infer-package-contract-graph",
  "upsert-source-bom-provenance",
  "normalize-executor-intent",
] as const

describe("attune-nx package declaration", () => {
  it("declares the authored generator-tooling package boundary", () => {
    expect(PackageDeclaration.id).toBe("attune-nx")
    expect(PackageDeclaration.kind).toBe("generator-tooling")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...operationIds,
    ])
  })

  it("keeps authored generator package views and atoms visible", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual([
      "attune-nx.generator-plan.changed",
      "attune-nx.generated-diff.changed",
      "attune-nx.provenance.changed",
      "attune-nx.contract-graph.changed",
      "attune-nx.executor-intent.changed",
    ])
    expect(PackageViewRoots.atoms).toEqual([
      "generatorPlanAtom",
      "generatedDiffAtom",
      "provenanceAtom",
      "contractGraphAtom",
      "generatorInventoryAtom",
      "executorIntentAtom",
    ])
  })
})
