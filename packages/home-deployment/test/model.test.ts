import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import {
  commandPlan,
  confirmGateInState,
  createHomeDeploymentPlan,
  createHomePlatformLifecycleGraph,
  createPlatformProvidersDryRun,
  createPlatformProvidersLive,
  createPlatformProvidersTest,
  defaultHomeDeploymentConfig,
  nextAgentStep,
  nextLifecycleAgentStep,
  runProviderTransition,
  toLifecycleResources,
  type PlannedResource,
} from "../src/index.ts"

const completed = (...ids: readonly string[]) => new Set(ids)

const proofFor = (resource: PlannedResource) => ({
  gateId:
    resource.kind === "MachineBinding"
      ? `${resource.id.split(":")[0]}:lan-binding-confirmed`
      : resource.kind === "UsbMediaWrite"
        ? "usb-media-write-approved"
        : resource.kind === "NixosAnywhereInstall"
        ? `${resource.id.split(":")[0]}:disk-wipe-confirmed`
        : resource.id,
  evidenceRef: `test://${resource.id}`,
  confirmedAt: "2026-06-22T12:00:00.000Z",
})

const approvalFor = (resource: PlannedResource, proof = proofFor(resource)) => ({
  approvalId: `approval:${resource.id}`,
  gateId: proof.gateId,
  resourceId: resource.id,
  approvedBy: "test-operator",
  approvedAt: "2026-06-22T12:01:00.000Z",
  proofRef: proof.evidenceRef,
  expiresAt: "2999-01-01T00:00:00.000Z",
})

const asStatus = (resource: PlannedResource, status: PlannedResource["status"]): PlannedResource => {
  const { blockedReason: _blockedReason, ...rest } = resource
  return {
    ...rest,
    status,
  }
}

const asPlanned = (resource: PlannedResource): PlannedResource => asStatus(resource, "planned")

const asReady = (resource: PlannedResource): PlannedResource => asStatus(resource, "ready")

