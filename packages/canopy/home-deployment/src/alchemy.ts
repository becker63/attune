import type { Diff } from "alchemy"
import * as Provider from "alchemy/Provider"
import { Resource, type Resource as AlchemyResource, type ResourceBinding } from "alchemy/Resource"
import {
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Schema } from "effect"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import {
  createHomePlatformLifecycleGraph,
  HomeDeploymentLifecycleGraphResource,
  nextLifecycleAgentStep,
  PlatformLifecycleGraphSchema,
  type AgentStep,
  type PlatformLifecycleGraph,
  type PlatformLifecycleResource,
} from "./lifecycle.ts"
import {
  canopyDesiredStateRecipeId,
  canopyHomeDeploymentRecipeId,
  canopyHomeDeploymentStateRecipeId,
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  type DeploymentPhase,
  type GateConfirmationState,
  type HomeDeploymentConfig,
  type HomeDeploymentPlan,
  HomeDeploymentDesiredStateResource,
  type PlannedResource,
} from "./model.ts"
import {
  createPlatformProvidersDryRun,
  createPlatformProvidersLive,
  createPlatformProvidersTest,
  runProviderTransition,
  type ManualProof,
  type PlatformProviderMode,
  type ProviderTransitionResult,
} from "./providers.ts"
import {
  completeResourceInState,
  gateStateFromHomeDeploymentState,
  HomeDeploymentStateFileResource,
  readHomeDeploymentState,
  writeHomeDeploymentState,
  type HomeDeploymentState,
} from "./state.ts"

const canopyDriftRepairRisk = "needs-review" as const
const canopyHomeDeploymentProviderCollectionId = "canopy.home-deployment.provider-collection" as const
const canopyHomeDeploymentAlchemyProviderSubstrateId = "canopy.home-deployment.alchemy-provider" as const

export interface ThinkCentreDay0DeploymentProps {
  readonly config?: HomeDeploymentConfig
  readonly gateState?: GateConfirmationState
  readonly statePath?: string
  readonly providerMode?: PlatformProviderMode
  readonly execute?: boolean
  readonly recordState?: boolean
  readonly proof?: ManualProof
  readonly planFingerprint?: string
  readonly resourceOutputs?: Readonly<Record<string, string>>
}

export type ThinkCentreDay0BindingKind =
  | "plan"
  | "plan-summary"
  | "phase-summary"
  | "depends-on"
  | "evidence-requirement"
  | "manual-action"
  | "secret-ref"
  | "observes"

export interface ThinkCentreDay0Binding {
  readonly kind: ThinkCentreDay0BindingKind
  readonly resourceId: string
  readonly targetResourceId?: string
  readonly provider?: string
  readonly phase?: string
  readonly resourceKind?: string
  readonly operation?: string
  readonly status?: string
  readonly summary?: string
  readonly blockedReason?: string
  readonly destructive?: boolean
  readonly deferred?: boolean
  readonly command?: readonly string[]
  readonly observeCommand?: readonly string[]
  readonly actionId?: string
  readonly actionKind?: string
  readonly evidenceId?: string
  readonly schema?: string
  readonly secret?: boolean
  readonly ref?: string
  readonly value?: string
  readonly url?: string
}

export type ThinkCentreDay0ResourceBinding = ResourceBinding<ThinkCentreDay0Binding>

export interface ThinkCentreDay0DeploymentOutput {
  readonly provider: "attune:alchemy:thinkcentre-day0-deployment"
  readonly id: string
  readonly bindings?: readonly ThinkCentreDay0ResourceBinding[]
  readonly plan: HomeDeploymentPlan
  readonly graph: PlatformLifecycleGraph
  readonly phases: readonly DeploymentPhase[]
  readonly providerMode: PlatformProviderMode
  readonly statePath?: string
  readonly byPhase: Readonly<Record<string, {
    readonly planned: number
    readonly ready: number
    readonly blocked: number
  }>>
  readonly blocked: readonly PlannedResource[]
  readonly planned: readonly PlannedResource[]
  readonly ready: readonly PlannedResource[]
  readonly next: AgentStep
}

