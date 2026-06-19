import { Schema } from "effect"

import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  HomeDeploymentConfig,
  type GateConfirmationState,
  type PlannedResource,
  type ThinkCentreHost,
} from "./model.js"
import type { GateEvidenceRecord } from "./state.js"

export const LifecycleStatus = Schema.Literals([
  "planned",
  "ready",
  "blocked",
  "applying",
  "applied",
  "failed",
  "destroying",
  "destroyed",
])
export type LifecycleStatus = typeof LifecycleStatus.Type

export const OperationClassification = Schema.Literals(["safe", "external", "irreversible"])
export type OperationClassification = typeof OperationClassification.Type

export const PlatformResourceKind = Schema.Literals([
  "HostInventory",
  "ManualGate",
  "NixBuildArtifact",
  "InstallerIso",
  "SshReachability",
  "HostActivation",
  "TailscaleHostAccess",
  "K3sServerNode",
  "K3sJoinSecret",
  "KubeconfigAccess",
  "KubernetesApiReachable",
  "KubernetesObjectSet",
  "AttuneCrdSet",
  "PlatformNamespaceSet",
  "AttuneWorkerPool",
  "DesktopWorkerRegistration",
  "SmokeCheck",
])
export type PlatformResourceKind = typeof PlatformResourceKind.Type

export interface EvidenceRequirement {
  readonly id: string
  readonly summary: string
  readonly schema: "json" | "file-ref" | "operator-note"
}

export interface PlatformLifecycleResource {
  readonly resourceId: string
  readonly kind: PlatformResourceKind
  readonly status: LifecycleStatus
  readonly dependsOn: readonly string[]
  readonly operation: OperationClassification
  readonly summary: string
  readonly evidenceRefs: readonly string[]
  readonly evidenceRequirements: readonly EvidenceRequirement[]
  readonly provider: string
  readonly errorType?: string
  readonly legacyResourceKind?: PlannedResource["kind"]
}

export interface PlatformLifecycleGraph {
  readonly name: string
  readonly resources: readonly PlatformLifecycleResource[]
}

export type AgentStep =
  | {
      readonly type: "SafeProbe"
      readonly resourceId: string
      readonly provider: string
      readonly summary: string
      readonly command?: readonly string[]
      readonly autoRunnable: true
    }
  | {
      readonly type: "ManualGate"
      readonly resourceId: string
      readonly gateId: string
      readonly summary: string
      readonly requirements: readonly EvidenceRequirement[]
      readonly autoRunnable: false
    }
  | {
      readonly type: "Apply"
      readonly resourceId: string
      readonly provider: string
      readonly summary: string
      readonly operation: OperationClassification
      readonly approvalRequired: boolean
      readonly autoRunnable: false
    }
  | {
      readonly type: "Blocked"
      readonly blockers: readonly {
        readonly resourceId: string
        readonly reason: string
      }[]
      readonly autoRunnable: false
    }

const kindMap: Record<PlannedResource["kind"], PlatformResourceKind> = {
  ManualGate: "ManualGate",
  NixBuild: "NixBuildArtifact",
  NixosAnywhereInstall: "HostActivation",
  TailscaleReadiness: "TailscaleHostAccess",
  K3sBootstrap: "K3sServerNode",
  K3sJoin: "K3sServerNode",
  K3sReadiness: "K3sServerNode",
  Kubeconfig: "KubeconfigAccess",
  KubernetesGraph: "KubernetesObjectSet",
  WindowsDesktopGuard: "DesktopWorkerRegistration",
}

const providerMap: Record<PlatformResourceKind, string> = {
  HostInventory: "DeploymentStateStore",
  ManualGate: "ManualGateProvider",
  NixBuildArtifact: "NixProvider",
  InstallerIso: "NixProvider",
  SshReachability: "SshProvider",
  HostActivation: "HostActivationProvider",
  TailscaleHostAccess: "TailscaleProvider",
  K3sServerNode: "K3sProvider",
  K3sJoinSecret: "K3sProvider",
  KubeconfigAccess: "K3sProvider",
  KubernetesApiReachable: "KubernetesProvider",
  KubernetesObjectSet: "KubernetesProvider",
  AttuneCrdSet: "KubernetesProvider",
  PlatformNamespaceSet: "KubernetesProvider",
  AttuneWorkerPool: "KubernetesProvider",
  DesktopWorkerRegistration: "WindowsDesktopProvider",
  SmokeCheck: "DeploymentJournal",
}

