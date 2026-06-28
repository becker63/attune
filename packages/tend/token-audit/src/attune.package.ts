import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-token-audit.metrics.changed",
    "tend-token-audit.compression.changed",
  ],
  atoms: [
    "tendTokenMetricsAtom",
    "tendCompressionMetricsAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-token-audit",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-token-metrics",
      kind: "query",
      name: "Tend token metrics",
    },
    {
      id: "tend-compression-metrics",
      kind: "projection",
      name: "Tend compression metric projection",
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