export interface ThinkCentreDay0ResourceProps extends ThinkCentreDay0DeploymentProps {
  readonly resourceId: string
  readonly resourceFingerprint?: string
  readonly dependencyOutputs?: Readonly<Record<string, string>>
}

export interface ThinkCentreDay0ResourceOutput {
  readonly provider: "attune:alchemy:thinkcentre-day0-resource"
  readonly id: string
  readonly bindings?: readonly ThinkCentreDay0ResourceBinding[]
  readonly resource: PlatformLifecycleResource
  readonly transition?: ProviderTransitionResult
}

type DeploymentResource = AlchemyResource<
  "attune:alchemy:ThinkCentreDay0Deployment",
  ThinkCentreDay0DeploymentProps,
  ThinkCentreDay0DeploymentOutput,
  ThinkCentreDay0Binding,
  AttuneHomeDeploymentProviders
>

type Day0Resource = AlchemyResource<
  "attune:alchemy:ThinkCentreDay0Resource",
  ThinkCentreDay0ResourceProps,
  ThinkCentreDay0ResourceOutput,
  ThinkCentreDay0Binding,
  AttuneHomeDeploymentProviders
>

const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, nested) => {
    if (nested instanceof Set) {
      return [...nested].sort()
    }
    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      return Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)))
    }
    return nested
  })

export const plannedResourceFingerprint = (resource: PlannedResource): string =>
  stableStringify({
    id: resource.id,
    phase: resource.phase,
    kind: resource.kind,
    provider: resource.provider,
    operation: resource.operation,
    status: resource.status,
    dependsOn: resource.dependsOn,
    summary: resource.summary,
    command: resource.command,
    observeCommand: resource.observeCommand,
    blockedReason: resource.blockedReason,
    destructive: resource.destructive,
    evidenceRequirements: resource.evidenceRequirements,
    manualActions: resource.manualActions,
    secretRefs: resource.secretRefs,
    observes: resource.observes,
    deferred: resource.deferred,
  })

export const deploymentPlanFingerprint = (plan: HomeDeploymentPlan): string =>
  stableStringify({
    name: plan.name,
    operator: plan.operator,
    hosts: plan.hosts,
    resources: plan.resources.map(plannedResourceFingerprint),
  })

const summarizeByPhase = (resources: readonly PlannedResource[]): ThinkCentreDay0DeploymentOutput["byPhase"] =>
  Object.fromEntries(
    [...new Set(resources.map((resource) => resource.phase))].map((phase) => [
      phase,
      {
        planned: resources.filter((resource) => resource.phase === phase && resource.status === "planned").length,
        ready: resources.filter((resource) => resource.phase === phase && resource.status === "ready").length,
        blocked: resources.filter((resource) => resource.phase === phase && resource.status === "blocked").length,
      },
    ]),
  )

const stateForProps = (props: ThinkCentreDay0DeploymentProps): HomeDeploymentState | undefined =>
  props.statePath === undefined ? undefined : readHomeDeploymentState(props.statePath)

const gateStateForProps = (
  props: ThinkCentreDay0DeploymentProps,
  state: HomeDeploymentState | undefined,
): GateConfirmationState => props.gateState ?? (state === undefined ? { confirmedGateIds: new Set() } : gateStateFromHomeDeploymentState(state))

const providerModeForProps = (props: ThinkCentreDay0DeploymentProps): PlatformProviderMode => props.providerMode ?? "DryRun"

const providersForMode = (mode: PlatformProviderMode) => {
  switch (mode) {
    case "Live":
      return createPlatformProvidersLive()
    case "Test":
      return createPlatformProvidersTest()
    case "DryRun":
      return createPlatformProvidersDryRun()
  }
}

const commandFields = (resource: PlatformLifecycleResource): Pick<ProviderTransitionResult, "command" | "display"> =>
  resource.command === undefined ? {} : { command: resource.command.argv, display: resource.command.display }

const transition = (
  resource: PlatformLifecycleResource,
  mode: PlatformProviderMode,
  status: ProviderTransitionResult["status"],
  blockers: readonly string[] = [],
): ProviderTransitionResult => ({
  provider: resource.provider,
  mode,
  resourceId: resource.resourceId,
  operation: resource.operation,
  status,
  mutated: false,
  ...commandFields(resource),
  evidence: [],
  blockers,
})

