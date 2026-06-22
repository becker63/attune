import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"

import {
  DiscoveryEvent,
  fixtureDiscoveryEvents,
  fixtureRun,
} from "../src/index.js"
import {
  BaseAtomFamilyOperation,
  DomainCodecInput,
  DomainEventCodecOperation,
  EventReplayProjectionOperation,
  PackageContract,
  PackageContractSchema,
  PackageFuzzHandlers,
  PackageFuzzRpcGroup,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  ReadModelQueryOperation,
  type AttunedDiscoveryOperationId,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "discovery-events-facade",
  "discovery-event-log-append",
  "event-replay-projection",
  "read-model-query",
  "reactivity-key-map",
  "base-atom-family",
  "derived-workbench-atom-family",
  "domain-event-codecs",
] as const

describe("attuned-discovery package contract", () => {
  it("declares the core discovery runtime and auditable operation ids", () => {
    expect(PackageContract.packageId).toBe("attuned-discovery")
    expect(PackageContract.packageKind).toBe("core-discovery-runtime")
    expect(PackageContract.sourceRoot).toBe("packages/attuned-discovery/src")
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual(
      [...requiredOperationIds],
    )
    expect(PackageContract.services).toEqual([
      "DiscoveryEvents",
      "DiscoveryEventLog",
      "DiscoveryReadModel",
      "DiscoveryProjection",
      "ReactivityRuntime",
      "DiscoveryAtomWorkspace",
      "DiscoveryFixtureHarness",
    ])

    expectTypeOf<AttunedDiscoveryOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()
    expectTypeOf<OperationIds<typeof PackageContract>>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()
  })

  it("decodes the package contract and the domain/event codec boundary", () => {
    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(
      PackageContract,
    )

    expect(decoded.packageId).toBe("attuned-discovery")
    expect(decoded.operations.map((operation) => operation.kind)).toEqual([
      "event-facade",
      "event-facade",
      "projection",
      "query",
      "query",
      "atom-family",
      "atom-family",
      "codec",
    ])

    expect(
      Schema.decodeUnknownSync(DiscoveryEvent)(fixtureDiscoveryEvents[0]),
    ).toMatchObject({
      _tag: "DiscoveryRunStarted",
    })
    expect(
      Schema.decodeUnknownSync(DomainCodecInput)({
        codec: "DiscoveryRun",
        payload: fixtureRun,
      }),
    ).toMatchObject({
      codec: "DiscoveryRun",
    })
  })

  it("declares package-level Reactivity and atom graph metadata", () => {
    expect(PackageViews.reactivityKeys).toEqual(
      expect.arrayContaining([
        "attuned-discovery.event-log.appended",
        "attuned-discovery.projection.changed",
        "attuned-discovery.hypotheses.changed",
        "attuned-discovery.evidence.changed",
        "attuned-discovery.review-queue.changed",
        "attuned-discovery.score-features.changed",
        "attuned-discovery.decision-packet.changed",
        "attuned-discovery.fold-scene.changed",
        "attuned-discovery.workbench-snapshot.changed",
      ]),
    )
    expect(PackageViews.atoms).toEqual(
      expect.arrayContaining([
        "runStateAtom",
        "hypothesesAtom",
        "evidenceAtom",
        "reviewQueueAtom",
        "scoreFeaturesAtom",
        "decisionPacketAtom",
        "foldSceneAtom",
        "workbenchSnapshotAtom",
        "readModelProjectionAtom",
      ]),
    )
    expect(ReadModelQueryOperation.views?.atoms).toContain(
      "workbenchSnapshotAtom",
    )
    expect(EventReplayProjectionOperation.views?.reactivityKeys).toContain(
      "attuned-discovery.projection.changed",
    )
    expect(BaseAtomFamilyOperation.views?.atoms).toContain("runStateAtom")
  })

  it("keeps inferred laws and type-guidance partitions aligned", () => {
    const inferredProjectionLaws = inferLawIds({
      id: EventReplayProjectionOperation.id,
      kind: EventReplayProjectionOperation.kind,
      schemas: {
        input: EventReplayProjectionOperation.input,
        output: EventReplayProjectionOperation.output,
        error: EventReplayProjectionOperation.error,
      },
      views: EventReplayProjectionOperation.views,
      projection: EventReplayProjectionOperation.projection,
    })

    expect(inferredProjectionLaws).toEqual(
      EventReplayProjectionOperation.laws,
    )
    expect(DomainEventCodecOperation.laws).toContain(
      "determinism.same-input-same-output",
    )
    expect(BaseAtomFamilyOperation.laws).toEqual(
      expect.arrayContaining([
        "atom-family.base-refresh",
        "atom-family.derived-composes",
        "view.atom-moves",
      ]),
    )

    const partitions = packagePartitionIds(PackageTypeGuidance)
    expect(partitions["event-replay-projection"]).toEqual(
      expect.arrayContaining([
        "projection.event-decode",
        "projection.state-decode",
        "projection.deterministic-replay",
        "readModelProjectionAtom.moves",
      ]),
    )
    expect(partitions["derived-workbench-atom-family"]).toEqual(
      expect.arrayContaining([
        "workbenchSnapshotAtom.moves",
        "atom-family.derived-composes",
      ]),
    )
    expect(
      PackageTypeGuidance.operations["read-model-query"].filters,
    ).toContainEqual(
      expect.objectContaining({
        id: "read-model-query.fixture-run-scope",
        kind: "operation-precondition",
      }),
    )
  })

  it("keeps exact handler/property maps and layer metadata aligned", () => {
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(
      true,
    )
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(
      true,
    )
    expect(
      assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer),
    ).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(
      true,
    )
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
  })

  it("derives internal fuzz RPC descriptor metadata without runtime @effect/rpc", () => {
    expect(PackageFuzzRpcGroup.packageId).toBe("attuned-discovery")
    expect(
      PackageFuzzRpcGroup.operations.map((descriptor) => descriptor.operationId),
    ).toEqual([...requiredOperationIds])
    expect(PackageFuzzRpcGroup.adapterCompatibility).toMatchObject({
      adapter: "@effect/rpc",
      status: "blocked",
    })
  })
})
