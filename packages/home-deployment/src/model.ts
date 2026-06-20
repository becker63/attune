import { Schema } from "effect"

import { commandPlan, shellQuote, type CommandPlan } from "./commands.js"

export const ThinkCentreRole = Schema.Literals(["k3s-init", "k3s-join"])
export type ThinkCentreRole = typeof ThinkCentreRole.Type

export const ManualGateStatus = Schema.Literals(["waiting", "confirmed"])
export type ManualGateStatus = typeof ManualGateStatus.Type

export const ResourceStatus = Schema.Literals(["blocked", "ready", "planned"])
export type ResourceStatus = typeof ResourceStatus.Type

export const DeploymentPhase = Schema.Literals([
  "artifacts",
  "secrets",
  "hosts",
  "tailscale",
  "k3s",
  "kubeconfig",
  "platform",
  "desktop",
  "smoke",
])
export type DeploymentPhase = typeof DeploymentPhase.Type

export const ThinkCentreHost = Schema.Struct({
  hostname: Schema.String,
  role: ThinkCentreRole,
  nixosConfiguration: Schema.String,
  installerSshTarget: Schema.String,
  postInstallSshTarget: Schema.String,
  expectedDisk: Schema.Struct({
    device: Schema.String,
    serial: Schema.optional(Schema.String),
  }),
})
export type ThinkCentreHost = typeof ThinkCentreHost.Type

export const HomeDeploymentConfig = Schema.Struct({
  name: Schema.String,
  hostFlakeUri: Schema.String,
  rootFlakeUri: Schema.String,
  hosts: Schema.NonEmptyArray(ThinkCentreHost),
})
export type HomeDeploymentConfig = typeof HomeDeploymentConfig.Type

export interface ManualGate {
  readonly id: string
  readonly title: string
  readonly prompt: string
  readonly host?: string
  readonly status: ManualGateStatus
  readonly command?: CommandPlan
}

export interface PlannedResource {
  readonly id: string
  readonly phase: DeploymentPhase
  readonly kind:
    | "ManualGate"
    | "NixBuild"
    | "NixosAnywhereInstall"
    | "TailscaleReadiness"
    | "K3sBootstrap"
    | "K3sJoin"
    | "K3sReadiness"
    | "Kubeconfig"
    | "KubernetesGraph"
    | "WindowsDesktopGuard"
  readonly status: ResourceStatus
  readonly dependsOn: readonly string[]
  readonly summary: string
  readonly command?: CommandPlan
  readonly blockedReason?: string
  readonly destructive?: boolean
}

export interface HomeDeploymentPlan {
  readonly name: string
  readonly resources: readonly PlannedResource[]
}

export const defaultHomeDeploymentConfig = (): HomeDeploymentConfig => ({
  name: "attune-home",
  hostFlakeUri: "./nix/hosts",
  rootFlakeUri: ".",
  hosts: [
    {
      hostname: "attune-cp-1",
      role: "k3s-init",
      nixosConfiguration: "attune-cp-1",
      installerSshTarget: "root@attune-installer-cp-1.local",
      postInstallSshTarget: "attune@attune-cp-1",
      expectedDisk: {
        device: "/dev/disk/by-id/REPLACE_ME_ATTUNE_CP_1",
      },
    },
    {
      hostname: "attune-cp-2",
      role: "k3s-join",
      nixosConfiguration: "attune-cp-2",
      installerSshTarget: "root@attune-installer-cp-2.local",
      postInstallSshTarget: "attune@attune-cp-2",
      expectedDisk: {
        device: "/dev/disk/by-id/REPLACE_ME_ATTUNE_CP_2",
      },
    },
    {
      hostname: "attune-cp-3",
      role: "k3s-join",
      nixosConfiguration: "attune-cp-3",
      installerSshTarget: "root@attune-installer-cp-3.local",
      postInstallSshTarget: "attune@attune-cp-3",
      expectedDisk: {
        device: "/dev/disk/by-id/REPLACE_ME_ATTUNE_CP_3",
      },
    },
  ],
})

export interface GateConfirmationState {
  readonly confirmedGateIds: ReadonlySet<string>
  readonly completedResourceIds?: ReadonlySet<string>
  readonly failedResourceIds?: ReadonlySet<string>
}

export const emptyGateState: GateConfirmationState = {
  confirmedGateIds: new Set(),
}

const gateStatus = (state: GateConfirmationState, id: string): ManualGateStatus =>
  state.confirmedGateIds.has(id) ? "confirmed" : "waiting"

