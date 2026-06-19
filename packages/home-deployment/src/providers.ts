import type { CommandPlan } from "./commands.js"
import type { OperationClassification } from "./lifecycle.js"
import type { PlannedResource } from "./model.js"

export type PlatformProviderMode = "Live" | "DryRun" | "Test"

export interface ProviderEvidence {
  readonly ref: string
  readonly summary: string
}

export interface ProviderTransitionResult {
  readonly provider: string
  readonly mode: PlatformProviderMode
  readonly resourceId: string
  readonly operation: OperationClassification
  readonly mutated: boolean
  readonly command?: readonly string[]
  readonly display?: string
  readonly evidence: readonly ProviderEvidence[]
}

export interface NixProvider {
  readonly mode: PlatformProviderMode
  readonly evaluateHostOutput: (resource: PlannedResource) => ProviderTransitionResult
  readonly buildArtifact: (resource: PlannedResource) => ProviderTransitionResult
}

export interface SshProvider {
  readonly mode: PlatformProviderMode
  readonly probeReachability: (resource: PlannedResource) => ProviderTransitionResult
  readonly runRemoteOperation: (resource: PlannedResource) => ProviderTransitionResult
}

export interface HostActivationProvider {
  readonly mode: PlatformProviderMode
  readonly activateHost: (resource: PlannedResource, proof: ManualProof | undefined) => ProviderTransitionResult
}

export interface TailscaleProvider {
  readonly mode: PlatformProviderMode
  readonly verifyNodeAccess: (resource: PlannedResource) => ProviderTransitionResult
}

export interface K3sProvider {
  readonly mode: PlatformProviderMode
  readonly verifyServerReady: (resource: PlannedResource) => ProviderTransitionResult
  readonly verifyJoinSecretAvailable: (resource: PlannedResource) => ProviderTransitionResult
  readonly readKubeconfig: (resource: PlannedResource) => ProviderTransitionResult
  readonly verifyApiHealthy: (resource: PlannedResource) => ProviderTransitionResult
}

export interface WindowsDesktopProvider {
  readonly mode: PlatformProviderMode
  readonly registerDesktopWorker: (resource: PlannedResource, proof: ManualProof | undefined) => ProviderTransitionResult
}

export interface ManualProof {
  readonly gateId: string
  readonly evidenceRef: string
}

export interface ManualGateProvider {
  readonly mode: PlatformProviderMode
  readonly requireProof: (resource: PlannedResource) => ProviderTransitionResult
  readonly confirmProof: (resource: PlannedResource, proof: ManualProof) => ProviderTransitionResult
}

export interface DeploymentJournal {
  readonly mode: PlatformProviderMode
  readonly record: (result: ProviderTransitionResult) => ProviderTransitionResult
}

export interface PlatformProviders {
  readonly mode: PlatformProviderMode
  readonly nix: NixProvider
  readonly ssh: SshProvider
  readonly hostActivation: HostActivationProvider
  readonly tailscale: TailscaleProvider
  readonly k3s: K3sProvider
  readonly windowsDesktop: WindowsDesktopProvider
  readonly manualGate: ManualGateProvider
  readonly journal: DeploymentJournal
}

const commandFields = (command: CommandPlan | undefined): Pick<ProviderTransitionResult, "command" | "display"> =>
  command === undefined ? {} : { command: command.argv, display: command.display }

const providerResult = (
  provider: string,
  mode: PlatformProviderMode,
  resource: PlannedResource,
  mutated: boolean,
): ProviderTransitionResult => ({
  provider,
  mode,
  resourceId: resource.id,
  operation: resource.destructive === true ? "irreversible" : resource.kind === "ManualGate" ? "safe" : "external",
  mutated,
  ...commandFields(resource.command),
  evidence: [
    {
      ref: `${provider}:${mode}:${resource.id}`,
      summary: `${provider} ${mode} transition for ${resource.id}`,
    },
  ],
})

