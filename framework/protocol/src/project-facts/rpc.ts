import { Schema } from "effect"

import type {
  AttunePackageContract,
  AttuneOperationContract,
  InputOf,
  OperationById,
  OperationIds,
  OutputOf,
  PackageIdOf,
} from "./core.js"

export const ProgramObservationRpcControlIds = [
  "reset",
  "snapshot",
  "observe",
  "flush-evidence",
  "replay-counterexample",
  "get-coverage",
  "get-atom-graph",
] as const

export const ProgramObservationRpcControlIdSchema = Schema.Literals(ProgramObservationRpcControlIds)
export type ProgramObservationRpcControlId = typeof ProgramObservationRpcControlIdSchema.Type

export const RpcDescriptorKindSchema = Schema.Literals(["operation", "control"] as const)
export type RpcDescriptorKind = typeof RpcDescriptorKindSchema.Type

export const RpcSchemaDescriptorRoleSchema = Schema.Literals([
  "payload",
  "success",
  "error",
  "evidence",
  "replay",
] as const)
export type RpcSchemaDescriptorRole = typeof RpcSchemaDescriptorRoleSchema.Type

export const RpcSchemaDescriptorSchema = Schema.Struct({
  role: RpcSchemaDescriptorRoleSchema,
  schemaId: Schema.String,
  source: Schema.String,
  operationId: Schema.optional(Schema.String),
  controlId: Schema.optional(ProgramObservationRpcControlIdSchema),
})
export type RpcSchemaDescriptor = typeof RpcSchemaDescriptorSchema.Type

export const EffectRpcAdapterCompatibilitySchema = Schema.Struct({
  adapter: Schema.Literals(["@effect/rpc"] as const),
  status: Schema.Literals(["blocked", "available"] as const),
  reason: Schema.String,
  peerSurface: Schema.optional(Schema.String),
})
export type EffectRpcAdapterCompatibility = typeof EffectRpcAdapterCompatibilitySchema.Type

export const EffectRpcAdapterCompatibility: EffectRpcAdapterCompatibility = {
  adapter: "@effect/rpc",
  status: "blocked",
  reason: "Direct @effect/rpc runtime import is blocked until its peer surface matches the repository Effect 4 beta.",
  peerSurface: "effect@4.0.0-beta.78 with @effect/rpc@0.75.1",
}

export const RpcDescriptorSchema = Schema.Struct({
  rpcId: Schema.String,
  kind: RpcDescriptorKindSchema,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  controlId: Schema.optional(ProgramObservationRpcControlIdSchema),
  payload: RpcSchemaDescriptorSchema,
  success: RpcSchemaDescriptorSchema,
  error: Schema.optional(RpcSchemaDescriptorSchema),
  evidence: RpcSchemaDescriptorSchema,
  replay: RpcSchemaDescriptorSchema,
})
export type RpcDescriptor = typeof RpcDescriptorSchema.Type

export const ProgramObservationRpcGroupDescriptorSchema = Schema.Struct({
  packageId: Schema.String,
  groupId: Schema.String,
  adapterCompatibility: EffectRpcAdapterCompatibilitySchema,
  controls: Schema.Array(RpcDescriptorSchema),
  operations: Schema.Array(RpcDescriptorSchema),
})
export type ProgramObservationRpcGroupDescriptor = typeof ProgramObservationRpcGroupDescriptorSchema.Type

export type ProgramObservationRpcGroupId<PackageId extends string> = `${PackageId}.ProgramObservationRpc`
export type OperationRpcId<PackageId extends string, OperationId extends string> =
  `${PackageId}.operation.${OperationId}`
export type ControlRpcId<PackageId extends string, ControlId extends ProgramObservationRpcControlId> =
  `${PackageId}.control.${ControlId}`

export type OperationRpcDescriptor<
  Contract extends AttunePackageContract,
  OperationId extends OperationIds<Contract> = OperationIds<Contract>,
> = Omit<RpcDescriptor, "kind" | "packageId" | "operationId" | "controlId" | "rpcId"> & {
  readonly kind: "operation"
  readonly packageId: PackageIdOf<Contract>
  readonly operationId: OperationId
  readonly rpcId: OperationRpcId<PackageIdOf<Contract>, OperationId>
}

export type ControlRpcDescriptor<
  PackageId extends string,
  ControlId extends ProgramObservationRpcControlId = ProgramObservationRpcControlId,
