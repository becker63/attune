import {
  AttuneProtocolEvidenceEventSchema,
  PackageFuzzRpcControlIds,
  controlRpcDescriptorById,
  definePackageFuzzRpcGroup,
  operationRpcDescriptorById,
  type AttuneProtocolEvidenceEvent,
  type ControlRpcDescriptor,
  type OperationById,
  type OperationIds,
  type OperationRpcDescriptor,
  type PackageFuzzRpcControlId,
  type PackageFuzzRpcGroup,
  type PackageIdOf,
  type InputOf,
  type OutputOf,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  atomMovementEvidence,
  type AtomGraphObserver,
} from "./atom-graph-observer.js"
import {
  defineEvidenceProducerMap,
  evidenceEvent,
  type EvidenceEventInput,
  type EvidenceProducerMap,
  type EvidenceProducerContext,
  type TypeGuidancePartitionEvidenceStatus,
  typeGuidancePartitionEvidence,
} from "./evidence-producer.js"
import {
  checkFastCheckProperty,
  type FastCheckPropertyEvidence,
  type FastCheckPropertyInput,
  type PropertyValidationHook,
} from "./fastcheck.js"
import {
  defineOperationRegistry,
  operationIdsFromTuple,
  type OperationRegistry,
} from "./operation-registry.js"
import {
  ReplayMetadataSchema,
  type ReplayMetadata,
} from "./replay-metadata.js"
import type { WorkerEvidenceMetadata } from "./worker-metadata.js"

export type PackageHarnessContract = Parameters<typeof definePackageFuzzRpcGroup>[0]

export const PackageHarnessInvocationSchema = Schema.Struct({
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.String,
  rpcId: Schema.optionalKey(Schema.String),
  payload: Schema.Unknown,
  replay: Schema.optionalKey(ReplayMetadataSchema),
  worker: Schema.optionalKey(Schema.Unknown),
})
export type PackageHarnessInvocation = typeof PackageHarnessInvocationSchema.Type

export const PackageHarnessExitSchema = Schema.Struct({
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.String,
  rpcId: Schema.optionalKey(Schema.String),
  status: Schema.Literals(["success", "typed-error", "defect"] as const),
  success: Schema.optionalKey(Schema.Unknown),
  encodedSuccess: Schema.optionalKey(Schema.Unknown),
  error: Schema.optionalKey(Schema.Unknown),
  encodedError: Schema.optionalKey(Schema.Unknown),
  evidence: Schema.Array(AttuneProtocolEvidenceEventSchema),
  replay: Schema.optionalKey(ReplayMetadataSchema),
})
export type PackageHarnessExit = typeof PackageHarnessExitSchema.Type

export type PackageHarnessInvokeOptions = Readonly<{
  readonly observedAt?: string
  readonly propertyId?: string
  readonly replay?: ReplayMetadata
  readonly runId?: string
  readonly typeGuidance?: readonly PackageHarnessTypeGuidanceObservation[]
  readonly worker?: WorkerEvidenceMetadata
}>

export type PackageHarnessTypeGuidanceObservation = Readonly<{
  readonly partitionId: string
  readonly status: TypeGuidancePartitionEvidenceStatus
  readonly corpusSeedId?: string
  readonly filterId?: string
  readonly partitionKind?: string
  readonly reason?: string
  readonly source?: string
}>

export type PackageHarnessRecordEvidence = (
  input: Omit<EvidenceEventInput, "operationId"> & Readonly<{
    readonly operationId?: string
  }>,
) => void

export interface PackageHarnessHandlerContext<
  Contract extends PackageHarnessContract,
  OperationId extends OperationIds<Contract>,
  PackageTestLayer,
> {
  readonly contract: Contract
  readonly operation: OperationById<Contract, OperationId>
  readonly packageTestLayer: PackageTestLayer
  readonly rpc: OperationRpcDescriptor<Contract, OperationId>
  readonly evidenceContext: EvidenceProducerContext
  readonly recordEvidence: PackageHarnessRecordEvidence
}

export type PackageHarnessHandler<
  Contract extends PackageHarnessContract,
  OperationId extends OperationIds<Contract>,
  PackageTestLayer = unknown,
