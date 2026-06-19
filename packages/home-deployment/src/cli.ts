#!/usr/bin/env node
import {
  confirmGateInState,
  createHomeDeploymentPlan,
  defaultHomeDeploymentConfig,
  defaultStatePath,
  readHomeDeploymentState,
  reconcileHomeDeployment,
  type DeploymentPhase,
  type PlannedResource,
  writeHomeDeploymentState,
} from "./index.js"

const planFromState = () =>
  {
    const state = readHomeDeploymentState(defaultStatePath())
    return createHomeDeploymentPlan(defaultHomeDeploymentConfig(), {
      confirmedGateIds: new Set(state.confirmedGateIds),
      completedResourceIds: new Set(state.completedResourceIds),
      failedResourceIds: new Set(state.failedResourceIds),
    })
  }

const hasFlag = (flag: string): boolean => process.argv.includes(flag)

const optionValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }
  return process.argv[index + 1]
}

const printJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2))
}

const printResource = (resource: PlannedResource): void => {
  const status = resource.status.toUpperCase().padEnd(7)
  console.log(`${status} ${resource.kind.padEnd(22)} ${resource.id}`)
  console.log(`        ${resource.summary}`)

  if (resource.blockedReason !== undefined) {
    console.log(`        blocked: ${resource.blockedReason}`)
  }

  if (resource.command !== undefined) {
    console.log(`        command: ${resource.command.display}`)
  }
}

const printPlan = (): void => {
  const plan = planFromState()
  if (hasFlag("--json")) {
    printJson({ statePath: defaultStatePath(), plan })
    return
  }

  console.log(`Attune home deployment plan: ${plan.name}`)
  console.log(`State: ${defaultStatePath()}`)
  console.log("")

  for (const resource of plan.resources) {
    printResource(resource)
  }
}

const printStatus = (): void => {
  const plan = planFromState()
  const blocked = plan.resources.filter((resource) => resource.status === "blocked")
  const planned = plan.resources.filter((resource) => resource.status === "planned")
  const ready = plan.resources.filter((resource) => resource.status === "ready")
  const byPhase = Object.fromEntries(
    [...new Set(plan.resources.map((resource) => resource.phase))].map((phase) => [
      phase,
      {
        planned: plan.resources.filter((resource) => resource.phase === phase && resource.status === "planned").length,
        ready: plan.resources.filter((resource) => resource.phase === phase && resource.status === "ready").length,
        blocked: plan.resources.filter((resource) => resource.phase === phase && resource.status === "blocked").length,
      },
    ]),
  )

  if (hasFlag("--json")) {
    printJson({
      statePath: defaultStatePath(),
      planned: planned.length,
      ready: ready.length,
      blocked: blocked.length,
      byPhase,
      next: blocked[0],
    })
    return
  }

  console.log(`Attune home deployment status: ${plan.name}`)
  console.log(`planned=${planned.length} ready=${ready.length} blocked=${blocked.length}`)

  const next = blocked[0]
  if (next !== undefined) {
    console.log("")
    console.log("Next gate/action:")
    printResource(next)
  }
}

const confirmGate = (gateId: string | undefined): void => {
  if (gateId === undefined || gateId.length === 0) {
    console.error("Usage: attune-home confirm <gate-id>")
    process.exitCode = 1
    return
  }

  const statePath = defaultStatePath()
  const state = confirmGateInState(readHomeDeploymentState(statePath), gateId)
  writeHomeDeploymentState(statePath, state)
  console.log(`Confirmed gate: ${gateId}`)
  console.log(`State: ${statePath}`)
}

const printPhases = (): void => {
  const plan = planFromState()
  const phases = [...new Set(plan.resources.map((resource) => resource.phase))]
  if (hasFlag("--json")) {
    printJson(phases)
    return
  }
  for (const phase of phases) {
    console.log(phase)
  }
}

const printState = (): void => {
  const state = readHomeDeploymentState(defaultStatePath())
  if (hasFlag("--json")) {
    printJson({
      statePath: defaultStatePath(),
      state,
    })
    return
  }

  console.log(`State: ${defaultStatePath()}`)
  console.log(`confirmed gates: ${state.confirmedGateIds.length}`)
  console.log(`completed resources: ${state.completedResourceIds.length}`)
  console.log(`failed resources: ${state.failedResourceIds.length}`)
  if (state.failedResourceIds.length > 0) {
    console.log("")
    console.log("Failed:")
    for (const id of state.failedResourceIds) {
      console.log(`  ${id}`)
    }
  }
}

const reconcile = async (): Promise<void> => {
  const phase = optionValue("--phase") as DeploymentPhase | undefined
  const resourceId = optionValue("--resource")
  const options = {
    statePath: defaultStatePath(),
    apply: hasFlag("--apply"),
    allowDestructive: hasFlag("--allow-destructive"),
    ...(phase === undefined ? {} : { phase }),
    ...(resourceId === undefined ? {} : { resourceId }),
  }
  const result = await reconcileHomeDeployment(options)

  if (hasFlag("--json")) {
    printJson(result)
    return
  }

  console.log(`Attune home deployment reconcile (${result.dryRun ? "dry-run" : "apply"})`)
  console.log(`State: ${result.statePath}`)
  console.log(`selected=${result.selected.length} applied=${result.applied.length} blocked=${result.blocked.length}`)
  for (const resource of result.selected) {
    printResource(resource)
  }
  if (result.selected.length === 0) {
    const next = result.blocked[0]
    if (next !== undefined) {
      console.log("")
      console.log("Next blocked gate/action:")
      printResource(next)
    }
  }
}

const command = process.argv[2] ?? "plan"

try {
  switch (command) {
    case "plan":
      printPlan()
      break
    case "status":
      printStatus()
      break
    case "phases":
      printPhases()
      break
    case "state":
      printState()
      break
    case "confirm":
      confirmGate(process.argv[3])
      break
    case "reconcile":
      await reconcile()
      break
    default:
      console.error(`Unknown command: ${command}`)
      console.error("Usage: attune-home <plan|status|phases|state|confirm|reconcile>")
      process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
