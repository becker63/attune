import { Schema } from "effect"
import fc from "fast-check"

import {
  counterexampleObservation,
  observationEvent,
  diagnosticRuleObservation,
  propertyRunObservation,
  type ObservationContext,
} from "./observation-producer.js"
import {
  counterexampleCacheEntry,
  replayFromFastCheckRun,
  summarizeEvidenceValue,
  type CounterexampleCacheEntry,
  type PropertyTier,
  type RandomSource,
} from "./replay-metadata.js"
import type { WorkerEvidenceMetadata } from "./worker-metadata.js"

export type ArbitrarySource = Readonly<
  | {
    readonly kind: "effect-schema"
    readonly schemaId: string
    readonly description?: string
  }
  | {
    readonly kind: "provided"
    readonly description: string
    readonly schemaId?: string
  }
>

export type ArbitrarySlot<Input> = Readonly<{
  readonly arbitrary: fc.Arbitrary<Input>
  readonly source: ArbitrarySource
}>

export type CoverageTransformMetadata = Readonly<{
  readonly transformId: string
  readonly targetPartition: string
  readonly reason?: string
}>

export type MeasuredFilterMetadata = Readonly<{
  readonly filterId: string
  readonly reason: string
  readonly rejectionCount: number
  readonly acceptanceRate: number
  readonly classification: "schema-refinement" | "operation-precondition" | "corpus-replay-guard" | "temporary-workaround"
}>

export type PropertyCaseContext<Input> = Readonly<{
  readonly caseIndex: number
  readonly input: Input
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
}>

export type PropertyValidationHook<Value, Input> = (
  value: Value,
  context: PropertyCaseContext<Input>,
) => boolean | void | Promise<boolean | void>

export type PropertyOperation<Input, Output> = (
  input: Input,
  context: PropertyCaseContext<Input>,
) => Output | Promise<Output>

export type FastCheckPropertyInput<Input, Output = unknown> = Readonly<{
  readonly arbitrary: ArbitrarySlot<Input>
  readonly examples?: readonly Input[]
  readonly lawIds: readonly string[]
  readonly numRuns: number
  readonly operation: PropertyOperation<Input, Output>
  readonly operationId: string
  readonly packageId: string
  readonly protocolId?: string
  readonly propertyId?: string
  readonly runId?: string
  readonly observedAt?: string
  readonly path?: string
  readonly seed?: number
  readonly tier?: PropertyTier
  readonly randomSource?: RandomSource
  readonly timeoutMs?: number
  readonly transforms?: readonly CoverageTransformMetadata[]
  readonly filters?: readonly MeasuredFilterMetadata[]
  readonly worker?: WorkerEvidenceMetadata
  readonly validateError?: PropertyValidationHook<unknown, Input>
  readonly validateOutput?: PropertyValidationHook<Output, Input>
}>

export type FastCheckPropertyEvidence = Readonly<{
  readonly counterexample?: CounterexampleCacheEntry
  readonly events: readonly ReturnType<typeof observationEvent>[]
  readonly run: Readonly<{
    readonly completedRuns: number
    readonly interrupted: boolean
    readonly requestedRuns: number
    readonly seed: number
    readonly shrinkCount: number
    readonly skippedRuns: number
  }>
  readonly status: "passed" | "failed"
  readonly validation: Readonly<{
    readonly errorSuccesses: number
    readonly outputSuccesses: number
  }>
}>

export class FastCheckPropertyValidationError extends Error {
  constructor(
    message: string,
    readonly context: Readonly<Record<string, unknown>>,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "FastCheckPropertyValidationError"
  }
}

export const providedArbitrarySlot = <Input>(
  arbitrary: fc.Arbitrary<Input>,
  description: string,
  options: Readonly<{ readonly schemaId?: string }> = {},
): ArbitrarySlot<Input> => ({
  arbitrary,
  source: {
    description,
    kind: "provided",
    ...("schemaId" in options ? { schemaId: options.schemaId } : {}),
  },
})

export const schemaArbitrarySlot = <Input>(
  schema: Schema.Schema<Input>,
  source: Readonly<{
    readonly schemaId: string
    readonly description?: string
  }>,
): ArbitrarySlot<Input> => ({
  arbitrary: Schema.toArbitrary(schema) as unknown as fc.Arbitrary<Input>,
  source: {
    kind: "effect-schema",
    schemaId: source.schemaId,
    ...("description" in source ? { description: source.description } : {}),
  },
})

const runHook = async <Value, Input>(
  hook: PropertyValidationHook<Value, Input> | undefined,
  value: Value,
  context: PropertyCaseContext<Input>,
  hookName: "validateError" | "validateOutput",
): Promise<boolean> => {
  if (hook === undefined) {
    return false
  }
  const result = await hook(value, context)
  if (result === false) {
    throw new FastCheckPropertyValidationError(`${hookName} returned false`, {
      caseIndex: context.caseIndex,
      operationId: context.operationId,
      packageId: context.packageId,
    })
  }
  return true
}

const errorSummary = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error)