> = Omit<RpcDescriptor, "kind" | "packageId" | "operationId" | "controlId" | "rpcId"> & {
  readonly kind: "control"
  readonly packageId: PackageId
  readonly controlId: ControlId
  readonly rpcId: ControlRpcId<PackageId, ControlId>
}

export type OperationRpcDescriptors<Contract extends AttunePackageContract> = {
  readonly [OperationId in OperationIds<Contract>]: OperationRpcDescriptor<Contract, OperationId>
}[OperationIds<Contract>]

export type ControlRpcDescriptors<PackageId extends string> = {
  readonly [ControlId in ProgramObservationRpcControlId]: ControlRpcDescriptor<PackageId, ControlId>
}[ProgramObservationRpcControlId]

export interface ProgramObservationRpcGroup<Contract extends AttunePackageContract> {
  readonly packageId: PackageIdOf<Contract>
  readonly groupId: ProgramObservationRpcGroupId<PackageIdOf<Contract>>
  readonly adapterCompatibility: EffectRpcAdapterCompatibility
  readonly controls: readonly ControlRpcDescriptors<PackageIdOf<Contract>>[]
  readonly operations: readonly OperationRpcDescriptors<Contract>[]
}

export type OperationRpcDescriptorRegistry<Contract extends AttunePackageContract> = {
  readonly [OperationId in OperationIds<Contract>]: OperationRpcDescriptor<Contract, OperationId>
}

export type ControlRpcDescriptorRegistry<PackageId extends string> = {
  readonly [ControlId in ProgramObservationRpcControlId]: ControlRpcDescriptor<PackageId, ControlId>
}

export interface OperationRpcHandlerContext<
  Contract extends AttunePackageContract,
  OperationId extends OperationIds<Contract>,
  programTestLayer,
> {
  readonly contract: Contract
  readonly operation: OperationById<Contract, OperationId>
  readonly rpc: OperationRpcDescriptor<Contract, OperationId>
  readonly programTestLayer: programTestLayer
}

export type OperationRpcHandler<
  Contract extends AttunePackageContract,
  OperationId extends OperationIds<Contract>,
  programTestLayer = unknown,
> = (
  payload: InputOf<Contract, OperationId>,
  context: OperationRpcHandlerContext<Contract, OperationId, programTestLayer>,
) => OutputOf<Contract, OperationId> | Promise<OutputOf<Contract, OperationId>>

export type OperationRpcHandlerMap<
  Contract extends AttunePackageContract,
  programTestLayer = unknown,
> = {
  readonly [OperationId in OperationIds<Contract>]: OperationRpcHandler<Contract, OperationId, programTestLayer>
}

export interface ProgramObservationRpcHandlerRegistry<
  Contract extends AttunePackageContract,
  programTestLayer,
  Handlers extends OperationRpcHandlerMap<Contract, programTestLayer> = OperationRpcHandlerMap<
    Contract,
    programTestLayer
  >,
> {
  readonly packageId: PackageIdOf<Contract>
  readonly group: ProgramObservationRpcGroup<Contract>
  readonly programTestLayer: programTestLayer
  readonly operationIds: readonly OperationIds<Contract>[]
  readonly handlers: Handlers
}

export const defineProgramObservationRpcGroup = <const Contract extends AttunePackageContract>(
  contract: Contract,
): ProgramObservationRpcGroup<Contract> => {
  const group = {
    packageId: contract.packageId,
    groupId: `${contract.packageId}.ProgramObservationRpc`,
    adapterCompatibility: EffectRpcAdapterCompatibility,
    controls: ProgramObservationRpcControlIds.map((controlId) => controlRpcDescriptor(contract.packageId, controlId)),
    operations: contract.operations.map((operation) => operationRpcDescriptor(contract.packageId, operation)),
  }

  Schema.decodeUnknownSync(ProgramObservationRpcGroupDescriptorSchema)(group)
  return group as ProgramObservationRpcGroup<Contract>
}

export const operationRpcRegistry = <const Contract extends AttunePackageContract>(
  group: ProgramObservationRpcGroup<Contract>,
): OperationRpcDescriptorRegistry<Contract> =>
  Object.fromEntries(group.operations.map((descriptor) => [descriptor.operationId, descriptor])) as
    OperationRpcDescriptorRegistry<Contract>

export const controlRpcRegistry = <const PackageId extends string>(
  group: { readonly controls: readonly ControlRpcDescriptors<PackageId>[] },
): ControlRpcDescriptorRegistry<PackageId> =>
  Object.fromEntries(group.controls.map((descriptor) => [descriptor.controlId, descriptor])) as
    ControlRpcDescriptorRegistry<PackageId>

