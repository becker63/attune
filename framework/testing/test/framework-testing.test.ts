import { describe, expect, it } from "vitest"
import { Schema } from "effect"
import fc from "fast-check"
import {
  CounterexampleCacheEntrySchema,
  assertExactOperationMapCoverage,
  atomMovementEvidence,
  checkFastCheckProperty,
  checkPackageHarnessProperty,
  counterexampleCacheEntry,
  defineEvidenceProducerMap,
  defineEvidenceProducer,
  definePackageEvidenceProducerMap,
  definePackageHarnessHandlers,
  createPackageHarnessClient,
  defineOperationRegistry,
  exactOperationMapCoverage,
  mergeAtomGraphObservations,
  normalizeWorkerMetadata,
  observedMovement,
  operationHandler,
  publicAccessorHandler,
  propertyRunEvidence,
  schemaArbitrarySlot,
  workerEvidenceMetadata,
  workerReplayMetadata,
} from "../src/index.js"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  touches,
} from "@attune/framework-protocol"

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

  it("checks exact evidence producer maps", () => {
    const producers = defineEvidenceProducerMap({
      packageId: "demo",
      operationIds: ["read", "write"] as const,
      producers: {
        read: defineEvidenceProducer({
          id: "read-evidence",
          operationId: "read",
          produce: () => [],
        }),
        write: defineEvidenceProducer({
          id: "write-evidence",
          operationId: "write",
          produce: () => [],
        }),
      },
    })

    expect(Object.keys(producers)).toEqual(["read", "write"])
    expect(() =>
      defineEvidenceProducerMap({
        packageId: "demo",
        operationIds: ["read"] as const,
        producers: {
          read: defineEvidenceProducer({ id: "read", produce: () => [] }),
          stale: defineEvidenceProducer({ id: "stale", produce: () => [] }),
        },
      }),
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

  it("invokes Schema-coded package harness entries through PackageTestLayer accessors", async () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const IncrementInput = Schema.Struct({ value: Schema.Number })
    const IncrementOutput = Schema.Struct({ value: Schema.Number })
    const IncrementError = Schema.Struct({ message: Schema.String })
    const incrementOperation = defineOperation({
      id: "increment",
      kind: "command",
      input: IncrementInput,
      output: IncrementOutput,
      error: IncrementError,
      views: touches(PackageViews, {
        reactivityKeys: ["demo.changed"],
        atoms: ["demoAtom"],
      } as const),
      laws: ["schema.decode", "schema.encode", "view.atom-moves"],
    } as const)
    const PackageContract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [incrementOperation] as const,
    } as const)
    const PackageTestLayer = {
      publicAccessors: {
        increment: (input: { readonly value: number }) => ({
          value: input.value + 1,
        }),
      },
    } as const
    const handlers = definePackageHarnessHandlers(PackageContract, {
      increment: publicAccessorHandler("increment"),
    })
    const evidenceProducers = definePackageEvidenceProducerMap(PackageContract, {
      increment: defineEvidenceProducer({
        id: "increment-law",
        operationId: "increment",
        produce: (context) => [
          propertyRunEvidence(context, "increment", {
            source: "generated-evidence-producer-map",
          }),
        ],
      }),
    })
    const client = createPackageHarnessClient({
      atomGraphObserver: {
        observe: () => [
          {
            reactivityKey: "demo.changed",
            packageViewAtom: "demoAtom",
            changed: true,
          },
        ],
      },
      contract: PackageContract,
      evidenceProducers,
      handlers,
      packageTestLayer: PackageTestLayer,
    })

    const exit = await client.operations.increment.invoke(
      { value: 41 },
      {
        observedAt: "2026-06-22T00:00:00.000Z",
        replay: { seed: 42 },
        runId: "run-42",
      },
    )

    expect(exit.status).toBe("success")
    expect(exit.success).toEqual({ value: 42 })
    expect(exit.encodedSuccess).toEqual({ value: 42 })
    expect(exit.evidence.map((event) => event.kind)).toEqual([
      "property-run",
      "schema-decode",
      "schema-decode",
      "reactivity-key",
      "property-run",
      "property-run",
    ])
  })

  it("runs worker-compatible property evidence through the package harness client", async () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const IncrementInput = Schema.Struct({ value: Schema.Number })
    const IncrementOutput = Schema.Struct({ value: Schema.Number })
    const incrementOperation = defineOperation({
      id: "increment",
      kind: "command",
      input: IncrementInput,
      output: IncrementOutput,
      views: touches(PackageViews, {
        reactivityKeys: ["demo.changed"],
        atoms: ["demoAtom"],
      } as const),
      laws: ["schema.decode"],
    } as const)
    const PackageContract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [incrementOperation] as const,
    } as const)
    const PackageTestLayer = {
      publicAccessors: {
        increment: (input: { readonly value: number }) => ({
          value: input.value + 1,
        }),
      },
    } as const
    const handlers = definePackageHarnessHandlers(PackageContract, {
      increment: publicAccessorHandler("increment"),
    })
    const worker = workerEvidenceMetadata({
      packageId: "demo",
      propertyId: "demo.increment.property",
      target: "framework-testing:test",
      operationId: "increment",
    }, normalizeWorkerMetadata({
      generatedValuesSerializable: true,
      resourceTier: "debug",
      seed: 7,
      workerCount: 1,
    }))
    const client = createPackageHarnessClient({
      contract: PackageContract,
      handlers,
      packageTestLayer: PackageTestLayer,
    })

    const result = await checkPackageHarnessProperty({
      arbitrary: schemaArbitrarySlot(IncrementInput, { schemaId: "IncrementInput" }),
      client,
      numRuns: 2,
      operationId: "increment",
      seed: 7,
      worker,
      validateOutput: (output) => {
        expect(output.value).toBeGreaterThan(Number.NEGATIVE_INFINITY)
      },
    })

    expect(result.status).toBe("passed")
    expect(result.validation.outputSuccesses).toBe(2)
    expect(result.events.some((event) => event.kind === "schema-decode")).toBe(true)
    expect(result.events[0]?.payload).toMatchObject({
      payload: {
        worker: {
          workerId: "demo:demo.increment.property:shard-0-of-1",
        },
      },
    })
  })
})
