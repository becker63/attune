import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-core.event-envelope.changed",
    "tend-core.receipt-projection.changed",
  ],
  atoms: [
    "tendEventEnvelopeAtom",
    "tendReceiptProjectionAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-core",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-event-envelope-recipe",
      kind: "codec",
      name: "Tend event envelope recipe boundary",
    },
    {
      id: "tend-receipt-projection",
      kind: "projection",
      name: "Tend receipt projection",
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
