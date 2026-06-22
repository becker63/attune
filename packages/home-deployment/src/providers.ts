import { spawnSync } from "node:child_process"

import { Context, Effect, Layer, Schema } from "effect"

import type { CommandPlan, PlannedResource } from "./model.ts"

export const PlatformProviderMode = Schema.Literals(["Live", "DryRun", "Test"])
export type PlatformProviderMode = typeof PlatformProviderMode.Type

export const ProviderTransitionStatus = Schema.Literals(["Observed", "Planned", "Applied", "Blocked"])
export type ProviderTransitionStatus = typeof ProviderTransitionStatus.Type

export const ProviderEvidence = Schema.Struct({
  ref: Schema.String,
  summary: Schema.String,
  secret: Schema.Boolean,
})
export type ProviderEvidence = typeof ProviderEvidence.Type

export const ProviderTransitionResult = Schema.Struct({
  provider: Schema.String,
  mode: PlatformProviderMode,
  resourceId: Schema.String,
  operation: Schema.Literals(["safe", "external", "irreversible"]),
  status: ProviderTransitionStatus,
  mutated: Schema.Boolean,
  command: Schema.optional(Schema.Array(Schema.String)),
  display: Schema.optional(Schema.String),
  evidence: Schema.Array(ProviderEvidence),
  blockers: Schema.Array(Schema.String),
})
export type ProviderTransitionResult = typeof ProviderTransitionResult.Type

export interface ManualProof {
  readonly gateId: string
  readonly evidenceRef: string
  readonly confirmedAt?: string
}

export interface DestructiveApproval {
  readonly approvalId: string
  readonly gateId: string
  readonly resourceId: string
  readonly approvedBy: string
  readonly approvedAt: string
  readonly proofRef: string
  readonly expiresAt?: string
}

export type ProviderEffect = Effect.Effect<ProviderTransitionResult>

export interface OperatorMachineProvider {
  readonly mode: PlatformProviderMode
  readonly observeMachine: (resource: PlannedResource) => ProviderEffect
}

export interface NixProvider {
  readonly mode: PlatformProviderMode
  readonly verifyX86Builder: (resource: PlannedResource) => ProviderEffect
  readonly evaluateHostOutput: (resource: PlannedResource) => ProviderEffect
  readonly buildArtifact: (resource: PlannedResource) => ProviderEffect
}

export interface SopsProvider {
  readonly mode: PlatformProviderMode
  readonly verifyOperatorKey: (resource: PlannedResource) => ProviderEffect
  readonly verifyRecipientMetadata: (resource: PlannedResource) => ProviderEffect
  readonly verifySecretSet: (resource: PlannedResource) => ProviderEffect
  readonly stageExtraFiles: (resource: PlannedResource) => ProviderEffect
  readonly rotateRecipients: (resource: PlannedResource) => ProviderEffect
}

export interface LanDiscoveryProvider {
  readonly mode: PlatformProviderMode
  readonly scan: (resource: PlannedResource) => ProviderEffect
}

export interface MachineInventoryProvider {
  readonly mode: PlatformProviderMode
  readonly recordInventory: (resource: PlannedResource) => ProviderEffect
  readonly bindMachine: (resource: PlannedResource, proof: ManualProof | undefined) => ProviderEffect
}

export interface UsbMediaProvider {
  readonly mode: PlatformProviderMode
  readonly writeInstaller: (
    resource: PlannedResource,
    proof: ManualProof | undefined,
    approval: DestructiveApproval | undefined,
  ) => ProviderEffect
}

export interface DiskoProvider {
  readonly mode: PlatformProviderMode
  readonly probeDiskIdentity: (resource: PlannedResource) => ProviderEffect
  readonly validateLayout: (resource: PlannedResource) => ProviderEffect
}

export interface NixosAnywhereProvider {
  readonly mode: PlatformProviderMode
  readonly stageExtraFiles: (resource: PlannedResource) => ProviderEffect
  readonly installHost: (
    resource: PlannedResource,
    proof: ManualProof | undefined,
    approval: DestructiveApproval | undefined,
  ) => ProviderEffect
}