const gateIdForResource = (resource: PlatformLifecycleResource): string | undefined => {
  const hostname = resource.resourceId.split(":")[0]

  switch (resource.kind) {
    case "MachineBinding":
      return hostname === undefined ? undefined : `${hostname}:lan-binding-confirmed`
    case "UsbMediaWrite":
      return "usb-media-write-approved"
    case "NixosAnywhereInstall":
      return hostname === undefined ? undefined : `${hostname}:disk-wipe-confirmed`
    case "ManualGate":
      return resource.resourceId
    default:
      return undefined
  }
}

const manualProofFromState = (
  gateId: string,
  state: HomeDeploymentState,
): ManualProof | undefined => {
  const gateEvidence = state.gateEvidence.find((record) => record.gateId === gateId)
  if (gateEvidence !== undefined) {
    return {
      gateId,
      evidenceRef: `gate:${gateId}:${gateEvidence.confirmedAt}`,
    }
  }

  return state.confirmedGateIds.includes(gateId)
    ? {
        gateId,
        evidenceRef: `gate:${gateId}`,
      }
    : undefined
}

const manualProofForResource = (
  resource: PlatformLifecycleResource,
  props: ThinkCentreDay0DeploymentProps,
  state: HomeDeploymentState | undefined,
): ManualProof | undefined => {
  if (props.proof !== undefined) {
    return props.proof
  }
  if (state === undefined) {
    return undefined
  }

  const gateId = gateIdForResource(resource)
  return gateId === undefined ? undefined : manualProofFromState(gateId, state)
}

const recordLiveTransition = (
  props: ThinkCentreDay0DeploymentProps,
  result: ProviderTransitionResult,
): void => {
  if (props.statePath === undefined || props.recordState !== true || result.mode !== "Live") {
    return
  }
  if (result.status !== "Observed" && result.status !== "Applied" && result.status !== "Blocked") {
    return
  }

  const now = new Date().toISOString()
  const state = readHomeDeploymentState(props.statePath)
  const record = {
    id: result.resourceId,
    ...(result.command === undefined ? {} : { command: result.command }),
    ...(result.display === undefined ? {} : { display: result.display }),
    exitCode: result.status === "Blocked" ? 1 : 0,
    stdout: result.evidence.map((item) => item.summary).join("\n").slice(0, 2048),
    stderr: result.blockers.join("\n").slice(0, 2048),
    startedAt: now,
    completedAt: now,
    dryRun: false,
  }

  writeHomeDeploymentState(
    props.statePath,
    result.status === "Blocked"
      ? {
          ...state,
          records: [...state.records.filter((item) => item.id !== record.id), record],
        }
      : completeResourceInState(state, record),
  )
}

const executeTransition = (
  planned: PlannedResource,
  lifecycle: PlatformLifecycleResource,
  props: ThinkCentreDay0DeploymentProps,
  state: HomeDeploymentState | undefined,
): ProviderTransitionResult | undefined => {
  if (props.execute !== true) {
    return undefined
  }

  const mode = providerModeForProps(props)
  if (planned.status === "blocked") {
    return transition(lifecycle, mode, "Blocked", [planned.blockedReason ?? planned.summary])
  }
  if (planned.status === "ready") {
    return transition(lifecycle, mode, "Observed")
  }

  try {
    const result = Effect.runSync(runProviderTransition(
      providersForMode(mode),
      planned,
      manualProofForResource(lifecycle, props, state),
    ))
    recordLiveTransition(props, result)
    return result
  } catch (error) {
    return transition(lifecycle, mode, "Blocked", [error instanceof Error ? error.message : String(error)])
  }
}

