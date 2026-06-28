import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "framework-testing.harness.changed",
    "framework-testing.coverage.changed",
    "framework-testing.worker-replay.changed",
  ],
  atoms: [
    "programHarnessObservationAtom",
    "coverageGuidedRerunAtom",
    "workerReplayMetadataAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "framework-testing",
  kind: "property-proof-runtime",
  symbols: [
    {
      id: "program-harness-observations",
      kind: "projection",
      name: "Program harness observations",
    },
    {
      id: "coverage-guided-rerun",
      kind: "query",
      name: "Coverage-guided property rerun",
    },
    {
      id: "worker-replay-metadata",
      kind: "projection",
      name: "Worker replay metadata",
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
