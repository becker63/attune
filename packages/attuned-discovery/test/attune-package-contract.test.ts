import { describe, expect, it } from "vitest"

import {
  PackageDeclaration,
  PackageViewRoots,
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

describe("attuned-discovery package declaration", () => {
  it("declares the authored discovery package boundary", () => {
    expect(PackageDeclaration.id).toBe("attuned-discovery")
    expect(PackageDeclaration.kind).toBe("core-discovery-runtime")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("keeps authored atom and Reactivity view roots visible", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual(expect.arrayContaining([
      "attuned-discovery.event-log.appended",
      "attuned-discovery.projection.changed",
      "attuned-discovery.hypotheses.changed",
      "attuned-discovery.evidence.changed",
      "attuned-discovery.review-queue.changed",
      "attuned-discovery.score-features.changed",
      "attuned-discovery.decision-packet.changed",
      "attuned-discovery.fold-scene.changed",
      "attuned-discovery.workbench-snapshot.changed",
    ]))
    expect(PackageViewRoots.atoms).toEqual(expect.arrayContaining([
      "runStateAtom",
      "hypothesesAtom",
      "evidenceAtom",
      "reviewQueueAtom",
      "scoreFeaturesAtom",
      "decisionPacketAtom",
      "foldSceneAtom",
      "workbenchSnapshotAtom",
      "readModelProjectionAtom",
    ]))
  })
})