> = (
  payload: InputOf<Contract, OperationId>,
  context: PackageHarnessHandlerContext<Contract, OperationId, PackageTestLayer>,
) => OutputOf<Contract, OperationId> | Promise<OutputOf<Contract, OperationId>>

export type PackageHarnessHandlerMap<
  Contract extends PackageHarnessContract,
  PackageTestLayer = unknown,
> = {
  readonly [OperationId in OperationIds<Contract>]: PackageHarnessHandler<
    Contract,
    OperationId,
    PackageTestLayer
  >
}

export interface PackageHarnessOperationEntry<
  Contract extends PackageHarnessContract,
  OperationId extends OperationIds<Contract>,
> {
  readonly operationId: OperationId
  readonly rpc: OperationRpcDescriptor<Contract, OperationId>
  readonly invoke: (
    payload: unknown,
    options?: PackageHarnessInvokeOptions,
  ) => Promise<PackageHarnessExit>
}

export interface PackageHarnessControlEntry<
  PackageId extends string,
  ControlId extends PackageFuzzRpcControlId,
> {
  readonly controlId: ControlId
  readonly rpc: ControlRpcDescriptor<PackageId, ControlId>
}

export type PackageHarnessControlEntries<PackageId extends string> = {
  readonly [ControlId in PackageFuzzRpcControlId]: PackageHarnessControlEntry<
    PackageId,
    ControlId
  >
}

export type PackageHarnessOperationEntries<Contract extends PackageHarnessContract> = {
  readonly [OperationId in OperationIds<Contract>]: PackageHarnessOperationEntry<
    Contract,
    OperationId
  >
}

export interface PackageHarnessClient<
  Contract extends PackageHarnessContract,
  PackageTestLayer,
  Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
> {
  readonly contract: Contract
  readonly controls: PackageHarnessControlEntries<PackageIdOf<Contract>>
  readonly packageTestLayer: PackageTestLayer
  readonly group: PackageFuzzRpcGroup<Contract>
  readonly operationIds: readonly OperationIds<Contract>[]
  readonly handlers: Handlers
  readonly registry: OperationRegistry<Handlers>
  readonly operations: PackageHarnessOperationEntries<Contract>
  readonly invoke: <OperationId extends OperationIds<Contract>>(
    operationId: OperationId,
    payload: unknown,
    options?: PackageHarnessInvokeOptions,
  ) => Promise<PackageHarnessExit>
}

export class PackageHarnessMissingAccessorError extends Error {
  constructor(
    readonly packageId: string,
    readonly operationId: string,
  ) {
    super(
      `Package ${packageId} PackageTestLayer does not expose a public accessor for operation ${operationId}.`,
    )
    this.name = "PackageHarnessMissingAccessorError"
  }
}

export const definePackageHarnessHandlers = <
  const Contract extends PackageHarnessContract,
  const PackageTestLayer,
  const Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
>(
  contract: Contract,
  handlers: Handlers,
): Handlers => {
  defineOperationRegistry({
    packageId: contract.packageId,
    protocolId: `attune/package/${contract.packageId}`,
    operationIds: operationIdsFromTuple(contract.operations),
    handlers,
  })
  return handlers
}

export const definePackageEvidenceProducerMap = <
  const Contract extends PackageHarnessContract,
  const Producers extends EvidenceProducerMap<OperationIds<Contract>>,
>(
  contract: Contract,
  producers: Producers,
): Producers =>
  defineEvidenceProducerMap({
    packageId: contract.packageId,
    operationIds: operationIdsFromTuple(contract.operations),
    producers,
  })

export const publicAccessorHandler = <
  const Contract extends PackageHarnessContract,
  const PackageTestLayer,
  const OperationId extends OperationIds<Contract>,
>(
  operationId: OperationId,
): PackageHarnessHandler<Contract, OperationId, PackageTestLayer> =>
  async (payload, context) => {
    const accessor = findPackageTestLayerAccessor(
      context.packageTestLayer,
      operationId,
    )
    if (accessor === undefined) {
      throw new PackageHarnessMissingAccessorError(
        context.contract.packageId,
        operationId,
      )
    }
    return await accessor(payload, context) as OutputOf<Contract, OperationId>
  }

