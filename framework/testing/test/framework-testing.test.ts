import { describe, expect, it } from "vitest"
import { Schema } from "effect"
import fc from "fast-check"
import {
  CounterexampleCacheEntrySchema,
  assertExactSymbolMapCoverage,
  atomGraphMovementRecordsFromObservations,
  atomMovementEvidence,
  checkFastCheckProperty,
  checkProgramHarnessProperty,
  counterexampleCacheEntry,
  coverageConformanceRecordsFromAtomGraph,
  coveragePointObservation,
  defineObservationProducerMap,
  defineObservationProducer,
  defineProjectObservationProducerMap,
  defineProgramHarnessHandlers,
  createProgramHarnessClient,
  defineSymbolHandlerRegistry,
  exactSymbolMapCoverage,
  mergeCoverageSearchEvidence,
  mergeCoverageWorkerShards,
  mergeAtomGraphObservations,
  normalizeWorkerMetadata,
  observedMovement,
  symbolHandler,
  planTargetedCoverageRerun,
  publicAccessorHandler,
  propertyRunObservation,
  schemaArbitrarySlot,
  schemaPartitionObservation,
  weakOracleObservation,
  workerEvidenceMetadata,
  workerReplayMetadata,
  type CoverageSearchIdentity,
  type ImplementationCoveragePointDelta,
  type MeasuredFilterRecord,
  type TypeGuidancePartitionRecord,
} from "../src/index.js"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  touches,
} from "@attune/framework-protocol"

const coverageCase = (
  input: Partial<CoverageSearchIdentity> = {},
): CoverageSearchIdentity => ({
  operationId: input.operationId ?? "increment",
  packageId: input.packageId ?? "demo",
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
  ...coverageCase(input),
  partitionId: input.partitionId,
  partitionKind: input.partitionKind ?? "input",
  ...(input.source === undefined ? {} : { source: input.source }),
  status: input.status,
})

const filter = (
  input: Partial<MeasuredFilterRecord> & Pick<MeasuredFilterRecord, "accepted" | "filterId" | "rejected">,
): MeasuredFilterRecord => ({
  ...coverageCase(input),
  accepted: input.accepted,
  filterId: input.filterId,
  reason: input.reason ?? "operation precondition",
  rejected: input.rejected,
  source: input.source ?? "operation-precondition",
})

const coverage = (
  input: Partial<ImplementationCoveragePointDelta> & Pick<ImplementationCoveragePointDelta, "pointId">,
): ImplementationCoveragePointDelta => ({
  ...coverageCase(input),
  afterCount: input.afterCount ?? 1,
  beforeCount: input.beforeCount ?? 0,
  coverageTool: input.coverageTool ?? "v8",
  pointId: input.pointId,
  pointKind: input.pointKind ?? "branch",
  sourceFile: input.sourceFile ?? "src/increment.ts",
})

