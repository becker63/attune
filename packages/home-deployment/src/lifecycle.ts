import { Schema } from "effect"

import type { PlannedResource } from "./model.js"

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

const evidenceRequirementsFor = (resource: PlannedResource): readonly EvidenceRequirement[] => {
  if (resource.kind !== "ManualGate") {
    return []
  }
  return [
    {
      id: `${resource.id}:evidence`,
      summary: resource.summary,
      schema: "json",
    },
  ]
}

export const toLifecycleResource = (resource: PlannedResource): PlatformLifecycleResource => {
  const kind = kindMap[resource.kind]
  return {
    resourceId: resource.id,
    kind,
    status: lifecycleStatus(resource.status),
    dependsOn: resource.dependsOn,
    operation: operationForResource(resource),
    summary: resource.summary,
    evidenceRefs: [],
    evidenceRequirements: evidenceRequirementsFor(resource),
    provider: providerMap[kind],
    ...(resource.blockedReason === undefined ? {} : { errorType: "BlockedRequirement" }),
    legacyResourceKind: resource.kind,
  }
}

export const toLifecycleResources = (resources: readonly PlannedResource[]): readonly PlatformLifecycleResource[] =>
  resources.map(toLifecycleResource)

export const nextAgentStep = (resources: readonly PlannedResource[]): AgentStep => {
  const planned = resources.find((resource) => resource.status === "planned")
  if (planned !== undefined) {
    const operation = operationForResource(planned)
    if (operation === "safe") {
      return {
        type: "SafeProbe",
        resourceId: planned.id,
        provider: toLifecycleResource(planned).provider,
        summary: planned.summary,
        ...(planned.command === undefined ? {} : { command: planned.command.argv }),
        autoRunnable: true,
      }
    }
    return {
      type: "Apply",
      resourceId: planned.id,
      provider: toLifecycleResource(planned).provider,
      summary: planned.summary,
      operation,
      approvalRequired: true,
      autoRunnable: false,
    }
  }

  const manual = resources.find((resource) => resource.kind === "ManualGate" && resource.status === "blocked")
  if (manual !== undefined) {
    return {
      type: "ManualGate",
      resourceId: manual.id,
      gateId: manual.id,
      summary: manual.summary,
      requirements: evidenceRequirementsFor(manual),
      autoRunnable: false,
    }
  }

  return {
    type: "Blocked",
    blockers: resources
      .filter((resource) => resource.status === "blocked")
      .map((resource) => ({
        resourceId: resource.id,
        reason: resource.blockedReason ?? resource.summary,
      })),
    autoRunnable: false,
  }
}