const assertProof = (resource: PlannedResource, proof: ManualProof | undefined): void => {
  if (proof === undefined) {
    throw new Error(`Resource ${resource.id} requires typed manual proof before provider execution.`)
  }
}

export const createPlatformProvidersDryRun = (): PlatformProviders => createPlatformProviders("DryRun")

export const createPlatformProvidersTest = (): PlatformProviders => createPlatformProviders("Test")

export const createPlatformProvidersLive = (): PlatformProviders => createPlatformProviders("Live")

const createPlatformProviders = (mode: PlatformProviderMode): PlatformProviders => ({
  mode,
  nix: {
    mode,
    evaluateHostOutput: (resource) => providerResult("NixProvider", mode, resource, false),
    buildArtifact: (resource) => providerResult("NixProvider", mode, resource, mode === "Live"),
  },
  ssh: {
    mode,
    probeReachability: (resource) => providerResult("SshProvider", mode, resource, false),
    runRemoteOperation: (resource) => providerResult("SshProvider", mode, resource, mode === "Live"),
  },
  hostActivation: {
    mode,
    activateHost: (resource, proof) => {
      assertProof(resource, proof)
      return providerResult("HostActivationProvider", mode, resource, mode === "Live" || mode === "Test")
    },
  },
  tailscale: {
    mode,
    verifyNodeAccess: (resource) => providerResult("TailscaleProvider", mode, resource, false),
  },
  k3s: {
    mode,
    verifyServerReady: (resource) => providerResult("K3sProvider", mode, resource, false),
    verifyJoinSecretAvailable: (resource) => providerResult("K3sProvider", mode, resource, false),
    readKubeconfig: (resource) => providerResult("K3sProvider", mode, resource, false),
    verifyApiHealthy: (resource) => providerResult("K3sProvider", mode, resource, false),
  },
  windowsDesktop: {
    mode,
    registerDesktopWorker: (resource, proof) => {
      assertProof(resource, proof)
      return providerResult("WindowsDesktopProvider", mode, resource, mode === "Live" || mode === "Test")
    },
  },
  manualGate: {
    mode,
    requireProof: (resource) => providerResult("ManualGateProvider", mode, resource, false),
    confirmProof: (resource) => providerResult("ManualGateProvider", mode, resource, false),
  },
  journal: {
    mode,
    record: (result) => result,
  },
})

export interface ProviderCommandExecutor {
  readonly exec: (id: string, command: string) => Promise<{
    readonly exitCode: number
    readonly stdout?: string
    readonly stderr?: string
  }>
}

export const executeLiveProviderTransition = async (
  resource: PlannedResource,
  executor: ProviderCommandExecutor,
): Promise<ProviderTransitionResult & { readonly exitCode?: number; readonly stdout?: string; readonly stderr?: string }> => {
  const base = providerResult(providerNameForResource(resource), "Live", resource, resource.command !== undefined)
  if (resource.command === undefined) {
    return base
  }
  const output = await executor.exec(resource.id.replaceAll(":", "-"), resource.command.display)
  if (output.exitCode !== 0) {
    throw new Error(`Provider ${base.provider} failed ${resource.id} with exit ${output.exitCode}\n${output.stderr ?? output.stdout ?? ""}`)
  }
  return {
    ...base,
    exitCode: output.exitCode,
    ...(output.stdout === undefined ? {} : { stdout: output.stdout }),
    ...(output.stderr === undefined ? {} : { stderr: output.stderr }),
  }
}

export const providerNameForResource = (resource: PlannedResource): string => {
  switch (resource.kind) {
    case "ManualGate":
      return "ManualGateProvider"
    case "NixBuild":
      return "NixProvider"
    case "NixosAnywhereInstall":
      return "HostActivationProvider"
    case "TailscaleReadiness":
      return "TailscaleProvider"
    case "K3sBootstrap":
    case "K3sJoin":
    case "K3sReadiness":
    case "Kubeconfig":
      return "K3sProvider"
    case "KubernetesGraph":
      return "KubernetesProvider"
    case "WindowsDesktopGuard":
      return "WindowsDesktopProvider"
  }
}
