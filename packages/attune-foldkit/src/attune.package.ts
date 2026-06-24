import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "attune-foldkit.current-route.changed",
    "attune-foldkit.selected-hypothesis.changed",
    "attune-foldkit.selected-evidence.changed",
    "attune-foldkit.server-snapshot.changed",
    "attune-foldkit.route-trace.changed",
    "attune-foldkit.foldkit-scene.changed",
    "attune-foldkit.export-packet.changed",
    "attune-foldkit.fixture-route.changed",
    "attune-foldkit.workbench-snapshot-view.changed",
  ],
  atoms: [
    "currentRouteAtom",
    "selectedHypothesisAtom",
    "selectedEvidenceAtom",
    "serverSnapshotLensAtom",
    "routeTraceAtom",
    "foldkitSceneAtom",
    "exportPacketAtom",
    "fixtureRouteStateAtom",
    "workbenchSnapshotViewAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "attune-foldkit",
  kind: "foldkit-ui",
  symbols: [
    {
      id: "model-codec",
      kind: "codec",
      name: "Model codec",
    },
    {
      id: "message-update-command",
      kind: "command",
      name: "Message/update command",
    },
    {
      id: "view-model-query",
      kind: "query",
      name: "View model query",
    },
    {
      id: "fixture-route-command",
      kind: "command",
      name: "Fixture route command",
    },
    {
      id: "fixture-route-query",
      kind: "query",
      name: "Fixture route query",
    },
    {
      id: "activity-fixture-codec",
      kind: "codec",
      name: "Activity fixture codec",
    },
    {
      id: "mdx-fixture-codec",
      kind: "codec",
      name: "MDX fixture codec",
    },
    {
      id: "site-fixture-codec",
      kind: "codec",
      name: "Site fixture codec",
    },
    {
      id: "workbench-snapshot-view-lens",
      kind: "query",
      name: "WorkbenchSnapshot view lens",
    },
    {
      id: "foldkit-scene-atom",
      kind: "atom-family",
      name: "FoldKit scene atom",
    },
    {
      id: "route-trace-atom",
      kind: "atom-family",
      name: "Route trace atom",
    },
    {
      id: "export-packet-atom",
      kind: "atom-family",
      name: "Export packet atom",
    },
  ],
  edges: [
    ...ProjectRuntimeRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...ProjectRuntimeRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