const lifecycleStatus = (status: PlannedResource["status"]): LifecycleStatus => {
  switch (status) {
    case "ready":
      return "ready"
    case "blocked":
      return "blocked"
    case "planned":
      return "planned"
  }
}

const isComplete = (state: GateConfirmationState, id: string): boolean => state.completedResourceIds?.has(id) ?? false
const isConfirmed = (state: GateConfirmationState, id: string): boolean => state.confirmedGateIds.has(id)

const statusFromDeps = (state: GateConfirmationState, id: string, deps: readonly string[]): LifecycleStatus => {
  if (isComplete(state, id)) {
    return "ready"
  }
  return deps.every((dep) => isComplete(state, dep) || isConfirmed(state, dep)) ? "planned" : "blocked"
}

const blockerForDeps = (state: GateConfirmationState, deps: readonly string[]): string | undefined => {
  const missing = deps.filter((dep) => !isComplete(state, dep) && !isConfirmed(state, dep))
  return missing.length === 0 ? undefined : `Waiting for dependency resource(s): ${missing.join(", ")}`
}

export const operationForResource = (resource: PlannedResource): OperationClassification => {
  if (resource.destructive === true) {
    return "irreversible"
  }
  if (resource.kind === "ManualGate" || resource.kind === "TailscaleReadiness" || resource.kind === "K3sReadiness") {
    return "safe"
  }
  if (resource.kind === "NixBuild") {
    return "safe"
  }
  return "external"
}

const manualGateEvidenceRequirement = (id: string, summary: string): readonly EvidenceRequirement[] => [
  {
    id: `${id}:evidence`,
    summary,
    schema: "json",
  },
]

const evidenceRequirementsFor = (resource: PlannedResource): readonly EvidenceRequirement[] => {
  if (resource.kind !== "ManualGate") {
    return []
  }
  return manualGateEvidenceRequirement(resource.id, resource.summary)
}

const providerFor = (kind: PlatformResourceKind): string => providerMap[kind] ?? "UnknownProvider"

const evidenceRefFor = (records: readonly GateEvidenceRecord[], resourceId: string): readonly string[] =>
  records.filter((record) => record.gateId === resourceId).map((record) => `gate:${record.gateId}:${record.confirmedAt}`)

export const toLifecycleResource = (
  resource: PlannedResource,
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): PlatformLifecycleResource => {
  const kind = kindMap[resource.kind]
  return {
    resourceId: resource.id,
    kind,
    status: lifecycleStatus(resource.status),
    dependsOn: resource.dependsOn,
    operation: operationForResource(resource),
    summary: resource.summary,
    evidenceRefs: evidenceRefFor(evidenceRecords, resource.id),
    evidenceRequirements: evidenceRequirementsFor(resource),
    provider: providerFor(kind),
    ...(resource.blockedReason === undefined ? {} : { errorType: "BlockedRequirement" }),
    legacyResourceKind: resource.kind,
  }
}

export const toLifecycleResources = (
  resources: readonly PlannedResource[],
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): readonly PlatformLifecycleResource[] => resources.map((resource) => toLifecycleResource(resource, evidenceRecords))

const manualGate = (
  state: GateConfirmationState,
  evidenceRecords: readonly GateEvidenceRecord[],
  id: string,
  summary: string,
  dependsOn: readonly string[] = [],
): PlatformLifecycleResource => {
  const confirmed = isConfirmed(state, id)
  return {
    resourceId: id,
    kind: "ManualGate",
    status: confirmed ? "ready" : "blocked",
    dependsOn,
    operation: "safe",
    summary,
    evidenceRefs: evidenceRefFor(evidenceRecords, id),
    evidenceRequirements: confirmed ? [] : manualGateEvidenceRequirement(id, summary),
    provider: providerFor("ManualGate"),
    ...(confirmed ? {} : { errorType: "ManualGateRequired" }),
  }
}

