import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import {
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

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

export const HomeDeploymentStatePathAddress = Schema.Struct({
  statePath: Schema.String,
})
export type HomeDeploymentStatePathAddress = typeof HomeDeploymentStatePathAddress.Type

export const HomeDeploymentStateMutationInput = Schema.Struct({
  statePath: Schema.String,
  state: HomeDeploymentStateSchema,
})
export type HomeDeploymentStateMutationInput = typeof HomeDeploymentStateMutationInput.Type

export const HomeDeploymentStateMutationOutput = Schema.Struct({
  statePath: Schema.String,
  confirmedGateCount: Schema.Number,
  completedResourceCount: Schema.Number,
  failedResourceCount: Schema.Number,
  recordCount: Schema.Number,
})
export type HomeDeploymentStateMutationOutput = typeof HomeDeploymentStateMutationOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentStateFileResource = defineAlchemyResource({
  id: "canopy.home-deployment-state.file.resource",
  kind: "file",
  alchemyType: "attune:canopy:HomeDeploymentStateFile",
  ownerRecipeId: "canopy.home-deployment-state",
  producedBy: ["canopy.home-deployment-state"],
  consumedBy: ["canopy.home-deployment", "canopy.observed-state"],
  addressFields: ["statePath"],
  addressSchema: HomeDeploymentStatePathAddress as never,
  stateSchema: HomeDeploymentStateSchema as never,
  modes: ["read", "write", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentStateAlchemyBinding = defineManagedRecipeAlchemyBinding({
  id: "canopy.home-deployment-state.alchemy",
  managedRecipeId: "canopy.home-deployment-state",
  alchemyResourceType: "attune:canopy:HomeDeploymentStateFile",
  providerId: "canopy.home-deployment-state.store",
  resource: HomeDeploymentStateFileResource,
  lifecycle: {
    plan: "read",
    read: "read",
    check: "read",
    apply: "write",
  },
  bindings: ["HomeDeploymentStateStoreLive"],
})

export interface HomeDeploymentStateStoreService {
  readonly read: (statePath: string) => HomeDeploymentState
  readonly write: (statePath: string, state: HomeDeploymentState) => void
}

export class HomeDeploymentStateStore extends Context.Service<
  HomeDeploymentStateStore,
  HomeDeploymentStateStoreService
>()("@attune/home-deployment/HomeDeploymentStateStore") {}

export const HomeDeploymentStateStoreLive = Layer.succeed(HomeDeploymentStateStore, {
  read: readHomeDeploymentState,
  write: writeHomeDeploymentState,
})

export const HomeDeploymentStateStoreLayer = defineRecipeLayer({
  id: "canopy.home-deployment-state.layer",
  sourcePath: "packages/canopy/home-deployment/src/state.ts",
  exportName: "HomeDeploymentStateStoreLive",
  layer: HomeDeploymentStateStoreLive as never,
  provides: [{
    id: "canopy.home-deployment-state.store",
    service: HomeDeploymentStateStore as never,
  }],
})

export const persistHomeDeploymentState = (
  store: HomeDeploymentStateStoreService,
  input: HomeDeploymentStateMutationInput,
): HomeDeploymentStateMutationOutput => {
  store.write(input.statePath, input.state)
  return {
    statePath: input.statePath,
    confirmedGateCount: input.state.confirmedGateIds.length,
    completedResourceCount: input.state.completedResourceIds.length,
    failedResourceCount: input.state.failedResourceIds.length,
    recordCount: input.state.records.length,
  }
}

export const HomeDeploymentStateMutationHandler = defineRecipeHandler<
  HomeDeploymentStateMutationInput,
  HomeDeploymentStateMutationOutput,
  never,
  HomeDeploymentStateStore
>({
  id: "canopy.home-deployment-state.handler",
  recipeId: "canopy.home-deployment-state",
  sourcePath: "packages/canopy/home-deployment/src/state.ts",
  exportName: "persistHomeDeploymentState",
  handler: (input) =>
    Effect.gen(function* () {
      const store = yield* HomeDeploymentStateStore
      return persistHomeDeploymentState(store, input)
    }) as never,
  layer: HomeDeploymentStateStoreLayer,
  emitsReceipts: ["canopy.home-deployment-state.persisted"],
})

export const HomeDeploymentStateManagedRecipe = defineManagedRecipe({
  id: "canopy.home-deployment-state",
  projectId: "home-deployment",
  title: "Manage Canopy local deployment state file",
  inputSchema: HomeDeploymentStateMutationInput as never,
  outputSchema: HomeDeploymentStateMutationOutput as never,
  nxTarget: "home-deployment:test",
  allowedFiles: ["packages/canopy/home-deployment/src/state.ts"],
  validationEvidence: ["home-deployment:test"],
  io: {
    inputSchema: HomeDeploymentStateMutationInput as never,
    outputSchema: HomeDeploymentStateMutationOutput as never,
    inputResources: [HomeDeploymentStateFileResource],
    outputResources: [HomeDeploymentStateFileResource],
  },
  handler: HomeDeploymentStateMutationHandler as never,
  alchemy: HomeDeploymentStateAlchemyBinding,
  lifecycleSubstrates: [{
    id: "canopy.home-deployment-state.node-fs",
    kind: "container-runtime",
    tool: "node:fs",
    lifecycleActions: ["plan", "apply", "check"],
    nxTarget: "home-deployment:test",
    evidence: ["home-deployment:test"],
  }],
  lifecycle: ["plan", "apply", "check"],
  resourceKind: "home-deployment-state-file",
  observedState: { status: "unknown" },
  humanReviewRequired: true,
})

export const HomeDeploymentStateRecipes = [HomeDeploymentStateManagedRecipe] as const
