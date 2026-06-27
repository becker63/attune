import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "effect-oxlint-policy.rule-source.changed",
    "effect-oxlint-policy.oxlint-config.changed",
    "effect-oxlint-policy.adapter-allowlist.changed",
    "effect-oxlint-policy.scanned-source-partitions.changed",
    "effect-oxlint-policy.policy-results.changed",
  ],
  atoms: [
    "policyRuleRegistryAtom",
    "adapterAllowlistAtom",
    "policyResultAtom",
    "ruleFindingAtom",
    "waiverSummaryAtom",
    "rawEnvFindingAtom",
    "rawNodeApiFindingAtom",
    "packageManagerSurfaceFindingAtom",
    "serviceShapeFindingAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "effect-oxlint-policy",
  kind: "policy-plugin",
  symbols: [
    {
      id: "no-raw-process-env",
      kind: "policy-rule",
      name: "No raw process.env",
    },
    {
      id: "no-raw-node-apis",
      kind: "policy-rule",
      name: "No raw Node APIs",
    },
    {
      id: "no-arbitrary-package-manager-surfaces",
      kind: "policy-rule",
      name: "No arbitrary package-manager surfaces",
    },
    {
      id: "no-hand-authored-architecture-shapes",
      kind: "policy-rule",
      name: "No hand-authored architecture shapes",
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
