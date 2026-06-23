import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"
export * from "./attune.contract.generated.js"

export const PackageViewRoots = {
  reactivityKeys: [
    "attuned-discovery.event-log.appended",
    "attuned-discovery.projection.changed",
    "attuned-discovery.run-state.changed",
    "attuned-discovery.run-metrics.changed",
    "attuned-discovery.anchors.changed",
    "attuned-discovery.families.changed",
    "attuned-discovery.hypotheses.changed",
    "attuned-discovery.evidence.changed",
    "attuned-discovery.review-queue.changed",
    "attuned-discovery.score-features.changed",
    "attuned-discovery.decision-packet.changed",
    "attuned-discovery.fold-scene.changed",
    "attuned-discovery.workbench-snapshot.changed",
    "attuned-discovery.domain-codec.changed",
  ],
  atoms: [
    "runStateAtom",
    "runMetricsAtom",
    "anchorsAtom",
    "familiesAtom",
    "hypothesesAtom",
    "evidenceAtom",
    "reviewQueueAtom",
    "scoreFeaturesAtom",
    "plateauAtom",
    "decisionPacketAtom",
    "foldSceneAtom",
    "workbenchSnapshotAtom",
    "readModelProjectionAtom",
    "domainCodecAtom",
  ],
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "attuned-discovery",
  kind: "core-discovery-runtime",
  operations: [
    {
      id: "discovery-events-facade",
      kind: "event-facade",
      name: "DiscoveryEvents event facade",
    },
    {
      id: "discovery-event-log-append",
      kind: "event-facade",
      name: "DiscoveryEventLog append",
    },
    {
      id: "read-model-query",
      kind: "query",
      name: "Read model query",
    },
    {
      id: "reactivity-key-map",
      kind: "query",
      name: "Discovery event to Reactivity key map",
    },
    {
      id: "base-atom-family",
      kind: "atom-family",
      name: "Base discovery atom family",
    },
    {
      id: "derived-workbench-atom-family",
      kind: "atom-family",
      name: "Derived workbench atom family",
    },
    {
      id: "domain-event-codecs",
      kind: "codec",
      name: "Domain and event codecs",
    },
  ],
  views: [
    ...PackageViewRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...PackageViewRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