export interface SshProvider {
  readonly mode: PlatformProviderMode
  readonly probeReachability: (resource: PlannedResource) => ProviderEffect
  readonly runRemoteOperation: (resource: PlannedResource) => ProviderEffect
}

export interface TailscaleProvider {
  readonly mode: PlatformProviderMode
  readonly prepareOperator: (resource: PlannedResource) => ProviderEffect
  readonly prepareAuthMaterial: (resource: PlannedResource) => ProviderEffect
  readonly verifyNodeAccess: (resource: PlannedResource) => ProviderEffect
}

export interface CominProvider {
  readonly mode: PlatformProviderMode
  readonly verifyConvergence: (resource: PlannedResource) => ProviderEffect
}

export interface ManualGateProvider {
  readonly mode: PlatformProviderMode
  readonly requireProof: (resource: PlannedResource) => ProviderEffect
  readonly confirmProof: (resource: PlannedResource, proof: ManualProof) => ProviderEffect
}

export interface DeploymentJournal {
  readonly mode: PlatformProviderMode
  readonly record: (result: ProviderTransitionResult) => ProviderTransitionResult
  readonly runSmoke: (resource: PlannedResource) => ProviderEffect
}

export interface PlatformProviders {
  readonly mode: PlatformProviderMode
  readonly operatorMachine: OperatorMachineProvider
  readonly nix: NixProvider
  readonly sops: SopsProvider
  readonly lanDiscovery: LanDiscoveryProvider
  readonly machineInventory: MachineInventoryProvider
  readonly usbMedia: UsbMediaProvider
  readonly disko: DiskoProvider
  readonly nixosAnywhere: NixosAnywhereProvider
  readonly ssh: SshProvider
  readonly tailscale: TailscaleProvider
  readonly comin: CominProvider
  readonly manualGate: ManualGateProvider
  readonly journal: DeploymentJournal
}

export class PlatformProviderServices extends Context.Service<
  PlatformProviderServices,
  PlatformProviders
>()("@attune/home-deployment/PlatformProviderServices") {}

const providerEvidence = (ref: string, summary: string, secret = false): ProviderEvidence =>
  Schema.decodeUnknownSync(ProviderEvidence)({ ref, summary, secret })

const commandFields = (
  resource: PlannedResource,
  commandPlan: CommandPlan | undefined = resource.command,
): Pick<ProviderTransitionResult, "command" | "display"> =>
  commandPlan === undefined ? {} : { command: commandPlan.argv, display: commandPlan.display }

const resourceCarriesSecrets = (resource: PlannedResource): boolean =>
  resource.secretRefs.length > 0 || resource.evidenceRequirements.some((requirement) => requirement.secret)

const providerResult = (
  provider: string,
  mode: PlatformProviderMode,
  resource: PlannedResource,
  status: ProviderTransitionStatus,
  mutated: boolean,
  evidence: readonly ProviderEvidence[] = [
    providerEvidence(`${provider}:${mode}:${resource.id}`, `${provider} ${mode} transition for ${resource.id}`),
  ],
  blockers: readonly string[] = [],
  commandPlan: CommandPlan | undefined = resource.command,
): ProviderTransitionResult =>
  Schema.decodeUnknownSync(ProviderTransitionResult)({
    provider,
    mode,
    resourceId: resource.id,
    operation: resource.operation,
    status,
    mutated,
    ...commandFields(resource, commandPlan),
    evidence,
    blockers,
  })

const blockedResourceResult = (
  provider: string,
  mode: PlatformProviderMode,
  resource: PlannedResource,
  reason = resource.blockedReason ?? `Resource ${resource.id} is blocked.`,
): ProviderTransitionResult => providerResult(provider, mode, resource, "Blocked", false, [], [reason])

const simulatedResult = (
  provider: string,
  mode: PlatformProviderMode,
  resource: PlannedResource,
  wouldMutate: boolean,
): ProviderEffect =>
  Effect.succeed(providerResult(
    provider,
    mode,
    resource,
    mode === "Test" ? wouldMutate ? "Applied" : "Observed" : "Planned",
    mode === "Test" && wouldMutate,
  ))

