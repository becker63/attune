import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineTestRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Schema } from "effect"
import { Effect } from "effect"
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
import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"
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
  readonly filterKind: "schema-refinement" | "operation-precondition" | "corpus-replay-guard" | "temporary-workaround"
}>

export type PropertyCaseContext<Input> = Readonly<{
  readonly caseIndex: number
  readonly input: Input
  readonly lawIds: readonly string[]
  readonly symbolId: string
  readonly projectId: string
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
  readonly symbolId: string
  readonly projectId: string
  readonly schemaDescriptorId?: string
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
      symbolId: context.symbolId,
      projectId: context.projectId,
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
  const runId = input.runId ?? `${input.projectId}:${input.symbolId}:property:${input.seed ?? 1_337}`
  const observedAt = input.observedAt ?? new Date().toISOString()
  const propertyId = input.propertyId ?? `${input.projectId}.${input.symbolId}.property`
  const seed = input.seed ?? 1_337
  const contextBase: ObservationContext = {
    observedAt,
    projectId: input.projectId,
    propertyId,
    schemaDescriptorId: input.schemaDescriptorId ?? `attune/project/${input.projectId}`,
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
    propertyRunObservation(contextBase, input.symbolId, {
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
      symbolId: input.symbolId,
      projectId: input.projectId,
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
    events.push(diagnosticRuleObservation(context, input.symbolId, lawId, {
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
      symbolId: input.symbolId,
      projectId: input.projectId,
      propertyId,
      schemaDescriptorId: context.schemaDescriptorId,
      replay,
      runId,
      transformIds: (input.transforms ?? []).map((transform) => transform.transformId),
    })
    : undefined

  events.push(propertyRunObservation(context, input.symbolId, {
    completedRuns: details.numRuns,
    interrupted: details.interrupted,
    phase: details.failed ? "failed" : "completed",
    shrinkCount: details.numShrinks,
    skippedRuns: details.numSkips,
  }))

  if (counterexample !== undefined) {
    events.push(counterexampleObservation(context, input.symbolId, counterexample))
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

export const FrameworkTestingFastCheckRecipeId = "framework-testing.fastcheck-property-evidence" as const
export const FrameworkTestingFastCheckSourcePath = "packages/trellis/testing/src/fastcheck.ts" as const

export const describeFrameworkTestingFastCheck = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "fastcheck-property-evidence", {
    observationCount: input.symbolIds.length,
    replayMetadataCount: input.symbolIds.length,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingFastCheckSourceResource = defineAlchemyResource({
  id: "framework-testing.fastcheck.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingFastCheckSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingFastCheckRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingFastCheckEvidenceResource = defineAlchemyResource({
  id: "framework-testing.fastcheck.evidence",
  kind: "report",
  alchemyType: "attune:resource:FrameworkTestingFastCheckEvidence",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["check", "read"],
  ownerRecipeId: FrameworkTestingFastCheckRecipeId,
  producedBy: [FrameworkTestingFastCheckRecipeId],
})

export const FrameworkTestingFastCheckHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.fastcheck-property-evidence.handler",
  recipeId: FrameworkTestingFastCheckRecipeId,
  sourcePath: FrameworkTestingFastCheckSourcePath,
  exportName: "describeFrameworkTestingFastCheck",
  emitsReceipts: ["framework-testing.fastcheck.evidence"],
  handler: (input) => Effect.succeed(describeFrameworkTestingFastCheck(input)),
})

export const FrameworkTestingFastCheckDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.fastcheck.source",
  toRecipeId: FrameworkTestingFastCheckRecipeId,
  resource: FrameworkTestingFastCheckEvidenceResource,
  kind: "validates",
  modes: ["read", "check"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingFastCheckRecipes = [
// @attune-packet-target generated-runtime-projection eligible
  defineTestRecipe({
    id: FrameworkTestingFastCheckRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own FastCheck property evidence helpers",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingFastCheckSourceResource],
      outputResources: [FrameworkTestingFastCheckEvidenceResource],
    },
    handler: FrameworkTestingFastCheckHandler,
    alchemyDag: [FrameworkTestingFastCheckDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    allowedFiles: [FrameworkTestingFastCheckSourcePath],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const