export const createPackageHarnessClient = <
  const Contract extends PackageHarnessContract,
  const PackageTestLayer,
  const Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
>(
  input: Readonly<{
    readonly contract: Contract
    readonly packageTestLayer: PackageTestLayer
    readonly handlers: Handlers
    readonly evidenceProducers?: EvidenceProducerMap<OperationIds<Contract>>
    readonly atomGraphObserver?: AtomGraphObserver
    readonly group?: PackageFuzzRpcGroup<Contract>
  }>,
): PackageHarnessClient<Contract, PackageTestLayer, Handlers> => {
  const group = input.group ?? definePackageFuzzRpcGroup(input.contract)
  const operationIds = operationIdsFromTuple(input.contract.operations)
  const handlers = input.handlers
  const registry = defineOperationRegistry({
    packageId: input.contract.packageId,
    protocolId: group.groupId,
    operationIds,
    handlers,
  })

  const invoke = <OperationId extends OperationIds<Contract>>(
    operationId: OperationId,
    payload: unknown,
    options: PackageHarnessInvokeOptions = {},
  ) =>
    invokePackageHarnessOperation({
      contract: input.contract,
      group,
      handlers,
      operationId,
      packageTestLayer: input.packageTestLayer,
      payload,
      options,
      ...(input.atomGraphObserver === undefined ? {} : { atomGraphObserver: input.atomGraphObserver }),
      ...(input.evidenceProducers === undefined ? {} : { evidenceProducers: input.evidenceProducers }),
    })

  const operations = Object.fromEntries(
    operationIds.map((operationId) => [
      operationId,
      {
        operationId,
        rpc: operationRpcDescriptorById(group, operationId),
        invoke: (
          payload: unknown,
          options?: PackageHarnessInvokeOptions,
        ) => invoke(operationId, payload, options),
      },
    ]),
  ) as PackageHarnessOperationEntries<Contract>
  const controls = Object.fromEntries(
    PackageFuzzRpcControlIds.map((controlId) => [
      controlId,
      {
        controlId,
        rpc: controlRpcDescriptorById(group, controlId),
      },
    ]),
  ) as PackageHarnessControlEntries<PackageIdOf<Contract>>

  return {
    contract: input.contract,
    controls,
    group,
    handlers,
    invoke,
    operationIds,
    operations,
    packageTestLayer: input.packageTestLayer,
    registry,
  }
}

export type PackageHarnessPropertyInput<
  Contract extends PackageHarnessContract,
  PackageTestLayer,
  Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
  OperationId extends OperationIds<Contract>,
> = Omit<
  FastCheckPropertyInput<InputOf<Contract, OperationId>, OutputOf<Contract, OperationId>>,
  "lawIds" | "operation" | "operationId" | "packageId" | "protocolId"
> & Readonly<{
  readonly client: PackageHarnessClient<Contract, PackageTestLayer, Handlers>
  readonly operationId: OperationId
  readonly lawIds?: readonly string[]
  readonly validateHarnessExit?: PropertyValidationHook<
    PackageHarnessExit,
    InputOf<Contract, OperationId>
  >
}>

export const checkPackageHarnessProperty = async <
  const Contract extends PackageHarnessContract,
  const PackageTestLayer,
  const Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
  const OperationId extends OperationIds<Contract>,
>(
  input: PackageHarnessPropertyInput<Contract, PackageTestLayer, Handlers, OperationId>,
): Promise<FastCheckPropertyEvidence> => {
  const operation = operationById(input.client.contract, input.operationId)
  const harnessEvents: AttuneProtocolEvidenceEvent[] = []

  const result = await checkFastCheckProperty({
    ...input,
    lawIds: input.lawIds ?? operation.laws ?? [],
    operationId: input.operationId,
    packageId: input.client.contract.packageId,
    protocolId: `attune/package/${input.client.contract.packageId}`,
    operation: async (payload, context) => {
      const exit = await input.client.invoke(
        input.operationId,
        payload,
        propertyInvokeOptions(input, context.caseIndex),
      )
      harnessEvents.push(...exit.evidence as readonly AttuneProtocolEvidenceEvent[])
      if (await runHarnessExitHook(input.validateHarnessExit, exit, context)) {
        return exit.success as OutputOf<Contract, OperationId>
      }
      if (exit.status === "success") {
        return exit.success as OutputOf<Contract, OperationId>
      }
      throw exit.error ?? new Error(`Package harness ${exit.status} for ${input.operationId}`)
    },
  })

  return {
    ...result,
    events: [...result.events, ...harnessEvents],
  }
}