const blockedUnlessConfirmed = (
  state: GateConfirmationState,
  gateIds: readonly string[],
): Pick<PlannedResource, "status" | "blockedReason"> => {
  const missing = gateIds.filter((id) => !state.confirmedGateIds.has(id))

  if (missing.length > 0) {
    return {
      status: "blocked",
      blockedReason: `Waiting for manual gate(s): ${missing.join(", ")}`,
    }
  }

  return { status: "planned" }
}

const isConfirmed = (state: GateConfirmationState, id: string): boolean => state.confirmedGateIds.has(id)

const isCompleted = (state: GateConfirmationState, id: string): boolean => state.completedResourceIds?.has(id) ?? false

const isFailed = (state: GateConfirmationState, id: string): boolean => state.failedResourceIds?.has(id) ?? false

const dependenciesSatisfied = (state: GateConfirmationState, ids: readonly string[]): boolean =>
  ids.every((id) => isConfirmed(state, id) || isCompleted(state, id))

const blockedUnlessSatisfied = (
  state: GateConfirmationState,
  dependencyIds: readonly string[],
): Pick<PlannedResource, "status" | "blockedReason"> => {
  const missing = dependencyIds.filter((id) => !isConfirmed(state, id) && !isCompleted(state, id))

  if (missing.length > 0) {
    return {
      status: "blocked",
      blockedReason: `Waiting for dependency resource(s): ${missing.join(", ")}`,
    }
  }

  return { status: "planned" }
}

const nixosAnywhereCommand = (config: HomeDeploymentConfig, host: ThinkCentreHost): CommandPlan =>
  commandPlan([
    "nixos-anywhere",
    "--flake",
    `${config.hostFlakeUri}#${host.nixosConfiguration}`,
    host.installerSshTarget,
  ])

