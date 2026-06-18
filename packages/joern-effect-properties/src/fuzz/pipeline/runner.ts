import { Context, Effect, Layer } from "effect"
import fc from "fast-check"
import { FuzzTelemetry, type FuzzTelemetryService } from "../services/telemetry.js"
import { FuzzOracle } from "../services/oracle.js"
import { FuzzExpectationMismatchError } from "../services/expectations.js"
import type { FuzzCase, FuzzerRunConfig, FuzzerRunSummary } from "../domain/model.js"
import { PropertyHarnessRuntime } from "../config/runtime.js"
import type { PropertyHarnessConfig } from "../config/runtime.js"
import { makeFuzzTrace, runPayload } from "../services/eventPayloads.js"
import { SemanticAdmitter } from "../services/admission.js"
import { SemanticCorpusStore } from "../services/corpus.js"
import { semanticCasePlanArbitrary } from "../templates/workloads.js"
import type { SemanticCase } from "../domain/model.js"
import { SemanticMutator } from "../services/mutator.js"

export interface SemanticFuzzSchedulerService {
  readonly run: (config: FuzzerRunConfig) => Effect.Effect<
    FuzzerRunSummary,
    unknown,
    SemanticCorpusStore | SemanticMutator | SemanticAdmitter | FuzzOracle | FuzzTelemetry
  >
}

export class SemanticFuzzScheduler extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticFuzzScheduler",
)<SemanticFuzzScheduler, SemanticFuzzSchedulerService>() {}

const chunksFor = <A>(values: readonly A[], workerCount: number): readonly (readonly A[])[] => {
  const chunkCount = Math.min(Math.max(workerCount, 1), Math.max(values.length, 1))
  return Array.from({ length: chunkCount }, (_chunk, workerIndex) =>
    values.filter((_value, valueIndex) => valueIndex % chunkCount === workerIndex),
  ).filter((chunk) => chunk.length > 0)
}

const chunksBySize = <A>(values: readonly A[], chunkSize: number): readonly (readonly A[])[] => {
  const safeChunkSize = Math.max(1, chunkSize)
  const chunks: Array<readonly A[]> = []
  for (let index = 0; index < values.length; index += safeChunkSize) {
    chunks.push(values.slice(index, index + safeChunkSize))
  }
  return chunks
}

const semanticCasePayload = (
  input: Readonly<{
    readonly semanticCase: SemanticCase
    readonly traceId: string
    readonly spanId: string
    readonly parentSpanId: string
  }>,
): Readonly<Record<string, unknown>> => ({
  caseId: input.semanticCase.caseId,
  corpusSeedId: input.semanticCase.project.id,
  fileCount: input.semanticCase.project.files.length,
  fastCheckPath: input.semanticCase.replay?.fastCheckPath,
  fastCheckSeed: input.semanticCase.replay?.fastCheckSeed,
  mutationSequence: input.semanticCase.mutations.map((step) => `${step.kind}:${step.targetFile}`).join(","),
  "otel.parent_span_id": input.parentSpanId,
  "otel.span_id": input.spanId,
  "otel.trace_id": input.traceId,
  syntaxFlavor: [...new Set(input.semanticCase.project.files.map((file) => file.syntaxFlavor))].join(","),
})

