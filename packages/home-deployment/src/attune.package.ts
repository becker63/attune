import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViewRoots = {
  reactivityKeys: [
    "home-deployment.config.changed",
    "home-deployment.deployment-plan.changed",
    "home-deployment.lifecycle-graph.changed",
    "home-deployment.phase-summary.changed",
    "home-deployment.next-agent-step.changed",
    "home-deployment.state-file.changed",
    "home-deployment.provider-transition-evidence.changed",
    "home-deployment.provider-gate.changed",
    "home-deployment.host-readiness.changed",
    "home-deployment.destructive-approval.changed",
    "home-deployment.tailscale-material.changed",
    "home-deployment.sops-recipient.changed",
    "home-deployment.network-smoke.changed",
    "home-deployment.command-intent.changed",
    "home-deployment.alchemy-stack.changed",
  ],
  atoms: [
    "deploymentPlanAtom",
    "phaseSummaryAtom",
    "nextAgentStepAtom",
    "hostReadinessAtom",
    "providerGateAtom",
    "destructiveApprovalAtom",
    "tailscaleMaterialAtom",
    "sopsRecipientAtom",
    "networkSmokeAtom",
  ],
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "home-deployment",
  kind: "day0-resource-runbook",
  operations: [
    {
      id: "deployment-config-codec",
      kind: "codec",
      name: "Decode deployment configuration boundary",
    },
    {
      id: "day0-lifecycle-projection",
      kind: "projection",
      name: "Project Day-0 plan into lifecycle graph",
    },
    {
      id: "phase-summary-query",
      kind: "query",
      name: "Query phase summary and next agent step",
    },
    {
      id: "provider-transition",
      kind: "resource-provider",
      name: "Run observed provider transition",
    },
    {
      id: "nixos-anywhere-install",
      kind: "resource-provider",
      name: "NixOS Anywhere destructive install gate",
    },
    {
      id: "alchemy-stack-resource",
      kind: "resource-provider",
      name: "Materialize ThinkCentre Day-0 Alchemy stack",
    },
    {
      id: "local-state-command",
      kind: "command",
      name: "Record local Day-0 state through service boundary",
    },
    {
      id: "manual-proof-confirmation",
      kind: "command",
      name: "Confirm manual proof and destructive approval records",
    },
    {
      id: "command-intent-boundary",
      kind: "command",
      name: "Render typed command intents behind provider execution boundary",
    },
    {
      id: "home-deployment-view-atoms",
      kind: "atom-family",
      name: "Home deployment package view atoms",
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
