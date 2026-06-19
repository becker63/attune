import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { mkdirSync } from "node:fs"

export interface ResourceExecutionRecord {
  readonly id: string
  readonly command?: readonly string[]
  readonly display?: string
  readonly exitCode?: number
  readonly stdout?: string
  readonly stderr?: string
  readonly startedAt: string
  readonly completedAt: string
  readonly dryRun: boolean
}

export interface HomeDeploymentState {
  readonly confirmedGateIds: readonly string[]
  readonly completedResourceIds: readonly string[]
  readonly failedResourceIds: readonly string[]
  readonly records: readonly ResourceExecutionRecord[]
}

export const emptyHomeDeploymentState = (): HomeDeploymentState => ({
  confirmedGateIds: [],
  completedResourceIds: [],
  failedResourceIds: [],
  records: [],
})

const uniqueSorted = (values: readonly string[]): readonly string[] => [...new Set(values)].sort()

export const readHomeDeploymentState = (statePath: string): HomeDeploymentState => {
  if (!existsSync(statePath)) {
    return emptyHomeDeploymentState()
  }

  const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<HomeDeploymentState>
  return {
    confirmedGateIds: uniqueSorted(parsed.confirmedGateIds ?? []),
    completedResourceIds: uniqueSorted(parsed.completedResourceIds ?? []),
    failedResourceIds: uniqueSorted(parsed.failedResourceIds ?? []),
    records: parsed.records ?? [],
  }
}

export const writeHomeDeploymentState = (statePath: string, state: HomeDeploymentState): void => {
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        confirmedGateIds: uniqueSorted(state.confirmedGateIds),
        completedResourceIds: uniqueSorted(state.completedResourceIds),
        failedResourceIds: uniqueSorted(state.failedResourceIds),
        records: state.records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
}

export const defaultStatePath = (): string => resolve(process.env.ATTUNE_HOME_STATE ?? ".attune-home-state.json")

export const confirmGateInState = (state: HomeDeploymentState, gateId: string): HomeDeploymentState => ({
  ...state,
  confirmedGateIds: uniqueSorted([...state.confirmedGateIds, gateId]),
})

export const completeResourceInState = (
  state: HomeDeploymentState,
  record: ResourceExecutionRecord,
): HomeDeploymentState => ({
  ...state,
  completedResourceIds: uniqueSorted([...state.completedResourceIds, record.id]),
  failedResourceIds: state.failedResourceIds.filter((id) => id !== record.id),
  records: [...state.records.filter((item) => item.id !== record.id), record],
})

export const failResourceInState = (
  state: HomeDeploymentState,
  record: ResourceExecutionRecord,
): HomeDeploymentState => ({
  ...state,
  completedResourceIds: state.completedResourceIds.filter((id) => id !== record.id),
  failedResourceIds: uniqueSorted([...state.failedResourceIds, record.id]),
  records: [...state.records.filter((item) => item.id !== record.id), record],
})