export const operationRpcDescriptorById = <
  const Contract extends AttunePackageContract,
  const OperationId extends OperationIds<Contract>,
>(
  group: ProgramObservationRpcGroup<Contract>,
  operationId: OperationId,
): OperationRpcDescriptor<Contract, OperationId> => {
  const descriptor = operationRpcRegistry(group)[operationId]
  if (!descriptor) {
    throw new Error(`Missing program observation RPC descriptor for operation "${operationId}"`)
  }
  return descriptor
}

export const controlRpcDescriptorById = <
  const PackageId extends string,
  const ControlId extends ProgramObservationRpcControlId,
>(
  group: { readonly controls: readonly ControlRpcDescriptors<PackageId>[] },
  controlId: ControlId,
): ControlRpcDescriptor<PackageId, ControlId> => {
  const descriptor = controlRpcRegistry(group)[controlId]
  if (!descriptor) {
    throw new Error(`Missing program observation control RPC descriptor for control "${controlId}"`)
  }
  return descriptor
}

export const defineProgramObservationRpcHandlerRegistry = <
  const Contract extends AttunePackageContract,
  const programTestLayer,
  const Handlers extends OperationRpcHandlerMap<Contract, programTestLayer>,
>(
  contract: Contract,
  programTestLayer: programTestLayer,
  handlers: Handlers,
): ProgramObservationRpcHandlerRegistry<Contract, programTestLayer, Handlers> => ({
  packageId: contract.packageId,
  group: defineProgramObservationRpcGroup(contract),
  programTestLayer,
  operationIds: contract.operations.map((operation) => operation.id) as readonly OperationIds<Contract>[],
  handlers,
})

const schemaDescriptor = (
  role: RpcSchemaDescriptorRole,
  schemaId: string,
  source: string,
  options: { readonly operationId?: string; readonly controlId?: ProgramObservationRpcControlId } = {},
): RpcSchemaDescriptor => {
  const descriptor = {
    role,
    schemaId,
    source,
    ...(options.operationId !== undefined ? { operationId: options.operationId } : {}),
    ...(options.controlId !== undefined ? { controlId: options.controlId } : {}),
  }
  return Schema.decodeUnknownSync(RpcSchemaDescriptorSchema)(descriptor)
}

const operationRpcDescriptor = (
  packageId: string,
  operation: AttuneOperationContract,
): RpcDescriptor => {
  const base = {
    rpcId: `${packageId}.operation.${operation.id}`,
    kind: "operation" as const,
    packageId,
    operationId: operation.id,
    payload: schemaDescriptor("payload", `${packageId}.${operation.id}.input`, "operation.input", {
      operationId: operation.id,
    }),
    success: schemaDescriptor("success", `${packageId}.${operation.id}.output`, "operation.output", {
      operationId: operation.id,
    }),
    evidence: schemaDescriptor("evidence", `${packageId}.${operation.id}.evidence`, "harness.evidence", {
      operationId: operation.id,
    }),
    replay: schemaDescriptor("replay", `${packageId}.${operation.id}.replay`, "harness.replay", {
      operationId: operation.id,
    }),
  }

  const descriptor = operation.error === undefined
    ? base
    : {
      ...base,
      error: schemaDescriptor("error", `${packageId}.${operation.id}.error`, "operation.error", {
        operationId: operation.id,
      }),
    }
  return Schema.decodeUnknownSync(RpcDescriptorSchema)(descriptor)
}

const controlRpcDescriptor = (
  packageId: string,
  controlId: ProgramObservationRpcControlId,
): RpcDescriptor => {
  const descriptor = {
    rpcId: `${packageId}.control.${controlId}`,
    kind: "control" as const,
    packageId,
    controlId,
    payload: schemaDescriptor("payload", `${packageId}.control.${controlId}.payload`, `control.${controlId}.payload`, {
      controlId,
    }),
    success: schemaDescriptor("success", `${packageId}.control.${controlId}.success`, `control.${controlId}.success`, {
      controlId,
    }),
    error: schemaDescriptor("error", `${packageId}.control.${controlId}.error`, `control.${controlId}.error`, {
      controlId,
    }),
    evidence: schemaDescriptor("evidence", `${packageId}.control.${controlId}.evidence`, "harness.evidence", {
      controlId,
    }),
    replay: schemaDescriptor("replay", `${packageId}.control.${controlId}.replay`, "harness.replay", {
      controlId,
    }),
  }
  return Schema.decodeUnknownSync(RpcDescriptorSchema)(descriptor)
}
