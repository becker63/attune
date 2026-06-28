import { describe, expect, it } from "vitest"
import {
  mergeCoverageSearchEvidence,
  mergeTypeGuidancePartitions,
  type CoverageSearchIdentity,
  type MeasuredFilterRecord,
  type TypeGuidancePartitionRecord,
  type V8CoveragePointDelta,
} from "../src/coverageSearch.js"

const caseRef = (
  input: Partial<CoverageSearchIdentity> = {},
): CoverageSearchIdentity => ({
  packageId: input.packageId ?? "pkg-a",
  operationId: input.operationId ?? "normalize",
  seed: input.seed ?? 101,
  shardId: input.shardId ?? "shard-a",
  ...(input.corpusSeedId === undefined ? {} : { corpusSeedId: input.corpusSeedId }),
  ...(input.generatedValueSummary === undefined ? {} : { generatedValueSummary: input.generatedValueSummary }),
  ...(input.shrinkPath === undefined ? {} : { shrinkPath: input.shrinkPath }),
  ...(input.workerId === undefined ? {} : { workerId: input.workerId }),
})

const partition = (
  input: Partial<TypeGuidancePartitionRecord> & Pick<TypeGuidancePartitionRecord, "partitionId" | "status">,
): TypeGuidancePartitionRecord => ({
  ...caseRef(input),
  partitionId: input.partitionId,
  partitionKind: input.partitionKind ?? "input",
  ...(input.source === undefined ? {} : { source: input.source }),
  status: input.status,
})

const filter = (
  input: Partial<MeasuredFilterRecord> & Pick<MeasuredFilterRecord, "accepted" | "filterId" | "rejected">,
): MeasuredFilterRecord => ({
  ...caseRef(input),
  accepted: input.accepted,
  filterId: input.filterId,
  reason: input.reason ?? "operation precondition",
  rejected: input.rejected,
  source: input.source ?? "operation-precondition",
})

const coverage = (
  input: Partial<V8CoveragePointDelta> & Pick<V8CoveragePointDelta, "pointId">,
): V8CoveragePointDelta => ({
  ...caseRef(input),
  afterCount: input.afterCount ?? 1,
  beforeCount: input.beforeCount ?? 0,
  coverageTool: input.coverageTool ?? "v8",
  pointId: input.pointId,
  pointKind: input.pointKind ?? "branch",
  sourceFile: input.sourceFile ?? "src/normalize.ts",
})

describe("coverage search evidence", () => {
  it("merges type-guidance partition hit and miss records deterministically", () => {
    const merged = mergeTypeGuidancePartitions([
      partition({
        partitionId: "approval.current",
        seed: 12,
        shardId: "b",
        status: "hit",
      }),
      partition({
        partitionId: "disk-proof.present",
        seed: 10,
        shardId: "a",
        source: "schema.required-field",
        status: "miss",
      }),
      partition({
        partitionId: "approval.current",
        seed: 11,
        shardId: "a",
        source: "destructive.approval-schema",
        status: "miss",
      }),
    ])

    expect(merged.map((item) => [item.partitionId, item.status])).toEqual([
      ["approval.current", "hit"],
      ["disk-proof.present", "missing"],
    ])
    expect(merged[0]).toMatchObject({
      hitCount: 1,
      missCount: 1,
      partitionId: "approval.current",
    })
    expect(merged[0]?.replay.map((item) => `${item.seed}:${item.shardId}`)).toEqual([
      "11:a",
      "12:b",
    ])
  })

  it("reports high-rejection measured filters as generator-quality findings", () => {
    const summary = mergeCoverageSearchEvidence({
      filters: [
        filter({
          accepted: 2,
          filterId: "valid-install-state",
          rejected: 98,
        }),
      ],
    })

    expect(summary.filters[0]).toMatchObject({
      acceptanceRate: 0.02,
      accepted: 2,
      filterId: "valid-install-state",
      rejected: 98,
    })
    expect(summary.findings).toContainEqual(expect.objectContaining({
      acceptanceRate: 0.02,
      filterId: "valid-install-state",
      kind: "high-rejection-filter",
      severity: "warning",
    }))
  })

  it("reports missing atom graph movement for required operation edges", () => {
    const summary = mergeCoverageSearchEvidence({
      atomGraphMovements: [
        {
          ...caseRef({ seed: 202, shardId: "worker-1" }),
          edgeId: "normalize->view",
          moved: false,
          reactivityKey: "normalized-command",
          viewAtomId: "normalizedCommandViewAtom",
        },
      ],
      requiredAtomGraphEdges: [
        {
          edgeId: "normalize->view",
          operationId: "normalize",
          packageId: "pkg-a",
          reactivityKey: "normalized-command",
          viewAtomId: "normalizedCommandViewAtom",
        },
      ],
    })

    expect(summary.findings).toContainEqual(expect.objectContaining({
      edgeId: "normalize->view",
      kind: "missing-atom-graph-movement",
      operationId: "normalize",
      packageId: "pkg-a",
      severity: "error",
    }))
    expect(summary.findings.find((finding) => finding.kind === "missing-atom-graph-movement")?.replay)
      .toHaveLength(1)
  })

  it("reports weak-oracle findings when V8 reaches code without required law evidence", () => {
    const summary = mergeCoverageSearchEvidence({
      coverageDeltas: [
        coverage({
          pointId: "branch:42:destructive-approval",
          seed: 303,
          sourceFile: "src/install.ts",
        }),
      ],
      requiredLaws: [
        {
          lawIds: ["schema.decode", "resource.destructive-approval"],
          operationId: "normalize",
          packageId: "pkg-a",
        },
      ],
    })

    expect(summary.coverageDeltas).toHaveLength(1)
    expect(summary.findings).toContainEqual(expect.objectContaining({
      kind: "weak-oracle",
      missingLawIds: ["schema.decode", "resource.destructive-approval"],
      operationId: "normalize",
      packageId: "pkg-a",
      severity: "warning",
    }))
  })

  it("ranks retained seeds by partition, graph, and implementation novelty", () => {
    const summary = mergeCoverageSearchEvidence({
      atomGraphMovements: [
        {
          ...caseRef({ seed: 404, shardId: "a" }),
          edgeId: "normalize->view",
          moved: true,
          reactivityKey: "normalized-command",
        },
      ],
      coverageDeltas: [
        coverage({
          pointId: "line:17",
          seed: 404,
          shardId: "a",
        }),
      ],
      filters: [
        filter({
          accepted: 1,
          filterId: "rare-error-path",
          rejected: 99,
          seed: 405,
          shardId: "b",
        }),
      ],
      typeGuidancePartitions: [
        partition({
          generatedValueSummary: "{\"kind\":\"trimmed\"}",
          partitionId: "input.trimmed",
          seed: 404,
          shardId: "a",
          status: "hit",
        }),
      ],
    })

    expect(summary.retainedSeeds.map((seed) => [seed.seed, seed.score])).toEqual([
      [404, 24],
      [405, 1],
    ])
    expect(summary.retainedSeeds[0]?.reasons).toEqual([
      "atom-graph:normalize->view",
      "coverage:src/normalize.ts:branch:line:17",
      "type-guidance:input:input.trimmed",
    ])
  })
})