const observedEvidenceResult = (provider: string, mode: PlatformProviderMode, resource: PlannedResource): ProviderEffect =>
  Effect.succeed(providerResult(provider, mode, resource, mode === "DryRun" ? "Planned" : "Observed", false))

const expectedProofGateId = (resource: PlannedResource): string | undefined => {
  const hostname = resource.id.split(":")[0]
  switch (resource.kind) {
    case "MachineBinding":
      return hostname === undefined ? undefined : `${hostname}:lan-binding-confirmed`
    case "UsbMediaWrite":
      return "usb-media-write-approved"
    case "NixosAnywhereInstall":
      return hostname === undefined ? undefined : `${hostname}:disk-wipe-confirmed`
    case "ManualGate":
      return resource.id
    default:
      return undefined
  }
}

const assertProof = (resource: PlannedResource, proof: ManualProof | undefined): void => {
  if (proof === undefined) {
    throw new Error(`Resource ${resource.id} requires typed manual proof before provider execution.`)
  }
  const expectedGateId = expectedProofGateId(resource)
  if (expectedGateId !== undefined && proof.gateId !== expectedGateId) {
    throw new Error(`Resource ${resource.id} requires proof for gate ${expectedGateId}; received ${proof.gateId}.`)
  }
  if (proof.evidenceRef.length === 0) {
    throw new Error(`Resource ${resource.id} requires a non-empty proof evidence reference.`)
  }
}

const parseTime = (label: string, value: string): number => {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    throw new Error(`Destructive approval ${label} must be an ISO timestamp.`)
  }
  return parsed
}

const assertDestructiveApproval = (
  resource: PlannedResource,
  proof: ManualProof | undefined,
  approval: DestructiveApproval | undefined,
): void => {
  if (approval === undefined) {
    throw new Error(`Resource ${resource.id} requires current destructive approval before provider execution.`)
  }
  if (proof === undefined) {
    throw new Error(`Resource ${resource.id} requires typed manual proof before destructive approval can be used.`)
  }
  const expectedGateId = expectedProofGateId(resource)
  if (expectedGateId !== undefined && approval.gateId !== expectedGateId) {
    throw new Error(`Resource ${resource.id} requires approval for gate ${expectedGateId}; received ${approval.gateId}.`)
  }
  if (approval.resourceId !== resource.id) {
    throw new Error(`Resource ${resource.id} requires approval for the exact resource; received ${approval.resourceId}.`)
  }
  if (approval.proofRef !== proof.evidenceRef) {
    throw new Error(`Resource ${resource.id} requires approval tied to proof ${proof.evidenceRef}; received ${approval.proofRef}.`)
  }
  const approvedAt = parseTime("approvedAt", approval.approvedAt)
  if (proof.confirmedAt !== undefined && approvedAt < parseTime("proof confirmedAt", proof.confirmedAt)) {
    throw new Error(`Resource ${resource.id} has stale destructive approval predating the current proof.`)
  }
  if (approval.expiresAt !== undefined && parseTime("expiresAt", approval.expiresAt) <= Date.now()) {
    throw new Error(`Resource ${resource.id} has stale destructive approval ${approval.approvalId}.`)
  }
}

const commandUnavailable = (
  provider: string,
  mode: PlatformProviderMode,
  resource: PlannedResource,
  reason = "Resource has no executable command; provide manual evidence through the Alchemy resource.",
  commandPlan: CommandPlan | undefined = resource.command,
): ProviderTransitionResult => providerResult(provider, mode, resource, "Blocked", false, [], [reason], commandPlan)

const redactCommandOutput = (provider: string, output: string): string => {
  return output
    .replace(/"AuthURL"\s*:\s*"[^"]*"/g, "\"AuthURL\":\"<redacted-login-url>\"")
    .replace(/https:\/\/login\.tailscale\.com\/[^\s"']+/g, "<redacted-login-url>")
    .replace(/nodekey:[A-Za-z0-9]+/g, "nodekey:<redacted>")
    .replace(/"PublicKey"\s*:\s*"[^"]*"/g, "\"PublicKey\":\"<redacted>\"")
    .replace(/"access_token"\s*:\s*"[^"]*"/g, "\"access_token\":\"<redacted>\"")
    .replace(/tskey-[A-Za-z0-9_-]+/g, "<redacted-tailscale-auth-key>")
    .replace(/auth-key:\s*"[^"]+"/gi, "auth-key: \"<redacted>\"")
    .replace(new RegExp(`${provider}:secret:[^\\s"']+`, "g"), `${provider}:secret:<redacted>`)
}