const buildDeploymentOutput = (id: string, props: ThinkCentreDay0DeploymentProps): ThinkCentreDay0DeploymentOutput => {
  const state = stateForProps(props)
  const gateState = gateStateForProps(props, state)
  const config = props.config ?? defaultHomeDeploymentConfig()
  const plan = createHomeDeploymentPlan(config, gateState)
  const graph = createHomePlatformLifecycleGraph(config, gateState, state?.gateEvidence ?? [])

  return {
    provider: "attune:alchemy:thinkcentre-day0-deployment",
    id,
    plan,
    graph,
    phases: [...new Set(plan.resources.map((resource) => resource.phase))],
    providerMode: providerModeForProps(props),
    ...(props.statePath === undefined ? {} : { statePath: props.statePath }),
    byPhase: summarizeByPhase(plan.resources),
    blocked: plan.resources.filter((resource) => resource.status === "blocked"),
    planned: plan.resources.filter((resource) => resource.status === "planned"),
    ready: plan.resources.filter((resource) => resource.status === "ready"),
    next: nextLifecycleAgentStep(graph.resources),
  }
}

const selectResource = (
  id: string,
  props: ThinkCentreDay0ResourceProps,
): ThinkCentreDay0ResourceOutput => {
  const state = stateForProps(props)
  const gateState = gateStateForProps(props, state)
  const config = props.config ?? defaultHomeDeploymentConfig()
  const graph = createHomePlatformLifecycleGraph(config, gateState, state?.gateEvidence ?? [])
  const resource = graph.resources.find((candidate) => candidate.resourceId === props.resourceId)
  const planned = createHomeDeploymentPlan(config, gateState).resources.find((candidate) => candidate.id === props.resourceId)
  if (resource === undefined) {
    throw new Error(`Unknown ThinkCentre day-0 resource: ${props.resourceId}`)
  }
  if (planned === undefined) {
    throw new Error(`Unknown ThinkCentre day-0 planned resource: ${props.resourceId}`)
  }
  const resourceTransition = executeTransition(planned, resource, props, state)

  return {
    provider: "attune:alchemy:thinkcentre-day0-resource",
    id,
    resource,
    ...(resourceTransition === undefined ? {} : { transition: resourceTransition }),
  }
}

const shouldRetryOutput = (output: unknown): boolean => {
  const transitionStatus = (output as { readonly transition?: { readonly status?: string } } | undefined)?.transition?.status
  return transitionStatus === "Blocked" || transitionStatus === "Planned"
}

const retryableDiff = (output: unknown): Diff | undefined =>
  shouldRetryOutput(output) ? { action: "update" } : undefined

const attachBindings = <Output extends object>(
  output: Output,
  bindings: readonly ThinkCentreDay0ResourceBinding[],
): Output & { readonly bindings: readonly ThinkCentreDay0ResourceBinding[] } => ({
  ...output,
  bindings,
})

const providerService = <R extends AlchemyResource<string, object | undefined, object, ThinkCentreDay0Binding, unknown>>(
  reconcile: (id: string, props: NonNullable<R["Props"]>) => R["Attributes"],
): Provider.ProviderService<R> => ({
  version: 2,
  read: ({ output }) => Effect.succeed(output),
  diff: ({ output }) => Effect.succeed(retryableDiff(output)),
  reconcile: ({ id, news, bindings }) =>
    Effect.sync(() =>
      attachBindings(
        reconcile(id, news as NonNullable<R["Props"]>),
        bindings as readonly ThinkCentreDay0ResourceBinding[],
      ) as R["Attributes"]),
  delete: () => Effect.void,
  list: () => Effect.succeed([]),
})

export const ThinkCentreDay0Deployment = Resource<DeploymentResource>("attune:alchemy:ThinkCentreDay0Deployment")

export const ThinkCentreDay0Resource = Resource<Day0Resource>("attune:alchemy:ThinkCentreDay0Resource")

export const ThinkCentreDay0DeploymentProvider = () =>
  Provider.succeed(ThinkCentreDay0Deployment, providerService<DeploymentResource>(buildDeploymentOutput))

export const ThinkCentreDay0ResourceProvider = () =>
  Provider.succeed(ThinkCentreDay0Resource, providerService<Day0Resource>(selectResource))

export class AttuneHomeDeploymentProviders extends Provider.ProviderCollection<AttuneHomeDeploymentProviders>()(
  "AttuneHomeDeployment",
) {}

