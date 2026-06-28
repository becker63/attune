import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-opencode.session-log.changed",
    "tend-opencode.receipts.changed",
    "tend-opencode.policy-events.changed",
  ],
  atoms: [
    "openCodeSessionLogAtom",
    "openCodeReceiptProjectionAtom",
    "openCodePolicyEventAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-opencode",
  kind: "agent-extension",
  symbols: [
    {
      id: "opencode-session-decoder",
      kind: "codec",
      name: "OpenCode session log decoder",
    },
    {
      id: "opencode-receipt-projection",
      kind: "projection",
      name: "OpenCode validation receipt projection",
    },
    {
      id: "opencode-policy-forcing",
      kind: "policy-rule",
      name: "OpenCode Tend forcing policy hook",
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