const runLiveCommand = (
  provider: string,
  resource: PlannedResource,
  mutate: boolean,
  commandPlan = resource.command,
): ProviderEffect =>
  Effect.sync(() => {
    if (commandPlan === undefined) {
      return commandUnavailable(provider, "Live", resource, undefined, commandPlan)
    }

    const [command, ...args] = commandPlan.argv
    if (command === undefined) {
      return commandUnavailable(provider, "Live", resource, "Command argv is empty.", commandPlan)
    }

    const startedAt = new Date().toISOString()
    const result = spawnSync(command, args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    })
    const completedAt = new Date().toISOString()
    const stdout = redactCommandOutput(provider, result.stdout.trim())
    const stderr = redactCommandOutput(provider, result.stderr.trim())
    const exitCode = result.status ?? 1
    const secretEvidence = resourceCarriesSecrets(resource)
    const blocked = exitCode === 0 ? [] : [`${command} exited ${exitCode}${stderr.length > 0 ? `: ${stderr}` : ""}`]

    return providerResult(
      provider,
      "Live",
      resource,
      exitCode === 0 ? (mutate ? "Applied" : "Observed") : "Blocked",
      mutate && exitCode === 0,
      [
        providerEvidence(`${provider}:live:${resource.id}:command`, commandPlan.display, secretEvidence),
        providerEvidence(`${provider}:live:${resource.id}:timing`, `${startedAt}..${completedAt}`),
        providerEvidence(`${provider}:live:${resource.id}:stdout`, stdout.length === 0 ? "stdout empty" : stdout.slice(0, 512), secretEvidence),
      ],
      blocked,
      commandPlan,
    )
  })

const observeOrSimulate = (
  mode: PlatformProviderMode,
  provider: string,
  resource: PlannedResource,
  mutateLive = false,
): ProviderEffect => {
  if (resource.status === "ready") {
    return observedEvidenceResult(provider, mode, resource)
  }
  if (resource.status === "blocked") {
    return Effect.succeed(blockedResourceResult(provider, mode, resource))
  }

  return mode === "Live" ? runLiveCommand(provider, resource, mutateLive) : simulatedResult(provider, mode, resource, mutateLive)
}

const observeExistingLive = (
  mode: PlatformProviderMode,
  provider: string,
  resource: PlannedResource,
): Effect.Effect<ProviderTransitionResult | undefined> => {
  if (mode !== "Live" || resource.observeCommand === undefined) {
    return Effect.succeed(undefined)
  }

  return runLiveCommand(provider, resource, false, resource.observeCommand).pipe(
    Effect.map((result) => result.status === "Observed" ? result : undefined),
  )
}

const observeThenApply = (
  mode: PlatformProviderMode,
  provider: string,
  resource: PlannedResource,
): ProviderEffect => {
  if (resource.status === "ready") {
    return observedEvidenceResult(provider, mode, resource)
  }
  if (resource.status === "blocked") {
    return Effect.succeed(blockedResourceResult(provider, mode, resource))
  }

  return observeExistingLive(mode, provider, resource).pipe(
    Effect.flatMap((observed) =>
      observed !== undefined ? Effect.succeed(observed) : observeOrSimulate(mode, provider, resource, true)),
  )
}