const syntheticResource = (props: {
  readonly state: GateConfirmationState
  readonly id: string
  readonly kind: PlatformResourceKind
  readonly dependsOn: readonly string[]
  readonly operation: OperationClassification
  readonly summary: string
  readonly evidenceRefs?: readonly string[]
}): PlatformLifecycleResource => {
  const status = statusFromDeps(props.state, props.id, props.dependsOn)
  const blockedReason = status === "blocked" ? blockerForDeps(props.state, props.dependsOn) : undefined
  return {
    resourceId: props.id,
    kind: props.kind,
    status,
    dependsOn: props.dependsOn,
    operation: props.operation,
    summary: props.summary,
    evidenceRefs: props.evidenceRefs ?? [],
    evidenceRequirements: [],
    provider: providerFor(props.kind),
    ...(blockedReason === undefined ? {} : { errorType: "BlockedRequirement" }),
  }
}

const hostInstallerSshId = (host: ThinkCentreHost): string => `${host.hostname}:installer-ssh-reachability`
const hostPostInstallSshId = (host: ThinkCentreHost): string => `${host.hostname}:post-install-ssh-reachability`
const hostK3sServerId = (host: ThinkCentreHost): string => `${host.hostname}:k3s-server-node`

export const createHomePlatformLifecycleGraph = (
  input: HomeDeploymentConfig = defaultHomeDeploymentConfig(),
  state: GateConfirmationState = { confirmedGateIds: new Set() },
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): PlatformLifecycleGraph => {
  const config = Schema.decodeUnknownSync(HomeDeploymentConfig)(input)
  const legacyPlan = createHomeDeploymentPlan(config, state)
  const legacyById = new Map(legacyPlan.resources.map((resource) => [resource.id, resource]))
  const resources: PlatformLifecycleResource[] = [
    manualGate(state, evidenceRecords, "host-inventory-confirmed", "Confirm home host inventory, identities, and disk targets."),
    syntheticResource({
      state,
      id: "host-inventory",
      kind: "HostInventory",
      dependsOn: ["host-inventory-confirmed"],
      operation: "safe",
      summary: "Record the desired home platform host inventory used by the lifecycle graph.",
      evidenceRefs: evidenceRefFor(evidenceRecords, "host-inventory-confirmed"),
    }),
    ...toLifecycleResources(legacyPlan.resources, evidenceRecords),
    syntheticResource({
      state,
      id: "installer-iso",
      kind: "InstallerIso",
      dependsOn: ["installer-image"],
      operation: "safe",
      summary: "Expose the Nix-built installer ISO as a lifecycle artifact with evidence references.",
    }),
    syntheticResource({
      state,
      id: "k3s-join-secret",
      kind: "K3sJoinSecret",
      dependsOn: ["k3s-token-ready"],
      operation: "safe",
      summary: "Verify K3s join secret availability without committing the token.",
      evidenceRefs: evidenceRefFor(evidenceRecords, "k3s-token-ready"),
    }),
  ]

  for (const host of config.hosts) {
    resources.push(
      syntheticResource({
        state,
        id: hostInstallerSshId(host),
        kind: "SshReachability",
        dependsOn: [`${host.hostname}:usb-booted`],
        operation: "safe",
        summary: `Probe installer SSH reachability for ${host.hostname} at ${host.installerSshTarget}.`,
      }),
      syntheticResource({
        state,
        id: hostPostInstallSshId(host),
        kind: "SshReachability",
        dependsOn: [`${host.hostname}:nixos-anywhere-install`],
        operation: "safe",
        summary: `Probe post-install SSH reachability for ${host.hostname} at ${host.postInstallSshTarget}.`,
      }),
      syntheticResource({
        state,
        id: hostK3sServerId(host),
        kind: "K3sServerNode",
        dependsOn: [host.role === "k3s-init" ? `${host.hostname}:k3s-init` : `${host.hostname}:k3s-join`],
        operation: "safe",
        summary: `Observe ${host.hostname} as a typed K3s server node resource.`,
      }),
    )
  }

  const allK3sReady = config.hosts.map((host: ThinkCentreHost) => `${host.hostname}:k3s-readiness`)
  resources.push(
    syntheticResource({
      state,
      id: "kubernetes-api-reachable",
      kind: "KubernetesApiReachable",
      dependsOn: ["home-kubeconfig", ...allK3sReady],
      operation: "safe",
      summary: "Verify the Kubernetes API is reachable through the typed Kubernetes provider.",
    }),
    syntheticResource({
      state,
      id: "attune-crd-set",
      kind: "AttuneCrdSet",
      dependsOn: ["kubernetes-api-reachable"],
      operation: "external",
      summary: "Apply and observe Attune CRDs as a lifecycle object set.",
    }),
    syntheticResource({
      state,
      id: "platform-namespace-set",
      kind: "PlatformNamespaceSet",
      dependsOn: ["attune-crd-set"],
      operation: "external",
      summary: "Apply and observe platform namespaces, quotas, and base policies.",
    }),
    syntheticResource({
      state,
      id: "attune-worker-pool:thinkcentre-cpu",
      kind: "AttuneWorkerPool",
      dependsOn: ["platform-namespace-set", ...allK3sReady],
      operation: "external",
      summary: "Apply and observe the ThinkCentre CPU worker pool object set.",
    }),
    manualGate(state, evidenceRecords, "desktop-worker-opt-in", "Confirm the Windows desktop worker opt-in and interactive-use safety policy."),
    syntheticResource({
      state,
      id: "attune-worker-pool:desktop-gpu",
      kind: "AttuneWorkerPool",
      dependsOn: ["platform-namespace-set", "desktop-worker-opt-in"],
      operation: "external",
      summary: "Apply and observe the gated intermittent desktop GPU worker pool object set.",
      evidenceRefs: evidenceRefFor(evidenceRecords, "desktop-worker-opt-in"),
    }),
    syntheticResource({
      state,
      id: "desktop-worker-registration",
      kind: "DesktopWorkerRegistration",
      dependsOn: ["desktop-gpu-guard", "attune-worker-pool:desktop-gpu"],
      operation: "external",
      summary: "Register the Windows desktop guard as an observed desktop worker capability.",
    }),
    syntheticResource({
      state,
      id: "smoke-check",
      kind: "SmokeCheck",
      dependsOn: [
        "kubernetes-api-reachable",
        "attune-worker-pool:thinkcentre-cpu",
        legacyById.has("desktop-gpu-guard") ? "desktop-worker-registration" : "attune-worker-pool:desktop-gpu",
      ],
      operation: "safe",
      summary: "Run final lifecycle smoke checks for host access, K3s, Kubernetes objects, and worker pools.",
    }),
  )

  return {
    name: config.name,
    resources,
  }
}

