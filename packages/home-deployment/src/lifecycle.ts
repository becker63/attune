import { Schema } from "effect"

import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  HomeDeploymentConfig,
  ResourceKind,
  type CommandPlan,
  type EvidenceRequirement,
  type GateConfirmationState,
  type ManualAction,
  type OperationClassification,
  type PlannedResource,
} from "./model.ts"
import type { GateEvidenceRecord } from "./state.ts"

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

export const PlatformResourceKind = ResourceKind
export type PlatformResourceKind = ResourceKind

export interface PlatformLifecycleResource {
  readonly resourceId: string
  readonly kind: PlatformResourceKind
  readonly status: LifecycleStatus
  readonly dependsOn: readonly string[]
  readonly operation: OperationClassification
  readonly summary: string
  readonly evidenceRefs: readonly string[]
  readonly evidenceRequirements: readonly EvidenceRequirement[]
  readonly manualActions: readonly ManualAction[]
  readonly provider: string
  readonly command?: CommandPlan
  readonly observeCommand?: CommandPlan
  readonly errorType?: string
  readonly blockedReason?: string
  readonly secretRefs: readonly string[]
  readonly observes: readonly string[]
  readonly deferred?: boolean
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
      readonly actions: readonly ManualAction[]
      readonly autoRunnable: false
    }
  | {
      readonly type: "Apply"
      readonly resourceId: string
      readonly provider: string
      readonly summary: string
      readonly operation: OperationClassification
      readonly command?: readonly string[]
      readonly requirements: readonly EvidenceRequirement[]
      readonly actions: readonly ManualAction[]
      readonly approvalRequired: boolean
      readonly autoRunnable: false
    }
  | {
      readonly type: "Blocked"
      readonly blockers: readonly {
        readonly resourceId: string
        readonly reason: string
        readonly actions: readonly ManualAction[]
      }[]
      readonly autoRunnable: false
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

const evidenceRefFor = (records: readonly GateEvidenceRecord[], resourceId: string): readonly string[] =>
  records.filter((record) => record.gateId === resourceId).map((record) => `gate:${record.gateId}:${record.confirmedAt}`)

export const toLifecycleResource = (
  resource: PlannedResource,
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): PlatformLifecycleResource => ({
  resourceId: resource.id,
  kind: resource.kind,
  status: lifecycleStatus(resource.status),
  dependsOn: resource.dependsOn,
  operation: resource.operation,
  summary: resource.summary,
  evidenceRefs: evidenceRefFor(evidenceRecords, resource.id),
  evidenceRequirements: resource.evidenceRequirements,
  manualActions: resource.manualActions,
  provider: resource.provider,
  ...(resource.command === undefined ? {} : { command: resource.command }),
  ...(resource.observeCommand === undefined ? {} : { observeCommand: resource.observeCommand }),
  ...(resource.blockedReason === undefined ? {} : { blockedReason: resource.blockedReason, errorType: "BlockedRequirement" }),
  secretRefs: resource.secretRefs,
  observes: resource.observes,
  ...(resource.deferred === undefined ? {} : { deferred: resource.deferred }),
})

export const toLifecycleResources = (
  resources: readonly PlannedResource[],
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): readonly PlatformLifecycleResource[] => resources.map((resource) => toLifecycleResource(resource, evidenceRecords))

export const createHomePlatformLifecycleGraph = (
  input: HomeDeploymentConfig = defaultHomeDeploymentConfig(),
  state: GateConfirmationState = { confirmedGateIds: new Set() },
  evidenceRecords: readonly GateEvidenceRecord[] = [],
): PlatformLifecycleGraph => {
  const config = Schema.decodeUnknownSync(HomeDeploymentConfig)(input)
  const plan = createHomeDeploymentPlan(config, state)

  return {
    name: plan.name,
    resources: toLifecycleResources(plan.resources, evidenceRecords),
  }
}

const dependenciesAreReady = (
  resources: readonly PlatformLifecycleResource[],
  resource: PlatformLifecycleResource,
): boolean =>
  resource.dependsOn.every((dependencyId) => {
    const dependency = resources.find((candidate) => candidate.resourceId === dependencyId)
    return dependency?.status === "ready"
  })

export const nextLifecycleAgentStep = (resources: readonly PlatformLifecycleResource[]): AgentStep => {
  const manual = resources.find(
    (resource) =>
      resource.kind === "ManualGate" &&
      resource.status === "blocked" &&
      dependenciesAreReady(resources, resource),
  )
  if (manual !== undefined) {
    return {
      type: "ManualGate",
      resourceId: manual.resourceId,
      gateId: manual.resourceId,
      summary: manual.summary,
      requirements: manual.evidenceRequirements,
      actions: manual.manualActions,
      autoRunnable: false,
    }
  }

  const planned = resources.find((resource) => resource.status === "planned" && dependenciesAreReady(resources, resource))
  if (planned !== undefined) {
    if (planned.operation === "safe") {
      return {
        type: "SafeProbe",
        resourceId: planned.resourceId,
        provider: planned.provider,
        summary: planned.summary,
        ...(planned.command === undefined ? {} : { command: planned.command.argv }),
        autoRunnable: true,
      }
    }
    return {
      type: "Apply",
      resourceId: planned.resourceId,
      provider: planned.provider,
      summary: planned.summary,
      operation: planned.operation,
      ...(planned.command === undefined ? {} : { command: planned.command.argv }),
      requirements: planned.evidenceRequirements,
      actions: planned.manualActions,
      approvalRequired: planned.operation === "irreversible",
      autoRunnable: false,
    }
  }

  return {
    type: "Blocked",
    blockers: resources
      .filter((resource) => resource.status === "blocked")
      .map((resource) => ({
        resourceId: resource.resourceId,
        reason: resource.blockedReason ?? resource.errorType ?? resource.summary,
        actions: resource.manualActions,
      })),
    autoRunnable: false,
  }
}

export const nextAgentStep = (resources: readonly PlannedResource[]): AgentStep =>
  nextLifecycleAgentStep(toLifecycleResources(resources))