export const homeDeploymentProviders = () =>
  Layer.effect(
    AttuneHomeDeploymentProviders,
    Provider.collection([
      ThinkCentreDay0Deployment,
      ThinkCentreDay0Resource,
    ]),
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        ThinkCentreDay0DeploymentProvider(),
        ThinkCentreDay0ResourceProvider(),
      ),
    ),
  )

export const canopyDriftRepair: RecipeRepair = {
  repairId: "recipe-repair:canopy.home-deployment:drift",
  recipeId: canopyHomeDeploymentRecipeId,
  title: "Repair Canopy managed platform drift",
  kind: "managed-lifecycle",
  nxTarget: "home-deployment:repair",
  allowedFiles: ["packages/canopy/home-deployment/**", "packages/canopy/platform-alchemy-k8s/**"],
  risk: canopyDriftRepairRisk,
  evidenceRequirements: ["home-deployment:test", "workspace:policy-fast"],
}

export const HomeDeploymentProviderBridgeInput = Schema.Struct({
  providerId: Schema.Literal(canopyHomeDeploymentProviderCollectionId),
  sourcePath: Schema.optional(Schema.String),
})
export type HomeDeploymentProviderBridgeInput = typeof HomeDeploymentProviderBridgeInput.Type

export const HomeDeploymentProviderBridgeOutput = Schema.Struct({
  providerId: Schema.Literal(canopyHomeDeploymentProviderCollectionId),
  resourceExport: Schema.Literal("ThinkCentreDay0Deployment"),
  providerExport: Schema.Literal("homeDeploymentProviders"),
  resourceContractId: Schema.Literal("canopy.home-deployment.alchemy-resource"),
  managedRecipeId: Schema.Literal(canopyHomeDeploymentRecipeId),
})
export type HomeDeploymentProviderBridgeOutput = typeof HomeDeploymentProviderBridgeOutput.Type

export const HomeDeploymentAlchemyAddress = Schema.Struct({
  id: Schema.String,
})
export type HomeDeploymentAlchemyAddress = typeof HomeDeploymentAlchemyAddress.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentProviderCollectionResource = defineAlchemyResource({
  id: "canopy.home-deployment.provider-collection.resource",
  kind: "external-service",
  alchemyType: "alchemy:ProviderCollection",
  ownerRecipeId: canopyHomeDeploymentRecipeId,
  producedBy: [canopyHomeDeploymentRecipeId],
  consumedBy: [canopyHomeDeploymentRecipeId],
  addressFields: ["providerId"],
  addressSchema: HomeDeploymentProviderBridgeInput as never,
  stateSchema: HomeDeploymentProviderBridgeOutput as never,
  modes: ["read", "external"],
  programmaticResourceExport: "ThinkCentreDay0Deployment",
  programmaticProviderExport: "homeDeploymentProviders",
  programmaticBridgeSourcePath: "packages/canopy/home-deployment/src/alchemy.ts",
})

// @attune-packet-target generated-runtime-projection eligible
export const ThinkCentreDay0DeploymentResourceContract = defineAlchemyResource({
  id: "canopy.home-deployment.alchemy-resource",
  kind: "workflow-target",
  alchemyType: "attune:alchemy:ThinkCentreDay0Deployment",
  providerId: canopyHomeDeploymentProviderCollectionId,
  ownerRecipeId: canopyHomeDeploymentRecipeId,
  producedBy: [canopyHomeDeploymentRecipeId],
  consumedBy: ["canopy.rendered-resources", "canopy.observed-state"],
  addressFields: ["id"],
  addressSchema: HomeDeploymentAlchemyAddress as never,
  stateSchema: PlatformLifecycleGraphSchema as never,
  modes: ["plan", "apply", "check", "destroy", "read"],
  programmaticResourceExport: "ThinkCentreDay0Deployment",
  programmaticProviderExport: "homeDeploymentProviders",
  programmaticBridgeSourcePath: "packages/canopy/home-deployment/src/alchemy.ts",
})

export const HomeDeploymentProviderLayer = defineRecipeLayer({
  id: "canopy.home-deployment.provider.layer",
  sourcePath: "packages/canopy/home-deployment/src/alchemy.ts",
  exportName: "homeDeploymentProviders",
  layer: homeDeploymentProviders() as never,
  provides: [{
    id: canopyHomeDeploymentProviderCollectionId,
    service: AttuneHomeDeploymentProviders as never,
  }],
})