export const nextLifecycleAgentStep = (resources: readonly PlatformLifecycleResource[]): AgentStep => {
  const manual = resources.find((resource) => resource.kind === "ManualGate" && resource.status === "blocked")
  if (manual !== undefined) {
    return {
      type: "ManualGate",
      resourceId: manual.resourceId,
      gateId: manual.resourceId,
      summary: manual.summary,
      requirements: manual.evidenceRequirements,
      autoRunnable: false,
    }
  }

  const planned = resources.find((resource) => resource.status === "planned")
  if (planned !== undefined) {
    if (planned.operation === "safe") {
      return {
        type: "SafeProbe",
        resourceId: planned.resourceId,
        provider: planned.provider,
        summary: planned.summary,
        autoRunnable: true,
      }
    }
    return {
      type: "Apply",
      resourceId: planned.resourceId,
      provider: planned.provider,
      summary: planned.summary,
      operation: planned.operation,
      approvalRequired: true,
      autoRunnable: false,
    }
  }


  return {
    type: "Blocked",
    blockers: resources
      .filter((resource) => resource.status === "blocked")
      .map((resource) => ({
        resourceId: resource.resourceId,
        reason: resource.errorType ?? resource.summary,
      })),
    autoRunnable: false,
  }
}

export const nextAgentStep = (resources: readonly PlannedResource[]): AgentStep =>
  nextLifecycleAgentStep(toLifecycleResources(resources))