const requireDestructiveProofThen = (
  mode: PlatformProviderMode,
  provider: string,
  resource: PlannedResource,
  proof: ManualProof | undefined,
  approval: DestructiveApproval | undefined,
): ProviderEffect => {
  if (resource.status === "ready") {
    return observedEvidenceResult(provider, mode, resource)
  }
  if (resource.status === "blocked") {
    return Effect.succeed(blockedResourceResult(provider, mode, resource))
  }

  return observeExistingLive(mode, provider, resource).pipe(
    Effect.flatMap((observed) =>
      observed !== undefined
        ? Effect.succeed(observed)
        : Effect.sync(() => assertProof(resource, proof)).pipe(
            Effect.tap(() => Effect.sync(() => assertDestructiveApproval(resource, proof, approval))),
            Effect.flatMap(() => observeOrSimulate(mode, provider, resource, true)),
          )),
  )
}

const requireProofRecordOnly = (
  mode: PlatformProviderMode,
  provider: string,
  resource: PlannedResource,
  proof: ManualProof | undefined,
): ProviderEffect =>
  resource.status === "ready"
    ? observedEvidenceResult(provider, mode, resource)
    : resource.status === "blocked"
      ? Effect.succeed(blockedResourceResult(provider, mode, resource))
      : Effect.sync(() => assertProof(resource, proof)).pipe(
          Effect.flatMap(() => observedEvidenceResult(provider, mode, resource)),
        )

export const createPlatformProvidersDryRun = (): PlatformProviders => createPlatformProviders("DryRun")

export const createPlatformProvidersTest = (): PlatformProviders => createPlatformProviders("Test")

export const createPlatformProvidersLive = (): PlatformProviders => createPlatformProviders("Live")

const createPlatformProviders = (mode: PlatformProviderMode): PlatformProviders => ({
  mode,
  operatorMachine: {
    mode,
    observeMachine: (resource) => observeOrSimulate(mode, "OperatorMachineProvider", resource),
  },
  nix: {
    mode,
    verifyX86Builder: (resource) => observeOrSimulate(mode, "NixProvider", resource),
    evaluateHostOutput: (resource) => observeOrSimulate(mode, "NixProvider", resource),
    buildArtifact: (resource) => observeOrSimulate(mode, "NixProvider", resource, true),
  },
  sops: {
    mode,
    verifyOperatorKey: (resource) => observeOrSimulate(mode, "SopsProvider", resource),
    verifyRecipientMetadata: (resource) => observeOrSimulate(mode, "SopsProvider", resource),
    verifySecretSet: (resource) => observeOrSimulate(mode, "SopsProvider", resource),
    stageExtraFiles: (resource) => observeThenApply(mode, "SopsProvider", resource),
    rotateRecipients: (resource) => observeThenApply(mode, "SopsProvider", resource),
  },
  lanDiscovery: {
    mode,
    scan: (resource) => observeOrSimulate(mode, "LanDiscoveryProvider", resource),
  },
  machineInventory: {
    mode,
    recordInventory: (resource) =>
      resource.command === undefined
        ? observedEvidenceResult("MachineInventoryProvider", mode, resource)
        : observeOrSimulate(mode, "MachineInventoryProvider", resource),
    bindMachine: (resource, proof) => requireProofRecordOnly(mode, "MachineInventoryProvider", resource, proof),
  },
  usbMedia: {
    mode,
    writeInstaller: (resource, proof, approval) =>
      requireDestructiveProofThen(mode, "UsbMediaProvider", resource, proof, approval),
  },
  disko: {
    mode,
    probeDiskIdentity: (resource) => observeOrSimulate(mode, "DiskoProvider", resource),
    validateLayout: (resource) => observeOrSimulate(mode, "DiskoProvider", resource),
  },
  nixosAnywhere: {
    mode,
    stageExtraFiles: (resource) => observeThenApply(mode, "NixosAnywhereProvider", resource),
    installHost: (resource, proof, approval) =>
      requireDestructiveProofThen(mode, "NixosAnywhereProvider", resource, proof, approval),
  },
  ssh: {
    mode,
    probeReachability: (resource) => observeOrSimulate(mode, "SshProvider", resource),
    runRemoteOperation: (resource) => observeThenApply(mode, "SshProvider", resource),
  },
  tailscale: {
    mode,
    prepareOperator: (resource) => observeOrSimulate(mode, "TailscaleProvider", resource),
    prepareAuthMaterial: (resource) => observeThenApply(mode, "TailscaleProvider", resource),
    verifyNodeAccess: (resource) => observeOrSimulate(mode, "TailscaleProvider", resource),
  },
  comin: {
    mode,
    verifyConvergence: (resource) => observeOrSimulate(mode, "CominProvider", resource),
  },
  manualGate: {
    mode,
    requireProof: (resource) =>
      resource.status === "ready"
        ? observedEvidenceResult("ManualGateProvider", mode, resource)
        : Effect.succeed(providerResult("ManualGateProvider", mode, resource, "Blocked", false, [], [
            `Manual evidence required for ${resource.id}.`,
          ])),
    confirmProof: (resource, proof) =>
      Effect.sync(() => assertProof(resource, proof)).pipe(
        Effect.flatMap(() => observedEvidenceResult("ManualGateProvider", mode, resource)),
      ),
  },
  journal: {
    mode,
    record: (result) => result,
    runSmoke: (resource) => observeOrSimulate(mode, "DeploymentJournal", resource),
  },
})

