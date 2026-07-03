import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  CanopyPolicyResult,
  CanopyPolicyResultResource,
  canopyHomeDeploymentRecipeId,
  canopyPolicyRecipeId,
  canopyRenderedResourcesRecipeId,
  HomeDeploymentConfig,
  HomeDeploymentDesiredStateResource,
  ResourceKind,
  type CommandPlan,
  type EvidenceRequirement,
  type GateConfirmationState,
  type ManualAction,
  OperationClassification,
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

export const PlatformLifecycleResourceSchema = Schema.Struct({
  resourceId: Schema.String,
  kind: PlatformResourceKind,
  status: LifecycleStatus,
  dependsOn: Schema.Array(Schema.String),
  operation: OperationClassification,
  summary: Schema.String,
  evidenceRefs: Schema.Array(Schema.String),
  evidenceRequirements: Schema.Array(Schema.Unknown),
  manualActions: Schema.Array(Schema.Unknown),
  provider: Schema.String,
  command: Schema.optional(Schema.Unknown),
  observeCommand: Schema.optional(Schema.Unknown),
  errorType: Schema.optional(Schema.String),
  blockedReason: Schema.optional(Schema.String),
  secretRefs: Schema.Array(Schema.String),
  observes: Schema.Array(Schema.String),
  deferred: Schema.optional(Schema.Boolean),
})

export const PlatformLifecycleGraphSchema = Schema.Struct({
  name: Schema.String,
  resources: Schema.Array(PlatformLifecycleResourceSchema),
})
export type PlatformLifecycleGraphRecipe = typeof PlatformLifecycleGraphSchema.Type

export const CanopyRenderedResources = Schema.Struct({
  lifecycleGraph: PlatformLifecycleGraphSchema,
  resourceCount: Schema.Number,
})
export type CanopyRenderedResources = typeof CanopyRenderedResources.Type

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

export const PlatformLifecycleGraphAddress = Schema.Struct({
  name: Schema.String,
})
export type PlatformLifecycleGraphAddress = typeof PlatformLifecycleGraphAddress.Type

export const CanopyRenderedResourcesAddress = Schema.Struct({
  name: Schema.String,
})
export type CanopyRenderedResourcesAddress = typeof CanopyRenderedResourcesAddress.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentLifecycleGraphResource = defineAlchemyResource({
  id: "canopy.home-deployment.lifecycle-graph.resource",
  kind: "report",
  alchemyType: "attune:canopy:PlatformLifecycleGraph",
  ownerRecipeId: "canopy.home-deployment",
  producedBy: ["canopy.home-deployment"],
  consumedBy: ["canopy.rendered-resources"],
  addressFields: ["name"],
  addressSchema: PlatformLifecycleGraphAddress as never,
  stateSchema: PlatformLifecycleGraphSchema as never,
  modes: ["plan", "check", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CanopyRenderedResourcesResource = defineAlchemyResource({
  id: "canopy.rendered-resources.resource",
  kind: "report",
  alchemyType: "attune:canopy:RenderedResources",
  ownerRecipeId: "canopy.rendered-resources",
  producedBy: ["canopy.rendered-resources"],
  consumedBy: ["canopy.policy"],
  addressFields: ["name"],
  addressSchema: CanopyRenderedResourcesAddress as never,
  stateSchema: CanopyRenderedResources as never,
  modes: ["project", "read"],
})

export const renderCanopyResources = (graph: PlatformLifecycleGraph): CanopyRenderedResources => ({
  lifecycleGraph: Schema.decodeUnknownSync(PlatformLifecycleGraphSchema)(graph),
  resourceCount: graph.resources.length,
})

export const evaluateCanopyPolicy = (rendered: CanopyRenderedResources): CanopyPolicyResult => {
  const destructive = rendered.lifecycleGraph.resources.some((resource) => resource.operation === "irreversible")
  const blockers = rendered.lifecycleGraph.resources
    .filter((resource) => resource.status === "blocked" && resource.deferred !== true)
    .map((resource) => `${resource.resourceId}: ${resource.blockedReason ?? resource.summary}`)

  return {
    allowed: blockers.length === 0,
    blockers,
    humanReviewRequired: destructive,
  }
}

export const CanopyRenderedResourcesHandler = defineRecipeHandler<PlatformLifecycleGraph, CanopyRenderedResources>({
  id: "canopy.rendered-resources.handler",
  recipeId: canopyRenderedResourcesRecipeId,
  sourcePath: "packages/canopy/home-deployment/src/lifecycle.ts",
  exportName: "renderCanopyResources",
  handler: (input) => Effect.succeed(renderCanopyResources(input)) as never,
  emitsReceipts: ["canopy.rendered-resources.projected"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CanopyRenderedResourcesRecipe = defineProjectionRecipe({
  id: canopyRenderedResourcesRecipeId,
  projectId: "home-deployment",
  title: "Render platform resources",
  inputSchema: PlatformLifecycleGraphSchema as never,
  outputSchema: CanopyRenderedResources as never,
  nxTarget: "home-deployment:check",
  allowedFiles: ["packages/canopy/home-deployment/src/lifecycle.ts"],
  validationEvidence: ["home-deployment:test"],
  io: {
    inputSchema: PlatformLifecycleGraphSchema as never,
    outputSchema: CanopyRenderedResources as never,
    inputResources: [HomeDeploymentLifecycleGraphResource],
    outputResources: [CanopyRenderedResourcesResource],
  },
  handler: CanopyRenderedResourcesHandler as never,
  alchemyDag: [{
    fromRecipeId: canopyHomeDeploymentRecipeId,
    toRecipeId: canopyRenderedResourcesRecipeId,
    resource: HomeDeploymentLifecycleGraphResource,
    kind: "projects",
    modes: ["project", "read"],
  }],
})

export const CanopyPolicyHandler = defineRecipeHandler<CanopyRenderedResources, CanopyPolicyResult>({
  id: "canopy.policy.handler",
  recipeId: canopyPolicyRecipeId,
  sourcePath: "packages/canopy/home-deployment/src/lifecycle.ts",
  exportName: "evaluateCanopyPolicy",
  handler: (input) => Effect.succeed(evaluateCanopyPolicy(input)) as never,
  emitsReceipts: ["canopy.policy.checked"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CanopyPolicyRecipe = defineProjectionRecipe({
  id: canopyPolicyRecipeId,
  projectId: "home-deployment",
  title: "Evaluate Canopy policy gates",
  inputSchema: CanopyRenderedResources as never,
  outputSchema: CanopyPolicyResult as never,
  nxTarget: "home-deployment:check",
  allowedFiles: ["packages/canopy/home-deployment/src/lifecycle.ts"],
  validationEvidence: ["home-deployment:test", "workspace:policy-fast"],
  io: {
    inputSchema: CanopyRenderedResources as never,
    outputSchema: CanopyPolicyResult as never,
    inputResources: [CanopyRenderedResourcesResource],
    outputResources: [CanopyPolicyResultResource],
  },
  handler: CanopyPolicyHandler,
  alchemyDag: [{
    fromRecipeId: canopyRenderedResourcesRecipeId,
    toRecipeId: canopyPolicyRecipeId,
    resource: CanopyRenderedResourcesResource,
    kind: "validates",
    modes: ["check", "read"],
  }],
})

export const HomeDeploymentLifecycleRecipes = [
  CanopyRenderedResourcesRecipe,
  CanopyPolicyRecipe,
] as const