const propertyInvokeOptions = (
  input: Readonly<{
    readonly observedAt?: string
    readonly path?: string
    readonly propertyId?: string
    readonly runId?: string
    readonly seed?: number
    readonly worker?: WorkerEvidenceMetadata
  }>,
  caseIndex: number,
): PackageHarnessInvokeOptions => ({
  replay: {
    seed: input.seed ?? 1_337,
    caseIndex,
    ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
    ...(input.path === undefined ? {} : { path: input.path }),
    ...(input.worker === undefined ? {} : {
      shardId: input.worker.shardId,
      workerId: input.worker.workerId,
      randomSource: input.worker.randomSource,
    }),
  },
  ...(input.observedAt === undefined ? {} : { observedAt: input.observedAt }),
  ...(input.propertyId === undefined ? {} : { propertyId: input.propertyId }),
  ...(input.runId === undefined ? {} : { runId: input.runId }),
  ...(input.worker === undefined ? {} : { worker: input.worker }),
})

const invokePackageHarnessOperation = async <
  const Contract extends PackageHarnessContract,
  const PackageTestLayer,
  const Handlers extends PackageHarnessHandlerMap<Contract, PackageTestLayer>,
  const OperationId extends OperationIds<Contract>,
>(
  input: Readonly<{
    readonly atomGraphObserver?: AtomGraphObserver
    readonly contract: Contract
    readonly evidenceProducers?: EvidenceProducerMap<OperationIds<Contract>>
    readonly group: PackageFuzzRpcGroup<Contract>
    readonly handlers: Handlers
    readonly operationId: OperationId
    readonly packageTestLayer: PackageTestLayer
    readonly payload: unknown
    readonly options: PackageHarnessInvokeOptions
  }>,
): Promise<PackageHarnessExit> => {
  const operation = operationById(input.contract, input.operationId)
  const rpc = operationRpcDescriptorById(input.group, input.operationId)
  const evidenceContext = evidenceContextFor(
    input.contract.packageId,
    input.operationId,
    input.options,
  )
  const evidence: AttuneProtocolEvidenceEvent[] = []
  const recordEvidence: PackageHarnessRecordEvidence = (eventInput) => {
    evidence.push(evidenceEvent(evidenceContext, {
      ...eventInput,
      operationId: eventInput.operationId ?? input.operationId,
    }))
  }

  const invocation = decodeHarnessInvocation({
    protocolId: evidenceContext.protocolId,
    packageId: input.contract.packageId,
    operationId: input.operationId,
    rpcId: rpc.rpcId,
    payload: input.payload,
    ...(input.options.replay === undefined ? {} : { replay: input.options.replay }),
    ...(input.options.worker === undefined ? {} : { worker: input.options.worker }),
  })

  recordEvidence({
    kind: "property-run",
    payload: {
      phase: "harness-started",
      rpcId: rpc.rpcId,
      worker: input.options.worker,
    },
    sequence: "harness-started",
  })

  try {
    const decodedInput = decodeOperationValue<InputOf<Contract, OperationId>>(
      operation.input,
      invocation.payload,
    )
    recordSchemaEvidence(recordEvidence, "payload", rpc, decodedInput)
    recordTypeGuidanceEvidence(
      evidence,
      evidenceContext,
      input.operationId,
      input.options.typeGuidance ?? [],
    )

    const handler = input.handlers[input.operationId] as unknown as PackageHarnessHandler<
      Contract,
      OperationId,
      PackageTestLayer
    >
    const output = await handler(decodedInput, {
      contract: input.contract,
      evidenceContext,
      operation,
      packageTestLayer: input.packageTestLayer,
      recordEvidence,
      rpc,
    })
    const decodedOutput = decodeOperationValue<OutputOf<Contract, OperationId>>(
      operation.output,
      output,
    )
    const encodedSuccess = encodeOperationValue(operation.output, decodedOutput)
    recordSchemaEvidence(recordEvidence, "success", rpc, encodedSuccess)

    if (input.atomGraphObserver !== undefined) {
      const observations = input.atomGraphObserver.observe({
          packageId: input.contract.packageId,
          operationId: input.operationId,
          ...optionalReplay(evidenceContext.replay),
        })
      recordEvidence({
        kind: "property-run",
        payload: {
          controlId: "observe",
          observationCount: observations.length,
          rpcId: controlRpcDescriptorById(input.group, "observe").rpcId,
        },
        sequence: "control:observe",
      })
      evidence.push(...atomMovementEvidence(
        evidenceContext,
        input.operationId,
        observations,
      ))
    }

    if (input.evidenceProducers !== undefined) {
      const producer = input.evidenceProducers[input.operationId]
      if (producer !== undefined) {
        evidence.push(...producer.produce(evidenceContext))
      }
    }

    recordEvidence({
      kind: "property-run",
      payload: {
        phase: "harness-completed",
        rpcId: rpc.rpcId,
      },
      sequence: "harness-completed",
    })

    return decodeHarnessExit({
      protocolId: evidenceContext.protocolId,
      packageId: input.contract.packageId,
      operationId: input.operationId,
      rpcId: rpc.rpcId,
      status: "success",
      success: decodedOutput,
      encodedSuccess,
      evidence,
      ...optionalReplay(evidenceContext.replay),
    })
  } catch (error) {
    return harnessErrorExit({
      contract: input.contract,
      error,
      evidence,
      evidenceContext,
      operation,
      operationId: input.operationId,
      recordEvidence,
      rpc,
    })
  }
}

