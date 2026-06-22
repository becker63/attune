import { describe, expect, expectTypeOf, it } from "vitest"

import {
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  decodePackageContract,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  commandIntentBoundaryOperation,
  HomeDeploymentPackageServices,
  nixosAnywhereInstallOperation,
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  providerTransitionOperation,
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

type HomeDeploymentOperationId = OperationIds<typeof PackageContract>

describe("home-deployment package contract", () => {
  it("declares the Day-0 resource runbook boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("home-deployment")
    expect(PackageContract.packageKind).toBe("day0-resource-runbook")
    expect(PackageContract.sourceRoot).toBe("packages/home-deployment/src")
    expect(PackageContract.services).toEqual([...HomeDeploymentPackageServices])
    expect(PackageContract.operations.map((operation: { readonly id: string }) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])

    expectTypeOf<HomeDeploymentOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()

    const decoded = decodePackageContract(PackageContract)
    expect(decoded.packageId).toBe("home-deployment")
    expect(decoded.packageKind).toBe("day0-resource-runbook")
    expect(decoded.operations).toHaveLength(requiredOperationIds.length)
  })

  it("records all required Day-0 package views and atoms", () => {
    expect(PackageViews.atoms).toEqual([
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
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "home-deployment.state-file.changed",
      "home-deployment.provider-transition-evidence.changed",
      "home-deployment.host-readiness.changed",
      "home-deployment.destructive-approval.changed",
      "home-deployment.tailscale-material.changed",
      "home-deployment.sops-recipient.changed",
      "home-deployment.network-smoke.changed",
    ]))
    expect(nixosAnywhereInstallOperation.views?.atoms).toEqual(expect.arrayContaining([
      "hostReadinessAtom",
      "destructiveApprovalAtom",
      "providerGateAtom",
    ]))
  })

  it("keeps exact handler/property maps, layers, and type guidance aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
  })

  it("models destructive observed-idempotence as metadata and laws", () => {
    expect(nixosAnywhereInstallOperation.destructive).toMatchObject({
      proof: "ManualProofRecord",
      approval: "DestructiveApprovalRecord",
    })
    expect(nixosAnywhereInstallOperation.destructive.rule).toContain(
      "already observed",
    )
    expect(nixosAnywhereInstallOperation.resource).toMatchObject({
      observes: true,
      destructive: true,
      currentProofSchema: "ManualProofRecord",
      approvalSchema: "DestructiveApprovalRecord",
    })
    expect(nixosAnywhereInstallOperation.laws).toEqual(expect.arrayContaining([
      "resource.observe-before-apply",
      "resource.observed-idempotence",
      "resource.current-destructive-proof",
      "resource.destructive-approval",
      "resource.no-repeat-destructive",
    ]))
    expect(
      inferLawIds({
        id: nixosAnywhereInstallOperation.id,
        kind: nixosAnywhereInstallOperation.kind,
        schemas: {
          input: nixosAnywhereInstallOperation.input,
          output: nixosAnywhereInstallOperation.output,
          error: nixosAnywhereInstallOperation.error,
        },
        views: {
          reactivityKeys: nixosAnywhereInstallOperation.views?.reactivityKeys,
          atoms: nixosAnywhereInstallOperation.views?.atoms,
        },
        resource: nixosAnywhereInstallOperation.resource,
      }),
    ).toEqual(nixosAnywhereInstallOperation.laws)
  })

  it("keeps live destructive/provider execution out of deterministic handlers", () => {
    expect(PackageTestLayer.metadata).toMatchObject({
      role: "day0-resource-runbook-deterministic-test-boundary",
      liveExecution: false,
    })
    expect(PackageContract.waivers?.map((waiver: { readonly id: string }) => waiver.id)).toEqual(expect.arrayContaining([
      "home-deployment/live-shell-execution-boundary",
      "home-deployment/human-destructive-review-gate",
    ]))
    expect(PackageFuzzHandlers["provider-transition"]()).toMatchObject({
      mode: "DryRun",
      status: "Planned",
      mutated: false,
    })
    expect(PackageFuzzHandlers["nixos-anywhere-install"]()).toMatchObject({
      mode: "Test",
      status: "Observed",
      mutated: false,
    })
    expect(PackageFuzzHandlers["command-intent-boundary"]()).toMatchObject({
      executionBoundary: "rendered-only",
      liveExecutionAllowed: false,
    })
    expect(commandIntentBoundaryOperation.laws).toContain("side-effect.declared-boundary")
  })

  it("records provider, destructive, and type-guidance partitions", () => {
    const partitions = packagePartitionIds(PackageTypeGuidance)
    expect(partitions["provider-transition"]).toEqual(expect.arrayContaining([
      "provider-transition.mode-resource-status",
      "provider-transition.result-status",
      "provider-transition.resource-status",
      "providerGateAtom.moves",
    ]))
    expect(partitions["nixos-anywhere-install"]).toEqual(expect.arrayContaining([
      "nixos-anywhere-install.observed-proof-approval",
      "nixos-anywhere-install.observed-or-applied-evidence",
      "nixos-anywhere-install.desired-state-observed",
      "nixos-anywhere-install.current-proof",
      "nixos-anywhere-install.current-approval",
      "resource.destructive-approval",
      "destructiveApprovalAtom.moves",
    ]))
    expect(
      PackageTypeGuidance.operations["nixos-anywhere-install"].filters,
    ).toEqual([
      expect.objectContaining({
        id: "nixos-anywhere-install.no-live-execution",
        kind: "operation-precondition",
      }),
    ])
    expect(providerTransitionOperation.resource).toMatchObject({
      liveModes: ["DryRun", "Test"],
      waivedLiveMode: "Live",
    })
  })
})
