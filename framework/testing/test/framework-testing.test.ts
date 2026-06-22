import { describe, expect, it } from "vitest"
import { Schema } from "effect"
import fc from "fast-check"
import {
  CounterexampleCacheEntrySchema,
  assertExactOperationMapCoverage,
  atomMovementEvidence,
  checkFastCheckProperty,
  counterexampleCacheEntry,
  defineEvidenceProducer,
  defineOperationRegistry,
  exactOperationMapCoverage,
  mergeAtomGraphObservations,
  normalizeWorkerMetadata,
  observedMovement,
  operationHandler,
  propertyRunEvidence,
  schemaArbitrarySlot,
  workerEvidenceMetadata,
  workerReplayMetadata,
} from "../src/index.js"

describe("@attune/framework-testing", () => {
  it("defines operation registries and evidence producers for generated harnesses", () => {
    const registry = defineOperationRegistry({
      packageId: "demo",
      handlers: {
        operation: () => "ok",
      },
    })
    const handler = operationHandler(registry, "operation")
    const producer = defineEvidenceProducer({
      id: "demo-evidence",
      operationId: "operation",
      produce: (context) => [propertyRunEvidence(context, "operation")],
    })
    const context = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      runId: "run-1",
      observedAt: "2026-06-22T00:00:00.000Z",
    } as const

    expect(handler()).toBe("ok")
    expect(producer.produce(context)).toHaveLength(1)
    expect(observedMovement({ packageViewAtom: "demoAtom", changed: true })).toBe(true)
  })

  it("reports exact operation-map coverage for generated maps", () => {
    expect(exactOperationMapCoverage(["read", "write"], {
      read: true,
      stale: true,
    })).toEqual({
      actual: ["read", "stale"],
      expected: ["read", "write"],
      extra: ["stale"],
      missing: ["write"],
      ok: false,
    })
    expect(() =>
      assertExactOperationMapCoverage("demo", "property-map", ["read"], { read: true, stale: true }),
    ).toThrow("Extra: stale")
  })

  it("turns property and atom observations into protocol evidence events", () => {
    const context = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      runId: "run-1",
      observedAt: "2026-06-22T00:00:00.000Z",
      replay: { seed: 123 },
    } as const

    expect(propertyRunEvidence(context, "operation").kind).toBe("property-run")
    expect(atomMovementEvidence(context, "operation", [
      { packageViewAtom: "demoAtom", changed: true },
      { packageViewAtom: "idleAtom", changed: false },
    ])).toHaveLength(1)
  })

  it("deduplicates atom graph observations by semantic identity", () => {
    expect(mergeAtomGraphObservations([
      { reactivityKey: "projection.changed", packageViewAtom: "workbench", changed: false },
      { reactivityKey: "projection.changed", packageViewAtom: "workbench", changed: true },
    ])).toEqual([
      { reactivityKey: "projection.changed", packageViewAtom: "workbench", changed: true },
    ])
  })

  it("normalizes worker metadata and replay metadata", () => {
    const budget = normalizeWorkerMetadata({
      generatedValuesSerializable: false,
      resourceTier: "proof-pressure",
      seed: 10,
      shard: { index: 1, total: 4 },
      workerCount: 3,
    })
    const worker = workerEvidenceMetadata({
      packageId: "demo",
      propertyId: "demo.operation.property",
      target: "framework-testing:test",
      operationId: "operation",
    }, budget)

    expect(worker.randomSource).toBe("worker")
    expect(worker.preservesShrinking).toBe(false)
    expect(workerReplayMetadata(worker, "0:1")).toMatchObject({
      path: "0:1",
      seed: 10,
      shardId: "shard-1-of-4",
      workerId: "demo:demo.operation.property:shard-1-of-4",
    })
  })

  it("defines a schema-coded counterexample cache entry", () => {
    const entry = counterexampleCacheEntry({
      failureSummary: "Error: failed",
      filterIds: [],
      generatedValueSummary: "{\"input\":1}",
      lawIds: ["schema.output"],
      observedAt: "2026-06-22T00:00:00.000Z",
      operationId: "operation",
      packageId: "demo",
      propertyId: "demo.operation.property",
      protocolId: "attune/package/demo",
      replay: { seed: 123, path: "0:1" },
      runId: "run-1",
      transformIds: [],
    })

    expect(Schema.decodeUnknownSync(CounterexampleCacheEntrySchema)(entry).cacheKey).toBe(
      "demo:operation:demo.operation.property:123:0:1",
    )
  })

  it("runs package-boundary FastCheck wrappers and emits protocol evidence", async () => {
    const result = await checkFastCheckProperty({
      arbitrary: schemaArbitrarySlot(Schema.Number, { schemaId: "Number" }),
      lawIds: ["schema.output"],
      numRuns: 3,
      operation: (input) => input + 1,
      operationId: "increment",
      packageId: "demo",
      seed: 99,
      validateOutput: (output) => {
        expect(typeof output).toBe("number")
      },
    })

    expect(result.status).toBe("passed")
    expect(result.validation.outputSuccesses).toBe(3)
    expect(result.events.map((event) => event.kind)).toContain("law-observed")
  })

  it("keeps provided arbitraries available for temporary waivered harnesses", async () => {
    const result = await checkFastCheckProperty({
      arbitrary: {
        arbitrary: fc.constant("ok"),
        source: { kind: "provided", description: "fixture until schema arbitrary lands" },
      },
      lawIds: [],
      numRuns: 1,
      operation: (input) => input,
      operationId: "fixture",
      packageId: "demo",
      seed: 1,
    })

    expect(result.status).toBe("passed")
    expect(result.events[0]?.payload).toMatchObject({
      payload: {
        arbitrarySource: {
          kind: "provided",
        },
      },
    })
  })
})