export const PlatformProvidersDryRun: Layer.Layer<PlatformProviderServices> = Layer.succeed(
  PlatformProviderServices,
  createPlatformProvidersDryRun(),
)

export const PlatformProvidersTest: Layer.Layer<PlatformProviderServices> = Layer.succeed(
  PlatformProviderServices,
  createPlatformProvidersTest(),
)

export const PlatformProvidersLive: Layer.Layer<PlatformProviderServices> = Layer.succeed(
  PlatformProviderServices,
  createPlatformProvidersLive(),
)

export const providerNameForResource = (resource: PlannedResource): string => resource.provider

export const runProviderTransition = (
  providers: PlatformProviders,
  resource: PlannedResource,
  proof?: ManualProof,
  approval?: DestructiveApproval,
): ProviderEffect => {
  switch (resource.kind) {
    case "OperatorMachine":
      return providers.operatorMachine.observeMachine(resource)
    case "OperatorTailscale":
      return providers.tailscale.prepareOperator(resource)
    case "X86NixBuilder":
      return providers.nix.verifyX86Builder(resource)
    case "SopsKey":
      return providers.sops.verifyOperatorKey(resource)
    case "SopsRecipientMetadata":
      return providers.sops.verifyRecipientMetadata(resource)
    case "SopsRecipientRotation":
      return providers.sops.rotateRecipients(resource)
    case "SopsSecretSet":
      return resource.provider === "TailscaleProvider"
        ? providers.tailscale.prepareAuthMaterial(resource)
        : providers.sops.verifySecretSet(resource)
    case "ThinkCentreMachine":
      return providers.machineInventory.recordInventory(resource)
    case "LanDiscoveryScan":
      return providers.lanDiscovery.scan(resource)
    case "MachineBinding":
      return providers.machineInventory.bindMachine(resource, proof)
    case "ManualGate":
      return proof === undefined ? providers.manualGate.requireProof(resource) : providers.manualGate.confirmProof(resource, proof)
    case "NixBuild":
      return providers.nix.buildArtifact(resource)
    case "InstallerIso":
      return providers.nix.evaluateHostOutput(resource)
    case "UsbInstallMedia":
    case "UsbMediaWrite":
      return providers.usbMedia.writeInstaller(resource, proof, approval)
    case "SshReachability":
      return providers.ssh.probeReachability(resource)
    case "DiskIdentityProbe":
      return providers.disko.probeDiskIdentity(resource)
    case "DiskoLayout":
      return providers.disko.validateLayout(resource)
    case "NixosAnywhereExtraFiles":
      return providers.nixosAnywhere.stageExtraFiles(resource)
    case "NixosAnywhereInstall":
      return providers.nixosAnywhere.installHost(resource, proof, approval)
    case "TailscaleSecretAvailability":
      return providers.sops.verifySecretSet(resource)
    case "TailscaleReadiness":
      return providers.tailscale.verifyNodeAccess(resource)
    case "CominReadiness":
      return providers.comin.verifyConvergence(resource)
    case "NetworkSmokeCheck":
    case "DeferredCapability":
      return providers.journal.runSmoke(resource)
  }
}