describe("@attune/framework-testing", () => {
  it("defines symbol handler registries and observation producers for generated harnesses", () => {
    const registry = defineSymbolHandlerRegistry({
      projectId: "demo",
      handlers: {
        operation: () => "ok",
      },
    })
    const handler = symbolHandler(registry, "operation")
    const producer = defineObservationProducer({
      id: "demo-evidence",
      operationId: "operation",
      produce: (context) => [propertyRunObservation(context, "operation")],
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

  it("reports exact symbol-map coverage for generated maps", () => {
    expect(exactSymbolMapCoverage(["read", "write"], {
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
      assertExactSymbolMapCoverage("demo", "property-map", ["read"], { read: true, stale: true }),
    ).toThrow("Extra: stale")
  })

  it("checks exact observation producer maps", () => {
    const producers = defineObservationProducerMap({
      projectId: "demo",
      symbolIds: ["read", "write"] as const,
      producers: {
        read: defineObservationProducer({
          id: "read-evidence",
          operationId: "read",
          produce: () => [],
        }),
        write: defineObservationProducer({
          id: "write-evidence",
          operationId: "write",
          produce: () => [],
        }),
      },
    })

    expect(Object.keys(producers)).toEqual(["read", "write"])
    expect(() =>
      defineObservationProducerMap({
        projectId: "demo",
        symbolIds: ["read"] as const,
        producers: {
          read: defineObservationProducer({ id: "read", produce: () => [] }),
          stale: defineObservationProducer({ id: "stale", produce: () => [] }),
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

    expect(propertyRunObservation(context, "operation").kind).toBe("property-run")
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

  it("invokes Schema-coded package harness entries through programTestLayer accessors", async () => {
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
    const programTestLayer = {
      publicAccessors: {
        increment: (input: { readonly value: number }) => ({
          value: input.value + 1,
        }),
      },
    } as const
    const handlers = defineProgramHarnessHandlers(PackageContract, {
      increment: publicAccessorHandler("increment"),
    })
    const observationProducers = defineProjectObservationProducerMap(PackageContract, {
      increment: defineObservationProducer({
        id: "increment-law",
        operationId: "increment",
        produce: (context) => [
          propertyRunObservation(context, "increment", {
            source: "generated-observation-producer-map",
          }),
        ],
      }),
    })
    const client = createProgramHarnessClient({
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
      observationProducers,
      handlers,
      programTestLayer: programTestLayer,
    })

    const exit = await client.operations.increment.invoke(
      { value: 41 },
      {
        observedAt: "2026-06-22T00:00:00.000Z",
        replay: { seed: 42 },
        runId: "run-42",
        typeGuidance: [
          {
            partitionId: "increment.input.positive",
            partitionKind: "schema-boundary",
            source: "generated-type-guidance",
            status: "hit",
          },
        ],
      },
    )

    expect(exit.status).toBe("success")
    expect(exit.success).toEqual({ value: 42 })
    expect(exit.encodedSuccess).toEqual({ value: 42 })
    expect(client.controls.observe.rpc.rpcId).toBe("demo.control.observe")
    expect(exit.evidence.map((event) => event.kind)).toEqual([
      "property-run",
      "schema-decode",
      "type-guidance",
      "schema-decode",
      "property-run",
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
    const programTestLayer = {
      publicAccessors: {
        increment: (input: { readonly value: number }) => ({
          value: input.value + 1,
        }),
      },
    } as const
    const handlers = defineProgramHarnessHandlers(PackageContract, {
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
    const client = createProgramHarnessClient({
      contract: PackageContract,
      handlers,
      programTestLayer: programTestLayer,
    })

    const result = await checkProgramHarnessProperty({
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

  it("records atom/Reactivity graph coverage for generated property audits", () => {
    const observations = [
      {
        reactivityKey: "demo.changed",
        baseAtom: "demoBaseAtom",
        derivedAtom: "demoDerivedAtom",
        packageViewAtom: "demoViewAtom",
        changed: true,
        diff: { after: 2, before: 1 },
      },
      {
        reactivityKey: "demo.idle",
        packageViewAtom: "idleViewAtom",
        changed: false,
      },
    ] as const

    const movements = atomGraphMovementRecordsFromObservations({
      observations,
      operationId: "increment",
      packageId: "demo",
      replay: {
        path: "0:1",
        seed: 55,
        shardId: "shard-2",
        workerId: "worker-a",
      },
    })
    const conformance = coverageConformanceRecordsFromAtomGraph({
      observations,
      operationId: "increment",
      packageId: "demo",
      replay: { seed: 55, shardId: "shard-2" },
    })

    expect(movements[0]).toMatchObject({
      edgeId: "increment->demo.changed->demoBaseAtom->demoDerivedAtom->demoViewAtom",
      moved: true,
      seed: 55,
      shardId: "shard-2",
      shrinkPath: "0:1",
      workerId: "worker-a",
    })
    expect(conformance.map((record) => [record.kind, record.requirementId, record.status])).toEqual([
      ["reactivity-key", "reactivity:demo.changed", "hit"],
      ["atom-refresh", "base-atom:demoBaseAtom", "hit"],
      ["atom-refresh", "derived-atom:demoDerivedAtom", "hit"],
      ["package-view-atom-change", "package-view:demoViewAtom", "hit"],
      ["reactivity-key", "reactivity:demo.idle", "miss"],
      ["package-view-atom-change", "package-view:idleViewAtom", "miss"],
    ])
  })

  it("merges coverage conformance, filters, and retained seeds deterministically", () => {
    const summary = mergeCoverageSearchEvidence({
      coverageConformance: [
        {
          ...coverageCase({ seed: 12, shardId: "worker-1" }),
          kind: "schema-variant",
          requirementId: "input.negative",
          schemaVariantId: "negative",
          status: "hit",
        },
        {
          ...coverageCase({ seed: 11, shardId: "worker-0" }),
          kind: "expected-error-path",
          requirementId: "error.out-of-range",
          errorPathId: "out-of-range",
          status: "miss",
        },
      ],
      filters: [
        filter({
          accepted: 1,
          filterId: "valid-state",
          rejected: 99,
          seed: 12,
          shardId: "worker-1",
        }),
      ],
      requiredCoverage: [
        {
          kind: "schema-variant",
          operationId: "increment",
          packageId: "demo",
          requirementId: "input.negative",
          schemaVariantId: "negative",
        },
        {
          errorPathId: "out-of-range",
          kind: "expected-error-path",
          operationId: "increment",
          packageId: "demo",
          requirementId: "error.out-of-range",
        },
      ],
      typeGuidancePartitions: [
        partition({
          generatedValueSummary: "{\"value\":-1}",
          partitionId: "input.negative",
          seed: 12,
          shardId: "worker-1",
          status: "hit",
        }),
      ],
    })

    expect(summary.coverageConformance.map((item) => [item.requirementId, item.status])).toEqual([
      ["error.out-of-range", "missing"],
      ["input.negative", "hit"],
    ])
    expect(summary.findings).toContainEqual(expect.objectContaining({
      filterId: "valid-state",
      kind: "high-rejection-filter",
    }))
    expect(summary.findings).toContainEqual(expect.objectContaining({
      kind: "missing-coverage-requirement",
      requirementId: "error.out-of-range",
      requirementKind: "expected-error-path",
    }))
    expect(summary.retainedSeeds[0]).toMatchObject({
      seed: 12,
      shardId: "worker-1",
      score: 21,
    })
  })

  it("plans targeted reruns while preserving replay metadata", () => {
    const summary = mergeCoverageSearchEvidence({
      atomGraphMovements: [
        {
          ...coverageCase({
            seed: 404,
            shardId: "shard-a",
            shrinkPath: "0:2",
            workerId: "worker-a",
          }),
          edgeId: "increment->demoViewAtom",
          moved: false,
          reactivityKey: "demo.changed",
          viewAtomId: "demoViewAtom",
        },
      ],
      coverageDeltas: [
        coverage({
          pointId: "branch:17",
          seed: 404,
          shardId: "shard-a",
          shrinkPath: "0:2",
          workerId: "worker-a",
        }),
      ],
      requiredAtomGraphEdges: [
        {
          edgeId: "increment->demoViewAtom",
          operationId: "increment",
          packageId: "demo",
          reactivityKey: "demo.changed",
          viewAtomId: "demoViewAtom",
        },
      ],
      requiredLaws: [
        {
          lawIds: ["view.package-view-moves"],
          operationId: "increment",
          packageId: "demo",
        },
      ],
      typeGuidancePartitions: [
        partition({
          partitionId: "input.rare",
          seed: 404,
          shardId: "shard-a",
          shrinkPath: "0:2",
          status: "hit",
          workerId: "worker-a",
        }),
      ],
    })
    const plan = planTargetedCoverageRerun({ summary })

    expect(plan.targets.map((target) => [target.targetKind, target.targetId])).toEqual([
      ["atom-graph-edge", "increment->demoViewAtom"],
      ["atom-graph-edge", "increment->demoViewAtom"],
      ["law", "view.package-view-moves"],
    ])
    expect(plan.seeds[0]).toMatchObject({
      replay: {
        seed: 404,
        shardId: "shard-a",
        shrinkPath: "0:2",
        workerId: "worker-a",
      },
      targetKinds: expect.arrayContaining(["atom-graph-edge", "coverage-point", "law", "type-guidance-partition"]),
    })
  })

  it("merges V8/Istanbul evidence across worker shards and detects dead harnesses", () => {
    const merged = mergeCoverageWorkerShards([
      {
        shardId: "shard-1",
        status: "passed",
        tier: "proof-pressure",
        workerId: "worker-b",
        coverage: {
          coverageDeltas: [
            coverage({
              afterCount: 3,
              beforeCount: 1,
              coverageTool: "istanbul",
              pointId: "line:10",
              seed: 7,
              shardId: "shard-1",
              workerId: "worker-b",
            }),
          ],
        },
      },
      {
        shardId: "shard-0",
        status: "passed",
        tier: "proof-pressure",
        workerId: "worker-a",
        coverage: {
          typeGuidancePartitions: [
            partition({
              operationId: "dry-harness",
              partitionId: "input.fixture",
              seed: 8,
              shardId: "shard-0",
              status: "hit",
              workerId: "worker-a",
            }),
          ],
        },
      },
    ])

    expect(merged.workerShards.map((shard) => shard.shardId)).toEqual(["shard-0", "shard-1"])
    expect(merged.coverageDeltas).toEqual([
      expect.objectContaining({
        coverageTool: "istanbul",
        delta: 2,
        pointId: "line:10",
      }),
    ])
    expect(merged.findings).toContainEqual(expect.objectContaining({
      kind: "dead-harness",
      operationId: "dry-harness",
      semanticCaseCount: 1,
    }))
  })

  it("flags weak oracles when implementation coverage lacks laws or expected paths", () => {
    const summary = mergeCoverageSearchEvidence({
      coverageDeltas: [
        coverage({
          pointId: "branch:typed-error",
          seed: 77,
          sourceFile: "src/increment.ts",
        }),
      ],
      requiredCoverage: [
        {
          errorPathId: "negative-input",
          kind: "expected-error-path",
          operationId: "increment",
          packageId: "demo",
          requirementId: "error.negative-input",
        },
      ],
      requiredLaws: [
        {
          lawIds: ["schema.decode", "view.package-view-moves"],
          operationId: "increment",
          packageId: "demo",
        },
      ],
    })

    expect(summary.findings).toContainEqual(expect.objectContaining({
      kind: "weak-oracle",
      missingLawIds: ["schema.decode", "view.package-view-moves"],
      missingRequirementIds: ["error.negative-input"],
      severity: "warning",
    }))
  })

  it("flags weak oracles when survived mutants sit on atom-covered paths", () => {
    const summary = mergeCoverageSearchEvidence({
      atomGraphMovements: [
        {
          ...coverageCase({ seed: 88, shardId: "mutation-shard" }),
          edgeId: "increment->demoViewAtom",
          moved: true,
          viewAtomId: "demoViewAtom",
        },
      ],
      mutationSurvivals: [
        {
          ...coverageCase({ seed: 88, shardId: "mutation-shard" }),
          atomGraphEdgeId: "increment->demoViewAtom",
          mutationId: "mutant-1",
          pointId: "branch:mutation-1",
          pointKind: "branch",
          sourceFile: "src/increment.ts",
          survived: true,
        },
      ],
    })

    expect(summary.mutationSurvivals).toEqual([
      expect.objectContaining({
        mutationId: "mutant-1",
        survivedCount: 1,
      }),
    ])
    expect(summary.findings).toContainEqual(expect.objectContaining({
      kind: "weak-oracle",
      survivedMutationIds: ["mutant-1"],
    }))
  })

  it("emits coverage-point and weak-oracle protocol evidence helpers", () => {
    const context = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      runId: "run-coverage",
      observedAt: "2026-06-22T00:00:00.000Z",
      replay: { seed: 909, path: "1:0" },
    } as const

    expect(coveragePointObservation(context, "increment", {
      pointId: "line:10",
      sourceFile: "src/increment.ts",
    })).toMatchObject({
      kind: "coverage-point",
      payload: {
        pointId: "line:10",
        replay: { seed: 909, path: "1:0" },
      },
    })
    expect(weakOracleObservation(context, "increment", {
      missingLawIds: ["schema.decode"],
    })).toMatchObject({
      kind: "weak-oracle",
      payload: {
        missingLawIds: ["schema.decode"],
        replay: { seed: 909, path: "1:0" },
      },
    })
    expect(schemaPartitionObservation(context, "increment", {
      filterId: "positive-input",
      partitionId: "increment.input.positive",
      partitionKind: "schema-boundary",
      status: "filtered",
    })).toMatchObject({
      kind: "type-guidance",
      payload: {
        filterId: "positive-input",
        partitionId: "increment.input.positive",
        replay: { seed: 909, path: "1:0" },
        status: "filtered",
      },
    })
  })
})
