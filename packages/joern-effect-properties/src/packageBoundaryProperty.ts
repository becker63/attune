import { Arbitrary as EffectArbitrary, Schema } from "effect"
import fc from "fast-check"

export type PackageBoundaryRandomSource = "main-thread"

export type PackageBoundaryArbitrarySource = Readonly<
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

export type PackageBoundaryArbitrarySlot<Input> = Readonly<{
  readonly arbitrary: fc.Arbitrary<Input>
  readonly source: PackageBoundaryArbitrarySource
}>

export type PackageBoundaryRunContext<Input> = Readonly<{
  readonly caseIndex: number
  readonly input: Input
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
}>

export type PackageBoundaryValidationHook<Value, Input> = (
  value: Value,
  context: PackageBoundaryRunContext<Input>,
) => boolean | void | Promise<boolean | void>

export type PackageBoundaryOperation<Input, Output> = (
  input: Input,
  context: PackageBoundaryRunContext<Input>,
) => Output | Promise<Output>

export type PackageBoundaryPropertyInput<Input, Output = unknown> = Readonly<{
  readonly arbitrary: PackageBoundaryArbitrarySlot<Input>
  readonly examples?: readonly Input[]
  readonly lawIds: readonly string[]
  readonly numRuns: number
  readonly operation: PackageBoundaryOperation<Input, Output>
  readonly operationId: string
  readonly packageId: string
  readonly path?: string
  readonly seed?: number
  readonly timeoutMs?: number
  readonly validateError?: PackageBoundaryValidationHook<unknown, Input>
  readonly validateOutput?: PackageBoundaryValidationHook<Output, Input>
  readonly now?: () => number
}>

export type PackageBoundaryReplayMetadata = Readonly<{
  readonly lawIds: readonly string[]
  readonly numRuns: number
  readonly operationId: string
  readonly packageId: string
  readonly path?: string
  readonly randomSource: PackageBoundaryRandomSource
  readonly seed: number
}>

export type PackageBoundaryCounterexampleSummary = Readonly<{
  readonly errorMessage: string
  readonly errorName: string
  readonly errorSummary: string
  readonly generatedValueSummary: string
  readonly path?: string
  readonly shrinkCount: number
}>

export type PackageBoundaryEvidenceRecordType =
  | "package-boundary.property.started"
  | "package-boundary.case.started"
  | "package-boundary.case.output-validated"
  | "package-boundary.case.error-validated"
  | "package-boundary.case.failed"
  | "package-boundary.property.completed"
  | "package-boundary.property.failed"

export type PackageBoundaryEvidenceRecord = Readonly<{
  readonly caseIndex?: number
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
  readonly payload?: Readonly<Record<string, unknown>>
  readonly seed: number
  readonly timestampMs: number
  readonly type: PackageBoundaryEvidenceRecordType
}>

