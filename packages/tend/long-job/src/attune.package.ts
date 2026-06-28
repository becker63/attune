import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-long-job.registry.changed",
    "tend-long-job.wakeup.changed",
  ],
  atoms: [
    "tendLongJobRegistryAtom",
    "tendWakeupPacketAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-long-job",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-long-job-registration",
      kind: "command",
      name: "Register Tend long job",
    },
    {
      id: "tend-wakeup-packet",
      kind: "projection",
      name: "Emit Tend wakeup packet",
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