const recordTypeGuidanceEvidence = (
  evidence: AttuneProtocolEvidenceEvent[],
  context: EvidenceProducerContext,
  operationId: string,
  observations: readonly PackageHarnessTypeGuidanceObservation[],
): void => {
  for (const observation of observations) {
    evidence.push(typeGuidancePartitionEvidence(context, operationId, observation))
  }
}

const harnessErrorExit = <
  const Contract extends PackageHarnessContract,
  const OperationId extends OperationIds<Contract>,
>(
  input: Readonly<{
    readonly contract: Contract
    readonly error: unknown
    readonly evidence: AttuneProtocolEvidenceEvent[]
    readonly evidenceContext: EvidenceProducerContext
    readonly operation: OperationById<Contract, OperationId>
    readonly operationId: OperationId
    readonly recordEvidence: PackageHarnessRecordEvidence
    readonly rpc: OperationRpcDescriptor<Contract, OperationId>
  }>,
): PackageHarnessExit => {
  const errorSchema = (input.operation as { readonly error?: unknown }).error
  if (errorSchema !== undefined) {
    try {
      const decodedError = decodeOperationValue(errorSchema, input.error)
      const encodedError = encodeOperationValue(errorSchema, decodedError)
      recordSchemaEvidence(input.recordEvidence, "error", input.rpc, encodedError)
      return decodeHarnessExit({
        protocolId: input.evidenceContext.protocolId,
        packageId: input.contract.packageId,
        operationId: input.operationId,
        rpcId: input.rpc.rpcId,
        status: "typed-error",
        error: decodedError,
        encodedError,
        evidence: input.evidence,
        ...optionalReplay(input.evidenceContext.replay),
      })
    } catch {
      // Fall through to defect: the handler error did not satisfy the declared typed-error schema.
    }
  }

  input.recordEvidence({
    kind: "counterexample",
    payload: {
      phase: "harness-defect",
      error: summarizeError(input.error),
      rpcId: input.rpc.rpcId,
    },
    sequence: "harness-defect",
  })

  return decodeHarnessExit({
    protocolId: input.evidenceContext.protocolId,
    packageId: input.contract.packageId,
    operationId: input.operationId,
    rpcId: input.rpc.rpcId,
    status: "defect",
    error: summarizeError(input.error),
    evidence: input.evidence,
    ...optionalReplay(input.evidenceContext.replay),
  })
}

