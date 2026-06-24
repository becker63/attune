import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import {
  ProgramFactStore,
  ProgramFactStoreTest,
  ProgramIndex,
  ProgramIndexTest,
  createInMemoryProgramFactStore,
  createInMemoryProgramIndex,
  createSqliteProgramFactStore,
  createSqliteProgramIndex,
  defaultProgramFactStorePath,
  defaultProgramIndexPath,
  descriptorHashForStorage,
  generatedArtifactContentHash,
  programIndexContentHash,
  sqliteBackendName,
  withDescriptorHash,
  type ProgramIndexApi,
  type CoverageObservationFeedback,
  type ReplayObservationMetadata,
  type ProgramFactStoreApi,
  type DiagnosticWaiverState,
} from "../src/index.js"
import type {
  ProgramArtifactRecord,
  ProgramRepairFinding,
  ProgramSchemaDescriptor,
  ProgramObservation,
  ProgramObservationRun,
  ProgramDiagnosticRequirement,
} from "@attune/framework-protocol"

describe("@attune/framework-sqlite", () => {
  it("keeps the program fact store path under the gitignored framework cache", () => {
    expect(defaultProgramFactStorePath).toBe(".attune/cache/program-facts.sqlite")
  })

  it("keeps the program index path under the gitignored framework cache", () => {
    expect(defaultProgramIndexPath).toBe(".attune/cache/program-index.sqlite")
  })

  it("records deterministic descriptor and generated artifact hashes", () => {
    const descriptor = demoDescriptor()
    expect(descriptor.descriptorHash).toBe(descriptorHashForStorage(descriptor))

    const artifactHash = generatedArtifactContentHash("export const generated = true\n")
    expect(artifactHash).toMatch(/^[a-f0-9]{64}$/u)
  })

  it("records deterministic program-index content hashes", () => {
    expect(programIndexContentHash("export const indexed = true\n")).toMatch(/^[a-f0-9]{64}$/u)
  })

  it("hides program fact state behind an Effect service API", () => {
    const result = Effect.runSync(
      Effect.gen(function* testStoreService() {
        const store = yield* ProgramFactStore
        const descriptor = demoDescriptor()
        const receipt = yield* store.putSchemaDescriptor(descriptor)
        yield* store.putDiagnosticRequirements([demoObligation])
        const snapshot = yield* store.snapshot()

        return {
          receipt,
          snapshot,
        }
      }).pipe(Effect.provide(ProgramFactStoreTest())),
    )

    expect(result.receipt.descriptorHash).toBe(result.snapshot.schemaDescriptors[0]?.descriptorHash)
    expect(result.snapshot.diagnosticRequirements).toHaveLength(1)
  })

  it("hides program-index state behind an Effect service API", () => {
    const result = Effect.runSync(
      Effect.gen(function* testProgramIndexService() {
        const index = yield* ProgramIndex
        yield* seedProgramIndex(index)

        return yield* index.listProjectHealth()
      }).pipe(Effect.provide(ProgramIndexTest())),
    )

    expect(result[0]).toMatchObject({
      projectId: "demo",
      sourceFileCount: 1,
      symbolCount: 1,
      diagnosticCount: 1,
      staleArtifactCount: 1,
      safeRepairCount: 1,
    })
  })

  it("initializes, reports health, resets, and reinitializes SQLite state", () => {
    const store = createSqliteProgramFactStore({ path: ":memory:" })
    const health = Effect.runSync(store.health())
    expect(health.ok).toBe(true)
    expect(health.backend).toBe(sqliteBackendName)
    expect(health.migrationVersion).toBe(2)

    Effect.runSync(store.putSchemaDescriptor(demoDescriptor()))
    expect(Effect.runSync(store.health()).rowCounts.schemaDescriptors).toBe(1)

    Effect.runSync(store.reset())
    expect(Effect.runSync(store.health()).rowCounts.schemaDescriptors).toBe(0)

    const reinitialized = Effect.runSync(store.reinitialize())
    expect(reinitialized.ok).toBe(true)
    expect(reinitialized.migrationVersion).toBe(2)
    Effect.runSync(store.close())
  })

  it("initializes, reports health, resets, and reinitializes SQLite program index state", () => {
    const index = createSqliteProgramIndex({ path: ":memory:" })
    const health = Effect.runSync(index.health())
    expect(health.ok).toBe(true)
    expect(health.backend).toBe(sqliteBackendName)
    expect(health.migrationVersion).toBe(4)

    Effect.runSync(seedProgramIndex(index))
    expect(Effect.runSync(index.health()).rowCounts.projects).toBe(1)

    Effect.runSync(index.reset())
    expect(Effect.runSync(index.health()).rowCounts.projects).toBe(0)
    expect(Effect.runSync(index.health()).rowCounts.invalidations).toBe(0)

    const reinitialized = Effect.runSync(index.reinitialize())
    expect(reinitialized.ok).toBe(true)
    expect(reinitialized.migrationVersion).toBe(4)
    Effect.runSync(index.close())
  })

  it("roundtrips descriptor, obligation, artifact, observations, and finding rows through SQLite", () => {
    const store = createSqliteProgramFactStore({ path: ":memory:" })
    roundtripProgramFactState(store)

    const snapshot = Effect.runSync(store.snapshot())
    expect(snapshot.schemaDescriptors[0]).toMatchObject({
      schemaDescriptorId: "attune/project/demo",
      descriptorHash: demoDescriptor().descriptorHash,
    })
    expect(snapshot.diagnosticRequirements).toEqual([demoObligation])
    expect(snapshot.observationRuns).toEqual([demoEvidenceRun])
    expect(snapshot.observations).toEqual([demoEvidenceEvent])
    expect(snapshot.artifacts).toEqual([demoGeneratedArtifact])
    expect(snapshot.replayMetadata).toEqual([demoReplayMetadata])
    expect(snapshot.waiverState).toEqual([demoWaiverState])
    expect(snapshot.coverageFeedback).toEqual([demoCoverageFeedback])
    expect(snapshot.repairFindings).toEqual([demoRepairFinding])

    expect(Effect.runSync(store.health()).rowCounts).toMatchObject({
      replayMetadata: 1,
      waiverState: 1,
      coverageFeedback: 1,
    })
    expect(Effect.runSync(store.listReplayObservations({ projectId: "demo" }))).toEqual([
      demoReplayMetadata,
    ])
    expect(Effect.runSync(store.listDiagnosticWaivers({ projectId: "demo" }))).toEqual([
      demoWaiverState,
    ])
    expect(Effect.runSync(store.listCoverageObservations({ projectId: "demo" }))).toEqual([
      demoCoverageFeedback,
    ])

    const filteredDeltas = Effect.runSync(store.listRepairFindings({ projectId: "demo" }))
    expect(filteredDeltas).toEqual([demoRepairFinding])

    Effect.runSync(store.replaceRepairFindings("demo", []))
    expect(Effect.runSync(store.listRepairFindings({ projectId: "demo" }))).toEqual([])
    Effect.runSync(store.close())
  })

  it("roundtrips program facts through SQLite views and invalidations", () => {
    const index = createSqliteProgramIndex({ path: ":memory:" })
    Effect.runSync(seedProgramIndex(index))

    expect(Effect.runSync(index.listSymbolsByFile("packages/demo/src/attune.package.ts"))).toEqual([
      expect.objectContaining({
        path: "packages/demo/src/attune.package.ts",
        symbol_id: "demo:Snapshot",
        kind: "schema",
      }),
    ])
    expect(Effect.runSync(index.listSchemaSerializationIssues("demo"))).toEqual([
      expect.objectContaining({
        id: "schema:demo:Snapshot",
        serialization_status: "partial",
      }),
    ])
    expect(Effect.runSync(index.listStaleArtifacts("demo"))[0]).toMatchObject({
      id: "demo:attune.generated",
      status: "stale",
    })
    expect(Effect.runSync(index.listDiagnosticsByFile("packages/demo/src/attune.package.ts"))[0]).toMatchObject({
      diagnostic_id: "diagnostic:demo:schema",
      severity: "warning",
    })
    expect(Effect.runSync(index.listRepairableDiagnostics("demo"))[0]).toMatchObject({
      repair_id: "repair:demo:schema",
      path: "packages/demo/src/attune.package.ts",
      safety: "safe",
      nx_target: "demo:attune-repair",
      route: "workspace:program-index-materialize",
      validation_after_targets_json: "[\"demo:attune-check\",\"demo:typecheck\"]",
    })
    expect(Effect.runSync(index.listRepairableDiagnostics({
      diagnosticId: "diagnostic:demo:schema",
      path: "packages/demo/src/attune.package.ts",
      projectId: "demo",
    }))).toHaveLength(1)
    expect(Effect.runSync(index.listRepairableDiagnostics({
      diagnosticId: "diagnostic:demo:schema",
      path: "packages/demo/src/other.ts",
      projectId: "demo",
    }))).toEqual([])
    expect(Effect.runSync(index.listPackageLocalAttuneCompanions("demo"))[0]).toMatchObject({
      path: "packages/demo/src/attune.generated.ts",
    })

    const invalidations = Effect.runSync(index.listInvalidations({ unconsumed: true }))
    expect(invalidations.map((entry) => entry.key)).toEqual(expect.arrayContaining([
      "symbol",
      "schema",
      "artifact",
      "diagnostic",
      "repair",
    ]))

    Effect.runSync(index.markInvalidationsConsumed(invalidations.map((entry) => entry.id), "now"))
    expect(Effect.runSync(index.listInvalidations({ unconsumed: true }))).toEqual([])
    Effect.runSync(index.close())
  })

  it("records repair invalidations for insert, update, and delete", () => {
    const index = createSqliteProgramIndex({ path: ":memory:" })
    Effect.runSync(index.putRepairs([{
      id: "repair:demo:route",
      diagnosticId: "diagnostic:demo:route",
      safety: "safe",
      nxTarget: "demo:attune-repair",
      repairKind: "artifact-freshness",
      route: "attune-repair-cli:artifact-freshness",
      payloadJson: "{}",
      validationAfterTargetsJson: "[\"demo:attune-check\"]",
      createdAt: "2026-06-23T00:00:00.000Z",
    }]))
    Effect.runSync(index.putRepairs([{
      id: "repair:demo:route",
      diagnosticId: "diagnostic:demo:route",
      safety: "needs-review",
      nxTarget: "demo:attune-repair",
      repairKind: "artifact-freshness",
      route: "attune-repair-cli:artifact-freshness",
      payloadJson: "{}",
      validationAfterTargetsJson: "[\"demo:attune-check\"]",
      createdAt: "2026-06-23T00:00:01.000Z",
    }]))
    Effect.runSync(index.deleteRepairs(["repair:demo:route"]))

    expect(Effect.runSync(index.listInvalidations({ key: "repair" })).map((entry) => entry.subject)).toEqual([
      "repair:demo:route",
      "repair:demo:route",
      "repair:demo:route",
    ])
    Effect.runSync(index.close())
  })

  it("roundtrips the same row shapes through the in-memory test store", () => {
    const store = createInMemoryProgramFactStore()
    roundtripProgramFactState(store)

    const snapshot = Effect.runSync(store.snapshot())
    expect(snapshot.schemaDescriptors).toHaveLength(1)
    expect(snapshot.diagnosticRequirements).toHaveLength(1)
    expect(snapshot.observationRuns).toHaveLength(1)
    expect(snapshot.observations).toHaveLength(1)
    expect(snapshot.artifacts).toHaveLength(1)
    expect(snapshot.replayMetadata).toHaveLength(1)
    expect(snapshot.waiverState).toHaveLength(1)
    expect(snapshot.coverageFeedback).toHaveLength(1)
    expect(snapshot.repairFindings).toHaveLength(1)
  })

  it("roundtrips program facts through the in-memory test index", () => {
    const index = createInMemoryProgramIndex()
    Effect.runSync(seedProgramIndex(index))

    expect(Effect.runSync(index.listProjectHealth())[0]).toMatchObject({
      projectId: "demo",
      warningCount: 1,
      staleArtifactCount: 1,
    })
    expect(Effect.runSync(index.listSchemaSerializationIssues("demo"))[0]).toMatchObject({
      id: "schema:demo:Snapshot",
    })
  })

  it("rejects invalid stored payloads through Schema-coded row decoding", () => {
    const store = createSqliteProgramFactStore({ path: ":memory:" })
    const invalid = {
      ...demoDescriptor(),
      packageKind: "not-a-package-kind",
    } as unknown as ProgramSchemaDescriptor

    expect(() => Effect.runSync(store.putSchemaDescriptor(invalid))).toThrow(
      /not-a-package-kind/u,
    )
    Effect.runSync(store.close())
  })
})

