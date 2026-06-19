import alchemy, { Resource } from "alchemy"

import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  type DeploymentPhase,
  type GateConfirmationState,
  type HomeDeploymentConfig,
  type PlannedResource,
} from "./model.js"
import { executeLiveProviderTransition } from "./providers.js"
import {
  completeResourceInState,
  failResourceInState,
  readHomeDeploymentState,
  type HomeDeploymentState,
  type ResourceExecutionRecord,
  writeHomeDeploymentState,
} from "./state.js"

export interface ReconcileOptions {
  readonly config?: HomeDeploymentConfig
  readonly statePath: string
  readonly phase?: DeploymentPhase
  readonly resourceId?: string
  readonly apply?: boolean
  readonly allowDestructive?: boolean
  readonly stage?: string
}

export interface ReconcileResult {
  readonly provider: "attune:alchemy:home-deployment"
  readonly dryRun: boolean
  readonly statePath: string
  readonly selected: readonly PlannedResource[]
  readonly skipped: readonly PlannedResource[]
  readonly applied: readonly StepExecutionOutput[]
  readonly blocked: readonly PlannedResource[]
}

export interface StepExecutionProps {
  readonly resource: PlannedResource
  readonly dryRun: boolean
  readonly allowDestructive: boolean
}

export interface StepExecutionOutput extends ResourceExecutionRecord {
  readonly provider: "attune:alchemy:home-deployment-step"
  readonly resourceKind: PlannedResource["kind"]
  readonly phase: DeploymentPhase
}

const now = (): string => new Date().toISOString()

export const AttuneDeploymentStep = Resource(
  "attune:alchemy:HomeDeploymentStep",
  async function (_id: string, props: StepExecutionProps): Promise<StepExecutionOutput> {
    if (this.phase === "delete") {
      return this.destroy()
    }

    const startedAt = now()
    const command = props.resource.command
    if (props.resource.destructive === true && !props.allowDestructive) {
      throw new Error(`Resource ${props.resource.id} is destructive; pass --allow-destructive to reconcile it.`)
    }

    if (command === undefined || props.dryRun) {
      return this.create({
        provider: "attune:alchemy:home-deployment-step",
        id: props.resource.id,
        resourceKind: props.resource.kind,
        phase: props.resource.phase,
        command: command?.argv,
        display: command?.display,
        startedAt,
        completedAt: now(),
        dryRun: true,
      })
    }

    const result = await executeLiveProviderTransition(props.resource, this.scope)

    return this.create({
      provider: "attune:alchemy:home-deployment-step",
      id: props.resource.id,
      resourceKind: props.resource.kind,
      phase: props.resource.phase,
      command: command.argv,
      display: command.display,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      startedAt,
      completedAt: now(),
      dryRun: false,
    })
  },
)

const toGateState = (state: HomeDeploymentState): GateConfirmationState => ({
  confirmedGateIds: new Set(state.confirmedGateIds),
  completedResourceIds: new Set(state.completedResourceIds),
  failedResourceIds: new Set(state.failedResourceIds),
})

const selectResources = (
  resources: readonly PlannedResource[],
  options: Pick<ReconcileOptions, "phase" | "resourceId">,
): readonly PlannedResource[] =>
  resources.filter((resource) => {
    if (resource.status !== "planned") {
      return false
    }
    if (options.resourceId !== undefined) {
      return resource.id === options.resourceId
    }
    if (options.phase !== undefined) {
      return resource.phase === options.phase
    }
    return true
  })

export const reconcileHomeDeployment = async (options: ReconcileOptions): Promise<ReconcileResult> => {
  const config = options.config ?? defaultHomeDeploymentConfig()
  let state = readHomeDeploymentState(options.statePath)
  const plan = createHomeDeploymentPlan(config, toGateState(state))
  const selected = selectResources(plan.resources, options)
  const skipped = plan.resources.filter((resource) => resource.status === "planned" && !selected.includes(resource))
  const blocked = plan.resources.filter((resource) => resource.status === "blocked")
  const applied: StepExecutionOutput[] = []

  await alchemy.run(
    "attune-home-deployment",
    {
      stage: options.stage ?? "local",
      phase: "up",
      quiet: true,
      rootDir: process.cwd(),
    },
    async () => {
      for (const resource of selected) {
        try {
          const output = await AttuneDeploymentStep(resource.id, {
            resource,
            dryRun: options.apply !== true,
            allowDestructive: options.allowDestructive === true,
          })
          applied.push(output)
          if (options.apply === true) {
            state = completeResourceInState(state, output)
            writeHomeDeploymentState(options.statePath, state)
          }
        } catch (error) {
          const record: ResourceExecutionRecord = {
            id: resource.id,
            stderr: error instanceof Error ? error.message : String(error),
            startedAt: now(),
            completedAt: now(),
            dryRun: options.apply !== true,
            ...(resource.command === undefined
              ? {}
              : {
                  command: resource.command.argv,
                  display: resource.command.display,
                }),
          }
          if (options.apply === true) {
            state = failResourceInState(state, record)
            writeHomeDeploymentState(options.statePath, state)
          }
          throw error
        }
      }
    },
  )

  return {
    provider: "attune:alchemy:home-deployment",
    dryRun: options.apply !== true,
    statePath: options.statePath,
    selected,
    skipped,
    applied,
    blocked,
  }
}
