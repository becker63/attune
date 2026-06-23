import { describe, expect, it } from "vitest"

import {
  PackageDeclaration,
  PackageViewRoots,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "deployment-config-codec",
  "day0-lifecycle-projection",
  "phase-summary-query",
  "provider-transition",
  "nixos-anywhere-install",
  "alchemy-stack-resource",
  "local-state-command",
  "manual-proof-confirmation",
  "command-intent-boundary",
  "home-deployment-view-atoms",
] as const

describe("home-deployment package declaration", () => {
  it("declares the authored Day-0 resource runbook boundary", () => {
    expect(PackageDeclaration.id).toBe("home-deployment")
    expect(PackageDeclaration.kind).toBe("day0-resource-runbook")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("keeps authored Day-0 package views and atoms visible", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual([
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
    ])
    expect(PackageViewRoots.atoms).toEqual([
      "deploymentPlanAtom",
      "phaseSummaryAtom",
      "nextAgentStepAtom",
      "hostReadinessAtom",
      "providerGateAtom",
      "destructiveApprovalAtom",
      "tailscaleMaterialAtom",
      "sopsRecipientAtom",
      "networkSmokeAtom",
    ])
  })
})
