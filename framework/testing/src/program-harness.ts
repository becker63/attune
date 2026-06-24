import {
  AttuneProtocolEvidenceEventSchema,
  ProgramObservationRpcControlIds,
  controlRpcDescriptorById,
  defineProgramObservationRpcGroup,
  operationRpcDescriptorById,
  type AttuneProtocolEvidenceEvent,
  type ControlRpcDescriptor,
  type SymbolIds,
  type SymbolById,
  type OperationRpcDescriptor,
  type ProgramObservationRpcControlId,
  type ProgramObservationRpcGroup,
  type ProjectIdOf,
  type InputOf,
  type OutputOf,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  atomMovementEvidence,
  type AtomGraphObserver,
} from "./atom-graph-observer.js"
import {
  defineObservationProducerMap,
  observationEvent,
  type ObservationInput,
  type ObservationProducerMap,
  type ObservationContext,
  type TypeGuidancePartitionEvidenceStatus,
  schemaPartitionObservation,
} from "./observation-producer.js"
import {
  checkFastCheckProperty,
  type FastCheckPropertyEvidence,
  type FastCheckPropertyInput,
  type PropertyValidationHook,
} from "./fastcheck.js"
import {
  defineSymbolHandlerRegistry,
  symbolIdsFromTuple,
  type SymbolHandlerRegistry,
} from "./symbol-map.js"
import {
  ReplayMetadataSchema,
  type ReplayMetadata,
} from "./replay-metadata.js"
import type { WorkerEvidenceMetadata } from "./worker-metadata.js"

export type ProgramHarnessContract = Parameters<typeof defineProgramObservationRpcGroup>[0]

export const ProgramHarnessInvocationSchema = Schema.Struct({
  protocolId: Schema.String,
  packageId: Schema.String,
  operationId: Schema.String,
  rpcId: Schema.optionalKey(Schema.String),
  payload: Schema.Unknown,
  replay: Schema.optionalKey(ReplayMetadataSchema),
  worker: Schema.optionalKey(Schema.Unknown),
})
export type ProgramHarnessInvocation = typeof ProgramHarnessInvocationSchema.Type

