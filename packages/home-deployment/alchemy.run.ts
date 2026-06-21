import * as Alchemy from "alchemy"
import type { Output } from "alchemy"
import * as Effect from "effect/Effect"

import {
  ThinkCentreDay0Deployment,
  ThinkCentreDay0Resource,
  deploymentPlanFingerprint,
  homeDeploymentProviders,
  plannedResourceFingerprint,
  type ThinkCentreDay0Binding,
} from "./src/alchemy.ts"
import {
  confirmGateInState,
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  gateStateFromHomeDeploymentState,
  readHomeDeploymentState,
  writeHomeDeploymentState,
} from "./src/index.ts"
import type { HomeDeploymentConfig, PlannedResource, ThinkCentreHost } from "./src/model.ts"
import type { PlatformProviderMode } from "./src/providers.ts"

const defaultDay0StatePath = ".attune/day0/state.json"

const csv = (value: string | undefined): readonly string[] =>
  value === undefined ? [] : value.split(",").map((item) => item.trim()).filter((item) => item.length > 0)

const providerModeFromEnv = (): PlatformProviderMode => {
  switch (process.env.ATTUNE_PROVIDER_MODE) {
    case "Test":
      return "Test"
    case "Live":
      return "Live"
    default:
      return "DryRun"
  }
}

const envDiskForHost = (host: ThinkCentreHost, index: number): ThinkCentreHost => {
  const slot = index + 1
  const device = process.env[`ATTUNE_CP_${slot}_DISK`] ?? process.env[`ATTUNE_${host.hostname.toUpperCase().replaceAll("-", "_")}_DISK`]
  const serial = process.env[`ATTUNE_CP_${slot}_DISK_SERIAL`]
  if (device === undefined && serial === undefined) {
    return host
  }

  return {
    ...host,
    expectedDisk: {
      ...host.expectedDisk,
      ...(device === undefined ? {} : { device }),
      ...(serial === undefined ? {} : { serial }),
    },
  }
}

const configFromEnv = (): HomeDeploymentConfig => {
  const base = defaultHomeDeploymentConfig()
  const ranges = csv(process.env.ATTUNE_DISCOVERY_RANGES)
  return {
    ...base,
    operator: {
      ...base.operator,
      ...(ranges.length === 0 ? {} : { allowedDiscoveryRanges: ranges }),
      ...(process.env.ATTUNE_INSTALLER_USB_DEVICE === undefined
        ? {}
        : { installerUsbDevice: process.env.ATTUNE_INSTALLER_USB_DEVICE }),
      tailscale: {
        ...base.operator.tailscale,
        tailnet: process.env.ATTUNE_TAILNET ?? base.operator.tailscale.tailnet,
      },
    },
    hosts: base.hosts.map(envDiskForHost) as unknown as HomeDeploymentConfig["hosts"],
  }
}

const alchemyResourceId = (id: string): string => id.replaceAll(":", "-")

type BindingTarget = {
  readonly bind: (sid: string, binding: ThinkCentreDay0Binding) => Effect.Effect<void>
}

const bindingSidPart = (value: string): string =>
  value
    .replace(/[^A-Za-z0-9_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)

const bindingSid = (...parts: readonly string[]): string => parts.map(bindingSidPart).filter(Boolean).join("/")

const planBinding = (resource: PlannedResource): ThinkCentreDay0Binding => ({
  kind: "plan",
  resourceId: resource.id,
  provider: resource.provider,
  phase: resource.phase,
  resourceKind: resource.kind,
  operation: resource.operation,
  status: resource.status,
  summary: resource.summary,
  ...(resource.command === undefined ? {} : { command: resource.command.argv }),
  ...(resource.observeCommand === undefined ? {} : { observeCommand: resource.observeCommand.argv }),
  ...(resource.blockedReason === undefined ? {} : { blockedReason: resource.blockedReason }),
  ...(resource.destructive === undefined ? {} : { destructive: resource.destructive }),
  ...(resource.deferred === undefined ? {} : { deferred: resource.deferred }),
})

const bindPlannedResource = (
  target: BindingTarget,
  resource: PlannedResource,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* target.bind("plan", planBinding(resource))

    for (const dependencyId of resource.dependsOn) {
      yield* target.bind(bindingSid("depends-on", dependencyId), {
        kind: "depends-on",
        resourceId: resource.id,
        targetResourceId: dependencyId,
        summary: `Depends on ${dependencyId}`,
      })
    }

    for (const requirement of resource.evidenceRequirements) {
      yield* target.bind(bindingSid("evidence", requirement.id), {
        kind: "evidence-requirement",
        resourceId: resource.id,
        evidenceId: requirement.id,
        summary: requirement.summary,
        schema: requirement.schema,
        secret: requirement.secret,
      })
    }

    for (const action of resource.manualActions) {
      yield* target.bind(bindingSid("manual-action", action.id), {
        kind: "manual-action",
        resourceId: resource.id,
        actionId: action.id,
        actionKind: action.kind,
        summary: action.summary,
        ...(action.url === undefined ? {} : { url: action.url }),
        ...(action.command === undefined ? {} : { command: action.command }),
        ...(action.evidenceId === undefined ? {} : { evidenceId: action.evidenceId }),
      })
    }

    for (const secretRef of resource.secretRefs) {
      yield* target.bind(bindingSid("secret", secretRef), {
        kind: "secret-ref",
        resourceId: resource.id,
        ref: secretRef,
        secret: true,
        summary: `Requires secret material ${secretRef}`,
      })
    }

    for (const observed of resource.observes) {
      yield* target.bind(bindingSid("observes", observed), {
        kind: "observes",
        resourceId: resource.id,
        value: observed,
        summary: `Observes ${observed}`,
      })
    }
  })

