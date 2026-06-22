import { describe, expect, it } from "vitest"
import {
  createInMemoryProtocolStore,
  createSqliteProtocolStore,
  defaultProtocolCachePath,
} from "../src/index.js"

describe("@attune/framework-sqlite", () => {
  it("keeps the protocol cache path under the gitignored framework cache", () => {
    expect(defaultProtocolCachePath).toBe(".attune/cache/protocol.sqlite")
  })

  it("hides protocol state behind a store-shaped API", () => {
    const store = createInMemoryProtocolStore()
    store.putDescriptor({
      protocolId: "attune/package/demo",
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      descriptorHash: "hash",
      sourcePath: "packages/demo/src/attune.package.ts",
      views: { reactivityKeys: [], atoms: [] },
      services: [],
      operations: [],
    })
    store.putObligations([{
      obligationId: "demo:operation:property",
      protocolId: "attune/package/demo",
      packageId: "demo",
      operationId: "operation",
      kind: "property",
      reason: "property evidence required",
    }])

    expect(store.snapshot().descriptors).toHaveLength(1)
    expect(store.snapshot().obligations).toHaveLength(1)
  })

  it("roundtrips protocol state through the private SQLite cache", () => {
    const store = createSqliteProtocolStore({ path: ":memory:" })
    store.putDescriptor({
      protocolId: "attune/package/demo",
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      descriptorHash: "hash",
      sourcePath: "packages/demo/src/attune.package.ts",
      views: { reactivityKeys: [], atoms: [] },
      services: [],
      operations: [],
    })
    store.putObligations([{
      obligationId: "demo:operation:property",
      protocolId: "attune/package/demo",
      packageId: "demo",
      operationId: "operation",
      kind: "property",
      reason: "property evidence required",
    }])
    store.recordEvidenceRun({
      runId: "run-1",
      protocolId: "attune/package/demo",
      packageId: "demo",
      tier: "commit",
      status: "passed",
      startedAt: "2026-06-22T00:00:00.000Z",
    })
    store.recordEvidence({
      eventId: "event-1",
      runId: "run-1",
      protocolId: "attune/package/demo",
      packageId: "demo",
      operationId: "operation",
      kind: "property-run",
      observedAt: "2026-06-22T00:00:01.000Z",
    })
    store.recordGeneratedArtifact({
      artifactId: "artifact-1",
      protocolId: "attune/package/demo",
      packageId: "demo",
      path: "packages/demo/src/generated/operation-registry.ts",
      generatorId: "@attune/framework-nx:operation-registry",
      expectedHash: "hash",
      status: "current",
    })
    store.putDeltas([])

    const snapshot = store.snapshot()
    expect(snapshot.descriptors[0]?.descriptorHash).toBe("hash")
    expect(snapshot.obligations).toHaveLength(1)
    expect(snapshot.evidenceRuns).toHaveLength(1)
    expect(snapshot.evidence).toHaveLength(1)
    expect(snapshot.generatedArtifacts).toHaveLength(1)
    store.close()
  })
})
