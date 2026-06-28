import {
  ProgramObservationSchema,
  type ProgramObservation,
} from "@attune/framework-protocol"
import {
  ProgramObservationRpcControlIds,
  controlRpcDescriptorById,
  defineProgramObservationRpcGroup,
  operationRpcDescriptorById,
  type ControlRpcDescriptor,
  type SymbolIds,
  type SymbolById,
  type OperationRpcDescriptor,
  type ProgramObservationRpcControlId,
  type ProgramObservationRpcGroup,
  type ProjectIdOf,
  type InputOf,
  type OutputOf,
} from "../../protocol/src/project-facts/index.js"
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
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.String,
  rpcId: Schema.optionalKey(Schema.String),
  payload: Schema.Unknown,
  replay: Schema.optionalKey(ReplayMetadataSchema),
  worker: Schema.optionalKey(Schema.Unknown),
})
export type ProgramHarnessInvocation = typeof ProgramHarnessInvocationSchema.Type

export const ProgramHarnessExitSchema = Schema.Struct({
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.String,
  rpcId: Schema.optionalKey(Schema.String),
  status: Schema.Literals(["success", "typed-error", "defect"] as const),
  success: Schema.optionalKey(Schema.Unknown),
  encodedSuccess: Schema.optionalKey(Schema.Unknown),
  error: Schema.optionalKey(Schema.Unknown),
  encodedError: Schema.optionalKey(Schema.Unknown),
  observations: Schema.Array(ProgramObservationSchema),
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
  input: Omit<ObservationInput, "symbolId"> & Readonly<{
    readonly symbolId?: string
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
  readonly symbolId: SymbolId
  readonly rpc: OperationRpcDescriptor<Contract, SymbolId>
  readonly invoke: (
    payload: unknown,
    options?: ProgramHarnessInvokeOptions,
  ) => Promise<ProgramHarnessExit>
}

export interface ProgramHarnessControlEntry<
  ProjectId extends string,
  ControlId extends ProgramObservationRpcControlId,
> {
  readonly controlId: ControlId
  readonly rpc: ControlRpcDescriptor<ProjectId, ControlId>
}

export type ProgramHarnessControlEntries<ProjectId extends string> = {
  readonly [ControlId in ProgramObservationRpcControlId]: ProgramHarnessControlEntry<
    ProjectId,
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
    symbolId: SymbolId,
    payload: unknown,
    options?: ProgramHarnessInvokeOptions,
  ) => Promise<ProgramHarnessExit>
}

export class ProgramHarnessMissingAccessorError extends Error {
  constructor(
    readonly projectId: string,
    readonly symbolId: string,
  ) {
    super(
      `Package ${projectId} programTestLayer does not expose a public accessor for operation ${symbolId}.`,
    )
    this.name = "ProgramHarnessMissingAccessorError"
  }
}

const projectIdForContract = (
  contract: { readonly packageId: string },
): string => contract.packageId

export const defineProgramHarnessHandlers = <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const Handlers extends ProgramHarnessHandlerMap<Contract, programTestLayer>,
>(
  contract: Contract,
  handlers: Handlers,
): Handlers => {
  defineSymbolHandlerRegistry({
    projectId: projectIdForContract(contract),
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
    projectId: projectIdForContract(contract),
    symbolIds: symbolIdsFromTuple(contract.operations),
    producers,
  })

export const publicAccessorHandler = <
  const Contract extends ProgramHarnessContract,
  const programTestLayer,
  const SymbolId extends SymbolIds<Contract>,
>(
  symbolId: SymbolId,
): ProgramHarnessHandler<Contract, SymbolId, programTestLayer> =>
  async (payload, context) => {
    const accessor = findprogramTestLayerAccessor(
      context.programTestLayer,
      symbolId,
    )
    if (accessor === undefined) {
      throw new ProgramHarnessMissingAccessorError(
        projectIdForContract(context.contract),
        symbolId,
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
    projectId: projectIdForContract(input.contract),
    symbolIds,
    handlers,
  })

  const invoke = <SymbolId extends SymbolIds<Contract>>(
    symbolId: SymbolId,
    payload: unknown,
    options: ProgramHarnessInvokeOptions = {},
  ) =>
    invokeProgramHarnessOperation({
      contract: input.contract,
      group,
      handlers,
      symbolId,
      programTestLayer: input.programTestLayer,
      payload,
      options,
      ...(input.atomGraphObserver === undefined ? {} : { atomGraphObserver: input.atomGraphObserver }),
      ...(input.observationProducers === undefined ? {} : { observationProducers: input.observationProducers }),
    })

  const operations = Object.fromEntries(
    symbolIds.map((symbolId) => [
      symbolId,
      {
        symbolId,
        rpc: operationRpcDescriptorById(group, symbolId),
        invoke: (
          payload: unknown,
          options?: ProgramHarnessInvokeOptions,
        ) => invoke(symbolId, payload, options),
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
  "lawIds" | "operation" | "symbolId" | "projectId" | "schemaDescriptorId"
> & Readonly<{
  readonly client: ProgramHarnessClient<Contract, programTestLayer, Handlers>
  readonly symbolId: SymbolId
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
  const symbol = symbolById(input.client.contract, input.symbolId)
  const harnessEvents: ProgramObservation[] = []

  const result = await checkFastCheckProperty({
    ...input,
    lawIds: input.lawIds ?? symbol.laws ?? [],
    symbolId: input.symbolId,
    projectId: projectIdForContract(input.client.contract),
    schemaDescriptorId: `attune/project/${projectIdForContract(input.client.contract)}`,
    operation: async (payload, context) => {
      const exit = await input.client.invoke(
        input.symbolId,
        payload,
        propertyInvokeOptions(input, context.caseIndex),
      )
      harnessEvents.push(...exit.observations as readonly ProgramObservation[])
      if (await runHarnessExitHook(input.validateHarnessExit, exit, context)) {
        return exit.success as OutputOf<Contract, SymbolId>
      }
      if (exit.status === "success") {
        return exit.success as OutputOf<Contract, SymbolId>
      }
      throw exit.error ?? new Error(`Package harness ${exit.status} for ${input.symbolId}`)
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
    readonly symbolId: SymbolId
    readonly programTestLayer: programTestLayer
    readonly payload: unknown
    readonly options: ProgramHarnessInvokeOptions
  }>,
): Promise<ProgramHarnessExit> => {
  const symbol = symbolById(input.contract, input.symbolId)
  const rpc = operationRpcDescriptorById(input.group, input.symbolId)
  const evidenceContext = evidenceContextFor(
    projectIdForContract(input.contract),
    input.symbolId,
    input.options,
  )
  const observations: ProgramObservation[] = []
  const recordObservation: ProgramHarnessRecordEvidence = (eventInput) => {
    observations.push(observationEvent(evidenceContext, {
      ...eventInput,
      symbolId: eventInput.symbolId ?? input.symbolId,
    }))
  }

  const invocation = decodeHarnessInvocation({
    schemaDescriptorId: evidenceContext.schemaDescriptorId,
    projectId: projectIdForContract(input.contract),
    symbolId: input.symbolId,
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
      observations,
      evidenceContext,
      input.symbolId,
      input.options.typeGuidance ?? [],
    )

    const handler = input.handlers[input.symbolId] as unknown as ProgramHarnessHandler<
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
      const atomGraphObservations = input.atomGraphObserver.observe({
          projectId: projectIdForContract(input.contract),
          symbolId: input.symbolId,
          ...optionalReplay(evidenceContext.replay),
        })
      recordObservation({
        kind: "property-run",
        payload: {
          controlId: "observe",
          observationCount: atomGraphObservations.length,
          rpcId: controlRpcDescriptorById(input.group, "observe").rpcId,
        },
        sequence: "control:observe",
      })
      observations.push(...atomMovementEvidence(
        evidenceContext,
        input.symbolId,
        atomGraphObservations,
      ))
    }

    if (input.observationProducers !== undefined) {
      const producer = input.observationProducers[input.symbolId]
      if (producer !== undefined) {
        observations.push(...producer.produce(evidenceContext))
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
      schemaDescriptorId: evidenceContext.schemaDescriptorId,
      projectId: projectIdForContract(input.contract),
      symbolId: input.symbolId,
      rpcId: rpc.rpcId,
      status: "success",
      success: decodedOutput,
      encodedSuccess,
      observations,
      ...optionalReplay(evidenceContext.replay),
    })
  } catch (error) {
    return harnessErrorExit({
      contract: input.contract,
      error,
      observations,
      evidenceContext,
      symbol,
      symbolId: input.symbolId,
      recordObservation,
      rpc,
    })
  }
}

const recordTypeGuidanceEvidence = (
  output: ProgramObservation[],
  context: ObservationContext,
  symbolId: string,
  typeGuidanceObservations: readonly ProgramHarnessTypeGuidanceObservation[],
): void => {
  for (const observation of typeGuidanceObservations) {
    output.push(schemaPartitionObservation(context, symbolId, observation))
  }
}

const harnessErrorExit = <
  const Contract extends ProgramHarnessContract,
  const SymbolId extends SymbolIds<Contract>,
>(
  input: Readonly<{
    readonly contract: Contract
    readonly error: unknown
    readonly observations: ProgramObservation[]
    readonly evidenceContext: ObservationContext
    readonly symbol: SymbolById<Contract, SymbolId>
    readonly symbolId: SymbolId
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
        schemaDescriptorId: input.evidenceContext.schemaDescriptorId,
        projectId: projectIdForContract(input.contract),
        symbolId: input.symbolId,
        rpcId: input.rpc.rpcId,
        status: "typed-error",
        error: decodedError,
        encodedError,
        observations: input.observations,
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
    schemaDescriptorId: input.evidenceContext.schemaDescriptorId,
    projectId: projectIdForContract(input.contract),
    symbolId: input.symbolId,
    rpcId: input.rpc.rpcId,
    status: "defect",
    error: summarizeError(input.error),
    observations: input.observations,
    ...optionalReplay(input.evidenceContext.replay),
  })
}

const evidenceContextFor = (
  projectId: string,
  symbolId: string,
  options: ProgramHarnessInvokeOptions,
): ObservationContext => ({
  observedAt: options.observedAt ?? new Date().toISOString(),
  projectId,
  propertyId: options.propertyId ?? `${projectId}.${symbolId}.harness`,
  schemaDescriptorId: `attune/project/${projectId}`,
  runId: options.runId ?? `${projectId}:${symbolId}:harness:${options.replay?.seed ?? "manual"}`,
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
  symbolId: SymbolId,
): SymbolById<Contract, SymbolId> => {
  const operation = contract.operations.find((candidate) => candidate.id === symbolId)
  if (operation === undefined) {
    throw new Error(`Unknown operation ${symbolId} for package ${projectIdForContract(contract)}`)
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
  symbolId: string,
): ((payload: unknown, context: unknown) => unknown | Promise<unknown>) | undefined => {
  const direct = lookupAccessor(programTestLayer, symbolId)
  if (direct !== undefined) return direct

  if (!isRecord(programTestLayer)) return undefined

  for (const key of ["publicAccessors", "accessors", "handlers", "operations", "services"] as const) {
    const accessor = lookupAccessor(programTestLayer[key], symbolId)
    if (accessor !== undefined) return accessor
  }

  for (const nested of Object.values(programTestLayer)) {
    const accessor = lookupAccessor(nested, symbolId)
    if (accessor !== undefined) return accessor
  }

  return undefined
}

const lookupAccessor = (
  container: unknown,
  symbolId: string,
): ((payload: unknown, context: unknown) => unknown | Promise<unknown>) | undefined => {
  if (!isRecord(container)) return undefined
  const candidate = container[symbolId]
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
  `attune/project/${ProjectIdOf<Contract>}`