export const ProgramHarnessExitSchema = Schema.Struct({
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
export type ProgramHarnessExit = typeof ProgramHarnessExitSchema.Type

export type ProgramHarnessInvokeOptions = Readonly<{
  readonly observedAt?: string
  readonly propertyId?: string
  readonly replay?: ReplayMetadata
  readonly runId?: string
  readonly typeGuidance?: readonly ProgramHarnessTypeGuidanceObservation[]
  readonly worker?: WorkerEvidenceMetadata
}>

export type ProgramHarnessTypeGuidanceObservation = Readonly<{
  readonly partitionId: string
  readonly status: TypeGuidancePartitionEvidenceStatus
  readonly corpusSeedId?: string
  readonly filterId?: string
  readonly partitionKind?: string
  readonly reason?: string
  readonly source?: string
}>

export type ProgramHarnessRecordEvidence = (
  input: Omit<ObservationInput, "operationId"> & Readonly<{
    readonly operationId?: string
  }>,
) => void

export interface ProgramHarnessHandlerContext<
  Contract extends ProgramHarnessContract,
  SymbolId extends SymbolIds<Contract>,
  programTestLayer,
> {
  readonly contract: Contract
  readonly symbol: SymbolById<Contract, SymbolId>
  readonly programTestLayer: programTestLayer
  readonly rpc: OperationRpcDescriptor<Contract, SymbolId>
  readonly evidenceContext: ObservationContext
  readonly recordObservation: ProgramHarnessRecordEvidence
}

export type ProgramHarnessHandler<
  Contract extends ProgramHarnessContract,
  SymbolId extends SymbolIds<Contract>,
  programTestLayer = unknown,
> = (
  payload: InputOf<Contract, SymbolId>,
  context: ProgramHarnessHandlerContext<Contract, SymbolId, programTestLayer>,
) => OutputOf<Contract, SymbolId> | Promise<OutputOf<Contract, SymbolId>>

export type ProgramHarnessHandlerMap<
  Contract extends ProgramHarnessContract,
  programTestLayer = unknown,
> = {
  readonly [SymbolId in SymbolIds<Contract>]: ProgramHarnessHandler<
    Contract,
    SymbolId,
    programTestLayer
  >
}

export interface ProgramHarnessOperationEntry<
  Contract extends ProgramHarnessContract,
  SymbolId extends SymbolIds<Contract>,
> {
  readonly operationId: SymbolId
  readonly rpc: OperationRpcDescriptor<Contract, SymbolId>
  readonly invoke: (
    payload: unknown,
    options?: ProgramHarnessInvokeOptions,
  ) => Promise<ProgramHarnessExit>
}

export interface ProgramHarnessControlEntry<
  PackageId extends string,
  ControlId extends ProgramObservationRpcControlId,
> {
  readonly controlId: ControlId
  readonly rpc: ControlRpcDescriptor<PackageId, ControlId>
}

export type ProgramHarnessControlEntries<PackageId extends string> = {
  readonly [ControlId in ProgramObservationRpcControlId]: ProgramHarnessControlEntry<
    PackageId,
    ControlId
  >
}

export type ProgramHarnessOperationEntries<Contract extends ProgramHarnessContract> = {
  readonly [SymbolId in SymbolIds<Contract>]: ProgramHarnessOperationEntry<
    Contract,
    SymbolId
  >
}

export interface ProgramHarnessClient<
  Contract extends ProgramHarnessContract,
  programTestLayer,
  Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
> {
  readonly contract: Contract
  readonly controls: ProgramHarnessControlEntries<ProjectIdOf<Contract>>
  readonly programTestLayer: programTestLayer
  readonly group: ProgramObservationRpcGroup<Contract>
  readonly symbolIds: readonly SymbolIds<Contract>[]
  readonly handlers: Handlers
  readonly registry: SymbolHandlerRegistry<Handlers>
  readonly operations: ProgramHarnessOperationEntries<Contract>
  readonly invoke: <SymbolId extends SymbolIds<Contract>>(
    operationId: SymbolId,
    payload: unknown,
    options?: ProgramHarnessInvokeOptions,
  ) => Promise<ProgramHarnessExit>
}

export class ProgramHarnessMissingAccessorError extends Error {
  constructor(
    readonly packageId: string,
    readonly operationId: string,
  ) {
    super(
      `Package ${packageId} programTestLayer does not expose a public accessor for operation ${operationId}.`,
    )
    this.name = "ProgramHarnessMissingAccessorError"
  }
}

export const defineProgramHarnessHandlers = <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
>(
  contract: Contract,
  handlers: Handlers,
): Handlers => {
  defineSymbolHandlerRegistry({
    projectId: contract.packageId,
    symbolIds: symbolIdsFromTuple(contract.operations),
    handlers,
  })
  return handlers
}

export const defineProjectObservationProducerMap = <
  const Contract extends ProgramHarnessContract,
  const Producers extends ObservationProducerMap<SymbolIds<Contract>>,
>(
  contract: Contract,
  producers: Producers,
): Producers =>
  defineObservationProducerMap({
    projectId: contract.packageId,
    symbolIds: symbolIdsFromTuple(contract.operations),
    producers,
  })

export const publicAccessorHandler = <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const SymbolId extends SymbolIds<Contract>,
>(
  operationId: SymbolId,
): ProgramHarnessHandler<Contract, SymbolId, programTestLayer> =>
  async (payload, context) => {
    const accessor = findprogramTestLayerAccessor(
      context.programTestLayer,
      operationId,
    )
    if (accessor === undefined) {
      throw new ProgramHarnessMissingAccessorError(
        context.contract.packageId,
        operationId,
      )
    }
    return await accessor(payload, context) as OutputOf<Contract, SymbolId>
  }

export const createProgramHarnessClient = <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
>(
  input: Readonly<{
    readonly contract: Contract
    readonly programTestLayer: programTestLayer
    readonly handlers: Handlers
    readonly observationProducers?: ObservationProducerMap<SymbolIds<Contract>>
    readonly atomGraphObserver?: AtomGraphObserver
    readonly group?: ProgramObservationRpcGroup<Contract>
  }>,
): ProgramHarnessClient<Contract, programTestLayer, Handlers> => {
  const group = input.group ?? defineProgramObservationRpcGroup(input.contract)
  const symbolIds = symbolIdsFromTuple(input.contract.operations)
  const handlers = input.handlers
  const registry = defineSymbolHandlerRegistry({
    projectId: input.contract.packageId,
    symbolIds,
    handlers,
  })

  const invoke = <SymbolId extends SymbolIds<Contract>>(
    operationId: SymbolId,
    payload: unknown,
    options: ProgramHarnessInvokeOptions = {},
  ) =>
    invokeProgramHarnessOperation({
      contract: input.contract,
      group,
      handlers,
      operationId,
      programTestLayer: input.programTestLayer,
      payload,
      options,
      ...(input.atomGraphObserver === undefined ? {} : { atomGraphObserver: input.atomGraphObserver }),
      ...(input.observationProducers === undefined ? {} : { observationProducers: input.observationProducers }),
    })

  const operations = Object.fromEntries(
    symbolIds.map((operationId) => [
      operationId,
      {
        operationId,
        rpc: operationRpcDescriptorById(group, operationId),
        invoke: (
          payload: unknown,
          options?: ProgramHarnessInvokeOptions,
        ) => invoke(operationId, payload, options),
      },
    ]),
  ) as ProgramHarnessOperationEntries<Contract>
  const controls = Object.fromEntries(
    ProgramObservationRpcControlIds.map((controlId) => [
      controlId,
      {
        controlId,
        rpc: controlRpcDescriptorById(group, controlId),
      },
    ]),
  ) as ProgramHarnessControlEntries<ProjectIdOf<Contract>>

  return {
    contract: input.contract,
    controls,
    group,
    handlers,
    invoke,
    operations,
    programTestLayer: input.programTestLayer,
    registry,
    symbolIds,
  }
}

export type ProgramHarnessPropertyInput<
  Contract extends ProgramHarnessContract,
  programTestLayer,
  Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
  SymbolId extends SymbolIds<Contract>,
> = Omit<
  FastCheckPropertyInput<InputOf<Contract, SymbolId>, OutputOf<Contract, SymbolId>>,
  "lawIds" | "operation" | "operationId" | "packageId" | "protocolId"
> & Readonly<{
  readonly client: ProgramHarnessClient<Contract, programTestLayer, Handlers>
  readonly operationId: SymbolId
  readonly lawIds?: readonly string[]
  readonly validateHarnessExit?: PropertyValidationHook<
    ProgramHarnessExit,
    InputOf<Contract, SymbolId>
  >
}>

export const checkProgramHarnessProperty = async <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
  const SymbolId extends SymbolIds<Contract>,
>(
  input: ProgramHarnessPropertyInput<Contract, programTestLayer, Handlers, SymbolId>,
): Promise<FastCheckPropertyEvidence> => {
  const symbol = symbolById(input.client.contract, input.operationId)
  const harnessEvents: AttuneProtocolEvidenceEvent[] = []

  const result = await checkFastCheckProperty({
    ...input,
    lawIds: input.lawIds ?? symbol.laws ?? [],
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
        return exit.success as OutputOf<Contract, SymbolId>
      }
      if (exit.status === "success") {
        return exit.success as OutputOf<Contract, SymbolId>
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
): ProgramHarnessInvokeOptions => ({
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

const invokeProgramHarnessOperation = async <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
  const SymbolId extends SymbolIds<Contract>,
>(
  input: Readonly<{
    readonly atomGraphObserver?: AtomGraphObserver
    readonly contract: Contract
    readonly observationProducers?: ObservationProducerMap<SymbolIds<Contract>>
    readonly group: ProgramObservationRpcGroup<Contract>
    readonly handlers: Handlers
    readonly operationId: SymbolId
    readonly programTestLayer: programTestLayer
    readonly payload: unknown
    readonly options: ProgramHarnessInvokeOptions
  }>,
): Promise<ProgramHarnessExit> => {
  const symbol = symbolById(input.contract, input.operationId)
  const rpc = operationRpcDescriptorById(input.group, input.operationId)
  const evidenceContext = evidenceContextFor(
    input.contract.packageId,
    input.operationId,
    input.options,
  )
  const evidence: AttuneProtocolEvidenceEvent[] = []
  const recordObservation: ProgramHarnessRecordEvidence = (eventInput) => {
    evidence.push(observationEvent(evidenceContext, {
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

  recordObservation({
    kind: "property-run",
    payload: {
      phase: "harness-started",
      rpcId: rpc.rpcId,
      worker: input.options.worker,
    },
    sequence: "harness-started",
  })

  try {
    const decodedInput = decodeOperationValue<InputOf<Contract, SymbolId>>(
      symbol.input,
      invocation.payload,
    )
    recordSchemaEvidence(recordObservation, "payload", rpc, decodedInput)
    recordTypeGuidanceEvidence(
      evidence,
      evidenceContext,
      input.operationId,
      input.options.typeGuidance ?? [],
    )

    const handler = input.handlers[input.operationId] as unknown as ProgramHarnessHandler<
      Contract,
      SymbolId,
      programTestLayer
    >
    const output = await handler(decodedInput, {
      contract: input.contract,
      evidenceContext,
      symbol,
      programTestLayer: input.programTestLayer,
      recordObservation,
      rpc,
    })
    const decodedOutput = decodeOperationValue<OutputOf<Contract, SymbolId>>(
      symbol.output,
      output,
    )
    const encodedSuccess = encodeOperationValue(symbol.output, decodedOutput)
    recordSchemaEvidence(recordObservation, "success", rpc, encodedSuccess)

    if (input.atomGraphObserver !== undefined) {
      const observations = input.atomGraphObserver.observe({
          packageId: input.contract.packageId,
          operationId: input.operationId,
          ...optionalReplay(evidenceContext.replay),
        })
      recordObservation({
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

    if (input.observationProducers !== undefined) {
      const producer = input.observationProducers[input.operationId]
      if (producer !== undefined) {
        evidence.push(...producer.produce(evidenceContext))
      }
    }

    recordObservation({
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
      symbol,
      operationId: input.operationId,
      recordObservation,
      rpc,
    })
  }
}

const recordTypeGuidanceEvidence = (
  evidence: AttuneProtocolEvidenceEvent[],
  context: ObservationContext,
  operationId: string,
  observations: readonly ProgramHarnessTypeGuidanceObservation[],
): void => {
  for (const observation of observations) {
    evidence.push(schemaPartitionObservation(context, operationId, observation))
  }
}

const harnessErrorExit = <
  const Contract extends ProgramHarnessContract,
  const SymbolId extends SymbolIds<Contract>,
>(
  input: Readonly<{
    readonly contract: Contract
    readonly error: unknown
    readonly evidence: AttuneProtocolEvidenceEvent[]
    readonly evidenceContext: ObservationContext
    readonly symbol: SymbolById<Contract, SymbolId>
    readonly operationId: SymbolId
    readonly recordObservation: ProgramHarnessRecordEvidence
    readonly rpc: OperationRpcDescriptor<Contract, SymbolId>
  }>,
): ProgramHarnessExit => {
  const errorSchema = (input.symbol as { readonly error?: unknown }).error
  if (errorSchema !== undefined) {
    try {
      const decodedError = decodeOperationValue(errorSchema, input.error)
      const encodedError = encodeOperationValue(errorSchema, decodedError)
      recordSchemaEvidence(input.recordObservation, "error", input.rpc, encodedError)
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

  input.recordObservation({
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
  options: ProgramHarnessInvokeOptions,
): ObservationContext => ({
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

const symbolById = <
  const Contract extends ProgramHarnessContract,
  const SymbolId extends SymbolIds<Contract>,
>(
  contract: Contract,
  operationId: SymbolId,
): SymbolById<Contract, SymbolId> => {
  const operation = contract.operations.find((candidate) => candidate.id === operationId)
  if (operation === undefined) {
    throw new Error(`Unknown operation ${operationId} for package ${contract.packageId}`)
  }
  return operation as SymbolById<Contract, SymbolId>
}

const decodeHarnessInvocation = (
  value: ProgramHarnessInvocation,
): ProgramHarnessInvocation =>
  Schema.decodeUnknownSync(ProgramHarnessInvocationSchema)(value)

const decodeHarnessExit = (
  value: ProgramHarnessExit,
): ProgramHarnessExit =>
  Schema.decodeUnknownSync(ProgramHarnessExitSchema)(value)

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
  const Contract extends ProgramHarnessContract,
  const SymbolId extends SymbolIds<Contract>,
>(
  recordObservation: ProgramHarnessRecordEvidence,
  role: "payload" | "success" | "error",
  rpc: OperationRpcDescriptor<Contract, SymbolId>,
  value: unknown,
): void =>
  recordObservation({
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

const findprogramTestLayerAccessor = (
  programTestLayer: unknown,
  operationId: string,
): ((payload: unknown, context: unknown) => unknown | Promise<unknown>) | undefined => {
  const direct = lookupAccessor(programTestLayer, operationId)
  if (direct !== undefined) return direct

  if (!isRecord(programTestLayer)) return undefined

  for (const key of ["publicAccessors", "accessors", "handlers", "operations", "services"] as const) {
    const accessor = lookupAccessor(programTestLayer[key], operationId)
    if (accessor !== undefined) return accessor
  }

  for (const nested of Object.values(programTestLayer)) {
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
  hook: PropertyValidationHook<ProgramHarnessExit, Input> | undefined,
  exit: ProgramHarnessExit,
  context: Parameters<PropertyValidationHook<ProgramHarnessExit, Input>>[1],
): Promise<boolean> => {
  if (hook === undefined) return false
  const result = await hook(exit, context)
  return result !== false
}

export const programHarnessControlIds: readonly ProgramObservationRpcControlId[] =
  ProgramObservationRpcControlIds

export type ProgramHarnessProtocolId<Contract extends ProgramHarnessContract> =
  `attune/package/${ProjectIdOf<Contract>}`
