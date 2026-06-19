import { Resource } from "alchemy"

import {
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  type DeploymentPhase,
  type GateConfirmationState,
  type HomeDeploymentConfig,
  type HomeDeploymentPlan,
  type PlannedResource,
} from "./model.js"

export interface AttuneHomeDeploymentProps {
  readonly config?: HomeDeploymentConfig
  readonly gateState?: GateConfirmationState
}

export interface AttuneHomeDeploymentOutput {
  readonly provider: "attune:alchemy:home-deployment"
  readonly id: string
  readonly plan: HomeDeploymentPlan
  readonly phases: readonly DeploymentPhase[]
  readonly byPhase: Readonly<Record<string, {
    readonly planned: number
    readonly ready: number
    readonly blocked: number
  }>>
  readonly blocked: readonly PlannedResource[]
  readonly planned: readonly PlannedResource[]
  readonly ready: readonly PlannedResource[]
  readonly next?: PlannedResource
}

const summarizeByPhase = (resources: readonly PlannedResource[]): AttuneHomeDeploymentOutput["byPhase"] =>
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

export const AttuneHomeDeployment = Resource(
  "attune:alchemy:HomeDeployment",
  async function (id: string, props: AttuneHomeDeploymentProps = {}): Promise<AttuneHomeDeploymentOutput> {
    if (this.phase === "delete") {
      return this.destroy()
    }

    const plan = createHomeDeploymentPlan(props.config ?? defaultHomeDeploymentConfig(), props.gateState)
    const blocked = plan.resources.filter((resource) => resource.status === "blocked")
    const next = blocked[0]
    const output: AttuneHomeDeploymentOutput = {
      provider: "attune:alchemy:home-deployment",
      id,
      plan,
      phases: [...new Set(plan.resources.map((resource) => resource.phase))],
      byPhase: summarizeByPhase(plan.resources),
      blocked,
      planned: plan.resources.filter((resource) => resource.status === "planned"),
      ready: plan.resources.filter((resource) => resource.status === "ready"),
      ...(next === undefined ? {} : { next }),
    }

    return this.create(output)
  },
)
