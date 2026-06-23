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
  PackageContract,
  PackageContractSchema,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  fixtureRouteCommandOperation,
  foldkitSceneAtomOperation,
  messageUpdateCommandOperation,
  mdxFixtureCodecOperation,
  modelCodecOperation,
  routeTraceAtomOperation,
  viewModelQueryOperation,
  workbenchSnapshotViewLensOperation,
} from "../src/generated/package-contracts/attune-foldkit/attune.contract.generated.js"

const requiredOperationIds = [
  "model-codec",
  "message-update-command",
  "view-model-query",
  "fixture-route-command",
  "fixture-route-query",
  "activity-fixture-codec",
  "mdx-fixture-codec",
  "site-fixture-codec",
  "workbench-snapshot-view-lens",
  "foldkit-scene-atom",
  "route-trace-atom",
  "export-packet-atom",
] as const

describe("attune-foldkit generated package contract", () => {
  it("materializes the foldkit-ui package boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("attune-foldkit")
    expect(PackageContract.packageKind).toBe("foldkit-ui")
    expect(PackageContract.sourceRoot).toBe("packages/attune-foldkit")
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
    expect(PackageContract.services).toEqual([])

    expectTypeOf<OperationIds<typeof PackageContract>>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()
  })

  it("decodes through the shared Effect Schema contract and exact maps", () => {
    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)

    expect(decoded.packageId).toBe("attune-foldkit")
    expect(decoded.operations).toHaveLength(requiredOperationIds.length)
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
  })

  it("records update, view, and fixture route boundaries with their view graph", () => {
    expect(messageUpdateCommandOperation.kind).toBe("command")
    expect(messageUpdateCommandOperation.views?.atoms).toEqual(
      expect.arrayContaining([
        "currentRouteAtom",
        "selectedHypothesisAtom",
        "selectedEvidenceAtom",
        "fixtureRouteStateAtom",
      ]),
    )
    expect(viewModelQueryOperation.kind).toBe("query")
    expect(viewModelQueryOperation.views?.atoms).toContain("workbenchSnapshotViewAtom")
    expect(fixtureRouteCommandOperation.views?.reactivityKeys).toEqual(
      expect.arrayContaining([
        "attune-foldkit.fixture-route.changed",
        "attune-foldkit.route-trace.changed",
        "attune-foldkit.server-snapshot.changed",
      ]),
    )
  })

  it("records fixture codec and WorkbenchSnapshot lens metadata", () => {
    expect(modelCodecOperation.kind).toBe("codec")
    expect(mdxFixtureCodecOperation.metadata).toMatchObject({
      fixture: "mdxViewFixture",
      source: "src/fixtures/mdx-view-fixture.ts",
    })
    expect(workbenchSnapshotViewLensOperation.kind).toBe("query")
    expect(workbenchSnapshotViewLensOperation.views?.atoms).toEqual(
      expect.arrayContaining([
        "serverSnapshotLensAtom",
        "workbenchSnapshotViewAtom",
        "foldkitSceneAtom",
        "exportPacketAtom",
      ]),
    )
  })

  it("declares generated package-level atom and Reactivity views", () => {
    expect(PackageViews.reactivityKeys).toEqual([
      "attune-foldkit.current-route.changed",
      "attune-foldkit.selected-hypothesis.changed",
      "attune-foldkit.selected-evidence.changed",
      "attune-foldkit.server-snapshot.changed",
      "attune-foldkit.route-trace.changed",
      "attune-foldkit.foldkit-scene.changed",
      "attune-foldkit.export-packet.changed",
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.workbench-snapshot-view.changed",
    ])
    expect(PackageViews.atoms).toEqual([
      "currentRouteAtom",
      "selectedHypothesisAtom",
      "selectedEvidenceAtom",
      "serverSnapshotLensAtom",
      "routeTraceAtom",
      "foldkitSceneAtom",
      "exportPacketAtom",
      "fixtureRouteStateAtom",
      "workbenchSnapshotViewAtom",
    ])
    expect(foldkitSceneAtomOperation.atom).toMatchObject({
      atomIds: ["foldkitSceneAtom"],
    })
    expect(routeTraceAtomOperation.atom).toMatchObject({
      atomIds: ["routeTraceAtom"],
    })
  })

  it("keeps inferred laws and type-guidance partitions aligned", () => {
    expect(
      inferLawIds({
        id: messageUpdateCommandOperation.id,
        kind: messageUpdateCommandOperation.kind,
        schemas: {
          input: messageUpdateCommandOperation.input,
          output: messageUpdateCommandOperation.output,
          error: messageUpdateCommandOperation.error,
        },
        views: messageUpdateCommandOperation.views,
      }),
    ).toEqual(messageUpdateCommandOperation.laws)

    expect(
      inferLawIds({
        id: foldkitSceneAtomOperation.id,
        kind: foldkitSceneAtomOperation.kind,
        schemas: {
          input: foldkitSceneAtomOperation.input,
          output: foldkitSceneAtomOperation.output,
          error: foldkitSceneAtomOperation.error,
        },
        views: foldkitSceneAtomOperation.views,
      }),
    ).toEqual(foldkitSceneAtomOperation.laws)

    const partitions = packagePartitionIds(PackageTypeGuidance)

    expect(partitions["message-update-command"]).toEqual(
      expect.arrayContaining([
        "message-update-command.message-tag",
        "message-update-command.model-and-command-tags",
        "side-effect.declared-boundary",
        "message-update-command.fixtureRouteStateAtom.moves",
      ]),
    )
    expect(partitions["foldkit-scene-atom"]).toEqual(
      expect.arrayContaining([
        "foldkit-scene-atom.snapshot-selection",
        "foldkit-scene-atom.scene-node-ids",
        "atom-family.base-refresh",
        "foldkit-scene-atom.foldkitSceneAtom.moves",
      ]),
    )
  })
})