describe("home-deployment", () => {
  it("plans the complete ThinkCentre Day 0 network workflow", () => {
    const plan = createHomeDeploymentPlan()
    const ids = plan.resources.map((resource) => resource.id)

    expect(plan.hosts.map((host) => [host.hostname, host.targetSystem])).toEqual([
      ["attune-cp-1", "x86_64-linux"],
      ["attune-cp-2", "x86_64-linux"],
      ["attune-cp-3", "x86_64-linux"],
    ])
    expect(ids).toContain("operator-machine")
    expect(ids).toContain("operator-tailscale")
    expect(ids).toContain("operator-x86-nix-builder")
    expect(ids).toContain("operator-sops-age-key")
    expect(ids).toContain("tailscale-auth-material")
    expect(ids).toContain("sops-secret-set")
    expect(ids).toContain("host-inventory")
    expect(ids).toContain("lan-discovery-scan")
    expect(ids).toContain("installer-image")
    expect(ids).toContain("installer-iso")
    expect(ids).toContain("usb-media-selected")
    expect(ids).toContain("installer-usb-written")
    expect(ids).toContain("attune-cp-1:machine-reference")
    expect(ids).toContain("attune-cp-1:lan-binding")
    expect(ids).toContain("attune-cp-1:host-closure")
    expect(ids).toContain("attune-cp-1:disko-layout")
    expect(ids).toContain("attune-cp-1:nixos-anywhere-extra-files")
    expect(ids).toContain("attune-cp-1:nixos-anywhere-install")
    expect(ids).toContain("attune-cp-1:tailscale-secret-availability")
    expect(ids).toContain("attune-cp-1:tailscale-readiness")
    expect(ids).toContain("attune-cp-1:sops-recipient-rotation")
    expect(ids).toContain("attune-cp-1:comin-readiness")
    expect(ids).toContain("attune-cp-1:network-smoke")
    expect(ids).toContain("thinkcentre-network-smoke")
    expect(ids).toContain("kubernetes-deferred")
    expect(ids).not.toContain("attune-platform-kubernetes-graph")
    expect(ids).not.toContain("desktop-gpu-guard")
  })

  it("auto-discovers active link-scope LAN ranges when no operator ranges are configured", () => {
    const plan = createHomeDeploymentPlan()
    const discovery = plan.resources.find((resource) => resource.id === "lan-discovery-scan")

    expect(discovery?.command?.display).toContain("ip -j route show scope link")
    expect(discovery?.command?.display).toContain("no active IPv4 link-scope routes")
    expect(discovery?.command?.display).toContain('nmap -sn "$range"')
    expect(discovery?.command?.display).not.toContain("192.168.0.0/24")
  })

  it("honors explicitly configured LAN discovery ranges", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan({
      ...config,
      operator: {
        ...config.operator,
        allowedDiscoveryRanges: ["10.42.0.0/24"],
      },
    })
    const discovery = plan.resources.find((resource) => resource.id === "lan-discovery-scan")

    expect(discovery?.command?.argv[2]).toContain("nmap -sn '10.42.0.0/24'")
    expect(discovery?.command?.argv[2]).not.toContain('nmap -sn "$range"')
  })

  it("rejects non-fixed host inventories", () => {
    const config = defaultHomeDeploymentConfig()

    expect(() =>
      createHomeDeploymentPlan({
        ...config,
        hosts: [config.hosts[0]!],
      }),
    ).toThrow("requires exactly attune-cp-1, attune-cp-2, attune-cp-3")
  })

  it("probes the laptop-local x86 builder before artifact builds can run", () => {
    const plan = createHomeDeploymentPlan()
    const builder = plan.resources.find((resource) => resource.id === "operator-x86-nix-builder")

    expect(builder?.command?.display).toContain("x86_64-linux binfmt")
    expect(builder?.command?.display).toContain("sudo nixos-rebuild switch --flake /home/becker/nixos-from-scratch#nixos-btw")
    expect(builder?.command?.display).toContain("nix build --option builders")
    expect(builder?.command?.display).toContain("attune-x86-builder-probe")
    expect(builder?.manualActions[0]).toMatchObject({
      id: "operator-x86-builder-activate",
      kind: "RunCommand",
    })
    expect(builder?.manualActions[0]?.command?.slice(0, 3)).toEqual(["sudo", "nixos-rebuild", "switch"])
  })

  it("blocks Disko and destructive install while disk ids are placeholders", () => {
    const plan = createHomeDeploymentPlan()
    const layout = plan.resources.find((resource) => resource.id === "attune-cp-1:disko-layout")
    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(layout?.status).toBe("blocked")
    expect(layout?.blockedReason).toContain("placeholder disk")
    expect(install?.status).toBe("blocked")
    expect(install?.destructive).toBe(true)
  })

  it("renders OAuth/manual Tailscale actions without exposing keys", () => {
    const plan = createHomeDeploymentPlan()
    const tailscale = plan.resources.find((resource) => resource.id === "tailscale-auth-material")

    expect(tailscale?.manualActions.map((action) => action.url)).toContain("https://tailscale.com/docs/features/oauth-clients")
    expect(tailscale?.manualActions.map((action) => action.url)).toContain("https://login.tailscale.com/admin/settings/keys")
    expect(tailscale?.evidenceRequirements.some((requirement) => requirement.secret)).toBe(true)
    expect(tailscale?.secretRefs).toEqual(["thinkcentre-oauth-or-auth-key"])
    expect(tailscale?.observeCommand?.display).toContain("sops --decrypt")
    expect(tailscale?.observeCommand?.display).toContain("missing encrypted Tailscale auth material")
  })

  it("renders SSH, disk, Tailscale, comin, and nixos-anywhere command metadata", () => {
    const config = defaultHomeDeploymentConfig()
    const host = config.hosts[0]!
    const plan = createHomeDeploymentPlan(config)

    const usbGate = plan.resources.find((resource) => resource.id === "attune-cp-1:usb-booted")
    const diskProbe = plan.resources.find((resource) => resource.id === "attune-cp-1:disk-identity-probe")
    const tailscaleReadiness = plan.resources.find((resource) => resource.id === "attune-cp-1:tailscale-readiness")
    const recipientRotation = plan.resources.find((resource) => resource.id === "attune-cp-1:sops-recipient-rotation")
    const cominReadiness = plan.resources.find((resource) => resource.id === "attune-cp-1:comin-readiness")
    const extraFiles = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-extra-files")
    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(usbGate?.command?.argv).toContain("root@attune-installer-cp-1.local")
    expect(diskProbe?.command?.display).toContain("lsblk")
    expect(tailscaleReadiness?.command?.display).toContain("tailscale status")
    expect(tailscaleReadiness?.command?.display).toContain("tag:attune-thinkcentre")
    expect(recipientRotation?.command?.display).toContain("ssh-to-age")
    expect(recipientRotation?.command?.display).toContain("SOPS_AGE_RECIPIENTS")
    expect(recipientRotation?.observeCommand?.display).toContain("cmp -s")
    expect(cominReadiness?.command?.display).toContain("journalctl")
    expect(cominReadiness?.command?.display).toContain(host.comin.repositoryUrl)
    expect(extraFiles?.observeCommand?.display).toContain("cmp -s")
    expect(extraFiles?.observeCommand?.display).toContain("var/lib/sops-nix/key.txt")
    expect(install?.command?.argv).toContain("--extra-files")
    expect(install?.observeCommand?.display).toContain(config.hosts[0]!.postInstallSshTarget)
    expect(install?.observeCommand?.display).toContain("/run/current-system")
    expect(install?.observeCommand?.display).toContain("/etc/attune/day0.json")
    expect(install?.observeCommand?.display).toContain(host.expectedDisk.device)
  })

  it("unblocks host install from completed Alchemy state and typed gates", () => {
    const config = defaultHomeDeploymentConfig()
    const host = config.hosts[0]!
    const readyConfig = {
      ...config,
      hosts: [
        {
          ...host,
          expectedDisk: {
            device: "/dev/disk/by-id/nvme-SERIAL_ATTUNE_CP_1",
          },
        },
        config.hosts[1]!,
        config.hosts[2]!,
      ] as const,
    }
    const plan = createHomeDeploymentPlan(readyConfig, {
      confirmedGateIds: new Set(["attune-cp-1:disk-wipe-confirmed"]),
      completedResourceIds: completed(
        "installer-image",
        "attune-cp-1:host-closure",
        "attune-cp-1:nixos-anywhere-extra-files",
        "attune-cp-1:disko-layout",
      ),
    })

    const install = plan.resources.find((resource) => resource.id === "attune-cp-1:nixos-anywhere-install")

    expect(install?.status).toBe("planned")
    expect(install?.operation).toBe("irreversible")
  })

  it("confirms gates through shared deployment state", () => {
    const state = confirmGateInState(
      {
        confirmedGateIds: [],
        completedResourceIds: [],
        failedResourceIds: [],
        records: [],
        gateEvidence: [],
        evidence: [],
      },
      "usb-media-selected",
    )

    expect(state.confirmedGateIds).toEqual(["usb-media-selected"])
    expect(state.gateEvidence[0]?.gateId).toBe("usb-media-selected")
  })

  it("DryRun providers report intended transitions without mutation", () => {
    const providers = createPlatformProvidersDryRun()
    const resource = createHomeDeploymentPlan().resources.find((item) => item.id === "installer-image")

    expect(resource).toBeDefined()
    const result = Effect.runSync(providers.nix.buildArtifact(asPlanned(resource!)))

    expect(result.provider).toBe("NixProvider")
    expect(result.mode).toBe("DryRun")
    expect(result.status).toBe("Planned")
    expect(result.mutated).toBe(false)
  })

  it("Test providers never mutate blocked irreversible host activation even with typed proof", () => {
    const providers = createPlatformProvidersTest()
    const resource = createHomeDeploymentPlan().resources.find((item) => item.id === "attune-cp-1:nixos-anywhere-install")

    expect(resource).toBeDefined()
    const result = Effect.runSync(runProviderTransition(providers, resource!, {
      gateId: "attune-cp-1:disk-wipe-confirmed",
      evidenceRef: "test://disk-proof",
    }))

    expect(result.status).toBe("Blocked")
    expect(result.mutated).toBe(false)
  })

  it("Test providers require exact typed proof before planned irreversible host activation", () => {
    const providers = createPlatformProvidersTest()
    const resource = asPlanned(createHomeDeploymentPlan().resources.find((item) => item.id === "attune-cp-1:nixos-anywhere-install")!)

    expect(() => Effect.runSync(runProviderTransition(providers, resource))).toThrow("requires typed manual proof")
    expect(() =>
      Effect.runSync(runProviderTransition(providers, resource, {
        gateId: "attune-cp-2:disk-wipe-confirmed",
        evidenceRef: "test://wrong-host-disk-proof",
      })),
    ).toThrow("requires proof for gate attune-cp-1:disk-wipe-confirmed")
    const proof = proofFor(resource)
    expect(() =>
      Effect.runSync(runProviderTransition(providers, resource, proof)),
    ).toThrow("requires current destructive approval")
    expect(() =>
      Effect.runSync(runProviderTransition(providers, resource, proof, {
        ...approvalFor(resource, proof),
        expiresAt: "2000-01-01T00:00:00.000Z",
      })),
    ).toThrow("stale destructive approval")
    expect(
      Effect.runSync(runProviderTransition(providers, resource, proof, approvalFor(resource, proof))).mutated,
    ).toBe(true)
  })

  it("Test providers observe completed irreversible host activation without proof", () => {
    const providers = createPlatformProvidersTest()
    const resource = asReady(createHomeDeploymentPlan().resources.find((item) => item.id === "attune-cp-1:nixos-anywhere-install")!)
    const result = Effect.runSync(runProviderTransition(providers, resource))

    expect(result.status).toBe("Observed")
    expect(result.mutated).toBe(false)
  })

  it("Test providers never mutate blocked USB media writes even with typed proof", () => {
    const providers = createPlatformProvidersTest()
    const resource = createHomeDeploymentPlan().resources.find((item) => item.id === "installer-usb-written")

    expect(resource).toBeDefined()
    const result = Effect.runSync(runProviderTransition(providers, resource!, {
      gateId: "usb-media-write-approved",
      evidenceRef: "test://usb-proof",
    }))

    expect(result.status).toBe("Blocked")
    expect(result.mutated).toBe(false)
  })

  it("Test providers require exact typed proof before planned USB media writes", () => {
    const providers = createPlatformProvidersTest()
    const resource = asPlanned(createHomeDeploymentPlan().resources.find((item) => item.id === "installer-usb-written")!)

    expect(() => Effect.runSync(runProviderTransition(providers, resource))).toThrow("requires typed manual proof")
    expect(() =>
      Effect.runSync(runProviderTransition(providers, resource, {
        gateId: "usb-media-selected",
        evidenceRef: "test://wrong-usb-proof",
      })),
    ).toThrow("requires proof for gate usb-media-write-approved")
    const proof = proofFor(resource)
    expect(() =>
      Effect.runSync(runProviderTransition(providers, resource, proof, {
        ...approvalFor(resource, proof),
        resourceId: "installer-image",
      })),
    ).toThrow("requires approval for the exact resource")
    expect(
      Effect.runSync(runProviderTransition(providers, resource, proof, approvalFor(resource, proof))).mutated,
    ).toBe(true)
  })

  it("Test providers observe completed USB media writes without proof", () => {
    const providers = createPlatformProvidersTest()
    const resource = asReady(createHomeDeploymentPlan().resources.find((item) => item.id === "installer-usb-written")!)
    const result = Effect.runSync(runProviderTransition(providers, resource))

    expect(result.status).toBe("Observed")
    expect(result.mutated).toBe(false)
  })

  it("mutable External resources expose observation commands", () => {
    const plan = createHomeDeploymentPlan()
    const observedExternalIds = [
      "tailscale-auth-material",
      ...plan.hosts.flatMap((hostConfig) => [
        `${hostConfig.hostname}:nixos-anywhere-extra-files`,
        `${hostConfig.hostname}:sops-recipient-rotation`,
      ]),
    ]

    for (const id of observedExternalIds) {
      const resource = plan.resources.find((item) => item.id === id)
      expect(resource).toBeDefined()
      expect(resource?.operation).toBe("external")
      expect(resource?.observeCommand).toBeDefined()
    }
  })

  it("Test providers do not mutate blocked external resources", () => {
    const providers = createPlatformProvidersTest()
    const plan = createHomeDeploymentPlan()
    const blockedExternalIds = [
      "tailscale-auth-material",
      "sops-secret-set",
      ...plan.hosts.flatMap((hostConfig) => [
        `${hostConfig.hostname}:nixos-anywhere-extra-files`,
        `${hostConfig.hostname}:sops-recipient-rotation`,
      ]),
    ]

    for (const id of blockedExternalIds) {
      const resource = plan.resources.find((item) => item.id === id)
      expect(resource).toBeDefined()
      const result = Effect.runSync(runProviderTransition(providers, resource!))
      expect(result.status).toBe("Blocked")
      expect(result.mutated).toBe(false)
      expect(result.blockers.length).toBeGreaterThan(0)
    }
  })

  it("Live external providers observe before mutating and redact secret output", () => {
    const providers = createPlatformProvidersLive()
    const tmp = mkdtempSync(join(tmpdir(), "attune-provider-"))
    const sentinel = join(tmp, "mutated")
    const base = createHomeDeploymentPlan().resources.find((item) => item.id === "tailscale-auth-material")
    const observeCommand = commandPlan(["sh", "-c", "printf '%s\\n' \"$ATTUNE_FAKE_PROVIDER_SECRET\""])
    const resource = asPlanned({
      ...base!,
      command: commandPlan(["sh", "-c", `printf mutated > '${sentinel}'; exit 99`]),
      observeCommand,
    })
    process.env.ATTUNE_FAKE_PROVIDER_SECRET =
      "https://login.tailscale.com/a nodekey:abc tskey-auth-test auth-key: \"super-secret\""

    try {
      const result = Effect.runSync(runProviderTransition(providers, resource))
      const evidence = result.evidence.map((item) => item.summary).join("\n")

      expect(result.status).toBe("Observed")
      expect(result.mutated).toBe(false)
      expect(result.blockers).toEqual([])
      expect(result.display).toBe(observeCommand.display)
      expect(existsSync(sentinel)).toBe(false)
      expect(result.evidence.some((item) => item.secret)).toBe(true)
      expect(evidence).not.toContain("https://login.tailscale.com/a")
      expect(evidence).not.toContain("nodekey:abc")
      expect(evidence).not.toContain("tskey-auth-test")
      expect(evidence).not.toContain("super-secret")
      expect(evidence).toContain("<redacted")
    } finally {
      delete process.env.ATTUNE_FAKE_PROVIDER_SECRET
      rmSync(tmp, { force: true, recursive: true })
    }
  })

  it("Manual gates and machine bindings require exact proof where needed", () => {
    const providers = createPlatformProvidersTest()
    const plan = createHomeDeploymentPlan()
    const gate = plan.resources.find((item) => item.id === "usb-media-selected")!
    const binding = plan.resources.find((item) => item.id === "attune-cp-1:lan-binding")!

    expect(() =>
      Effect.runSync(runProviderTransition(providers, gate, {
        gateId: "usb-media-write-approved",
        evidenceRef: "test://wrong-gate",
      })),
    ).toThrow("requires proof for gate usb-media-selected")
    expect(() =>
      Effect.runSync(runProviderTransition(providers, gate, {
        gateId: "usb-media-selected",
        evidenceRef: "",
      })),
    ).toThrow("requires a non-empty proof evidence reference")

    expect(Effect.runSync(runProviderTransition(providers, asReady(binding))).status).toBe("Observed")
    const blocked = Effect.runSync(runProviderTransition(providers, binding, {
      gateId: "attune-cp-1:lan-binding-confirmed",
      evidenceRef: "test://binding",
    }))
    expect(blocked.status).toBe("Blocked")
    expect(blocked.mutated).toBe(false)

    expect(() =>
      Effect.runSync(runProviderTransition(providers, asPlanned(binding), {
        gateId: "attune-cp-2:lan-binding-confirmed",
        evidenceRef: "test://wrong-binding",
      })),
    ).toThrow("requires proof for gate attune-cp-1:lan-binding-confirmed")
  })

  it("adds a non-mutating USB write observation command when a device is selected", () => {
    const config = defaultHomeDeploymentConfig()
    const plan = createHomeDeploymentPlan({
      ...config,
      operator: {
        ...config.operator,
        installerUsbDevice: "/dev/disk/by-id/test-usb",
      },
    })
    const resource = plan.resources.find((item) => item.id === "installer-usb-written")

    expect(resource?.observeCommand?.display).toContain("cmp -n")
    expect(resource?.observeCommand?.display).toContain("/dev/disk/by-id/test-usb")
  })

  it("models Day 0 lifecycle resource kinds in the platform graph", () => {
    const graph = createHomePlatformLifecycleGraph()
    const kinds = new Set(graph.resources.map((resource) => resource.kind))

    expect(kinds).toEqual(new Set([
      "OperatorMachine",
      "OperatorTailscale",
      "X86NixBuilder",
      "SopsKey",
      "SopsRecipientMetadata",
      "SopsSecretSet",
      "SopsRecipientRotation",
      "ThinkCentreMachine",
      "LanDiscoveryScan",
      "MachineBinding",
      "ManualGate",
      "NixBuild",
      "InstallerIso",
      "UsbMediaWrite",
      "SshReachability",
      "DiskIdentityProbe",
      "DiskoLayout",
      "NixosAnywhereExtraFiles",
      "NixosAnywhereInstall",
      "TailscaleSecretAvailability",
      "TailscaleReadiness",
      "CominReadiness",
      "NetworkSmokeCheck",
      "DeferredCapability",
    ]))
  })

  it("returns safe probes before manual gates whose dependencies are not ready", () => {
    const step = nextLifecycleAgentStep(createHomePlatformLifecycleGraph().resources)

    expect(step).toMatchObject({
      type: "SafeProbe",
      resourceId: "operator-machine",
      autoRunnable: true,
    })
  })

  it("projects plan resources into typed lifecycle resources", () => {
    const plan = createHomeDeploymentPlan()
    const lifecycle = toLifecycleResources(plan.resources)

    expect(lifecycle.find((resource) => resource.resourceId === "operator-x86-nix-builder")).toMatchObject({
      kind: "X86NixBuilder",
      operation: "safe",
      provider: "NixProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "attune-cp-1:nixos-anywhere-install")).toMatchObject({
      kind: "NixosAnywhereInstall",
      operation: "irreversible",
      provider: "NixosAnywhereProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "attune-cp-1:comin-readiness")).toMatchObject({
      kind: "CominReadiness",
      provider: "CominProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "attune-cp-1:sops-recipient-rotation")).toMatchObject({
      kind: "SopsRecipientRotation",
      provider: "SopsProvider",
    })
    expect(lifecycle.find((resource) => resource.resourceId === "thinkcentre-network-smoke")).toMatchObject({
      kind: "NetworkSmokeCheck",
      provider: "DeploymentJournal",
    })
  })

  it("runs the native Day 0 graph over Effect Test providers with simulated proof", () => {
    const providers = createPlatformProvidersTest()
    const plan = createHomeDeploymentPlan()
    const graph = createHomePlatformLifecycleGraph()
    const graphIds = new Set(graph.resources.map((resource) => resource.resourceId))

    const results = plan.resources.map((resource) => {
      const runnable = resource.status === "blocked" ? asPlanned(resource) : resource
      const proof = resource.kind === "ManualGate" ||
          resource.kind === "MachineBinding" ||
          resource.kind === "UsbMediaWrite" ||
          resource.kind === "NixosAnywhereInstall"
        ? proofFor(resource)
        : undefined
      return Effect.runSync(runProviderTransition(
        providers,
        runnable,
        proof,
        resource.kind === "UsbMediaWrite" || resource.kind === "NixosAnywhereInstall"
          ? approvalFor(resource, proof)
          : undefined,
      ))
    })

    expect(plan.resources.every((resource) => graphIds.has(resource.id))).toBe(true)
    expect(results.every((result) => result.mode === "Test")).toBe(true)
    expect(results.some((result) => result.resourceId === "attune-cp-1:sops-recipient-rotation")).toBe(true)
    expect(results.filter((result) => result.operation === "irreversible").every((result) => result.mutated)).toBe(true)
    expect(results.every((result) => result.status !== "Blocked")).toBe(true)
  })

  it("returns deterministic next-step output for agents", () => {
    const step = nextAgentStep(createHomeDeploymentPlan().resources)

    expect(step).toMatchObject({
      type: "SafeProbe",
      resourceId: "operator-machine",
      autoRunnable: true,
    })
  })
})