const seedProgramIndex = (index: ProgramIndexApi): Effect.Effect<void, unknown> =>
  Effect.gen(function* seedIndex() {
    yield* index.putProjects([{
      id: "demo",
      root: "packages/demo",
      sourceRoot: "packages/demo/src",
      projectType: "library",
      hash: "project-hash",
      updatedAt: "2026-06-23T00:00:00.000Z",
    }])
    yield* index.putTargets([{
      projectId: "demo",
      name: "attune-check",
      executor: "@attune/nx:package-check",
      optionsJson: "{}",
      configurationsJson: "{}",
    }])
    yield* index.putSourceFiles([{
      id: "file:demo:attune",
      projectId: "demo",
      path: "packages/demo/src/attune.package.ts",
      hash: "source-hash",
      updatedAt: "2026-06-23T00:00:00.000Z",
    }])
    yield* index.putSymbols([{
      id: "demo:Snapshot",
      projectId: "demo",
      sourceFileId: "file:demo:attune",
      exportName: "Snapshot",
      localName: "Snapshot",
      kind: "schema",
      rangeJson: "{\"start\":{\"line\":1,\"character\":1},\"end\":{\"line\":1,\"character\":30}}",
      hash: "symbol-hash",
    }])
    yield* index.putSchemaDescriptors([{
      id: "schema:demo:Snapshot",
      symbolId: "demo:Snapshot",
      role: "boundary",
      astHash: "schema-hash",
      descriptorVersion: 1,
      shapeJson: "{\"type\":\"Struct\"}",
      annotationsJson: "{}",
      serializationStatus: "partial",
      nonSerializableFeaturesJson: "[\"filter\"]",
    }])
    yield* index.putEdges([{
      id: "edge:demo:Snapshot:Schema",
      fromSymbolId: "demo:Snapshot",
      toSymbolId: "external:effect:Schema",
      kind: "import",
      source: "typescript",
    }])
    yield* index.putArtifacts([{
      id: "demo:attune.generated",
      projectId: "demo",
      path: "packages/demo/src/attune.generated.ts",
      kind: "generated-program-companion",
      builtFromHash: "source-hash",
      currentHash: "stale-hash",
      status: "stale",
    }])
    yield* index.putObservations([{
      id: "observation:demo:test",
      symbolId: "demo:Snapshot",
      projectId: "demo",
      kind: "test",
      status: "passed",
      payloadJson: "{}",
      createdAt: "2026-06-23T00:00:00.000Z",
    }])
    yield* index.putDiagnostics([{
      id: "diagnostic:demo:schema",
      projectId: "demo",
      sourceFileId: "file:demo:attune",
      code: "attune/program-index/schema-non-serializable",
      severity: "warning",
      message: "Schema contains executable features.",
      causeJson: "{\"features\":[\"filter\"]}",
    }])
    yield* index.putRepairs([{
      id: "repair:demo:schema",
      diagnosticId: "diagnostic:demo:schema",
      safety: "safe",
      nxTarget: "demo:attune-repair",
      repairKind: "schema-descriptor-refresh",
      route: "workspace:program-index-materialize",
      payloadJson: "{}",
      validationAfterTargetsJson: "[\"demo:attune-check\",\"demo:typecheck\"]",
      createdAt: "2026-06-23T00:00:00.000Z",
    }])
  })