export const planHomeDeploymentLifecycle = (input: HomeDeploymentConfig): PlatformLifecycleGraph =>
  createHomePlatformLifecycleGraph(input)

export const CanopyHomeDeploymentHandler = defineRecipeHandler<
  HomeDeploymentConfig,
  PlatformLifecycleGraph,
  never,
  AttuneHomeDeploymentProviders
>({
  id: "canopy.home-deployment.handler",
  recipeId: canopyHomeDeploymentRecipeId,
  sourcePath: "packages/canopy/home-deployment/src/alchemy.ts",
  exportName: "planHomeDeploymentLifecycle",
  handler: (input) =>
    Effect.gen(function* () {
      yield* AttuneHomeDeploymentProviders
      return planHomeDeploymentLifecycle(input)
    }) as never,
  layer: HomeDeploymentProviderLayer,
  emitsReceipts: ["canopy.home-deployment.lifecycle"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CanopyHomeDeploymentAlchemyBinding = defineManagedRecipeAlchemyBinding({
  id: "canopy.home-deployment.alchemy",
  managedRecipeId: canopyHomeDeploymentRecipeId,
  alchemyResourceType: "attune:alchemy:ThinkCentreDay0Deployment",
  providerId: canopyHomeDeploymentProviderCollectionId,
  resource: ThinkCentreDay0DeploymentResourceContract,
  lifecycle: {
    plan: "plan",
    read: "read",
    check: "check",
    apply: "apply",
    destroy: "delete",
  },
  bindings: ["ThinkCentreDay0Deployment", "homeDeploymentProviders"],
})

export const CanopyHomeDeploymentRecipe = defineManagedRecipe({
  id: canopyHomeDeploymentRecipeId,
  projectId: "home-deployment",
  title: "Manage Canopy home deployment lifecycle",
  inputSchema: HomeDeploymentDesiredStateResource.stateSchema as never,
  outputSchema: PlatformLifecycleGraphSchema as never,
  nxTarget: "home-deployment:dev",
  allowedFiles: [
    "packages/canopy/home-deployment/src/alchemy.ts",
    "packages/canopy/home-deployment/src/lifecycle.ts",
    "packages/canopy/home-deployment/alchemy.run.ts",
  ],
  validationEvidence: ["home-deployment:test"],
  io: {
    inputSchema: HomeDeploymentDesiredStateResource.stateSchema as never,
    outputSchema: PlatformLifecycleGraphSchema as never,
    inputResources: [HomeDeploymentDesiredStateResource, HomeDeploymentProviderCollectionResource],
    outputResources: [HomeDeploymentLifecycleGraphResource, ThinkCentreDay0DeploymentResourceContract],
  },
  handler: CanopyHomeDeploymentHandler as never,
  alchemyDag: [
    {
      fromRecipeId: canopyDesiredStateRecipeId,
      toRecipeId: canopyHomeDeploymentRecipeId,
      resource: HomeDeploymentDesiredStateResource,
      kind: "manages",
      modes: ["plan", "read"],
    },
    {
      fromRecipeId: canopyHomeDeploymentStateRecipeId,
      toRecipeId: canopyHomeDeploymentRecipeId,
      resource: HomeDeploymentStateFileResource,
      kind: "observes",
      modes: ["read", "observe"],
    },
  ],
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "canopy-platform-lifecycle",
  alchemy: CanopyHomeDeploymentAlchemyBinding,
  lifecycleSubstrates: [{
    id: canopyHomeDeploymentAlchemyProviderSubstrateId,
    kind: "container-runtime",
    tool: "alchemy",
    lifecycleActions: ["plan", "apply", "check", "destroy"],
    nxTarget: "home-deployment:dev",
    evidence: ["home-deployment:test"],
  }],
  observedState: { status: "unknown" },
  driftRepair: canopyDriftRepair,
  humanReviewRequired: true,
})

export const HomeDeploymentAlchemyRecipes = [CanopyHomeDeploymentRecipe] as const