const evidenceContextFor = (
  packageId: string,
  operationId: string,
  options: PackageHarnessInvokeOptions,
): EvidenceProducerContext => ({
  observedAt: options.observedAt ?? new Date().toISOString(),
  packageId,
  propertyId: options.propertyId ?? `${packageId}.${operationId}.harness`,
  protocolId: `attune/package/${packageId}`,
  runId: options.runId ?? `${packageId}:${operationId}:harness:${options.replay?.seed ?? "manual"}`,
  tier: options.worker?.resourceTier ?? "commit",
  ...optionalReplay(options.replay),
})

const optionalReplay = (
  replay: ReplayMetadata | undefined,
): Readonly<{ readonly replay?: ReplayMetadata }> =>
  replay === undefined ? {} : { replay }

const operationById = <
  const Contract extends PackageHarnessContract,
  const OperationId extends OperationIds<Contract>,
>(
  contract: Contract,
  operationId: OperationId,
): OperationById<Contract, OperationId> => {
  const operation = contract.operations.find((candidate) => candidate.id === operationId)
  if (operation === undefined) {
    throw new Error(`Unknown operation ${operationId} for package ${contract.packageId}`)
  }
  return operation as OperationById<Contract, OperationId>
}

const decodeHarnessInvocation = (
  value: PackageHarnessInvocation,
): PackageHarnessInvocation =>
  Schema.decodeUnknownSync(PackageHarnessInvocationSchema)(value)

const decodeHarnessExit = (
  value: PackageHarnessExit,
): PackageHarnessExit =>
  Schema.decodeUnknownSync(PackageHarnessExitSchema)(value)

const decodeOperationValue = <Value>(
  schema: unknown,
  value: unknown,
): Value =>
  Schema.decodeUnknownSync(schema as never)(value) as Value

const encodeOperationValue = (
  schema: unknown,
  value: unknown,
): unknown =>
  Schema.encodeSync(schema as never)(value as never)

const recordSchemaEvidence = <
  const Contract extends PackageHarnessContract,
  const OperationId extends OperationIds<Contract>,
>(
  recordEvidence: PackageHarnessRecordEvidence,
  role: "payload" | "success" | "error",
  rpc: OperationRpcDescriptor<Contract, OperationId>,
  value: unknown,
): void =>
  recordEvidence({
    kind: "schema-decode",
    payload: {
      role,
      rpcId: rpc.rpcId,
      schema: role === "payload"
        ? rpc.payload
        : role === "success"
          ? rpc.success
          : rpc.error,
      value,
    },
    sequence: `schema:${role}`,
  })

const findPackageTestLayerAccessor = (
  packageTestLayer: unknown,
  operationId: string,
): ((payload: unknown, context: unknown) => unknown | Promise<unknown>) | undefined => {
  const direct = lookupAccessor(packageTestLayer, operationId)
  if (direct !== undefined) return direct

  if (!isRecord(packageTestLayer)) return undefined

  for (const key of ["publicAccessors", "accessors", "handlers", "operations", "services"] as const) {
    const accessor = lookupAccessor(packageTestLayer[key], operationId)
    if (accessor !== undefined) return accessor
  }

  for (const nested of Object.values(packageTestLayer)) {
    const accessor = lookupAccessor(nested, operationId)
    if (accessor !== undefined) return accessor
  }

  return undefined
}

const lookupAccessor = (
  container: unknown,
  operationId: string,
): ((payload: unknown, context: unknown) => unknown | Promise<unknown>) | undefined => {
  if (!isRecord(container)) return undefined
  const candidate = container[operationId]
  return typeof candidate === "function"
    ? candidate as (payload: unknown, context: unknown) => unknown | Promise<unknown>
    : undefined
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object"

const summarizeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error)

const runHarnessExitHook = async <Input>(
  hook: PropertyValidationHook<PackageHarnessExit, Input> | undefined,
  exit: PackageHarnessExit,
  context: Parameters<PropertyValidationHook<PackageHarnessExit, Input>>[1],
): Promise<boolean> => {
  if (hook === undefined) return false
  const result = await hook(exit, context)
  return result !== false
}

export const packageHarnessControlIds: readonly PackageFuzzRpcControlId[] =
  PackageFuzzRpcControlIds

export type PackageHarnessProtocolId<Contract extends PackageHarnessContract> =
  `attune/package/${PackageIdOf<Contract>}`