const runParameters = <Input>(
  input: Pick<FastCheckPropertyInput<Input>, "examples" | "numRuns" | "path" | "seed" | "timeoutMs">,
): fc.Parameters<[Input]> => ({
  endOnFailure: false,
  numRuns: input.numRuns,
  seed: input.seed ?? 1_337,
  ...(input.examples === undefined ? {} : { examples: input.examples.map((example) => [example] as [Input]) }),
  ...(input.path === undefined ? {} : { path: input.path }),
  ...(input.timeoutMs === undefined ? {} : { timeout: input.timeoutMs }),
})

export const checkFastCheckProperty = async <Input, Output = unknown>(
  input: FastCheckPropertyInput<Input, Output>,
): Promise<FastCheckPropertyEvidence> => {
  const runId = input.runId ?? `${input.packageId}:${input.operationId}:property:${input.seed ?? 1_337}`
  const observedAt = input.observedAt ?? new Date().toISOString()
  const propertyId = input.propertyId ?? `${input.packageId}.${input.operationId}.property`
  const seed = input.seed ?? 1_337
  const contextBase: ObservationContext = {
    observedAt,
    packageId: input.packageId,
    propertyId,
    protocolId: input.protocolId ?? `attune/package/${input.packageId}`,
    runId,
    tier: input.tier ?? "commit",
    replay: {
      seed,
      propertyId,
      ...(input.path === undefined ? {} : { path: input.path }),
      ...(input.randomSource === undefined ? {} : { randomSource: input.randomSource }),
      ...(input.worker === undefined ? {} : {
        shardId: input.worker.shardId,
        workerId: input.worker.workerId,
        randomSource: input.worker.randomSource,
      }),
    },
  }
  const events = [
    propertyRunObservation(contextBase, input.operationId, {
      arbitrarySource: input.arbitrary.source,
      filters: input.filters ?? [],
      phase: "started",
      requestedRuns: input.numRuns,
      transforms: input.transforms ?? [],
      worker: input.worker,
    }),
  ]

  let caseIndex = 0
  let outputSuccesses = 0
  let errorSuccesses = 0

  const property = fc.asyncProperty(input.arbitrary.arbitrary, async (value) => {
    const currentCaseIndex = caseIndex
    caseIndex += 1
    const caseContext: PropertyCaseContext<Input> = {
      caseIndex: currentCaseIndex,
      input: value,
      lawIds: input.lawIds,
      operationId: input.operationId,
      packageId: input.packageId,
    }
    try {
      const output = await input.operation(value, caseContext)
      if (await runHook(input.validateOutput, output, caseContext, "validateOutput")) {
        outputSuccesses += 1
      }
      return true
    } catch (error) {
      if (await runHook(input.validateError, error, caseContext, "validateError")) {
        errorSuccesses += 1
        return true
      }
      throw error
    }
  })

  const details = await fc.check(property, runParameters(input))
  const randomSource = input.randomSource ?? input.worker?.randomSource
  const replay = replayFromFastCheckRun(details, {
    propertyId,
    ...(randomSource === undefined ? {} : { randomSource }),
    ...(input.worker?.shardId === undefined ? {} : { shardId: input.worker.shardId }),
    ...(input.worker?.workerId === undefined ? {} : { workerId: input.worker.workerId }),
    ...(input.worker?.shrinkLimitation === undefined ? {} : { shrinkLimitation: input.worker.shrinkLimitation }),
  })
  const context = {
    ...contextBase,
    replay,
  }

  for (const lawId of input.lawIds) {
    events.push(diagnosticRuleObservation(context, input.operationId, lawId, {
      completedRuns: details.numRuns,
      status: details.failed ? "failed" : "passed",
    }))
  }

  const counterexample = details.failed && details.counterexample !== null
    ? counterexampleCacheEntry({
      failureSummary: errorSummary(details.errorInstance ?? details.error),
      filterIds: (input.filters ?? []).map((filter) => filter.filterId),
      generatedValueSummary: summarizeEvidenceValue(details.counterexample[0]),
      lawIds: input.lawIds,
      observedAt,
      operationId: input.operationId,
      packageId: input.packageId,
      propertyId,
      protocolId: context.protocolId,
      replay,
      runId,
      transformIds: (input.transforms ?? []).map((transform) => transform.transformId),
    })
    : undefined

  events.push(propertyRunObservation(context, input.operationId, {
    completedRuns: details.numRuns,
    interrupted: details.interrupted,
    phase: details.failed ? "failed" : "completed",
    shrinkCount: details.numShrinks,
    skippedRuns: details.numSkips,
  }))

  if (counterexample !== undefined) {
    events.push(counterexampleObservation(context, input.operationId, counterexample))
  }

  return {
    events,
    run: {
      completedRuns: details.numRuns,
      interrupted: details.interrupted,
      requestedRuns: input.numRuns,
      seed: details.seed,
      shrinkCount: details.numShrinks,
      skippedRuns: details.numSkips,
    },
    status: details.failed ? "failed" : "passed",
    validation: {
      errorSuccesses,
      outputSuccesses,
    },
    ...(counterexample === undefined ? {} : { counterexample }),
  }
}