const bindDeploymentSummary = (
  target: BindingTarget,
  plan: ReturnType<typeof createHomeDeploymentPlan>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* target.bind("plan-summary", {
      kind: "plan-summary",
      resourceId: "deployment",
      provider: "attune:alchemy:thinkcentre-day0-deployment",
      summary: `${plan.name}: ${plan.resources.length} planned lifecycle resources`,
    })

    for (const phase of [...new Set(plan.resources.map((resource) => resource.phase))]) {
      const phaseResources = plan.resources.filter((resource) => resource.phase === phase)
      const blocked = phaseResources.filter((resource) => resource.status === "blocked").length
      const ready = phaseResources.filter((resource) => resource.status === "ready").length
      const planned = phaseResources.filter((resource) => resource.status === "planned").length
      yield* target.bind(bindingSid("phase", phase), {
        kind: "phase-summary",
        resourceId: "deployment",
        phase,
        summary: `${phase}: ${phaseResources.length} resources, ${blocked} blocked, ${ready} ready, ${planned} planned`,
      })
    }
  })

const seedStateFromEnv = (statePath: string): void => {
  const confirmedGateIds = csv(process.env.ATTUNE_CONFIRMED_GATES)
  if (confirmedGateIds.length === 0) {
    return
  }

  const initial = readHomeDeploymentState(statePath)
  const next = confirmedGateIds.reduce(
    (state, gateId) => confirmGateInState(state, gateId, {
      kind: "env-confirmation",
      source: "ATTUNE_CONFIRMED_GATES",
    }),
    initial,
  )
  writeHomeDeploymentState(statePath, next)
}

export default Alchemy.Stack(
  "thinkcentre-day0",
  {
    providers: homeDeploymentProviders(),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const config = configFromEnv()
    const statePath = process.env.ATTUNE_DEPLOYMENT_STATE ?? defaultDay0StatePath
    seedStateFromEnv(statePath)

    const providerMode = providerModeFromEnv()
    const execute = process.env.ATTUNE_ALCHEMY_EXECUTE === "1"
    const props = {
      config,
      statePath,
      providerMode,
      execute,
      recordState: execute && providerMode === "Live" && process.env.ATTUNE_ALCHEMY_RECORD_STATE !== "0",
    }

    const state = readHomeDeploymentState(statePath)
    const plan = createHomeDeploymentPlan(config, gateStateFromHomeDeploymentState(state))
    const resources = new Map<string, { readonly id: Output<string> }>()

    for (const resource of plan.resources) {
      const dependencyOutputs = Object.fromEntries(
        resource.dependsOn
          .map((dependencyId) => {
            const dependency = resources.get(dependencyId)
            return dependency === undefined ? undefined : [alchemyResourceId(dependencyId), dependency.id] as const
          })
          .filter((dependency): dependency is readonly [string, Output<string>] => dependency !== undefined),
      )

      const output = yield* ThinkCentreDay0Resource(alchemyResourceId(resource.id), {
        ...props,
        resourceId: resource.id,
        resourceFingerprint: plannedResourceFingerprint(resource),
        dependencyOutputs,
      })
      yield* bindPlannedResource(output, resource)
      resources.set(resource.id, output)
    }

    const resourceOutputs = Object.fromEntries(
      [...resources].map(([resourceId, output]) => [alchemyResourceId(resourceId), output.id] as const),
    )
    const deployment = yield* ThinkCentreDay0Deployment("deployment", {
      ...props,
      planFingerprint: deploymentPlanFingerprint(plan),
      resourceOutputs,
    })
    yield* bindDeploymentSummary(deployment, plan)

    return {
      deployment,
      resourceIds: resourceOutputs,
    }
  }),
)
