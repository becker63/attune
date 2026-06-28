import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { Schema } from "effect"

import type { GateConfirmationState } from "./model.ts"

export const DeploymentEvidenceKind = Schema.Literals([
  "BuilderProbe",
  "LanDiscoveryScan",
  "MachineBinding",
  "UsbMediaSelection",
  "UsbMediaWrite",
  "DiskIdentityProbe",
  "DestructiveApproval",
  "TailscaleAuthReference",
  "TailscaleNodeObservation",
  "SopsSecretReference",
  "SopsRecipientRotation",
  "NixosAnywhereResult",
  "CominObservation",
  "NetworkSmoke",
])
export type DeploymentEvidenceKind = typeof DeploymentEvidenceKind.Type

export const LocalEvidenceRecord = Schema.Struct({
  id: Schema.String,
  kind: DeploymentEvidenceKind,
  resourceId: Schema.String,
  summary: Schema.String,
  ref: Schema.String,
  secret: Schema.Boolean,
  recordedAt: Schema.String,
})
export type LocalEvidenceRecord = typeof LocalEvidenceRecord.Type

export const ResourceExecutionRecordSchema = Schema.Struct({
  id: Schema.String,
  command: Schema.optional(Schema.Array(Schema.String)),
  display: Schema.optional(Schema.String),
  exitCode: Schema.optional(Schema.Number),
  stdout: Schema.optional(Schema.String),
  stderr: Schema.optional(Schema.String),
  startedAt: Schema.String,
  completedAt: Schema.String,
  dryRun: Schema.Boolean,
})

export interface ResourceExecutionRecord {
  readonly id: string
  readonly command?: readonly string[] | undefined
  readonly display?: string | undefined
  readonly exitCode?: number | undefined
  readonly stdout?: string | undefined
  readonly stderr?: string | undefined
  readonly startedAt: string
  readonly completedAt: string
  readonly dryRun: boolean
}

export const GateEvidenceRecordSchema = Schema.Struct({
  gateId: Schema.String,
  evidence: Schema.Unknown,
  confirmedAt: Schema.String,
})

export interface GateEvidenceRecord {
  readonly gateId: string
  readonly evidence: unknown
  readonly confirmedAt: string
}

export const HomeDeploymentStateSchema = Schema.Struct({
  confirmedGateIds: Schema.Array(Schema.String),
  completedResourceIds: Schema.Array(Schema.String),
  failedResourceIds: Schema.Array(Schema.String),
  records: Schema.Array(ResourceExecutionRecordSchema),
  gateEvidence: Schema.Array(GateEvidenceRecordSchema),
  evidence: Schema.Array(LocalEvidenceRecord),
})

export interface HomeDeploymentState {
  readonly confirmedGateIds: readonly string[]
  readonly completedResourceIds: readonly string[]
  readonly failedResourceIds: readonly string[]
  readonly records: readonly ResourceExecutionRecord[]
  readonly gateEvidence: readonly GateEvidenceRecord[]
  readonly evidence: readonly LocalEvidenceRecord[]
}

export const emptyHomeDeploymentState = (): HomeDeploymentState => ({
  confirmedGateIds: [],
  completedResourceIds: [],
  failedResourceIds: [],
  records: [],
  gateEvidence: [],
  evidence: [],
})

const uniqueSorted = (values: readonly string[]): readonly string[] => [...new Set(values)].sort()

export const readHomeDeploymentState = (statePath: string): HomeDeploymentState => {
  if (!existsSync(statePath)) {
    return emptyHomeDeploymentState()
  }

  const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<HomeDeploymentState>
  return Schema.decodeUnknownSync(HomeDeploymentStateSchema)({
    confirmedGateIds: uniqueSorted(parsed.confirmedGateIds ?? []),
    completedResourceIds: uniqueSorted(parsed.completedResourceIds ?? []),
    failedResourceIds: uniqueSorted(parsed.failedResourceIds ?? []),
    records: parsed.records ?? [],
    gateEvidence: parsed.gateEvidence ?? [],
    evidence: parsed.evidence ?? [],
  })
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
        gateEvidence: state.gateEvidence,
        evidence: state.evidence,
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
}

export const defaultStatePath = (): string =>
  resolve(process.env.ATTUNE_DEPLOYMENT_STATE ?? ".attune-deployment-state.json")

export const gateStateFromHomeDeploymentState = (state: HomeDeploymentState): GateConfirmationState => ({
  confirmedGateIds: new Set(state.confirmedGateIds),
  completedResourceIds: new Set(state.completedResourceIds),
  failedResourceIds: new Set(state.failedResourceIds),
})

export const confirmGateInState = (
  state: HomeDeploymentState,
  gateId: string,
  evidence: unknown = { kind: "operator-confirmation" },
): HomeDeploymentState => ({
  ...state,
  confirmedGateIds: uniqueSorted([...state.confirmedGateIds, gateId]),
  gateEvidence: [
    ...state.gateEvidence.filter((record) => record.gateId !== gateId),
    { gateId, evidence, confirmedAt: new Date().toISOString() },
  ],
})

export const recordLocalEvidence = (
  state: HomeDeploymentState,
  evidence: LocalEvidenceRecord,
): HomeDeploymentState => ({
  ...state,
  evidence: [
    ...state.evidence.filter((record) => record.id !== evidence.id),
    Schema.decodeUnknownSync(LocalEvidenceRecord)(evidence),
  ],
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
