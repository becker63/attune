import { describe, expect, it } from "vitest"

import {
  PackageDeclaration,
  PackageViewRoots,
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

describe("joern-effect-properties package declaration", () => {
  it("keeps the authored property proof runtime root small and complete", () => {
    expect(PackageDeclaration.id).toBe("joern-effect-properties")
    expect(PackageDeclaration.kind).toBe("property-proof-runtime")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
    expect(PackageDeclaration.operations.map((operation) => operation.kind)).toEqual([
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

  it("declares proof-runtime Reactivity keys and package view atoms", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual([
      "joern-effect-properties.property-run.changed",
      "joern-effect-properties.fuzz-run.changed",
      "joern-effect-properties.corpus.changed",
      "joern-effect-properties.counterexample.changed",
      "joern-effect-properties.worker-shard.changed",
      "joern-effect-properties.workspace-pool.changed",
      "joern-effect-properties.coverage-feedback.changed",
      "joern-effect-properties.weak-oracle.changed",
      "joern-effect-properties.telemetry.changed",
    ])
    expect(PackageViewRoots.atoms).toEqual([
      "propertyRunAtom",
      "fuzzRunAtom",
      "corpusAtom",
      "counterexampleAtom",
      "workerShardAtom",
      "workspacePoolAtom",
      "coverageFeedbackAtom",
      "weakOracleFindingAtom",
      "telemetryEventAtom",
    ])
    expect(PackageDeclaration.views).toEqual([
      ...PackageViewRoots.reactivityKeys.map((id) => ({
        id,
        kind: "reactivity-key",
      })),
      ...PackageViewRoots.atoms.map((id) => ({
        id,
        kind: "atom",
      })),
    ])
  })
})
