import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  hashProtocolValue,
  type AttuneProtocolDescriptor,
  type AttuneProtocolEvidenceEvent,
  type AttuneGeneratedArtifactRecord,
} from "@attune/framework-protocol"
import {
  InMemoryProtocolStoreLive,
  ProtocolDiagnostics,
  ProtocolDiagnosticsLive,
  ProtocolProjectionLive,
  ProtocolQuery,
  ProtocolQueryLive,
  ProtocolRuntime,
  ProtocolRuntimeLive,
  ProtocolStore,
  SqliteRuntimeProtocolStoreLive,
  computeProtocolDeltas,
  diagnosticsForProtocol,
  explainObligation,
  getPackageSummary,
  getRepairPlan,
  type ProtocolStoreSnapshot,
} from "../src/index.js"

const demoDescriptor = {
  protocolId: "attune/package/demo",
  packageId: "demo",
  packageKind: "policy-plugin",
  descriptorHash: "demo-hash",
  sourcePath: "packages/demo/src/attune.package.ts",
  views: {
    reactivityKeys: ["demo.changed"],
    atoms: ["demoView"],
  },
  services: [],
  operations: [{
    id: "project",
    kind: "projection",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demoView"],
    },
    laws: ["projection.deterministic-replay"],
    inputSchema: "ProjectInput",
    outputSchema: "ProjectOutput",
  }],
} as const

const provideRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProtocolRuntime
    | ProtocolQuery
    | ProtocolDiagnostics
    | ProtocolStore
  >,
  initial?: Partial<ProtocolStoreSnapshot>,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProtocolDiagnosticsLive),
    Effect.provide(ProtocolQueryLive),
    Effect.provide(ProtocolRuntimeLive),
    Effect.provide(ProtocolProjectionLive),
    Effect.provide(InMemoryProtocolStoreLive(initial)),
  ) as Effect.Effect<A, E, never>

const provideSqliteRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProtocolRuntime
    | ProtocolQuery
    | ProtocolDiagnostics
    | ProtocolStore
  >,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProtocolDiagnosticsLive),
    Effect.provide(ProtocolQueryLive),
    Effect.provide(ProtocolRuntimeLive),
    Effect.provide(ProtocolProjectionLive),
    Effect.provide(SqliteRuntimeProtocolStoreLive({ path: ":memory:" })),
  ) as Effect.Effect<A, E, never>

