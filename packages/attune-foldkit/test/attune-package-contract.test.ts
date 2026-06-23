import { describe, expect, it } from "vitest"

import {
  PackageDeclaration,
  PackageViewRoots,
} from "../src/attune.package.js"

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

describe("attune-foldkit package declaration", () => {
  it("declares the authored foldkit package boundary", () => {
    expect(PackageDeclaration.id).toBe("attune-foldkit")
    expect(PackageDeclaration.kind).toBe("foldkit-ui")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("keeps authored atom and Reactivity view roots visible", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual([
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
    expect(PackageViewRoots.atoms).toEqual([
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
  })
})