const failurePayload = (
  semanticCase: SemanticCase | undefined,
  workerId: string,
  traceId: string,
  parentSpanId: string,
  failureClass: string,
  failureSummary: string,
  extra: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> => ({
  failureClass,
  failureSummary,
  ...extra,
  workerId,
  "otel.parent_span_id": parentSpanId,
  "otel.span_id": makeFuzzTrace().spanId,
  "otel.trace_id": traceId,
  ...(semanticCase === undefined ? {} : {
    caseId: semanticCase.caseId,
    corpusSeedId: semanticCase.project.id,
    fastCheckPath: semanticCase.replay?.fastCheckPath,
    fastCheckSeed: semanticCase.replay?.fastCheckSeed,
    mutationSequence: semanticCase.mutations.map((step) => `${step.kind}:${step.targetFile}`).join(","),
    syntaxFlavor: [...new Set(semanticCase.project.files.map((file) => file.syntaxFlavor))].join(","),
  }),
})

const failureSummaryFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const expectationFailureFields = (
  error: unknown,
): Readonly<Record<string, unknown>> => {
  if (!(error instanceof FuzzExpectationMismatchError)) {
    return {}
  }
  return {
    expectationFailureCount: error.failures.length,
    expectationSummary: error.failures
      .slice(0, 8)
      .map((failure) =>
        `${failure.expectation.kind}:${failure.expectation.value}:${failure.expectation.sourcePath}`
      )
      .join(";"),
  }
}

const emitCounterexampleEvents = (
  input: Readonly<{
    readonly batchIndex: number
    readonly error: unknown
    readonly failureClass: string
    readonly firstCase: SemanticCase | undefined
    readonly shardIndex: number
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
  config: FuzzerRunConfig,
): Effect.Effect<void> => {
  const payload = failurePayload(
    input.firstCase,
    input.workerId,
    input.traceId,
    input.workerSpanId,
    input.error instanceof FuzzExpectationMismatchError ? "invariant" : input.failureClass,
    failureSummaryFor(input.error),
    expectationFailureFields(input.error),
  )
  return input.telemetry.emit(config, "attune.fuzz.counterexample_found", {
    ...payload,
    batchIndex: input.batchIndex,
    shardIndex: input.shardIndex,
  }).pipe(
    Effect.zipRight(input.telemetry.emit(config, "attune.fuzz.shrink_completed", {
      ...payload,
      batchIndex: input.batchIndex,
      shardIndex: input.shardIndex,
      shrinkStrategy: "semantic-fast-check-replay-case",
    })),
    Effect.zipRight(input.telemetry.emit(config, "attune.fuzz.fixture_candidate", {
      ...payload,
      batchIndex: input.batchIndex,
      shardIndex: input.shardIndex,
    })),
    Effect.zipRight(input.telemetry.flush),
  )
}

export const makeSemanticFuzzScheduler = (runtime: PropertyHarnessConfig): SemanticFuzzSchedulerService => ({
  run: (config) => Effect.gen(function* runFuzzPipeline() {
    const corpus = yield* SemanticCorpusStore
    const mutator = yield* SemanticMutator
    const admitter = yield* SemanticAdmitter
    const oracle = yield* FuzzOracle
    const telemetry = yield* FuzzTelemetry
    const trace = makeFuzzTrace()
    const workerCount = runtime.workerCount
    const batchCount = Math.max(1, config.batchCount ?? 1)
    const joernShardSize = Math.max(1, config.joernShardSize ?? Number.MAX_SAFE_INTEGER)
    const maxMutators = Math.max(1, config.maxMutators ?? 4)
    const joernMode = config.joernMode ?? (config.mode === "smoke" ? "none" : "query")

      yield* telemetry.emit(config, "attune.fuzz.run_started", {
        batchCount,
        caseCount: config.caseCount,
        joernMode,
      joernShardSize,
      maxMutators,
      mode: config.mode,
      queryBudget: config.queryBudget,
      queryFeedback: config.queryFeedback ?? true,
      seed: config.seed,
      workerCount,
      "otel.span_id": trace.spanId,
      "otel.trace_id": trace.traceId,
    })
    yield* telemetry.flush

    const seeds = yield* corpus.list
    const batchSummaries = yield* Effect.forEach(
      Array.from({ length: batchCount }, (_, batchIndex) => batchIndex),
      (batchIndex) => Effect.gen(function* runSemanticBatch() {
        const batchSeed = config.seed + batchIndex
        const batchTrace = makeFuzzTrace()
        yield* telemetry.emit(config, "attune.fuzz.batch_started", {
          batchCount,
          batchIndex,
          caseCount: config.caseCount,
          joernShardSize,
          maxMutators,
          seed: batchSeed,
          "otel.parent_span_id": trace.spanId,
          "otel.span_id": batchTrace.spanId,
          "otel.trace_id": trace.traceId,
        })
        yield* telemetry.flush

        const plans = fc.sample(semanticCasePlanArbitrary(seeds, maxMutators), {
          numRuns: config.caseCount,
          seed: batchSeed,
        }).map((plan, sampleIndex) => ({
          ...plan,
          caseId: `${plan.caseId}-batch-${batchIndex}-sample-${sampleIndex}`,
          plan: {
            ...plan.plan,
            replay: {
              fastCheckPath: `semantic-seed:${batchSeed}:batch:${batchIndex}:sample:${sampleIndex}`,
              fastCheckSeed: batchSeed,
            },
          },
        }))
        const planChunks = chunksFor(plans, workerCount)

        const workerSummaries = yield* Effect.forEach(
          planChunks,
          (workerPlans, workerIndex) => Effect.gen(function* runSemanticWorker() {
            const workerId = `semantic-worker-${workerIndex}`
            const workerTrace = makeFuzzTrace()
            yield* telemetry.emit(config, "attune.fuzz.worker_started", {
              batchIndex,
              caseCount: workerPlans.length,
              mode: config.mode,
              workerId,
              "otel.parent_span_id": batchTrace.spanId,
              "otel.span_id": workerTrace.spanId,
              "otel.trace_id": trace.traceId,
            })
            yield* telemetry.flush

            let accepted = 0
            let rejected = 0
            const acceptedSemanticCases: SemanticCase[] = []
            const acceptedFuzzCases: FuzzCase[] = []

            for (const [caseIndex, plan] of workerPlans.entries()) {
              const spanId = makeFuzzTrace().spanId
              const globalCaseIndex = workerIndex + caseIndex * planChunks.length
              const result = yield* mutator.applyDetailed(plan)
              const semanticCase = result.case
              yield* telemetry.emit(config, "attune.fuzz.case_generated", {
                appliedMutations: result.applied.map((mutation) => mutation.kind).join(","),
                batchIndex,
                caseIndex: globalCaseIndex,
                rejectedMutations: result.rejected.map((mutation) => `${mutation.kind}:${mutation.reason}`).join(";"),
                workerId,
                ...semanticCasePayload({
                  parentSpanId: workerTrace.spanId,
                  semanticCase,
                  spanId,
                  traceId: trace.traceId,
                }),
              })
              for (const mutation of result.applied) {
                yield* telemetry.emit(config, "attune.fuzz.mutation_applied", {
                  batchIndex,
                  caseIndex: globalCaseIndex,
                  mutationKind: mutation.kind,
                  targetFile: mutation.targetFile,
                  workerId,
                  ...semanticCasePayload({
                    parentSpanId: workerTrace.spanId,
                    semanticCase,
                    spanId: makeFuzzTrace().spanId,
                    traceId: trace.traceId,
                  }),
                })
              }

              const admission = yield* admitter.admit(semanticCase)
              if (admission.accepted) {
                accepted += 1
                acceptedSemanticCases.push(semanticCase)
                acceptedFuzzCases.push(...(yield* admitter.toFuzzCases(semanticCase)))
                yield* telemetry.emit(config, "attune.fuzz.case_admitted", {
                  batchIndex,
                  caseIndex: globalCaseIndex,
                  files: admission.files.length,
                  workerId,
                  ...semanticCasePayload({
                    parentSpanId: workerTrace.spanId,
                    semanticCase,
                    spanId,
                    traceId: trace.traceId,
                  }),
                })
              } else {
                rejected += 1
                yield* telemetry.emit(config, "attune.fuzz.case_rejected", {
                  batchIndex,
                  caseIndex: globalCaseIndex,
                  diagnostics: admission.diagnostics,
                  workerId,
                  ...semanticCasePayload({
                    parentSpanId: workerTrace.spanId,
                    semanticCase,
                    spanId,
                    traceId: trace.traceId,
                  }),
                })
              }
            }

            if (joernMode !== "none" && acceptedFuzzCases.length > 0) {
              const firstCase = acceptedSemanticCases[0]
              const joernShards = chunksBySize(acceptedFuzzCases, joernShardSize)

              for (const [shardIndex, joernShard] of joernShards.entries()) {
                const oracleStartedAt = Date.now()
                yield* telemetry.emit(config, "attune.fuzz.joern_import_started", {
                  batchIndex,
                  caseCount: joernShard.length,
                  shardCount: joernShards.length,
                  shardIndex,
                  workerId,
                  "otel.parent_span_id": workerTrace.spanId,
                  "otel.span_id": makeFuzzTrace().spanId,
                  "otel.trace_id": trace.traceId,
                })
                yield* telemetry.flush

                if (joernMode === "import") {
                  const importResult = yield* Effect.either(oracle.importJoernProject(joernShard))
                  if (importResult._tag === "Left") {
                    yield* emitCounterexampleEvents({
                      batchIndex,
                      error: importResult.left,
                      failureClass: "joern-import",
                      firstCase,
                      shardIndex,
                      telemetry,
                      traceId: trace.traceId,
                      workerId,
                      workerSpanId: workerTrace.spanId,
                    }, config)
                    continue
                  }
                  yield* telemetry.emit(config, "attune.fuzz.joern_import_completed", {
                    batchIndex,
                    caseCount: importResult.right.caseCount,
                    durationMs: Date.now() - oracleStartedAt,
                    joernWorkerId: importResult.right.workerId,
                    projectName: importResult.right.projectName,
                    projectPath: importResult.right.projectPath,
                    shardCount: joernShards.length,
                    shardIndex,
                    workspacePath: importResult.right.workspacePath,
                    workerId,
                    "otel.parent_span_id": workerTrace.spanId,
                    "otel.span_id": makeFuzzTrace().spanId,
                    "otel.trace_id": trace.traceId,
                  })
                  yield* telemetry.flush
                } else {
                  const oracleResult = yield* Effect.either(oracle.runJoernQueries(joernShard, {
                    ...(config.queryBudget === undefined ? {} : { queryBudget: config.queryBudget }),
                    ...(config.queryFeedback === undefined ? {} : { queryFeedback: config.queryFeedback }),
                  }))
                  if (oracleResult._tag === "Left") {
                    yield* emitCounterexampleEvents({
                      batchIndex,
                      error: oracleResult.left,
                      failureClass: "oracle-disagreement",
                      firstCase,
                      shardIndex,
                      telemetry,
                      traceId: trace.traceId,
                      workerId,
                      workerSpanId: workerTrace.spanId,
                    }, config)
                    continue
                  }
                  yield* telemetry.emit(config, "attune.fuzz.joern_import_completed", {
                    batchIndex,
                    caseCount: oracleResult.right.caseCount,
                    durationMs: Date.now() - oracleStartedAt,
                    joernWorkerId: oracleResult.right.workerId,
                    projectName: oracleResult.right.projectName,
                    projectPath: oracleResult.right.projectPath,
                    shardCount: joernShards.length,
                    shardIndex,
                    workspacePath: oracleResult.right.workspacePath,
                    workerId,
                    "otel.parent_span_id": workerTrace.spanId,
                    "otel.span_id": makeFuzzTrace().spanId,
                    "otel.trace_id": trace.traceId,
                  })
                  yield* telemetry.emit(config, "attune.fuzz.joern_oracle_completed", {
                    batchIndex,
                    caseCount: oracleResult.right.caseCount,
                    durationMs: Date.now() - oracleStartedAt,
                    joernWorkerId: oracleResult.right.workerId,
                    projectName: oracleResult.right.projectName,
                    queryResults: oracleResult.right.queryResults,
                    shardCount: joernShards.length,
                    shardIndex,
                    workerId,
                    "otel.parent_span_id": workerTrace.spanId,
                    "otel.span_id": makeFuzzTrace().spanId,
                    "otel.trace_id": trace.traceId,
                  })
                  yield* Effect.forEach(
                    oracleResult.right.queryResults,
                    (queryResult) => telemetry.emit(config, "attune.fuzz.query_completed", {
                      batchIndex,
                      caseCount: oracleResult.right.caseCount,
                      cpgql: queryResult.cpgql,
                      joernWorkerId: oracleResult.right.workerId,
                      projectName: oracleResult.right.projectName,
                      queryFingerprint: queryResult.fingerprint,
                      queryKind: queryResult.kind,
                      queryName: queryResult.name,
                      queryPreview: queryResult.preview,
                      rowCount: queryResult.rowCount,
                      shardCount: joernShards.length,
                      shardIndex,
                      workerId,
                      "otel.parent_span_id": workerTrace.spanId,
                      "otel.span_id": makeFuzzTrace().spanId,
                      "otel.trace_id": trace.traceId,
                    }),
                  )
                  yield* telemetry.flush
                }
              }
            }

            yield* telemetry.emit(config, "attune.fuzz.worker_completed", {
              accepted,
              batchIndex,
              caseCount: workerPlans.length,
              rejected,
              workerId,
              "otel.parent_span_id": batchTrace.spanId,
              "otel.span_id": workerTrace.spanId,
              "otel.trace_id": trace.traceId,
            })
            yield* telemetry.flush
            return { accepted, rejected }
          }),
          { concurrency: workerCount },
        )
        const batchSummary = {
          accepted: workerSummaries.reduce((sum, worker) => sum + worker.accepted, 0),
          cases: plans.length,
          rejected: workerSummaries.reduce((sum, worker) => sum + worker.rejected, 0),
        }
        yield* telemetry.emit(config, "attune.fuzz.batch_completed", {
          ...batchSummary,
          batchCount,
          batchIndex,
          "otel.parent_span_id": trace.spanId,
          "otel.span_id": batchTrace.spanId,
          "otel.trace_id": trace.traceId,
        })
        yield* telemetry.flush
        return batchSummary
      }),
      { concurrency: 1 },
    )

    const summary = {
      accepted: batchSummaries.reduce((sum, batch) => sum + batch.accepted, 0),
      batches: batchCount,
      cases: batchSummaries.reduce((sum, batch) => sum + batch.cases, 0),
      mode: config.mode,
      rejected: batchSummaries.reduce((sum, batch) => sum + batch.rejected, 0),
      seed: config.seed,
    }
    yield* telemetry.emit(config, "attune.fuzz.run_completed", {
      ...runPayload(summary, trace.traceId, trace.spanId),
      batchCount,
      joernShardSize,
      maxMutators,
      workerCount,
    })
    yield* telemetry.flush
    return summary
  }),
})

export const SemanticFuzzSchedulerLive: Layer.Layer<SemanticFuzzScheduler, never, PropertyHarnessRuntime> = Layer.effect(
  SemanticFuzzScheduler,
  PropertyHarnessRuntime.pipe(Effect.map(makeSemanticFuzzScheduler)),
)

export type FuzzPipelineRunnerService = SemanticFuzzSchedulerService
export const FuzzPipelineRunner = SemanticFuzzScheduler
export const makeFuzzPipelineRunner = makeSemanticFuzzScheduler
export const FuzzPipelineRunnerLive = SemanticFuzzSchedulerLive
