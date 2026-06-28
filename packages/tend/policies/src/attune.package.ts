import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-policies.forcing.changed",
    "tend-policies.magic-context.changed",
    "tend-policies.openrtk.changed",
  ],
  atoms: [
    "tendForcingPolicyAtom",
    "magicContextDecisionAtom",
    "openRtkCompressionAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-policies",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-forced-tool-policy",
      kind: "policy-rule",
      name: "Tend forced tool policy",
    },
    {
      id: "magic-context-selection",
      kind: "query",
      name: "Magic Context selection",
    },
    {
      id: "openrtk-compression-action",
      kind: "projection",
      name: "OpenRTK compression action",
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