const sshProbeCommand = (target: string, remoteCommand: string): CommandPlan =>
  commandPlan(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", target, remoteCommand])

const installerSshProbeCommand = (host: ThinkCentreHost): CommandPlan => sshProbeCommand(host.installerSshTarget, "true")

const diskProbeCommand = (host: ThinkCentreHost): CommandPlan => {
  const disk = shellQuote(host.expectedDisk.device)
  const serialCheck =
    host.expectedDisk.serial === undefined
      ? ""
      : ` && test "$(udevadm info --query=property --name=${disk} | sed -n 's/^ID_SERIAL=//p')" = ${shellQuote(host.expectedDisk.serial)}`

  return sshProbeCommand(
    host.installerSshTarget,
    `test -e ${disk}${serialCheck} && lsblk -o NAME,SIZE,MODEL,SERIAL,TYPE,MOUNTPOINTS ${disk}`,
  )
}

const tailscaleReadinessCommand = (host: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    host.postInstallSshTarget,
    "systemctl is-active --quiet tailscaled && tailscale status --json >/dev/null",
  )

const k3sServiceCommand = (host: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(host.postInstallSshTarget, "sudo systemctl is-active --quiet attune-k3s-server")

const k3sReadinessCommand = (host: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    host.postInstallSshTarget,
    `sudo k3s kubectl get node ${shellQuote(host.hostname)} -o wide`,
  )

export const manualGatesForHost = (host: ThinkCentreHost, state: GateConfirmationState): readonly ManualGate[] => [
  {
    id: `${host.hostname}:usb-booted`,
    title: `${host.hostname} booted from installer USB`,
    prompt: `Boot ${host.hostname} from the Attune NixOS installer USB and wait for SSH at ${host.installerSshTarget}.`,
    host: host.hostname,
    status: gateStatus(state, `${host.hostname}:usb-booted`),
    command: installerSshProbeCommand(host),
  },
  {
    id: `${host.hostname}:disk-wipe-confirmed`,
    title: `${host.hostname} destructive disk install confirmed`,
    prompt: `Confirm ${host.hostname} may be wiped at ${host.expectedDisk.device}.`,
    host: host.hostname,
    status: gateStatus(state, `${host.hostname}:disk-wipe-confirmed`),
    command: diskProbeCommand(host),
  },
]

export const createHomeDeploymentPlan = (
  input: HomeDeploymentConfig = defaultHomeDeploymentConfig(),
  state: GateConfirmationState = emptyGateState,
): HomeDeploymentPlan => {
  const config = Schema.decodeUnknownSync(HomeDeploymentConfig)(input)
  const resources: PlannedResource[] = [
    ...initialDeploymentResources(config, state),
  ]

  for (const host of config.hosts) {
    resources.push(...hostDeploymentResources(config, host, state))
  }

  resources.push(...finalDeploymentResources(config, state))

  return {
    name: config.name,
    resources,
  }
}

const initialDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const tailscaleGateConfirmed = gateStatus(state, "tailscale-auth-ready") === "confirmed"
  const k3sTokenGateConfirmed = gateStatus(state, "k3s-token-ready") === "confirmed"

  return [
    {
      id: "installer-image",
      phase: "artifacts",
      kind: "NixBuild",
      status: isCompleted(state, "installer-image") ? "ready" : "planned",
      dependsOn: [],
      summary: "Build or fetch the Attune NixOS installer image used for ThinkCentre bootstrap.",
      command: commandPlan([
        "nix",
        "build",
        `${config.hostFlakeUri}#nixosConfigurations.attune-installer.config.system.build.isoImage`,
      ]),
    },
    {
      id: "windows-desktop-guard-artifact",
      phase: "artifacts",
      kind: "NixBuild",
      status: isCompleted(state, "windows-desktop-guard-artifact") ? "ready" : "planned",
      dependsOn: [],
      summary: "Build the Nix-generated Windows desktop guard artifact and Scheduled Task scripts.",
      command: commandPlan(["nix", "build", `${config.rootFlakeUri}#windows-desktop-guard`]),
    },
    {
      id: "tailscale-auth-ready",
      phase: "secrets",
      kind: "ManualGate",
      status: tailscaleGateConfirmed ? "ready" : "blocked",
      dependsOn: [],
      summary: "Provide a reusable or pre-approved Tailscale auth path outside git for the ThinkCentre installs.",
      ...(tailscaleGateConfirmed
        ? {}
        : {
            blockedReason:
              "Tailscale auth key or interactive auth plan has not been recorded in this local plan state.",
          }),
    },
    {
      id: "k3s-token-ready",
      phase: "secrets",
      kind: "ManualGate",
      status: k3sTokenGateConfirmed ? "ready" : "blocked",
      dependsOn: [],
      summary: "Provide the K3s cluster token outside git so cp-2 and cp-3 can join cp-1.",
      ...(k3sTokenGateConfirmed
        ? {}
        : {
            blockedReason: "K3s token secret path has not been recorded in this local plan state.",
      }),
    },
  ]
}

const globalGateIds = ["tailscale-auth-ready", "k3s-token-ready"] as const

const hostDeploymentResources = (
  config: HomeDeploymentConfig,
  host: ThinkCentreHost,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const gates = manualGatesForHost(host, state)
  const installGateIds = [...globalGateIds, ...gates.map((gate) => gate.id)]
  const installState = blockedUnlessConfirmed(state, installGateIds)
  const k3sResource = k3sDeploymentResource(host, state)
  const k3sReadinessDependency =
    host.role === "k3s-init"
      ? `${host.hostname}:k3s-init`
      : `${host.hostname}:k3s-join`

  return [
    ...gates.map(gateResource),
    {
      id: `${host.hostname}:nixos-anywhere-install`,
      phase: "hosts",
      kind: "NixosAnywhereInstall",
      dependsOn: ["installer-image", ...installGateIds],
      summary: `Install ${host.hostname} as ${host.role} with NixOS-anywhere.`,
      command: nixosAnywhereCommand(config, host),
      destructive: true,
      ...(isCompleted(state, `${host.hostname}:nixos-anywhere-install`)
        ? { status: "ready" as const }
        : installState),
    },
    tailscaleReadinessResource(host, state),
    k3sResource,
    {
      id: `${host.hostname}:k3s-readiness`,
      phase: "k3s",
      kind: "K3sReadiness",
      dependsOn: [k3sReadinessDependency],
      summary: `Verify K3s service health and node labels for ${host.hostname}.`,
      command: k3sReadinessCommand(host),
      ...(isCompleted(state, `${host.hostname}:k3s-readiness`)
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, [k3sReadinessDependency])),
    },
  ]
}

const gateResource = (gate: ManualGate): PlannedResource => {
  const resource: PlannedResource = {
    id: gate.id,
    phase: "hosts",
    kind: "ManualGate",
    status: gate.status === "confirmed" ? "ready" : "blocked",
    dependsOn: ["installer-image"],
    summary: gate.prompt,
    ...(gate.command === undefined ? {} : { command: gate.command }),
  }

  return gate.status === "waiting"
    ? {
        ...resource,
        blockedReason: gate.title,
      }
    : resource
}