const roundtripProgramFactState = (store: ProgramFactStoreApi): void => {
  Effect.runSync(store.putSchemaDescriptor(demoDescriptor()))
  Effect.runSync(store.putDiagnosticRequirements([demoObligation]))
  Effect.runSync(store.recordObservationRun(demoEvidenceRun))
  Effect.runSync(store.recordObservation(demoEvidenceEvent))
  Effect.runSync(store.recordArtifact(demoGeneratedArtifact))
  Effect.runSync(store.recordReplayObservation(demoReplayMetadata))
  Effect.runSync(store.recordDiagnosticWaiver(demoWaiverState))
  Effect.runSync(store.recordCoverageObservation(demoCoverageFeedback))
  Effect.runSync(store.putRepairFindings([demoRepairFinding]))
}

const demoDescriptor = (): ProgramSchemaDescriptor =>
  withDescriptorHash({
    schemaDescriptorId: "attune/project/demo",
    projectId: "demo",
    packageKind: "core-discovery-runtime",
    sourcePath: "packages/demo/src/attune.package.ts",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demo.view"],
    },
    services: ["DemoService"],
    operations: [{
      id: "operation",
      kind: "command",
      views: {
        reactivityKeys: ["demo.changed"],
        atoms: ["demo.view"],
      },
      laws: ["command.view-movement"],
      inputSchema: "Struct",
      outputSchema: "Void",
    }],
    waivers: [],
    coverageExpectations: [],
  })