describe("@attune/framework-runtime", () => {
  it("turns missing evidence and stale generated source into private deltas", () => {
    const deltas = computeProtocolDeltas({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:property",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "property",
        reason: "projection operation requires property evidence",
      }],
      generatedArtifacts: [{
        artifactId: "demo:registry",
        protocolId: "attune/package/demo",
        packageId: "demo",
        path: "packages/demo/src/generated/operation-registry.ts",
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })

    expect(deltas.map((delta) => delta.kind)).toEqual([
      "missing-obligation",
      "stale-generated-source",
    ])
  })

  it("projects deltas as framework diagnostics", () => {
    const diagnostics = diagnosticsForProtocol({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:law",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "law",
        reason: "law evidence missing",
      }],
      generatedArtifacts: [],
    })

    expect(diagnostics[0]?.code).toBe("attune/protocol/missing-obligation")
  })

  it("provisions ProtocolRuntime/Query/Diagnostics through Effect layers", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* protocolRuntimeProvisioning() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        const receipt = yield* runtime.materializeDescriptor(demoDescriptor)
        yield* runtime.recordGeneratedArtifact({
          artifactId: "demo:registry",
          protocolId: "attune/package/demo",
          packageId: "demo",
          path: "packages/demo/src/generated/operation-registry.ts",
          generatorId: "@attune/framework-nx:operation-registry",
          expectedHash: "expected",
          actualHash: "actual",
          status: "stale",
        })

        const summary = yield* query.getPackageSummary("demo")
        const deltas = yield* query.listDeltas("demo")
        const projected = yield* diagnostics.diagnosticsForFile(
          "packages/demo/src/attune.package.ts",
          { packageId: "demo", protocolId: "attune/package/demo" },
        )

        return { receipt, summary, deltas, projected }
      })),
    )

    expect(result.receipt).toMatchObject({
      packageId: "demo",
      descriptorHash: "demo-hash",
    })
    expect(result.summary).toMatchObject({
      packageId: "demo",
      operationCount: 1,
      obligationCount: 6,
      staleGeneratedArtifactCount: 1,
    })
    expect(result.deltas.map((delta) => delta.kind)).toEqual(
      expect.arrayContaining(["missing-obligation", "stale-generated-source"]),
    )
    expect(result.projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/missing-obligation",
    )
  })

  it("explains obligations and repair plans without exposing store rows", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* protocolQueryExplanations() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery

        yield* runtime.materializeDescriptor(demoDescriptor)

        const explanation = yield* query.explainObligation("demo:project:view-movement")
        const repairPlan = yield* query.getRepairPlan("delta:demo:project:view-movement")

        return { explanation, repairPlan }
      })),
    )

    expect(result.explanation?.expectedEvidenceKinds).toContain("atom-movement")
    expect(result.repairPlan?.actions[0]?.target).toBe(
      "@attune/framework-nx:atom-view-edge",
    )
  })

  it("keeps pure query helpers available for focused projections", () => {
    const input = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:view-movement",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "view-movement" as const,
        reason: "view movement evidence missing",
      }],
      generatedArtifacts: [],
    }

    expect(getPackageSummary(input)).toMatchObject({
      packageId: "demo",
      obligationCount: 1,
      evidenceCount: 0,
    })
    expect(explainObligation(input, "demo:project:view-movement")?.expectedEvidenceKinds).toContain(
      "atom-movement",
    )
    expect(getRepairPlan(input, "delta:demo:project:view-movement")?.actions[0]?.target).toBe(
      "@attune/framework-nx:atom-view-edge",
    )
  })

  it("projects invalid stored payloads as diagnostics", async () => {
    const diagnostics = await Effect.runPromise(
      provideRuntime(Effect.gen(function* invalidPayloadDiagnostics() {
        const service = yield* ProtocolDiagnostics
        return yield* service.diagnosticsForFile(
          "packages/demo/src/attune.package.ts",
          { packageId: "demo", protocolId: "attune/package/demo" },
        )
      }), {
          descriptors: [{
            protocolId: "attune/package/demo",
            packageId: "demo",
            sourcePath: "packages/demo/src/attune.package.ts",
            descriptorHash: "bad",
          }],
        }),
    )

    expect(diagnostics[0]).toMatchObject({
      code: "attune/protocol/invalid-store-payload",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
    })
  })

  it("adapts sqlite ProtocolStoreApi into runtime materialization and diagnostics", async () => {
    const descriptor = descriptorWithHash({
      protocolId: "attune/package/sqlite-demo",
      packageId: "sqlite-demo",
      packageKind: "core-discovery-runtime",
      sourcePath: "packages/sqlite-demo/src/attune.package.ts",
      views: {
        reactivityKeys: ["sqlite-demo.changed"],
        atoms: ["sqlite-demo.view"],
      },
      services: ["SqliteDemoService"],
      operations: [{
        id: "operation",
        kind: "command",
        views: {
          reactivityKeys: ["sqlite-demo.changed"],
          atoms: ["sqlite-demo.view"],
        },
        laws: ["command.view-movement"],
        inputSchema: "Struct",
        outputSchema: "Void",
      }],
    })
    const staleArtifact: AttuneGeneratedArtifactRecord = {
      artifactId: "sqlite-demo:registry",
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      path: "packages/sqlite-demo/src/generated/operation-registry.ts",
      generatorId: "@attune/framework-nx:operation-registry",
      expectedHash: "expected",
      actualHash: "actual",
      status: "stale",
    }
    const propertyEvidence: AttuneProtocolEvidenceEvent = {
      eventId: "sqlite-demo:operation:property-run",
      runId: "run-1",
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      operationId: "operation",
      kind: "property-run",
      observedAt: "2026-06-22T00:00:00.000Z",
    }

    const result = await Effect.runPromise(
      provideSqliteRuntime(Effect.gen(function* sqliteRuntimeAdapter() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        const receipt = yield* runtime.materializeDescriptor(descriptor)
        yield* runtime.recordGeneratedArtifact(staleArtifact)
        yield* runtime.recordEvidence(propertyEvidence)
        yield* runtime.refreshDeltas(descriptor.packageId)

        const summary = yield* query.getPackageSummary(descriptor.packageId)
        const deltas = yield* query.listDeltas(descriptor.packageId)
        const projected = yield* diagnostics.diagnosticsForFile(
          descriptor.sourcePath,
          { packageId: descriptor.packageId, protocolId: descriptor.protocolId },
        )

        return { receipt, summary, deltas, projected }
      })),
    )

    expect(result.receipt).toMatchObject({
      packageId: "sqlite-demo",
      descriptorHash: descriptor.descriptorHash,
      obligationCount: 6,
    })
    expect(result.summary).toMatchObject({
      operationCount: 1,
      obligationCount: 6,
      evidenceCount: 1,
      staleGeneratedArtifactCount: 1,
    })
    expect(result.deltas.map((delta) => delta.kind)).toEqual(
      expect.arrayContaining(["missing-obligation", "stale-generated-source"]),
    )
    expect(result.deltas.some((delta) =>
      delta.obligationId === "sqlite-demo:operation:property"
    )).toBe(false)
    expect(result.projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/stale-generated-source",
    )
  })
})

const descriptorWithHash = (
  descriptor: Omit<AttuneProtocolDescriptor, "descriptorHash">,
): AttuneProtocolDescriptor => ({
  ...descriptor,
  descriptorHash: hashProtocolValue(descriptor),
})
