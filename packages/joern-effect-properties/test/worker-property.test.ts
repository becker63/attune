import { assert as rawWorkerAssert, propertyFor as rawPropertyFor } from "@fast-check/worker"
import { describe, expect, it } from "vitest"

import {
  chooseWorkerRandomSource,
  defineWorkerPropertyDescriptor,
  makeWorkerEvidenceMetadata,
  mergeWorkerEvidenceRecords,
  normalizeWorkerBudget,
  type WorkerEvidenceRecord,
} from "../src/workerProperty.js"

const target = {
  moduleUrl: new URL("../src/workerProperty.ts", import.meta.url),
  operationId: "semantic-fuzz-operation",
  packageId: "joern-effect-properties",
  propertyId: "semantic-worker-smoke",
  target: "joern-effect-properties:property",
} as const

describe("worker property metadata", () => {
  it("normalizes commit-tier worker budgets into bounded values", () => {
    const budget = normalizeWorkerBudget({
      isolationLevel: "predicate",
      numRuns: 9_999,
      resourceTier: "commit",
      seed: 42,
      shard: {
        index: 5,
        total: 3,
      },
      timeoutMs: 999_999,
      workerCount: 99,
    })

    expect(budget.workerCount).toBe(2)
    expect(budget.numRuns).toBe(50)
    expect(budget.timeoutMs).toBe(5_000)
    expect(budget.isolationLevel).toBe("predicate")
    expect(budget.randomSource).toBe("main-thread")
    expect(budget.preservesShrinking).toBe(true)
    expect(budget.shard).toMatchObject({
      index: 2,
      seedEnd: 44,
      seedStart: 44,
      shardId: "shard-2-of-3",
      total: 3,
    })
    expect(budget.timeout).toEqual({
      cleanup: "worker-aware-assert",
      isolationLevel: "predicate",
      synchronousLoopProtection: true,
      timeoutMs: 5_000,
    })
  })

  it("chooses worker-side random generation only when requested or needed", () => {
    expect(chooseWorkerRandomSource({ generatedValuesSerializable: true })).toMatchObject({
      preservesShrinking: true,
      randomSource: "main-thread",
    })

    expect(chooseWorkerRandomSource({ generatedValuesSerializable: false })).toMatchObject({
      preservesShrinking: false,
      randomSource: "worker",
      shrinkLimitation: "worker-side random generation drops FastCheck shrinking and path replay",
    })
  })

  it("creates a dry worker property descriptor with the real worker API bindings", () => {
    const descriptor = defineWorkerPropertyDescriptor({
      budget: {
        isolationLevel: "property",
        numRuns: 12,
        randomSource: "main-thread",
        seed: 9,
        shard: {
          index: 1,
          total: 2,
        },
        timeoutMs: 250,
        workerCount: 2,
      },
      target,
      workerId: "worker-1",
    })

    expect(descriptor.descriptorKind).toBe("attune.worker-property")
    expect(descriptor.propertyFor).toBe(rawPropertyFor)
    expect(descriptor.assert).toBe(rawWorkerAssert)
    expect(typeof descriptor.propertyBuilder).toBe("function")
    expect(descriptor.propertyForOptions).toEqual({
      isolationLevel: "property",
      randomSource: "main-thread",
    })
    expect(descriptor.evidence).toMatchObject({
      isolationLevel: "property",
      moduleUrl: target.moduleUrl.toString(),
      operationId: "semantic-fuzz-operation",
      packageId: "joern-effect-properties",
      propertyId: "semantic-worker-smoke",
      randomSource: "main-thread",
      seed: 9,
      shardId: "shard-1-of-2",
      target: "joern-effect-properties:property",
      timeoutMs: 250,
      workerCount: 2,
      workerId: "worker-1",
    })
  })

  it("emits worker, shard, random-source, and timeout evidence metadata", () => {
    const budget = normalizeWorkerBudget({
      generatedValuesSerializable: false,
      isolationLevel: "file",
      resourceTier: "push",
      seed: 100,
      shard: {
        index: 3,
        seedEnd: 199,
        seedStart: 150,
        total: 8,
      },
      timeoutMs: 10_000,
      workerCount: 4,
    })

    expect(makeWorkerEvidenceMetadata(target, budget, "worker-3")).toMatchObject({
      isolationLevel: "file",
      moduleUrl: target.moduleUrl.toString(),
      operationId: "semantic-fuzz-operation",
      preservesShrinking: false,
      randomSource: "worker",
      resourceTier: "push",
      seed: 100,
      seedEnd: 199,
      seedStart: 150,
      shardId: "shard-3-of-8",
      shardIndex: 3,
      shardTotal: 8,
      shrinkLimitation: "worker-side random generation drops FastCheck shrinking and path replay",
      timeoutMs: 10_000,
      workerCount: 4,
      workerId: "worker-3",
    })
  })

  it("merges worker evidence records deterministically", () => {
    const descriptor = defineWorkerPropertyDescriptor({ target })
    const base = descriptor.evidence
    const records: readonly WorkerEvidenceRecord[] = [
      {
        ...base,
        runCount: 3,
        seed: 2,
        shardId: "shard-1-of-2",
        shardIndex: 1,
        status: "failed",
        workerId: "worker-b",
      },
      {
        ...base,
        runCount: 7,
        seed: 1,
        shardId: "shard-0-of-2",
        shardIndex: 0,
        status: "passed",
        workerId: "worker-a",
      },
      {
        ...base,
        runCount: 0,
        seed: 3,
        shardId: "shard-1-of-2",
        shardIndex: 1,
        status: "timed-out",
        workerId: "worker-c",
      },
    ]

    const merged = mergeWorkerEvidenceRecords(records)
    const reversedMerge = mergeWorkerEvidenceRecords([...records].reverse())

    expect(merged).toEqual(reversedMerge)
    expect(merged.records.map((record) => record.workerId)).toEqual([
      "worker-a",
      "worker-b",
      "worker-c",
    ])
    expect(merged.shardIds).toEqual(["shard-0-of-2", "shard-1-of-2"])
    expect(merged.workerIds).toEqual(["worker-a", "worker-b", "worker-c"])
    expect(merged.totals).toEqual({
      failed: 1,
      passed: 1,
      runCount: 10,
      skipped: 0,
      "timed-out": 1,
    })
  })
})
