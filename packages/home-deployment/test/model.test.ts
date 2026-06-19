import { describe, expect, it } from "vitest"

import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  confirmGateInState,
  createHomeDeploymentPlan,
  createPlatformProvidersDryRun,
  createPlatformProvidersTest,
  defaultHomeDeploymentConfig,
  nextAgentStep,
  reconcileHomeDeployment,
  toLifecycleResources,
  writeHomeDeploymentState,
} from "../src/index.js"

describe("home-deployment", () => {
  it("plans installer, manual gates, nixos-anywhere installs, platform, and desktop guard", () => {
    const plan = createHomeDeploymentPlan()
    const ids = plan.resources.map((resource) => resource.id)

    expect(ids).toContain("installer-image")
    expect(ids).toContain("windows-desktop-guard-artifact")
    expect(ids).toContain("attune-cp-1:usb-booted")
    expect(ids).toContain("attune-cp-1:disk-wipe-confirmed")
    expect(ids).toContain("attune-cp-1:nixos-anywhere-install")
    expect(ids).toContain("attune-platform-kubernetes-graph")
    expect(ids).toContain("desktop-gpu-guard")
  })

  it("blocks destructive install until host gates are confirmed", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan(config, {
      confirmedGateIds: new Set(["tailscale-auth-ready", "k3s-token-ready", "attune-cp-1:usb-booted"]),
    })

    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(install?.status).toBe("blocked")
    expect(install?.blockedReason).toContain("attune-cp-1:disk-wipe-confirmed")
    expect(install?.destructive).toBe(true)
    expect(install?.phase).toBe("hosts")
  })

  it("blocks installs until global Tailscale and K3s token gates are confirmed", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan(config, {
      confirmedGateIds: new Set(["attune-cp-1:usb-booted", "attune-cp-1:disk-wipe-confirmed"]),
    })

    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(install?.status).toBe("blocked")
    expect(install?.blockedReason).toContain("tailscale-auth-ready")
    expect(install?.blockedReason).toContain("k3s-token-ready")
  })

  it("renders the nixos-anywhere command for a confirmed host", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan(config, {
      confirmedGateIds: new Set([
        "tailscale-auth-ready",
        "k3s-token-ready",
        "attune-cp-1:usb-booted",
        "attune-cp-1:disk-wipe-confirmed",
      ]),
    })

    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(install?.status).toBe("planned")
    expect(install?.command?.argv).toEqual([
      "nixos-anywhere",
      "--flake",
      "./nix/hosts#attune-cp-1",
      "root@attune-installer-cp-1.local",
    ])
  })

  it("renders SSH, disk, Tailscale, and K3s probe commands", () => {
    const plan = createHomeDeploymentPlan()

    const usbGate = plan.resources.find((resource) => resource.id === "attune-cp-1:usb-booted")
    const diskGate = plan.resources.find((resource) => resource.id === "attune-cp-1:disk-wipe-confirmed")
    const tailscaleReadiness = plan.resources.find((resource) => resource.id === "attune-cp-1:tailscale-readiness")
    const k3sInit = plan.resources.find((resource) => resource.id === "attune-cp-1:k3s-init")
    const k3sReadiness = plan.resources.find((resource) => resource.id === "attune-cp-1:k3s-readiness")

    expect(usbGate?.command?.argv).toContain("root@attune-installer-cp-1.local")
    expect(diskGate?.command?.display).toContain("lsblk")
    expect(tailscaleReadiness?.command?.display).toContain("tailscale status")
    expect(k3sInit?.command?.display).toContain("systemctl is-active")
    expect(k3sReadiness?.command?.display).toContain("kubectl get node")
  })

  it("unblocks dependent resources from completed Alchemy state", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan(config, {
      confirmedGateIds: new Set([
        "tailscale-auth-ready",
        "k3s-token-ready",
        "attune-cp-1:usb-booted",
        "attune-cp-1:disk-wipe-confirmed",
      ]),
      completedResourceIds: new Set(["installer-image", "attune-cp-1:nixos-anywhere-install"]),
    })

    const tailscale = plan.resources.find((resource) => resource.id === "attune-cp-1:tailscale-readiness")

    expect(tailscale?.status).toBe("planned")
    expect(tailscale?.phase).toBe("tailscale")
  })

  it("dry-runs reconciliation through Alchemy resources without mutating completion state", async () => {
    const directory = mkdtempSync(join(tmpdir(), "attune-home-"))
    const statePath = join(directory, "state.json")
    try {
      writeHomeDeploymentState(statePath, {
        confirmedGateIds: [],
        completedResourceIds: [],
        failedResourceIds: [],
        records: [],
        gateEvidence: [],
      })

      const result = await reconcileHomeDeployment({
        statePath,
        phase: "artifacts",
      })

      expect(result.dryRun).toBe(true)
      expect(result.selected.map((resource) => resource.id)).toEqual(["installer-image", "windows-desktop-guard-artifact"])
      expect(result.applied).toHaveLength(2)
      expect(result.applied.every((record) => record.dryRun)).toBe(true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("confirms gates through shared deployment state", () => {
    const state = confirmGateInState(
      {
        confirmedGateIds: [],
        completedResourceIds: [],
        failedResourceIds: [],
        records: [],
        gateEvidence: [],
      },
      "tailscale-auth-ready",
    )

    expect(state.confirmedGateIds).toEqual(["tailscale-auth-ready"])
    expect(state.gateEvidence[0]?.gateId).toBe("tailscale-auth-ready")
  })



  it("DryRun providers report intended transitions without mutation", () => {
    const providers = createPlatformProvidersDryRun()
    const resource = createHomeDeploymentPlan().resources.find((item) => item.id === "installer-image")

    expect(resource).toBeDefined()
    const result = providers.nix.buildArtifact(resource!)

    expect(result.provider).toBe("NixProvider")
    expect(result.mode).toBe("DryRun")
    expect(result.mutated).toBe(false)
  })

  it("Test providers block irreversible host activation without typed proof", () => {
    const providers = createPlatformProvidersTest()
    const config = defaultHomeDeploymentConfig()
    const resource = createHomeDeploymentPlan(config, {
      confirmedGateIds: new Set([
        "tailscale-auth-ready",
        "k3s-token-ready",
        "attune-cp-1:usb-booted",
        "attune-cp-1:disk-wipe-confirmed",
      ]),
    }).resources.find((item) => item.id === "attune-cp-1:nixos-anywhere-install")

    expect(resource).toBeDefined()
    expect(() => providers.hostActivation.activateHost(resource!, undefined)).toThrow("requires typed manual proof")
    expect(
      providers.hostActivation.activateHost(resource!, {
        gateId: "attune-cp-1:disk-wipe-confirmed",
        evidenceRef: "test://disk-proof",
      }).mutated,
    ).toBe(true)
  })

  it("projects legacy plan resources into typed lifecycle resources", () => {
    const plan = createHomeDeploymentPlan()
    const lifecycle = toLifecycleResources(plan.resources)

    expect(lifecycle.find((resource) => resource.resourceId === "installer-image")).toMatchObject({
      kind: "NixBuildArtifact",
      operation: "safe",
      provider: "NixProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "attune-cp-1:nixos-anywhere-install")).toMatchObject({
      kind: "HostActivation",
      operation: "irreversible",
      provider: "HostActivationProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "attune-platform-kubernetes-graph")).toMatchObject({
      kind: "KubernetesObjectSet",
      provider: "KubernetesProvider",
    })
  })

  it("returns deterministic next-step output for agents", () => {
    const step = nextAgentStep(createHomeDeploymentPlan().resources)

    expect(step).toMatchObject({
      type: "SafeProbe",
      resourceId: "installer-image",
      provider: "NixProvider",
      autoRunnable: true,
    })
  })
})
