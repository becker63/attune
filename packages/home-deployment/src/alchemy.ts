import type { Diff } from "alchemy"
import * as Provider from "alchemy/Provider"
import { Resource, type Resource as AlchemyResource, type ResourceBinding } from "alchemy/Resource"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import {
  createHomePlatformLifecycleGraph,
  nextLifecycleAgentStep,
  type AgentStep,
  type PlatformLifecycleGraph,
  type PlatformLifecycleResource,
} from "./lifecycle.ts"
import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  type DeploymentPhase,
  type GateConfirmationState,
  type HomeDeploymentConfig,
  type HomeDeploymentPlan,
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
  readHomeDeploymentState,
  writeHomeDeploymentState,
  type HomeDeploymentState,
} from "./state.ts"

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

  const hostname = resource.resourceId.split(":")[0]
  const gateId =
    resource.kind === "MachineBinding" && hostname !== undefined
      ? `${hostname}:lan-binding-confirmed`
      : resource.kind === "UsbMediaWrite"
        ? "usb-media-write-approved"
        : resource.kind === "NixosAnywhereInstall" && hostname !== undefined
          ? `${hostname}:disk-wipe-confirmed`
          : resource.kind === "ManualGate"
            ? resource.resourceId
            : undefined

  if (gateId === undefined) {
    return undefined
  }

  const gateEvidence = state.gateEvidence.find((record) => record.gateId === gateId)
  if (gateEvidence !== undefined) {
    return {
      gateId,
      evidenceRef: `gate:${gateId}:${gateEvidence.confirmedAt}`,
    }
  }
  if (state.confirmedGateIds.includes(gateId)) {
    return {
      gateId,
      evidenceRef: `gate:${gateId}`,
    }
  }
  return undefined
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