const demoObligation: ProgramDiagnosticRequirement = {
  diagnosticRequirementId: "demo:operation:property",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  symbolId: "operation",
  kind: "property",
  reason: "property observations required",
}

const demoEvidenceRun: ProgramObservationRun = {
  runId: "run-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  tier: "commit",
  status: "passed",
  startedAt: "2026-06-22T00:00:00.000Z",
  completedAt: "2026-06-22T00:00:02.000Z",
}

const demoEvidenceEvent: ProgramObservation = {
  eventId: "event-1",
  runId: "run-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  symbolId: "operation",
  kind: "property-run",
  observedAt: "2026-06-22T00:00:01.000Z",
  payload: {
    seed: 42,
  },
}

const demoGeneratedArtifact: ProgramArtifactRecord = {
  artifactId: "artifact-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  path: "packages/demo/src/generated/symbol-registry.ts",
  generatorId: "@attune/framework-nx:symbol-registry",
  expectedHash: generatedArtifactContentHash("expected artifact\n"),
  actualHash: generatedArtifactContentHash("actual artifact\n"),
  status: "stale",
}

const demoReplayMetadata: ReplayObservationMetadata = {
  replayId: "replay-1",
  runId: "run-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  symbolId: "operation",
  propertyId: "demo.operation.property",
  seed: 42,
  shrinkPath: "0:1",
  generatedValueSummary: "{ value: 1 }",
  status: "failed",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoWaiverState: DiagnosticWaiverState = {
  waiverId: "waiver-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  category: "property",
  status: "active",
  targetDiagnosticRequirementId: "demo:operation:property",
  symbolId: "operation",
  owner: "framework",
  reason: "temporary property harness migration",
  reviewAt: "2026-07-22",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoCoverageFeedback: CoverageObservationFeedback = {
  coverageId: "coverage-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  symbolId: "operation",
  kind: "atom-graph",
  status: "hit",
  coveragePoint: "demo.changed->demo.view",
  seed: 42,
  workerId: "worker-1",
  shardId: "shard-1",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoRepairFinding: ProgramRepairFinding = {
  findingId: "finding:artifact-1",
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  kind: "stale-generated-source",
  sourcePath: "packages/demo/src/generated/symbol-registry.ts",
  explanation: "Generated artifact is stale.",
  repairActions: [{
    id: "refresh-artifact-materialization",
    title: "Refresh artifact materialization",
    kind: "nx-generator",
    target: "@attune/framework-nx:artifact-materialize",
    options: {
      projectId: "demo",
    },
  }],
}