export type PackageBoundaryPropertyEvidence = Readonly<{
  readonly arbitrarySource: PackageBoundaryArbitrarySource
  readonly counterexample?: PackageBoundaryCounterexampleSummary
  readonly lawIds: readonly string[]
  readonly operationId: string
  readonly packageId: string
  readonly records: readonly PackageBoundaryEvidenceRecord[]
  readonly run: Readonly<{
    readonly completedRuns: number
    readonly interrupted: boolean
    readonly replay: PackageBoundaryReplayMetadata
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

export class PackageBoundaryValidationError extends Error {
  constructor(
    message: string,
    readonly context: Readonly<Record<string, unknown>>,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "PackageBoundaryValidationError"
  }
}

const defaultSeed = 1337

const summarizeValue = (value: unknown): string => {
  try {
    const summary = JSON.stringify(value)
    if (summary === undefined) {
      return String(value)
    }
    return summary.length > 2_000 ? `${summary.slice(0, 2_000)}...` : summary
  } catch {
    return String(value)
  }
}

const errorName = (error: unknown): string =>
  error instanceof Error ? error.name : typeof error

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const record = (
  input: Pick<PackageBoundaryPropertyInput<unknown>, "lawIds" | "operationId" | "packageId">,
  seed: number,
  now: () => number,
  type: PackageBoundaryEvidenceRecordType,
  options: {
    readonly caseIndex?: number
    readonly payload?: Readonly<Record<string, unknown>>
  } = {},
): PackageBoundaryEvidenceRecord => {
  const base = {
    lawIds: input.lawIds,
    operationId: input.operationId,
    packageId: input.packageId,
    seed,
    timestampMs: now(),
    type,
  }
  return {
    ...base,
    ...("caseIndex" in options ? { caseIndex: options.caseIndex } : {}),
    ...("payload" in options ? { payload: options.payload } : {}),
  }
}

const runHook = async <Value, Input>(
  hook: PackageBoundaryValidationHook<Value, Input> | undefined,
  value: Value,
  context: PackageBoundaryRunContext<Input>,
  hookName: "validateError" | "validateOutput",
): Promise<boolean> => {
  if (hook === undefined) {
    return false
  }
  const result = await hook(value, context)
  if (result === false) {
    throw new PackageBoundaryValidationError(`${hookName} returned false`, {
      caseIndex: context.caseIndex,
      operationId: context.operationId,
      packageId: context.packageId,
    })
  }
  return true
}

const replayMetadata = (
  input: Pick<PackageBoundaryPropertyInput<unknown>, "lawIds" | "numRuns" | "operationId" | "packageId">,
  seed: number,
  path: string | null | undefined,
): PackageBoundaryReplayMetadata => ({
  lawIds: input.lawIds,
  numRuns: input.numRuns,
  operationId: input.operationId,
  packageId: input.packageId,
  randomSource: "main-thread",
  seed,
  ...(typeof path === "string" ? { path } : {}),
})

const makeCounterexample = <Input>(
  details: fc.RunDetails<[Input]>,
): PackageBoundaryCounterexampleSummary | undefined => {
  if (!details.failed || details.counterexample === null) {
    return undefined
  }
  return {
    errorMessage: errorMessage(details.errorInstance ?? details.error),
    errorName: errorName(details.errorInstance ?? details.error),
    errorSummary: summarizeValue(details.errorInstance ?? details.error),
    generatedValueSummary: summarizeValue(details.counterexample[0]),
    shrinkCount: details.numShrinks,
    ...(details.counterexamplePath === null ? {} : { path: details.counterexamplePath }),
  }
}

const runParameters = <Input>(
  input: Readonly<{
    readonly examples?: readonly Input[]
    readonly numRuns: number
    readonly path?: string
    readonly timeoutMs?: number
  }>,
  seed: number,
): fc.Parameters<[Input]> => ({
  endOnFailure: false,
  numRuns: input.numRuns,
  seed,
  ...(input.examples === undefined ? {} : { examples: input.examples.map((example) => [example] as [Input]) }),
  ...(input.path === undefined ? {} : { path: input.path }),
  ...(input.timeoutMs === undefined ? {} : { timeout: input.timeoutMs }),
})

export const providedArbitrarySlot = <Input>(
  arbitrary: fc.Arbitrary<Input>,
  description: string,
  options: Readonly<{ readonly schemaId?: string }> = {},
): PackageBoundaryArbitrarySlot<Input> => ({
  arbitrary,
  source: {
    description,
    kind: "provided",
    ...("schemaId" in options ? { schemaId: options.schemaId } : {}),
  },
})

export const schemaArbitrarySlot = <Input, Encoded = Input, Requirements = never>(
  schema: Schema.Schema<Input, Encoded, Requirements>,
  source: Readonly<{
    readonly schemaId: string
    readonly description?: string
  }>,
): PackageBoundaryArbitrarySlot<Input> => ({
  arbitrary: EffectArbitrary.make(schema),
  source: {
    kind: "effect-schema",
    schemaId: source.schemaId,
    ...("description" in source ? { description: source.description } : {}),
  },
})

export const checkPackageBoundaryProperty = async <Input, Output = unknown>(
  input: PackageBoundaryPropertyInput<Input, Output>,
): Promise<PackageBoundaryPropertyEvidence> => {
  const seed = input.seed ?? defaultSeed
  const now = input.now ?? Date.now
  const records: PackageBoundaryEvidenceRecord[] = [
    record(input, seed, now, "package-boundary.property.started", {
      payload: {
        arbitrarySource: input.arbitrary.source,
        requestedRuns: input.numRuns,
      },
    }),
  ]
  let caseIndex = 0
  let outputSuccesses = 0
  let errorSuccesses = 0

  const property = fc.asyncProperty(input.arbitrary.arbitrary, async (value) => {
    const currentCaseIndex = caseIndex
    caseIndex += 1
    const context: PackageBoundaryRunContext<Input> = {
      caseIndex: currentCaseIndex,
      input: value,
      lawIds: input.lawIds,
      operationId: input.operationId,
      packageId: input.packageId,
    }
    records.push(record(input, seed, now, "package-boundary.case.started", {
      caseIndex: currentCaseIndex,
      payload: {
        generatedValueSummary: summarizeValue(value),
      },
    }))
    try {
      const output = await input.operation(value, context)
      if (await runHook(input.validateOutput, output, context, "validateOutput")) {
        outputSuccesses += 1
        records.push(record(input, seed, now, "package-boundary.case.output-validated", {
          caseIndex: currentCaseIndex,
        }))
      }
      return true
    } catch (error) {
      if (await runHook(input.validateError, error, context, "validateError")) {
        errorSuccesses += 1
        records.push(record(input, seed, now, "package-boundary.case.error-validated", {
          caseIndex: currentCaseIndex,
          payload: {
            errorMessage: errorMessage(error),
            errorName: errorName(error),
          },
        }))
        return true
      }
      records.push(record(input, seed, now, "package-boundary.case.failed", {
        caseIndex: currentCaseIndex,
        payload: {
          errorMessage: errorMessage(error),
          errorName: errorName(error),
          errorSummary: summarizeValue(error),
        },
      }))
      throw error
    }
  })

  const details = await fc.check(property, runParameters(input, seed))
  const counterexample = makeCounterexample(details)
  const status = details.failed ? "failed" : "passed"
  const replay = replayMetadata(
    input,
    details.seed,
    details.counterexamplePath ?? input.path,
  )

  records.push(record(
    input,
    details.seed,
    now,
    status === "passed" ? "package-boundary.property.completed" : "package-boundary.property.failed",
    {
      payload: {
        completedRuns: details.numRuns,
        interrupted: details.interrupted,
        replay,
        shrinkCount: details.numShrinks,
        skippedRuns: details.numSkips,
      },
    },
  ))

  return {
    arbitrarySource: input.arbitrary.source,
    lawIds: input.lawIds,
    operationId: input.operationId,
    packageId: input.packageId,
    records,
    run: {
      completedRuns: details.numRuns,
      interrupted: details.interrupted,
      replay,
      requestedRuns: input.numRuns,
      seed: details.seed,
      shrinkCount: details.numShrinks,
      skippedRuns: details.numSkips,
    },
    status,
    validation: {
      errorSuccesses,
      outputSuccesses,
    },
    ...(counterexample === undefined ? {} : { counterexample }),
  }
}

export const replaySeedFromEvidence = (
  evidence: PackageBoundaryPropertyEvidence,
): PackageBoundaryReplayMetadata => evidence.run.replay