const tailscaleReadinessResource = (
  host: ThinkCentreHost,
  state: GateConfirmationState,
): PlannedResource => {
  const tailscaleDependencies = [`${host.hostname}:nixos-anywhere-install`]

  return {
      id: `${host.hostname}:tailscale-readiness`,
      phase: "tailscale",
      kind: "TailscaleReadiness",
      dependsOn: tailscaleDependencies,
      summary: `Verify host-level Tailscale and SSH readiness for ${host.hostname} at ${host.postInstallSshTarget}.`,
      command: tailscaleReadinessCommand(host),
      ...(isCompleted(state, `${host.hostname}:tailscale-readiness`)
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, tailscaleDependencies)),
    }
}

const k3sDeploymentResource = (
  host: ThinkCentreHost,
  state: GateConfirmationState,
): PlannedResource =>
  host.role === "k3s-init"
    ? k3sInitResource(host, state)
    : k3sJoinResource(host, state)

const k3sInitResource = (
  host: ThinkCentreHost,
  state: GateConfirmationState,
): PlannedResource => {
  const k3sInitDependencies = [`${host.hostname}:tailscale-readiness`]

  return {
      id: `${host.hostname}:k3s-init`,
      phase: "k3s",
      kind: "K3sBootstrap",
      dependsOn: k3sInitDependencies,
      summary: `Initialize the K3s embedded-etcd control plane on ${host.hostname}.`,
      command: k3sServiceCommand(host),
      ...(isCompleted(state, `${host.hostname}:k3s-init`)
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, k3sInitDependencies)),
  }
}

const k3sJoinResource = (
  host: ThinkCentreHost,
  state: GateConfirmationState,
): PlannedResource => {
  const k3sJoinDependencies = [`${host.hostname}:tailscale-readiness`, "attune-cp-1:k3s-init"]

  return {
      id: `${host.hostname}:k3s-join`,
      phase: "k3s",
      kind: "K3sJoin",
      dependsOn: k3sJoinDependencies,
      summary: `Join ${host.hostname} to the K3s embedded-etcd control plane.`,
      command: k3sServiceCommand(host),
      ...(isCompleted(state, `${host.hostname}:k3s-join`)
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, k3sJoinDependencies)),
  }
}

const finalDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const hostReadinessIds = config.hosts.map(
    (host: ThinkCentreHost) => `${host.hostname}:k3s-readiness`,
  )

  return [
    {
      id: "home-kubeconfig",
      phase: "kubeconfig",
      kind: "Kubeconfig",
      dependsOn: ["attune-cp-1:k3s-readiness"],
      summary: "Fetch and merge the home cluster kubeconfig over Tailscale.",
      command: commandPlan(["ssh", "attune@attune-cp-1", "sudo", "cat", "/etc/rancher/k3s/k3s.yaml"]),
      ...(isCompleted(state, "home-kubeconfig")
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, ["attune-cp-1:k3s-readiness"])),
    },
    {
      id: "attune-platform-kubernetes-graph",
      phase: "platform",
      kind: "KubernetesGraph",
      dependsOn: ["home-kubeconfig", ...hostReadinessIds],
      summary: "Apply Attune CRDs and local compute stack with the typed Effect/Alchemy Kubernetes provider.",
      command: commandPlan(["node", "scripts/codex/pnpm.mjs", "exec", "nx", "run", "platform-alchemy-k8s:test"]),
      ...(isCompleted(state, "attune-platform-kubernetes-graph")
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, ["home-kubeconfig", ...hostReadinessIds])),
    },
    {
      id: "desktop-gpu-guard",
      phase: "desktop",
      kind: "WindowsDesktopGuard",
      dependsOn: ["windows-desktop-guard-artifact", "attune-platform-kubernetes-graph"],
      summary: "Install or update the Nix-generated Windows desktop guard Scheduled Task and worker launcher.",
      command: commandPlan([
        "powershell.exe",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ".\\windows\\Install-AttuneDesktopGuardTask.ps1",
        "-Force",
      ]),
      ...(isCompleted(state, "desktop-gpu-guard")
        ? { status: "ready" as const }
        : blockedUnlessSatisfied(state, ["windows-desktop-guard-artifact", "attune-platform-kubernetes-graph"])),
    },
  ]
}
